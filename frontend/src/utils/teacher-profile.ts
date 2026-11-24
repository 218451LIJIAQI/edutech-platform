const PROFILE_STATUS_INCOMPLETE = 'INCOMPLETE';
const PROFILE_STATUS_PENDING_REVIEW = 'PENDING_REVIEW';
const PROFILE_STATUS_APPROVED = 'APPROVED';
const LEGACY_PROFILE_STATUS_COMPLETE = 'COMPLETE';

export const normalizeTeacherProfileCompletionStatus = (
  status?: string | null
): string => {
  if (status === LEGACY_PROFILE_STATUS_COMPLETE) {
    return PROFILE_STATUS_APPROVED;
  }

  return status ?? PROFILE_STATUS_INCOMPLETE;
};

export const isApprovedTeacherProfileStatus = (status?: string | null): boolean =>
  normalizeTeacherProfileCompletionStatus(status) === PROFILE_STATUS_APPROVED;

export const isPendingTeacherProfileStatus = (status?: string | null): boolean =>
  normalizeTeacherProfileCompletionStatus(status) === PROFILE_STATUS_PENDING_REVIEW;
