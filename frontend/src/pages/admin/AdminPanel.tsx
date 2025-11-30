import { useState } from 'react';
import AdminDashboard from './AdminDashboard';
import UsersManagement from './UsersManagement';
import CoursesManagement from './CoursesManagement';
import ReportsManagement from './ReportsManagement';
import RefundsManagement from './RefundsManagement';
import SupportTicketsManagement from './SupportTicketsManagement';
import VerificationTeachersManagement from './VerificationTeachersManagement';

/**
 * Admin Panel Component
 * Main admin interface with tabs for different management sections
 */
type TabId = 'dashboard' | 'users' | 'courses' | 'reports' | 'refunds' | 'support' | 'verification-teachers';

const AdminPanel = () => {
  const [activeTab, setActiveTab] = useState<TabId>('dashboard');

  const tabs: Array<{ id: TabId; label: string; icon: string }> = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊' },
    { id: 'users', label: 'Users', icon: '👥' },
    { id: 'verification-teachers', label: 'Verification Teachers', icon: '✅' },
    { id: 'courses', label: 'Courses', icon: '📚' },
    { id: 'reports', label: 'Reports', icon: '⚠️' },
    { id: 'refunds', label: 'Refunds', icon: '💰' },
    { id: 'support', label: 'Support', icon: '🎧' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-primary-50/10 to-indigo-50/20 relative">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.015)_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none"></div>
      
      {/* Decorative Elements */}
      <div className="absolute top-20 right-[10%] w-72 h-72 bg-primary-400/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-40 left-[5%] w-80 h-80 bg-indigo-400/10 rounded-full blur-3xl pointer-events-none"></div>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative">
        {/* Tab Navigation */}
        <div className="flex flex-wrap gap-2 mb-8 pb-4 border-b-2 border-gray-200 bg-white/50 backdrop-blur-sm rounded-xl p-4 shadow-sm">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-lg font-semibold transition-all flex items-center gap-2 ${
                activeTab === tab.id
                  ? 'bg-primary-600 text-white shadow-lg'
                  : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              <span>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div>
          {activeTab === 'dashboard' && <AdminDashboard />}
          {activeTab === 'users' && <UsersManagement />}
          {activeTab === 'verification-teachers' && <VerificationTeachersManagement />}
          {activeTab === 'courses' && <CoursesManagement />}
          {activeTab === 'reports' && <ReportsManagement />}
          {activeTab === 'refunds' && <RefundsManagement />}
          {activeTab === 'support' && <SupportTicketsManagement />}
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;
