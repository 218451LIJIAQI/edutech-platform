import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';
import { buildCourseSavePayload } from '@/features/course-editor/course-persistence';
import { buildMaterialSavePayload } from '@/features/course-editor/material-persistence';
import { buildPackageSavePayload } from '@/features/course-editor/package-persistence';
import { buildLessonSavePayload } from '@/features/lesson-editor/lesson-persistence';
import {
  CourseType,
  LessonType,
  SupportTicketPriority,
  SupportTicketStatus,
} from '@/types';
import type { Enrollment, SupportTicket } from '@/types';
import { getPreferredCourseEnrollments } from '@/utils/enrollment';
import {
  buildSupportConversationEntries,
  validateSupportAttachmentFile,
} from '@/utils/support-thread';

const setTestViteEnv = (env: Record<string, string>) => {
  (
    globalThis as typeof globalThis & {
      __TEST_IMPORT_META_ENV__?: Record<string, string>;
    }
  ).__TEST_IMPORT_META_ENV__ = env;
};

afterEach(() => {
  setTestViteEnv({});
});

const noopToast = {
  show: () => 'toast-1',
  dismiss: () => undefined,
};

describe('editor persistence payload builders', () => {
  it('supports clearing optional course media with null in edit mode and strips backend origin from uploaded paths', async () => {
    setTestViteEnv({ VITE_API_URL: 'https://api.example.com/api/v1' });

    const editClearedPayload = await buildCourseSavePayload({
      data: {
        title: '  Systems Design  ',
        description: '  Practical distributed systems  ',
        category: 'Engineering',
        courseType: CourseType.HYBRID,
        thumbnail: '',
        previewVideoUrl: '',
      },
      media: {
        thumbnailType: 'link',
        thumbnailFile: null,
        thumbnailLink: '   ',
        previewVideoType: 'upload',
        previewVideoFile: null,
        previewVideoLink: '',
      },
      uploadService: {
        uploadThumbnail: async () => '/uploads/thumbnails/unused.png',
        uploadVideo: async () => '/uploads/videos/unused.mp4',
      },
      previewUploadToast: noopToast,
      isEditMode: true,
    });

    assert.deepEqual(editClearedPayload, {
      title: 'Systems Design',
      description: 'Practical distributed systems',
      category: 'Engineering',
      courseType: CourseType.HYBRID,
      thumbnail: null,
      previewVideoUrl: null,
    });
  });

  it('distinguishes lifetime 0-day packages between create (omitted) and edit (null to clear existing duration)', () => {
    const baseData = {
      name: '  Full Access  ',
      description: '   ',
      price: 120,
      discount: 20,
      duration: 0,
      maxStudents: 50,
    };

    const created = buildPackageSavePayload(baseData, ['  HD Videos ', 'HD Videos', 'Q&A']);
    assert.deepEqual(created, {
      name: 'Full Access',
      description: undefined,
      price: 120,
      discount: 20,
      finalPrice: 100,
      maxStudents: 50,
      features: ['HD Videos', 'Q&A'],
    });

    const updated = buildPackageSavePayload(baseData, ['HD Videos'], { isEditMode: true });
    assert.deepEqual(updated, {
      name: 'Full Access',
      description: null,
      price: 120,
      discount: 20,
      finalPrice: 100,
      duration: null,
      maxStudents: 50,
      features: ['HD Videos'],
    });
  });

  it('clears existing lesson video and optional fields cleanly when clearExistingVideo is set in edit mode', async () => {
    const payload = await buildLessonSavePayload({
      data: {
        title: '  Intro Lesson  ',
        description: '   ',
        type: LessonType.RECORDED,
        duration: 0,
        isFree: true,
      },
      videoType: 'upload',
      videoFile: null,
      videoLink: '',
      clearExistingVideo: true,
      existingLesson: { videoUrl: 'https://api.example.com/uploads/videos/old.mp4' },
      quizEnabled: false,
      quizQuestions: [],
      uploadService: { uploadVideo: async () => '/uploads/videos/new.mp4' },
      uploadProgressHandler: () => undefined,
      toastController: noopToast,
    });

    assert.deepEqual(payload, {
      title: 'Intro Lesson',
      description: null,
      type: LessonType.RECORDED,
      isFree: true,
      duration: null,
      videoUrl: null,
      quiz: null,
    });
  });

  it('avoids re-sending unchanged fileUrl when editing material metadata against normalized split-origin asset URL', async () => {
    setTestViteEnv({ VITE_API_URL: 'https://api.example.com/api/v1' });

    const payload = await buildMaterialSavePayload({
      data: {
        title: '  Updated Workbook  ',
        description: '',
        isDownloadable: true,
      },
      materialType: 'link',
      materialFile: null,
      materialLink: 'https://api.example.com/uploads/documents/workbook.pdf',
      existingMaterial: {
        fileUrl: 'https://api.example.com/uploads/documents/workbook.pdf',
        fileType: 'application/pdf',
        fileSize: 2048,
      },
      uploadService: {
        uploadDocument: async () => ({
          url: '/uploads/documents/new.pdf',
          size: 100,
          mimeType: 'application/pdf',
        }),
      },
      toastController: noopToast,
    });

    assert.deepEqual(payload, {
      title: 'Updated Workbook',
      description: null,
      isDownloadable: true,
    });
  });
});

describe('enrollment deduplication and support thread helpers', () => {
  it('selects the highest-progress / lifetime-access enrollment per course', () => {
    const makeEnrollment = (
      id: string,
      courseId: string,
      progress: number,
      expiresAt?: string
    ): Enrollment => ({
      id,
      userId: 'u-1',
      packageId: `pkg-${id}`,
      enrolledAt: '2026-01-01T00:00:00.000Z',
      expiresAt,
      progress,
      completedLessons: Math.round(progress / 10),
      isActive: true,
      package: {
        id: `pkg-${id}`,
        courseId,
        name: 'Standard',
        price: 50,
        finalPrice: 50,
        features: [],
        isActive: true,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
        course: {
          id: courseId,
          teacherProfileId: 'tp-1',
          title: `Course ${courseId}`,
          description: 'Desc',
          category: 'Tech',
          courseType: CourseType.RECORDED,
          rating: 5,
          totalStudents: 1,
          totalRevenue: 50,
          isPublished: true,
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
      },
    });

    const deduplicated = getPreferredCourseEnrollments([
      makeEnrollment('enr-old', 'course-a', 30, '2026-06-01T00:00:00.000Z'),
      makeEnrollment('enr-best', 'course-a', 80, undefined),
      makeEnrollment('enr-b1', 'course-b', 50, '2026-05-01T00:00:00.000Z'),
      makeEnrollment('enr-b2', 'course-b', 50, undefined), // lifetime wins tie on progress
    ]);

    assert.deepEqual(
      deduplicated.map((item) => item.id),
      ['enr-best', 'enr-b2']
    );
  });

  it('deduplicates mirrored initial support ticket description and validates attachment MIME/size', () => {
    const ticket: SupportTicket = {
      id: 't-1',
      ticketNo: 'SUP-1001',
      userId: 'u-student',
      subject: 'Refund inquiry',
      description: 'Need help with order #42',
      category: 'BILLING',
      priority: SupportTicketPriority.MEDIUM,
      status: SupportTicketStatus.OPEN,
      createdAt: '2026-02-01T10:00:00.000Z',
      updatedAt: '2026-02-01T10:05:00.000Z',
      messages: [
        {
          id: 'm-1',
          ticketId: 't-1',
          senderId: 'u-student',
          message: '  Need help with order #42 ',
          createdAt: '2026-02-01T10:00:01.000Z',
        },
        {
          id: 'm-2',
          ticketId: 't-1',
          senderId: 'u-admin',
          message: 'Checking this for you now.',
          createdAt: '2026-02-01T10:05:00.000Z',
        },
      ],
    };

    const entries = buildSupportConversationEntries(ticket);
    assert.equal(entries.length, 2);
    assert.equal(entries[0]?.kind, 'initial_request');
    assert.equal(entries[1]?.kind, 'message');

    assert.equal(
      validateSupportAttachmentFile({
        type: 'application/pdf',
        size: 1024,
      } as File),
      null
    );
    assert.match(
      validateSupportAttachmentFile({
        type: 'application/x-msdownload',
        size: 1024,
      } as File) ?? '',
      /Only JPG, PNG, WebP, and PDF/
    );
    assert.match(
      validateSupportAttachmentFile({
        type: 'image/png',
        size: 11 * 1024 * 1024,
      } as File) ?? '',
      /10MB or smaller/
    );
  });
});
