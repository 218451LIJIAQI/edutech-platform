import { courseEditorTabs } from './constants';
import type { CourseEditorTabId } from './types';

interface CourseEditorTabsNavProps {
  activeTab: CourseEditorTabId;
  onTabChange: (tab: CourseEditorTabId) => void;
}

export default function CourseEditorTabsNav({
  activeTab,
  onTabChange,
}: CourseEditorTabsNavProps) {
  return (
    <div className="mb-8">
      <div className="rounded-2xl border-2 border-gray-200 bg-white p-2 shadow-xl transition-all hover:border-primary-200">
        <nav
          className="flex gap-2 overflow-x-auto"
          aria-label="Course editor sections"
          role="tablist"
        >
          {courseEditorTabs.map((tab) => {
            const isActive = activeTab === tab.id;
            const Icon = tab.icon;

            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                aria-current={isActive ? 'page' : undefined}
                onClick={() => onTabChange(tab.id)}
                className={`flex shrink-0 items-center gap-2 rounded-xl px-5 py-3 text-sm font-bold transition-all focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 ${
                  isActive
                    ? 'bg-gradient-to-r from-primary-600 to-primary-700 text-white shadow-lg'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-primary-600'
                }`}
              >
                <Icon className="h-5 w-5" aria-hidden="true" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
