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
const AdminPanel = () => {
  const [activeTab, setActiveTab] = useState<
    'dashboard' | 'users' | 'courses' | 'reports' | 'refunds' | 'support' | 'verification-teachers'
  >('dashboard');

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊' },
    { id: 'users', label: 'Users', icon: '👥' },
    { id: 'verification-teachers', label: 'Verification Teachers', icon: '✅' },
    { id: 'courses', label: 'Courses', icon: '📚' },
    { id: 'reports', label: 'Reports', icon: '⚠️' },
    { id: 'refunds', label: 'Refunds', icon: '💰' },
    { id: 'support', label: 'Support', icon: '🎧' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50">
      <div className="container mx-auto px-4 py-8">
        {/* Tab Navigation */}
        <div className="flex flex-wrap gap-2 mb-8 pb-4 border-b-2 border-gray-200">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
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
