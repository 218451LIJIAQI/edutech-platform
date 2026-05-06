import type {
  AdCampaign,
  CartSummary,
  Course,
  Lesson,
  LessonPackage,
  Material,
  Order,
  OrderItem,
  Payment,
  Refund,
  SupportTicket,
  SupportTicketMessage,
  TeacherProfile,
  TeacherVerification,
  User,
} from '@/types';
import { getApiBaseUrl, resolveBackendAssetUrl } from './runtime';

const NON_HTTP_SCHEME_PATTERN = /^[a-z][a-z0-9+.-]*:/i;
const SUPPORT_ATTACHMENT_UPLOAD_PATH = '/uploads/support-attachments/';
const LEGACY_TEACHER_PROFILE_STATUS_COMPLETE = 'COMPLETE';
const APPROVED_TEACHER_PROFILE_STATUS = 'APPROVED';

const normalizeTeacherProfileCompletionStatus = (
  status?: string
): string | undefined =>
  status === LEGACY_TEACHER_PROFILE_STATUS_COMPLETE
    ? APPROVED_TEACHER_PROFILE_STATUS
    : status;

export const toFiniteNumber = (value: unknown, fallback = 0): number => {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : fallback;
  }

  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  return fallback;
};

export const toOptionalFiniteNumber = (
  value: unknown
): number | undefined => {
  if (value === null || value === undefined || value === '') {
    return undefined;
  }

  return toFiniteNumber(value);
};

export const normalizeAssetUrl = (value?: string): string | undefined => {
  if (!value) {
    return undefined;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }

  if (/^[\[{]/.test(trimmed)) {
    return undefined;
  }

  if (NON_HTTP_SCHEME_PATTERN.test(trimmed) && !/^https?:/i.test(trimmed)) {
    return undefined;
  }

  return resolveBackendAssetUrl(trimmed);
};

export const normalizeAssetUrlList = (
  value?: string[] | string
): string[] | undefined => {
  let values: string[];

  if (!value) {
    return undefined;
  }

  if (Array.isArray(value)) {
    values = value;
  } else {
    const trimmed = value.trim();

    if (!trimmed) {
      return undefined;
    }

    if (/^\[/.test(trimmed)) {
      try {
        const parsed = JSON.parse(trimmed) as unknown;
        values = Array.isArray(parsed)
          ? parsed.filter((item): item is string => typeof item === 'string')
          : [];
      } catch {
        values = [];
      }
    } else {
      values = [trimmed];
    }
  }

  const normalizedValues = values
    .map((item) => normalizeAssetUrl(item))
    .filter((item): item is string => Boolean(item));

  return normalizedValues.length > 0 ? normalizedValues : undefined;
};

const normalizeUserAvatarOnly = (user?: User): User | undefined =>
  user
    ? {
        ...user,
        avatar: normalizeAssetUrl(user.avatar),
      }
    : user;

const isSupportAttachmentUploadPath = (value?: string): boolean => {
  if (!value) {
    return false;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return false;
  }

  if (trimmed.startsWith(SUPPORT_ATTACHMENT_UPLOAD_PATH)) {
    return true;
  }

  if (!/^https?:\/\//i.test(trimmed)) {
    return false;
  }

  try {
    return new URL(trimmed).pathname.startsWith(SUPPORT_ATTACHMENT_UPLOAD_PATH);
  } catch {
    return false;
  }
};

const getAttachmentFileName = (value: string): string | undefined => {
  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }

  const withoutQuery = trimmed.split(/[?#]/, 1)[0] ?? trimmed;
  const lastSegment = withoutQuery.split('/').filter(Boolean).at(-1);

  return lastSegment || undefined;
};

const buildSupportAttachmentAccessUrl = (
  messageId: string,
  attachmentUrl: string
): string => {
  const fileName = getAttachmentFileName(attachmentUrl);
  const fileNameQuery = fileName
    ? `?filename=${encodeURIComponent(fileName)}`
    : '';

  return resolveBackendAssetUrl(
    `${getApiBaseUrl()}/support/messages/${messageId}/attachment${fileNameQuery}`
  );
};

export const normalizeSupportMessageAssets = (
  message: SupportTicketMessage
): SupportTicketMessage => {
  const attachment = message.attachment;
  const normalizedAttachment = attachment?.trim();

  return {
    ...message,
    attachment: normalizedAttachment && isSupportAttachmentUploadPath(normalizedAttachment)
      ? buildSupportAttachmentAccessUrl(message.id, normalizedAttachment)
      : normalizeAssetUrl(attachment),
    sender: normalizeUserAvatarOnly(message.sender),
  };
};

export const normalizeSupportTicketAssets = (
  ticket: SupportTicket
): SupportTicket => ({
  ...ticket,
  user: normalizeUserAvatarOnly(ticket.user),
  messages: ticket.messages?.map(normalizeSupportMessageAssets),
});

export const normalizeTeacherProfileAssets = (
  profile?: TeacherProfile
): TeacherProfile | undefined =>
  profile
    ? {
        ...profile,
        profileCompletionStatus: normalizeTeacherProfileCompletionStatus(
          profile.profileCompletionStatus
        ),
        hourlyRate: toOptionalFiniteNumber(profile.hourlyRate),
        totalStudents: toFiniteNumber(profile.totalStudents),
        averageRating: toFiniteNumber(profile.averageRating),
        totalEarnings: toFiniteNumber(profile.totalEarnings),
        commissionRate: toOptionalFiniteNumber(profile.commissionRate),
        profilePhoto: normalizeAssetUrl(profile.profilePhoto),
        certificatePhotos: normalizeAssetUrlList(profile.certificatePhotos),
        user: normalizeUserAvatarOnly(profile.user),
        certifications: profile.certifications?.map((certification) => ({
          ...certification,
          credentialUrl: normalizeAssetUrl(certification.credentialUrl),
        })),
      }
    : profile;

export const getTeacherDisplayPhoto = (profile?: TeacherProfile): string | undefined =>
  profile?.profilePhoto || profile?.user?.avatar;

export const normalizeUserAssets = (user?: User): User | undefined =>
  user
    ? {
        ...user,
        avatar: normalizeAssetUrl(user.avatar),
        teacherProfile: normalizeTeacherProfileAssets(user.teacherProfile),
      }
    : user;

export const normalizeLessonAssets = (lesson: Lesson): Lesson => ({
  ...lesson,
  duration: toOptionalFiniteNumber(lesson.duration),
  orderIndex: toFiniteNumber(lesson.orderIndex),
  videoUrl: normalizeAssetUrl(lesson.videoUrl),
});

export const normalizeLessonPackage = <T extends LessonPackage & { course?: Course }>(
  lessonPackage: T
): T => ({
  ...lessonPackage,
  price: toFiniteNumber(lessonPackage.price),
  discount: toOptionalFiniteNumber(lessonPackage.discount),
  finalPrice: toFiniteNumber(lessonPackage.finalPrice),
  duration: toOptionalFiniteNumber(lessonPackage.duration),
  maxStudents: toOptionalFiniteNumber(lessonPackage.maxStudents),
  course: lessonPackage.course
    ? normalizeCourseAssets(lessonPackage.course)
    : lessonPackage.course,
});

export const normalizeMaterialAssets = (material: Material): Material => ({
  ...material,
  fileSize: toFiniteNumber(material.fileSize),
  fileUrl: material.fileUrl,
  accessUrl: normalizeAssetUrl(material.accessUrl),
});

export const normalizeAdAssets = (ad: AdCampaign): AdCampaign => ({
  ...ad,
  imageUrl: normalizeAssetUrl(ad.imageUrl ?? undefined),
});

export const normalizeCourseAssets = (course: Course): Course => ({
  ...course,
  thumbnail: normalizeAssetUrl(course.thumbnail),
  previewVideoUrl: normalizeAssetUrl(course.previewVideoUrl),
  teacherProfile: normalizeTeacherProfileAssets(course.teacherProfile),
  lessons: course.lessons?.map(normalizeLessonAssets),
  packages: course.packages?.map(normalizeLessonPackage),
  materials: course.materials?.map(normalizeMaterialAssets),
});

export const normalizeTeacherVerificationAssets = (
  verification: TeacherVerification
): TeacherVerification => ({
  ...verification,
  documentUrl: normalizeAssetUrl(verification.documentUrl) ?? '',
  accessUrl: normalizeAssetUrl(verification.accessUrl),
});

export const normalizePayment = <T extends Payment>(payment: T): T => ({
  ...payment,
  amount: toFiniteNumber(payment.amount),
  platformCommission: toFiniteNumber(payment.platformCommission),
  teacherEarning: toFiniteNumber(payment.teacherEarning),
});

export const normalizeOrderItem = (item: OrderItem): OrderItem => ({
  ...item,
  price: toFiniteNumber(item.price),
  discount: toOptionalFiniteNumber(item.discount),
  finalPrice: toFiniteNumber(item.finalPrice),
  package: item.package ? normalizeLessonPackage(item.package) : item.package,
});

export const normalizeOrder = (order: Order): Order => ({
  ...order,
  totalAmount: toFiniteNumber(order.totalAmount),
  refundAmount: toOptionalFiniteNumber(order.refundAmount),
  items: order.items?.map(normalizeOrderItem),
});

export const normalizeRefund = (refund: Refund): Refund => ({
  ...refund,
  amount: toFiniteNumber(refund.amount),
  order: refund.order ? normalizeOrder(refund.order) : refund.order,
});

export const normalizeCartSummary = (summary: CartSummary): CartSummary => ({
  ...summary,
  totalAmount: toFiniteNumber(summary.totalAmount),
  items: summary.items.map((item) => ({
    ...item,
    package: item.package ? normalizeLessonPackage(item.package) : item.package,
  })),
});
