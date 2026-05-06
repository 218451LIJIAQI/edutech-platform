export const PROFILE_STATUS_INCOMPLETE = 'INCOMPLETE';
export const PROFILE_STATUS_PENDING_REVIEW = 'PENDING_REVIEW';
export const PROFILE_STATUS_APPROVED = 'APPROVED';
export const LEGACY_PROFILE_STATUS_COMPLETE = 'COMPLETE';

export const normalizeTeacherProfileCompletionStatus = (
  status?: string | null
): string => {
  if (status === LEGACY_PROFILE_STATUS_COMPLETE) {
    return PROFILE_STATUS_APPROVED;
  }

  return status ?? PROFILE_STATUS_INCOMPLETE;
};
