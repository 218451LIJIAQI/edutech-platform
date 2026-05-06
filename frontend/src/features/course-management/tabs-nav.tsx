import { courseManagementTabs } from './constants';
import type { CourseManagementTabId } from './types';

interface CourseManagementTabsNavProps {
  activeTab: CourseManagementTabId;
  onTabChange: (tab: CourseManagementTabId) => void;
}

export default function CourseManagementTabsNav({
  activeTab,
  onTabChange,
}: CourseManagementTabsNavProps) {
  return (
    <div className="flex items-center space-x-2 border-b border-gray-200 overflow-x-auto">
      {courseManagementTabs.map((tab) => (
        <button
          type="button"
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          aria-label={`${tab.label} course management tab`}
          aria-pressed={activeTab === tab.id}
          className={`px-6 py-4 font-medium transition-all whitespace-nowrap ${
            activeTab === tab.id
              ? 'text-primary-600 border-b-2 border-primary-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
