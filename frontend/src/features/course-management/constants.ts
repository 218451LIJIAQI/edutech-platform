import type { CourseManagementTabId } from './types';

export const courseManagementTabs: Array<{
  id: CourseManagementTabId;
  label: string;
}> = [
  { id: 'overview', label: 'Overview' },
  { id: 'live', label: 'Live Teaching' },
  { id: 'notifications', label: 'Notifications' },
  { id: 'materials', label: 'Materials' },
  { id: 'recordings', label: 'Recordings' },
  { id: 'quizzes', label: 'Quiz Results' },
];
