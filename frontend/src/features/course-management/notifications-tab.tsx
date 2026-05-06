import { Bell, Send } from 'lucide-react';
import type { NotificationDispatchSummary } from './types';

interface CourseManagementNotificationsTabProps {
  title: string;
  message: string;
  isSending: boolean;
  onTitleChange: (value: string) => void;
  onMessageChange: (value: string) => void;
  onSend: () => void;
  lastDispatch: NotificationDispatchSummary | null;
}

export default function CourseManagementNotificationsTab({
  title,
  message,
  isSending,
  onTitleChange,
  onMessageChange,
  onSend,
  lastDispatch,
}: CourseManagementNotificationsTabProps) {
  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-blue-50 to-blue-100 border-2 border-blue-200 p-6 rounded-lg">
        <h3 className="text-lg font-bold text-blue-900 mb-4 flex items-center space-x-2">
          <Bell className="w-5 h-5" />
          <span>Send Notification to All Students</span>
        </h3>

        <div className="space-y-4">
          <div>
            <label htmlFor="course-notification-title" className="block text-sm font-medium text-gray-700 mb-2">
              Notification Title
            </label>
            <input
              id="course-notification-title"
              type="text"
              value={title}
              onChange={(event) => onTitleChange(event.target.value)}
              placeholder="e.g., New Class Schedule, New Course Material, etc."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>

          <div>
            <label htmlFor="course-notification-message" className="block text-sm font-medium text-gray-700 mb-2">
              Message
            </label>
            <textarea
              id="course-notification-message"
              value={message}
              onChange={(event) => onMessageChange(event.target.value)}
              placeholder="Write your notification message here..."
              rows={5}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>

          <button
            type="button"
            onClick={onSend}
            disabled={isSending}
            className="btn-primary flex items-center space-x-2 w-full justify-center"
          >
            <Send className="w-4 h-4" />
            <span>{isSending ? 'Sending...' : 'Send Notification'}</span>
          </button>
        </div>
      </div>

      <div className="bg-gray-50 p-6 rounded-lg">
        <h4 className="font-bold text-gray-900 mb-4">Notification History</h4>
        {lastDispatch ? (
          <div className="space-y-3 text-sm text-gray-700">
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold text-gray-900">{lastDispatch.title}</span>
                <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700">
                  Last dispatch this session
                </span>
              </div>
              <p className="mt-2 whitespace-pre-wrap text-gray-600">{lastDispatch.message}</p>
              <div className="mt-3 flex flex-wrap gap-3 text-xs text-gray-500">
                <span>Recipients: {lastDispatch.recipients}</span>
                <span>{new Date(lastDispatch.sentAt).toLocaleString()}</span>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-gray-600">
            This panel shows the most recent notification dispatch from your current session. Send an announcement to preview it here.
          </p>
        )}
      </div>
    </div>
  );
}
