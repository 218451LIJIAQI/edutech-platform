import { useState, useEffect } from 'react';
import { X, AlertCircle } from 'lucide-react';
import { ReportType } from '@/types';
import reportService from '@/services/report.service';
import toast from 'react-hot-toast';

interface ReportSubmissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  reportedId: string;
  reportedName?: string;
  contentType?: 'teacher' | 'course' | 'community_post' | 'community_comment';
  contentId?: string;
  onSuccess?: () => void;
}

/**
 * Report Submission Modal Component
 * Allows students to submit reports for teachers, courses, or community content
 */
const ReportSubmissionModal = ({
  isOpen,
  onClose,
  reportedId,
  reportedName,
  contentType,
  contentId,
  onSuccess,
}: ReportSubmissionModalProps) => {
  const [reportType, setReportType] = useState<ReportType>(ReportType.QUALITY_ISSUE);
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setReportType(ReportType.QUALITY_ISSUE);
      setDescription('');
      setIsSubmitting(false);
    }
  }, [isOpen]);

  const reportTypeOptions = [
    {
      value: ReportType.QUALITY_ISSUE,
      label: 'Quality Issue',
      description: 'Course content is incorrect, outdated, or misleading',
    },
    {
      value: ReportType.INAPPROPRIATE_CONTENT,
      label: 'Inappropriate Content',
      description: 'Contains offensive, abusive, or inappropriate material',
    },
    {
      value: ReportType.FRAUD,
      label: 'Fraud',
      description: 'Suspicious activity or fraudulent behavior',
    },
    {
      value: ReportType.TECHNICAL_ISSUE,
      label: 'Technical Issue',
      description: 'Video not playing, materials not accessible, etc.',
    },
    {
      value: ReportType.OTHER,
      label: 'Other',
      description: 'Other issues not covered above',
    },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (description.trim().length < 20) {
      toast.error('Description must be at least 20 characters');
      return;
    }

    if (description.trim().length > 1000) {
      toast.error('Description must not exceed 1000 characters');
      return;
    }

    setIsSubmitting(true);
    try {
      await reportService.submitReport({
        reportedId,
        type: reportType,
        description: description.trim(),
        contentType,
        contentId,
      });

      toast.success('Report submitted successfully. Our team will review it shortly.');
      setDescription('');
      setReportType(ReportType.QUALITY_ISSUE);
      onClose();

      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error('Failed to submit report:', error);
      const errorMessage =
        error && typeof error === 'object' && 'response' in error
          ? (error as { response?: { data?: { message?: string } } }).response?.data?.message || 'Failed to submit report'
          : error instanceof Error
          ? error.message
          : 'Failed to submit report';
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <AlertCircle className="w-5 h-5 text-red-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">Submit a Report</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Info Box */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-900">
              <strong>Note:</strong> Please provide accurate and detailed information. False reports may result in account restrictions.
              {reportedName && (
                <span className="block mt-2">
                  <strong>Reporting:</strong> {reportedName}
                </span>
              )}
            </p>
          </div>

          {/* Report Type Selection */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-3">
              Report Type <span className="text-red-600">*</span>
            </label>
            <div className="space-y-2">
              {reportTypeOptions.map((option) => (
                <label
                  key={option.value}
                  className="flex items-start p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                >
                  <input
                    type="radio"
                    name="reportType"
                    value={option.value}
                    checked={reportType === option.value}
                    onChange={(e) => {
                      const value = e.target.value as ReportType;
                      if (Object.values(ReportType).includes(value)) {
                        setReportType(value);
                      }
                    }}
                    className="mt-1 w-4 h-4 text-primary-600"
                  />
                  <div className="ml-3 flex-1">
                    <p className="font-medium text-gray-900">{option.label}</p>
                    <p className="text-sm text-gray-600">{option.description}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-sm font-semibold text-gray-900 mb-2">
              Description <span className="text-red-600">*</span>
            </label>
            <p className="text-xs text-gray-600 mb-2">
              Provide detailed information about the issue. Minimum 20 characters, maximum 1000 characters.
            </p>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the issue in detail..."
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-600 focus:border-transparent resize-none"
              rows={6}
            />
            <p className="text-xs text-gray-500 mt-2">
              {description.length}/1000 characters
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || description.trim().length < 20}
              className="flex-1 px-4 py-2 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {isSubmitting ? 'Submitting...' : 'Submit Report'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ReportSubmissionModal;

