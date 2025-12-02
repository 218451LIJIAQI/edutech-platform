import { ShieldAlert, Clock, Mail } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';

/**
 * Teacher Pending Page
 * Shown when teacher registration is pending approval
 */
const TeacherPendingPage = () => {
  const { user } = useAuthStore();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-primary-50/10 to-indigo-50/20 px-4 relative">
      <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.015)_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none"></div>
      <div className="card max-w-xl text-center shadow-2xl border border-gray-100 rounded-2xl relative bg-white/80 backdrop-blur-sm">
        <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center mb-4 shadow-lg shadow-yellow-500/25">
          <ShieldAlert className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-2xl font-extrabold text-gray-900 mb-2">
          Registration <span className="bg-gradient-to-r from-yellow-600 to-orange-600 bg-clip-text text-transparent">Pending</span>
        </h1>
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
