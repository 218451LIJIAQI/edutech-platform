import { getNextHorizontalTabId } from '@/utils/helpers';
import { courseManagementTabs } from './constants';
import type { CourseManagementTabId } from './types';

const TAB_IDS = courseManagementTabs.map((item) => item.id);

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
      {courseManagementTabs.map((tab) => {
        const isSelected = activeTab === tab.id;
        return (
          <button
            type="button"
            key={tab.id}
            id={`course-mgmt-tab-${tab.id}`}
            role="tab"
            aria-selected={isSelected}
            aria-controls={`course-mgmt-panel-${tab.id}`}
            tabIndex={isSelected ? 0 : -1}
            onClick={() => onTabChange(tab.id)}
            onKeyDown={(event) => {
              const nextTab = getNextHorizontalTabId(TAB_IDS, activeTab, event.key);
              if (nextTab) {
                event.preventDefault();
                onTabChange(nextTab);
                document.getElementById(`course-mgmt-tab-${nextTab}`)?.focus();
              }
            }}
            className={`px-6 py-4 font-medium transition-all whitespace-nowrap ${
              isSelected
                ? 'text-primary-600 border-b-2 border-primary-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
