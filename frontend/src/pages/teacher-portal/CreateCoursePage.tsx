import { useState, useEffect, useCallback } from 'react';
import clientLogger from '@/utils/logger';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Edit } from 'lucide-react';
import { Course, Lesson, LessonPackage, Material } from '@/types';
import courseService from '@/services/course.service';
import uploadService from '@/services/upload.service';
import ConfirmationModal from '@/components/common/ConfirmationModal';
import LessonModal from '@/components/teacher/LessonModal';
import PackageModal from '@/components/teacher/PackageModal';
import MaterialModal from '@/components/teacher/MaterialModal';
import toast from 'react-hot-toast';
import { extractErrorMessage } from '@/utils/error-handler';
import { isExternalMediaLink } from '@/features/course-editor/media-utils';
import {
  buildCourseSavePayload,
  buildDeleteDialogLabel,
  buildDeleteSuccessMessage,
} from '@/features/course-editor/course-persistence';
import { usePageTitle } from '@/hooks';
import CourseEditorHeader from '@/features/course-editor/header';
import CourseEditorTabsNav from '@/features/course-editor/tabs-nav';
import CourseEditorBasicTab from '@/features/course-editor/basic-tab';
import CourseEditorLessonsTab from '@/features/course-editor/lessons-tab';
import CourseEditorPackagesTab from '@/features/course-editor/packages-tab';
import CourseEditorMaterialsTab from '@/features/course-editor/materials-tab';
import type {
  CourseEditorTabId,
  CourseFormData,
  PendingDeleteItem,
} from '@/features/course-editor/types';

/**
 * Create/Edit Course Page
 * Teacher interface for creating and editing courses
 */
const CreateCoursePage = () => {
  const { courseId } = useParams<{ courseId?: string }>();
  const navigate = useNavigate();
  const isEditMode = !!courseId;
  usePageTitle(isEditMode ? 'Edit Course' : 'Create Course');

  const [course, setCourse] = useState<Course | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [packages, setPackages] = useState<LessonPackage[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [activeTab, setActiveTab] = useState<CourseEditorTabId>('basic');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [thumbnailType, setThumbnailType] = useState<'upload' | 'link'>('upload');
  const [thumbnailLink, setThumbnailLink] = useState('');
  const [thumbnailPreviewError, setThumbnailPreviewError] = useState(false);
  const [previewVideoFile, setPreviewVideoFile] = useState<File | null>(null);
  const [previewVideoType, setPreviewVideoType] = useState<'upload' | 'link'>('upload');
  const [previewVideoLink, setPreviewVideoLink] = useState('');
  const [showLessonModal, setShowLessonModal] = useState(false);
  const [showPackageModal, setShowPackageModal] = useState(false);
  const [showMaterialModal, setShowMaterialModal] = useState(false);
  const [editingLessonId, setEditingLessonId] = useState<string | undefined>();
  const [editingPackageId, setEditingPackageId] = useState<string | undefined>();
  const [editingMaterialId, setEditingMaterialId] = useState<string | undefined>();
  const [pendingDeleteItem, setPendingDeleteItem] = useState<PendingDeleteItem>(null);
  const [isDeletingItem, setIsDeletingItem] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<CourseFormData>();

  const fetchCourse = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await courseService.getCourseById(courseId!);
      setCourse(data);
      setLessons(data.lessons || []);
      setPackages(data.packages || []);
      setMaterials(data.materials || []);

      // Populate form
      setValue('title', data.title);
      setValue('description', data.description);
      setValue('category', data.category);
      setValue('courseType', data.courseType);
      setValue('thumbnail', data.thumbnail);
      setValue('previewVideoUrl', data.previewVideoUrl);

      if (isExternalMediaLink(data.thumbnail)) {
        setThumbnailType('link');
        setThumbnailLink(data.thumbnail ?? '');
        setThumbnailPreviewError(false);
      }

      if (isExternalMediaLink(data.previewVideoUrl)) {
        setPreviewVideoType('link');
        setPreviewVideoLink(data.previewVideoUrl ?? '');
      }
    } catch (error) {
      clientLogger.error('Failed to fetch course:', error);
      toast.error(extractErrorMessage(error, 'Failed to load course'));
    } finally {
      setIsLoading(false);
    }
  }, [courseId, setValue]);

  useEffect(() => {
    if (isEditMode && courseId) {
      fetchCourse();
    }
  }, [isEditMode, courseId, fetchCourse]);

  const onSubmit = async (data: CourseFormData) => {
    setIsSaving(true);
    try {
      const cleanData = await buildCourseSavePayload({
        data,
        media: {
          thumbnailType,
          thumbnailFile,
          thumbnailLink,
          previewVideoType,
          previewVideoFile,
          previewVideoLink,
        },
        uploadService,
        previewUploadToast: {
          show: toast.loading,
          dismiss: toast.dismiss,
        },
      });

      let savedCourse: Course;
      if (isEditMode) {
        savedCourse = await courseService.updateCourse(courseId!, cleanData);
        toast.success('Course updated successfully!');
      } else {
        savedCourse = await courseService.createCourse(cleanData);
        toast.success('Course created successfully!');
      }

      setCourse(savedCourse);
      if (!isEditMode && savedCourse.id) {
        navigate(`/teacher/courses/${savedCourse.id}/edit`);
      }
    } catch (error) {
      clientLogger.error('Failed to save course:', error);
      toast.error(extractErrorMessage(error, 'Failed to save course'));
    } finally {
      setIsSaving(false);
    }
  };

  const handlePublishToggle = async () => {
    if (!course) return;

    try {
      await courseService.updateCourse(course.id, {
        isPublished: !course.isPublished,
      });
      setCourse({ ...course, isPublished: !course.isPublished });
      toast.success(
        course.isPublished ? 'Course unpublished' : 'Course published successfully!'
      );
    } catch (error) {
      clientLogger.error('Failed to update course status:', error);
      toast.error(extractErrorMessage(error, 'Failed to update course status'));
    }
  };

  const handleAddLesson = () => {
    setEditingLessonId(undefined);
    setShowLessonModal(true);
  };

  const handleEditLesson = (lessonId: string) => {
    setEditingLessonId(lessonId);
    setShowLessonModal(true);
  };

  const handleDeleteItem = async () => {
    if (!pendingDeleteItem) {
      return;
    }

    setIsDeletingItem(true);
    try {
      if (pendingDeleteItem.kind === 'lesson') {
        await courseService.deleteLesson(pendingDeleteItem.id);
      } else if (pendingDeleteItem.kind === 'package') {
        await courseService.deletePackage(pendingDeleteItem.id);
      } else {
        await courseService.deleteMaterial(pendingDeleteItem.id);
      }

      toast.success(buildDeleteSuccessMessage(pendingDeleteItem.kind));

      await fetchCourse();
      setPendingDeleteItem(null);
    } catch (error) {
      clientLogger.error(`Failed to delete ${pendingDeleteItem.kind}:`, error);
      toast.error(
        extractErrorMessage(
          error,
          `Failed to delete ${pendingDeleteItem.kind}`
        )
      );
    } finally {
      setIsDeletingItem(false);
    }
  };

  const handleAddPackage = () => {
    setEditingPackageId(undefined);
    setShowPackageModal(true);
  };

  const handleEditPackage = (packageId: string) => {
    setEditingPackageId(packageId);
    setShowPackageModal(true);
  };

  const handleAddMaterial = () => {
    setEditingMaterialId(undefined);
    setShowMaterialModal(true);
  };

  const handleEditMaterial = (materialId: string) => {
    setEditingMaterialId(materialId);
    setShowMaterialModal(true);
  };

  const handleRequestDelete = (
    kind: Exclude<NonNullable<PendingDeleteItem>, null>['kind'],
    id: string,
    label: string
  ) => {
    setPendingDeleteItem({ kind, id, label });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-primary-50/10 to-indigo-50/20">
        <div className="flex flex-col items-center space-y-4">
          <div className="relative">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-500 to-indigo-600 animate-pulse flex items-center justify-center">
              <Edit className="w-8 h-8 text-white" />
            </div>
            <div className="absolute inset-0 rounded-2xl bg-primary-500/20 animate-ping"></div>
          </div>
          <p className="text-gray-600 font-medium">Loading course editor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-primary-50/10 to-indigo-50/20 py-8 relative">
      <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.015)_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none"></div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        <CourseEditorHeader
          isEditMode={isEditMode}
          isPublished={Boolean(course?.isPublished)}
          onBack={() => navigate('/teacher/courses')}
          onTogglePublish={handlePublishToggle}
        />

        <CourseEditorTabsNav
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />

        <div className="card shadow-xl border border-gray-100 rounded-2xl">
          {activeTab === 'basic' && (
            <CourseEditorBasicTab
              register={register}
              errors={errors}
              onSubmit={handleSubmit(onSubmit)}
              isSaving={isSaving}
              isEditMode={isEditMode}
              thumbnailType={thumbnailType}
              thumbnailLink={thumbnailLink}
              thumbnailPreviewError={thumbnailPreviewError}
              previewVideoType={previewVideoType}
              previewVideoLink={previewVideoLink}
              onCancel={() => navigate('/teacher/courses')}
              onThumbnailSourceTypeChange={(sourceType) => {
                setThumbnailType(sourceType);
                setThumbnailPreviewError(false);
                if (sourceType === 'upload') {
                  setThumbnailLink('');
                  return;
                }

                setThumbnailFile(null);
              }}
              onThumbnailLinkChange={setThumbnailLink}
              onThumbnailPreviewErrorChange={setThumbnailPreviewError}
              onThumbnailFileSelect={setThumbnailFile}
              onPreviewVideoSourceTypeChange={(sourceType) => {
                setPreviewVideoType(sourceType);
                if (sourceType === 'upload') {
                  setPreviewVideoLink('');
                  return;
                }

                setPreviewVideoFile(null);
              }}
              onPreviewVideoLinkChange={setPreviewVideoLink}
              onPreviewVideoFileSelect={setPreviewVideoFile}
            />
          )}

          {activeTab === 'lessons' && (
            <CourseEditorLessonsTab
              courseExists={Boolean(course)}
              lessons={lessons}
              onAddLesson={handleAddLesson}
              onEditLesson={handleEditLesson}
              onRequestDelete={(lessonId, lessonTitle) =>
                handleRequestDelete('lesson', lessonId, lessonTitle)
              }
            />
          )}

          {activeTab === 'packages' && (
            <CourseEditorPackagesTab
              courseExists={Boolean(course)}
              packages={packages}
              onAddPackage={handleAddPackage}
              onEditPackage={handleEditPackage}
              onRequestDelete={(packageId, packageName) =>
                handleRequestDelete('package', packageId, packageName)
              }
            />
          )}

          {activeTab === 'materials' && (
            <CourseEditorMaterialsTab
              courseExists={Boolean(course)}
              materials={materials}
              onAddMaterial={handleAddMaterial}
              onEditMaterial={handleEditMaterial}
              onRequestDelete={(materialId, materialTitle) =>
                handleRequestDelete('material', materialId, materialTitle)
              }
            />
          )}
        </div>

        {/* Modals */}
        {showLessonModal && course && (
          <LessonModal
            courseId={course.id}
            lessonId={editingLessonId}
            initialLesson={lessons.find((lesson) => lesson.id === editingLessonId)}
            onClose={() => setShowLessonModal(false)}
            onSuccess={fetchCourse}
          />
        )}

        {showPackageModal && course && (
          <PackageModal
            courseId={course.id}
            packageId={editingPackageId}
            initialPackage={packages.find((pkg) => pkg.id === editingPackageId)}
            onClose={() => setShowPackageModal(false)}
            onSuccess={fetchCourse}
          />
        )}

        {showMaterialModal && course && (
          <MaterialModal
            courseId={course.id}
            materialId={editingMaterialId}
            initialMaterial={materials.find((material) => material.id === editingMaterialId)}
            onClose={() => setShowMaterialModal(false)}
            onSuccess={fetchCourse}
          />
        )}

        <ConfirmationModal
          isOpen={Boolean(pendingDeleteItem)}
          title={
            pendingDeleteItem
              ? `Delete ${pendingDeleteItem.kind}`
              : 'Delete item'
          }
          description={
            pendingDeleteItem
              ? `Permanently delete "${pendingDeleteItem.label}". This action cannot be undone.`
              : ''
          }
          confirmLabel={
            buildDeleteDialogLabel(pendingDeleteItem)
          }
          tone="danger"
          isLoading={isDeletingItem}
          onClose={() => {
            if (!isDeletingItem) {
              setPendingDeleteItem(null);
            }
          }}
          onConfirm={handleDeleteItem}
        />
      </div>
    </div>
  );
};

export default CreateCoursePage;
