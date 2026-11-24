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
    <div
      role="tablist"
      aria-label="Course management sections"
      className="flex items-center space-x-2 border-b border-gray-200 overflow-x-auto"
    >
      {courseManagementTabs.map((tab) => (
        <button
          type="button"
          role="tab"
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          aria-selected={activeTab === tab.id}
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
