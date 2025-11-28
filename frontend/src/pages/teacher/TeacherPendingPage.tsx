import { ShieldAlert, Clock, Mail } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';

/**
 * Teacher Pending Page
 * Shown when teacher registration is pending approval
 */
const TeacherPendingPage = () => {
  const { user } = useAuthStore();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50 px-4">
      <div className="card max-w-xl text-center shadow-2xl border border-gray-100 rounded-2xl">
        <div className="mx-auto w-16 h-16 rounded-2xl bg-yellow-100 border-2 border-yellow-300 flex items-center justify-center mb-4">
          <ShieldAlert className="w-8 h-8 text-yellow-700" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Registration Pending</h1>
        <p className="text-gray-700 mb-6">
          Your teacher registration is currently under review. Once approved by our admin team, you will gain access to the teacher dashboard.
        </p>
        <div className="flex items-center justify-center gap-2 text-gray-600 mb-6">
          <Clock className="w-4 h-4" />
          <span>Typical review time: 1-2 business days</span>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-left">
          <div className="flex items-center gap-2 text-blue-800 font-semibold mb-1">
            <Mail className="w-4 h-4" />
            Contact Support
          </div>
          <p className="text-sm text-blue-800">
            If you believe this is a mistake or your approval is urgent, please contact support with your registered email {user?.email}.
          </p>
        </div>
      </div>
    </div>
  );
};

export default TeacherPendingPage;

