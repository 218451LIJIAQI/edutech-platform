import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, CheckCircle, Clock } from 'lucide-react';
import teacherService from '@/services/teacher.service';
import TeacherProfileCompletionForm from '@/components/teacher/TeacherProfileCompletionForm';
import { TeacherProfile } from '@/types';

/**
 * Teacher Profile Completion Page
 * Allows teachers to complete and submit their extended profile for verification
 */
const ProfileCompletionPage = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<TeacherProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    fetchProfile();
  }, []);

  /**
   * Fetch teacher's extended profile
   */
  const fetchProfile = async () => {
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
  };

  /**
   * Handle successful profile submission
   */
  const handleSuccess = (updatedProfile: TeacherProfile) => {
    setProfile(updatedProfile);
    const isApproved = profile?.profileCompletionStatus === 'APPROVED';
    setSuccessMessage(
      isApproved 
        ? 'Profile updated successfully! Your changes will be reviewed by our admin team.'
        : 'Profile submitted successfully! It will be reviewed by our admin team.'
    );
    setErrorMessage('');
    // Refresh profile data
    setTimeout(() => {
      fetchProfile();
    }, 1000);
  };

  /**
   * Handle submission error
   */
  const handleError = (error: string) => {
    setErrorMessage(error);
    setSuccessMessage('');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50">
        <div className="flex flex-col items-center space-y-4">
          <div className="spinner"></div>
          <p className="text-gray-600 font-medium">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50 py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Complete Your Profile
          </h1>
          <p className="text-lg text-gray-600">
            Provide detailed information about yourself to help students learn more about you
          </p>
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
          initialData={profile}
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

