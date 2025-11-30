import { useEffect, useState, useCallback } from 'react';
import { AlertCircle, CheckCircle, Clock } from 'lucide-react';
import teacherService from '@/services/teacher.service';
import TeacherProfileCompletionForm from '@/components/teacher/TeacherProfileCompletionForm';
import { TeacherProfile } from '@/types';

/**
 * Teacher Profile Completion Page
 * Allows teachers to complete and submit their extended profile for verification
 */
const ProfileCompletionPage = () => {
  const [profile, setProfile] = useState<TeacherProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  /**
   * Fetch teacher's extended profile
   */
  const fetchProfile = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await teacherService.getExtendedProfile();
      setProfile(data);
    } catch (error) {
      console.error('Failed to fetch profile:', error);
      // Profile might not exist yet, which is fine
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  /**
   * Handle successful profile submission
   */
  const handleSuccess = useCallback((updatedProfile: TeacherProfile) => {
    setProfile(updatedProfile);
    const isApproved = updatedProfile.profileCompletionStatus === 'APPROVED';
    setSuccessMessage(
      isApproved 
        ? 'Profile updated successfully! Your changes will be reviewed by our admin team.'
        : 'Profile submitted successfully! It will be reviewed by our admin team.'
    );
    setErrorMessage('');
    // Refresh profile data after a short delay to ensure backend has processed
    setTimeout(() => {
      fetchProfile();
    }, 1000);
  }, [fetchProfile]);

  /**
   * Handle submission error
   */
  const handleError = (error: string) => {
    setErrorMessage(error);
    setSuccessMessage('');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-primary-50/10 to-indigo-50/20">
        <div className="flex flex-col items-center space-y-4">
          <div className="relative">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-500 to-indigo-600 animate-pulse flex items-center justify-center">
              <span className="text-2xl">👤</span>
            </div>
            <div className="absolute inset-0 rounded-2xl bg-primary-500/20 animate-ping"></div>
          </div>
          <p className="text-gray-600 font-medium">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-primary-50/10 to-indigo-50/20 py-8 relative">
      <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.015)_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none"></div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 max-w-4xl relative">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-primary-500/25">
              <CheckCircle className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">
                Complete Your <span className="bg-gradient-to-r from-primary-600 to-indigo-600 bg-clip-text text-transparent">Profile</span>
              </h1>
              <p className="text-gray-500 font-medium">Provide detailed information to help students learn more about you</p>
            </div>
          </div>
        </div>

        {/* Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {/* Profile Status */}
          <div className="card shadow-xl border border-gray-100 rounded-2xl">
            <div className="flex items-start space-x-3">
              {profile?.profileCompletionStatus === 'APPROVED' ? (
                <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
              ) : profile?.profileCompletionStatus === 'PENDING_REVIEW' ? (
                <Clock className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-1" />
              ) : (
                <AlertCircle className="w-6 h-6 text-gray-400 flex-shrink-0 mt-1" />
              )}
              <div>
                <h3 className="font-bold text-gray-900">Profile Status</h3>
                <p className="text-sm text-gray-600 mt-1">
                  {profile?.profileCompletionStatus === 'APPROVED'
                    ? 'Your profile is approved and visible to students'
                    : profile?.profileCompletionStatus === 'PENDING_REVIEW'
                    ? 'Your profile is under review'
                    : 'Your profile is incomplete'}
                </p>
              </div>
            </div>
          </div>

          {/* Verification Status */}
          <div className="card shadow-xl border border-gray-100 rounded-2xl">
            <div className="flex items-start space-x-3">
              {profile?.isVerified ? (
                <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
              ) : (
                <AlertCircle className="w-6 h-6 text-gray-400 flex-shrink-0 mt-1" />
              )}
              <div>
                <h3 className="font-bold text-gray-900">Verification Status</h3>
                <p className="text-sm text-gray-600 mt-1">
                  {profile?.isVerified
                    ? 'You are verified on the platform'
                    : 'You are not yet verified'}
                </p>
              </div>
            </div>
          </div>

          {/* Submitted Date */}
          {profile?.profileSubmittedAt && (
            <div className="card shadow-xl border border-gray-100 rounded-2xl">
              <div className="flex items-start space-x-3">
                <Clock className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-bold text-gray-900">Submitted</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    {new Date(profile.profileSubmittedAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Success Message */}
        {successMessage && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-start space-x-3">
            <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-bold text-green-900">Success</h3>
              <p className="text-sm text-green-800 mt-1">{successMessage}</p>
            </div>
          </div>
        )}

        {/* Error Message */}
        {errorMessage && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start space-x-3">
            <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-bold text-red-900">Error</h3>
              <p className="text-sm text-red-800 mt-1">{errorMessage}</p>
            </div>
          </div>
        )}

        {/* Review Notes */}
        {profile?.profileReviewNotes && (
          <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <h3 className="font-bold text-yellow-900 mb-2">Admin Review Notes</h3>
            <p className="text-sm text-yellow-800">{profile.profileReviewNotes}</p>
          </div>
        )}

        {/* Form - Show for both incomplete and approved profiles */}
        <TeacherProfileCompletionForm
          onSuccess={handleSuccess}
          onError={handleError}
          initialData={profile ?? undefined}
          isEditingApproved={profile?.profileCompletionStatus === 'APPROVED'}
        />

        {/* Approved Message - Show below form when approved */}
        {profile?.profileCompletionStatus === 'APPROVED' && (
          <div className="card shadow-lg bg-gradient-to-br from-green-50 to-green-100 border-2 border-green-200 mt-8">
            <div className="flex items-start space-x-4">
              <CheckCircle className="w-8 h-8 text-green-600 flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-bold text-green-900 text-lg">Profile Approved!</h3>
                <p className="text-sm text-green-800 mt-1">
                  Your profile has been approved and is now visible to students. You have received a verified badge!
                </p>
                <p className="text-sm text-green-700 mt-2">
                  You can update your profile information below. Changes will be reviewed by our admin team.
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

