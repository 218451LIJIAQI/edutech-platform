import { useEffect, useState, useCallback, useRef } from 'react';
import { isAxiosError } from 'axios';
import clientLogger from '@/utils/logger';
import { AlertCircle, CheckCircle, Clock, RefreshCcw } from 'lucide-react';
import teacherService from '@/services/teacher.service';
import TeacherProfileCompletionForm from '@/components/teacher/TeacherProfileCompletionForm';
import { TeacherProfile } from '@/types';
import { usePageTitle, useTimeoutManager } from '@/hooks';
import { extractErrorMessage } from '@/utils/error-handler';
import {
  isApprovedTeacherProfileStatus,
  isPendingTeacherProfileStatus,
} from '@/utils/teacher-profile';

/**
 * Teacher Profile Completion Page
 * Allows teachers to complete and submit their extended profile for verification
 */
const ProfileCompletionPage = () => {
  usePageTitle('Complete Teacher Profile');
  const { setManagedTimeout } = useTimeoutManager();
  const [profile, setProfile] = useState<TeacherProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const requestIdRef = useRef(0);

  const hasPendingProfileSubmission = Boolean(profile?.hasPendingProfileSubmission);
  const pendingProfileSubmittedLabel = profile?.pendingProfileSubmittedAt
    ? new Date(profile.pendingProfileSubmittedAt).toLocaleDateString()
    : null;

  const fetchProfile = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    setIsLoading(true);
    try {
      const data = await teacherService.getExtendedProfile();
      if (requestId !== requestIdRef.current) {
        return;
      }
      setProfile(data);
      setErrorMessage('');
    } catch (error) {
      if (requestId !== requestIdRef.current) {
        return;
      }
      if (isAxiosError(error) && error.response?.status === 404) {
        setProfile(null);
        setErrorMessage('');
      } else {
        clientLogger.error('Failed to fetch profile:', error);
        setErrorMessage(extractErrorMessage(error, 'Failed to load your teacher profile'));
      }
    } finally {
      if (requestId === requestIdRef.current) {
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    void fetchProfile();
    return () => {
      requestIdRef.current += 1;
    };
  }, [fetchProfile]);

  const handleSuccess = useCallback((updatedProfile: TeacherProfile) => {
    setProfile(updatedProfile);
    const isApproved = isApprovedTeacherProfileStatus(updatedProfile.profileCompletionStatus);
    setSuccessMessage(
      isApproved
        ? 'Profile updated! Your changes have been queued for admin review.'
        : 'Profile submitted! Our admin team will review your information shortly.'
    );
    setErrorMessage('');
    setManagedTimeout(() => {
      void fetchProfile();
    }, 1000);
  }, [fetchProfile, setManagedTimeout]);

  const handleError = (error: string) => {
    setErrorMessage(error);
    setSuccessMessage('');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-primary-50/10 to-indigo-50/20">
        <div className="flex flex-col items-center space-y-4">
          <div className="relative">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-500 to-indigo-600 animate-pulse motion-reduce:animate-none flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-white" />
            </div>
            <div className="absolute inset-0 rounded-2xl bg-primary-500/20 animate-ping motion-reduce:animate-none"></div>
          </div>
          <p className="text-gray-600 font-medium">Loading profile...</p>
        </div>
      </div>
    );
  }

  const isApproved = isApprovedTeacherProfileStatus(profile?.profileCompletionStatus);
  const isPending = isPendingTeacherProfileStatus(profile?.profileCompletionStatus);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-primary-50/10 to-indigo-50/20 py-8 relative">
      <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.015)_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none"></div>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-primary-500/25">
              <CheckCircle className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-extrabold text-gray-900">
                Complete Your <span className="bg-gradient-to-r from-primary-600 to-indigo-600 bg-clip-text text-transparent">Profile</span>
              </h1>
              <p className="text-gray-500 font-medium">Provide detailed information to help students learn more about you</p>
            </div>
          </div>
        </div>

        {/* Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="card shadow-xl border border-gray-100 rounded-2xl">
            <div className="flex items-start space-x-3">
              {isApproved ? (
                <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
              ) : isPending ? (
                <Clock className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-1" />
              ) : (
                <AlertCircle className="w-6 h-6 text-gray-400 flex-shrink-0 mt-1" />
              )}
              <div>
                <h2 className="font-bold text-gray-900 text-base">Profile Status</h2>
                <p className="text-sm text-gray-600 mt-1">
                  {isApproved
                    ? 'Your profile is approved and visible to students'
                    : isPending
                    ? 'Your profile is under review'
                    : 'Your profile is incomplete'}
                </p>
              </div>
            </div>
          </div>

          <div className="card shadow-xl border border-gray-100 rounded-2xl">
            <div className="flex items-start space-x-3">
              {profile?.isVerified ? (
                <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
              ) : (
                <AlertCircle className="w-6 h-6 text-gray-400 flex-shrink-0 mt-1" />
              )}
              <div>
                <h2 className="font-bold text-gray-900 text-base">Verification Status</h2>
                <p className="text-sm text-gray-600 mt-1">
                  {profile?.isVerified
                    ? 'You are verified on the platform'
                    : 'You are not yet verified'}
                </p>
              </div>
            </div>
          </div>

          {profile?.profileSubmittedAt && (
            <div className="card shadow-xl border border-gray-100 rounded-2xl">
              <div className="flex items-start space-x-3">
                <Clock className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" />
                <div>
                  <h2 className="font-bold text-gray-900 text-base">Submitted</h2>
                  <p className="text-sm text-gray-600 mt-1 tabular-nums">
                    {new Date(profile.profileSubmittedAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {successMessage && (
          <div role="status" className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-start space-x-3">
            <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" />
            <div>
              <h2 className="font-bold text-green-900 text-base">Success</h2>
              <p className="text-sm text-green-800 mt-1">{successMessage}</p>
            </div>
          </div>
        )}

        {errorMessage && (
          <div role="alert" className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center justify-between gap-4">
            <div className="flex items-start space-x-3">
              <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <h2 className="font-bold text-red-900 text-base">Error</h2>
                <p className="text-sm text-red-800 mt-1">{errorMessage}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => void fetchProfile()}
              className="btn-outline btn-sm shrink-0 inline-flex items-center gap-1.5"
            >
              <RefreshCcw className="w-3.5 h-3.5" />
              Retry
            </button>
          </div>
        )}

        {profile?.profileReviewNotes && (
          <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <h2 className="font-bold text-yellow-900 text-base mb-2">Admin Review Notes</h2>
            <p className="text-sm text-yellow-800">{profile.profileReviewNotes}</p>
          </div>
        )}

        {hasPendingProfileSubmission && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-start space-x-3">
            <Clock className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <h2 className="font-bold text-blue-900 text-base">Pending Changes Under Review</h2>
              <p className="text-sm text-blue-800 mt-1">
                {pendingProfileSubmittedLabel
                  ? `Your latest profile changes were submitted on ${pendingProfileSubmittedLabel} and are waiting for admin review. Students still see your last approved profile until the new draft is approved.`
                  : 'Your latest profile changes are waiting for admin review. Students still see your last approved profile until the new draft is approved.'}
              </p>
            </div>
          </div>
        )}

        <TeacherProfileCompletionForm
          onSuccess={handleSuccess}
          onError={handleError}
          initialData={profile ?? undefined}
          isEditingApproved={isApproved}
        />

        {isApproved && (
          <div className="card shadow-lg bg-gradient-to-br from-green-50 to-green-100 border-2 border-green-200 mt-8">
            <div className="flex items-start space-x-4">
              <CheckCircle className="w-8 h-8 text-green-600 flex-shrink-0 mt-1" />
              <div>
                <h2 className="font-bold text-green-900 text-lg">Profile Approved</h2>
                <p className="text-sm text-green-800 mt-1">
                  {profile?.isVerified
                    ? 'Your profile has been approved and is now visible to students. Your teacher verification is also complete, so your verified badge is live.'
                    : 'Your profile has been approved and is now visible to students. Complete the separate verification flow to unlock your verified badge.'}
                </p>
                <p className="text-sm text-green-700 mt-2">
                  {hasPendingProfileSubmission
                    ? 'Your current public profile remains live while your latest changes are being reviewed.'
                    : 'You can update your profile information above. Changes will be reviewed by our admin team.'}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfileCompletionPage;
