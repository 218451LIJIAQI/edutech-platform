import { Link, Navigate } from 'react-router-dom';
import { ShieldAlert, Clock, Mail, XCircle, ArrowRight } from 'lucide-react';
import { useAuthStore } from '@/store/auth-store';
import { RegistrationStatus } from '@/types';
import PageLoader from '@/components/common/PageLoader';
import { usePageTitle } from '@/hooks';

/**
 * Teacher Pending Page
 * Shown when teacher registration is pending approval
 */
const TeacherPendingPage = () => {
  usePageTitle('Teacher Registration Status');
  const { user, isProfileHydrating } = useAuthStore();
  const teacherProfile = user?.teacherProfile;
  if (!teacherProfile) {
    if (isProfileHydrating) {
      return <PageLoader message="Restoring teacher profile..." />;
    }

    return <Navigate to="/teacher/profile-completion" replace />;
  }

  const registrationStatus = teacherProfile.registrationStatus;
  const isRejected = registrationStatus === RegistrationStatus.REJECTED;

  if (registrationStatus === RegistrationStatus.APPROVED) {
    return <Navigate to="/teacher" replace />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-primary-50/10 to-indigo-50/20 px-4 relative">
      <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.015)_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none"></div>
      <div className="card max-w-xl text-center shadow-2xl border border-gray-100 rounded-2xl relative bg-white/80 backdrop-blur-sm">
        <div className={`mx-auto w-16 h-16 rounded-2xl flex items-center justify-center mb-4 shadow-lg ${
          isRejected
            ? 'bg-gradient-to-br from-red-500 to-rose-600 shadow-red-500/25'
            : 'bg-gradient-to-br from-yellow-400 to-orange-500 shadow-yellow-500/25'
        }`}>
          {isRejected ? (
            <XCircle className="w-8 h-8 text-white" />
          ) : (
            <ShieldAlert className="w-8 h-8 text-white" />
          )}
        </div>
        <h1 className="text-2xl font-extrabold text-gray-900 mb-2">
          Registration{' '}
          <span className={`bg-gradient-to-r bg-clip-text text-transparent ${
            isRejected
              ? 'from-red-600 to-rose-600'
              : 'from-yellow-600 to-orange-600'
          }`}>
            {isRejected ? 'Rejected' : 'Pending'}
          </span>
        </h1>
        <p className="text-gray-700 mb-6">
          {isRejected
            ? 'Your teacher registration was not approved. Please review your submitted information, update anything inaccurate, and resubmit before accessing the teacher dashboard.'
            : 'Your teacher registration is currently under review. Once approved by our admin team, you will gain access to the teacher dashboard.'}
        </p>
        <div className="flex items-center justify-center gap-2 text-gray-600 mb-6">
          {isRejected ? <XCircle className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
          <span>
            {isRejected ? 'Action required before teacher access can be restored' : 'Typical review time: 1-2 business days'}
          </span>
        </div>
        <div className={`rounded-lg p-4 text-left ${
          isRejected
            ? 'bg-red-50 border border-red-200'
            : 'bg-blue-50 border border-blue-200'
        }`}>
          <div className={`flex items-center gap-2 font-semibold mb-1 ${
            isRejected ? 'text-red-800' : 'text-blue-800'
          }`}>
            <Mail className="w-4 h-4" />
            {isRejected ? 'Need to resubmit?' : 'Contact Support'}
          </div>
          <p className={`text-sm ${isRejected ? 'text-red-800' : 'text-blue-800'}`}>
            {isRejected
              ? `Update your profile or verification documents, then contact support if you need clarification. Use your registered email ${user?.email}.`
              : `If you believe this is a mistake or your approval is urgent, please contact support with your registered email ${user?.email}.`}
          </p>
        </div>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
          {isRejected ? (
            <Link to="/teacher/profile-completion" className="btn-primary inline-flex items-center justify-center">
              Update Profile
              <ArrowRight className="w-4 h-4 ml-2" />
            </Link>
          ) : null}
          <Link to="/teacher/verification" className="btn-outline inline-flex items-center justify-center">
            Review Verification
          </Link>
        </div>
      </div>
    </div>
  );
};

export default TeacherPendingPage;
