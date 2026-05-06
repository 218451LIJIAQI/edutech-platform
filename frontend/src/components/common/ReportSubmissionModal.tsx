import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { AlertCircle, X } from 'lucide-react';
import toast from 'react-hot-toast';

import { ReportType } from '@/types';
import reportService from '@/services/report.service';
import clientLogger from '@/utils/logger';
import { extractErrorMessage } from '@/utils/error-handler';
import { useOverlayAccessibility } from '@/hooks';

interface ReportSubmissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  reportedId: string;
  reportedName?: string;
  contentType?: 'teacher' | 'course' | 'community_post' | 'community_comment';
  contentId?: string;
  onSuccess?: () => void;
}

const MIN_DESCRIPTION_LENGTH = 20;
const MAX_DESCRIPTION_LENGTH = 1000;

const REPORT_TYPE_OPTIONS = [
  {
    value: ReportType.QUALITY_ISSUE,
    label: 'Quality Issue',
    description: 'Course content is incorrect, outdated, or misleading.',
  },
  {
    value: ReportType.INAPPROPRIATE_CONTENT,
    label: 'Inappropriate Content',
    description: 'Contains offensive, abusive, or inappropriate material.',
  },
  {
    value: ReportType.FRAUD,
    label: 'Fraud',
    description: 'Suspicious activity or fraudulent behavior.',
  },
  {
    value: ReportType.TECHNICAL_ISSUE,
    label: 'Technical Issue',
    description: 'Video not playing, materials not accessible, or other technical problems.',
  },
  {
    value: ReportType.OTHER,
    label: 'Other',
    description: 'Other issues not covered above.',
  },
] as const;

/**
 * Report Submission Modal Component
 * Allows users to submit reports for teachers, courses, or community content.
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
  const modalRef = useRef<HTMLDivElement | null>(null);
  const firstReportTypeRef = useRef<HTMLInputElement | null>(null);

  const [reportType, setReportType] = useState<ReportType>(ReportType.QUALITY_ISSUE);
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const trimmedDescription = useMemo(() => description.trim(), [description]);

  const isDescriptionValid =
    trimmedDescription.length >= MIN_DESCRIPTION_LENGTH &&
    trimmedDescription.length <= MAX_DESCRIPTION_LENGTH;

  const canSubmit = !isSubmitting && isDescriptionValid;

  useEffect(() => {
    if (isOpen) {
      setReportType(ReportType.QUALITY_ISSUE);
      setDescription('');
      setIsSubmitting(false);
    }
  }, [isOpen]);

  const handleClose = () => {
    if (!isSubmitting) {
      onClose();
    }
  };

  useOverlayAccessibility({
    isOpen,
    containerRef: modalRef,
    initialFocusRef: firstReportTypeRef,
    onClose: handleClose,
    trapFocus: true,
    lockBodyScroll: true,
  });

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (isSubmitting) return;

    if (trimmedDescription.length < MIN_DESCRIPTION_LENGTH) {
      toast.error(`Description must be at least ${MIN_DESCRIPTION_LENGTH} characters.`);
      return;
    }

    if (trimmedDescription.length > MAX_DESCRIPTION_LENGTH) {
      toast.error(`Description must not exceed ${MAX_DESCRIPTION_LENGTH} characters.`);
      return;
    }

    setIsSubmitting(true);

    try {
      await reportService.submitReport({
        reportedId,
        type: reportType,
        description: trimmedDescription,
        contentType,
        contentId,
      });

      toast.success('Report submitted successfully. Our team will review it shortly.');

      setDescription('');
      setReportType(ReportType.QUALITY_ISSUE);
      onSuccess?.();
      onClose();
    } catch (error) {
      clientLogger.error('Failed to submit report:', error);
      toast.error(extractErrorMessage(error, 'Failed to submit report.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4"
      aria-hidden={!isOpen}
    >
      <div
        ref={modalRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="report-modal-title"
        aria-describedby="report-modal-description report-modal-note"
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-white shadow-xl"
      >
        <div className="sticky top-0 flex items-center justify-between border-b border-gray-200 bg-white px-6 py-4">
          <div className="flex items-center space-x-3">
            <div className="rounded-lg bg-red-100 p-2" aria-hidden="true">
              <AlertCircle className="h-5 w-5 text-red-600" />
            </div>

            <h2 id="report-modal-title" className="text-2xl font-bold text-gray-900">
              Submit a Report
            </h2>
          </div>

          <button
            type="button"
            onClick={handleClose}
            disabled={isSubmitting}
            className="text-gray-500 transition-colors hover:text-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Close report modal"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 p-6">
          <p id="report-modal-description" className="sr-only">
            Submit a detailed report about a teacher, course, or community content item.
          </p>

          <div id="report-modal-note" className="rounded-lg border border-blue-200 bg-blue-50 p-4">
            <p className="text-sm text-blue-900">
              <strong>Note:</strong> Please provide accurate and detailed information. False reports may result in account restrictions.
            </p>

            {reportedName && (
              <p className="mt-2 text-sm text-blue-900">
                <strong>Reporting:</strong> {reportedName}
              </p>
            )}
          </div>

          <fieldset>
            <legend className="mb-3 block text-sm font-semibold text-gray-900">
              Report Type <span className="text-red-600">*</span>
            </legend>

            <div className="space-y-2">
              {REPORT_TYPE_OPTIONS.map((option, index) => (
                <label
                  key={option.value}
                  className="flex cursor-pointer items-start rounded-lg border border-gray-200 p-3 transition-colors hover:bg-gray-50"
                >
                  <input
                    ref={index === 0 ? firstReportTypeRef : undefined}
                    type="radio"
                    name="reportType"
                    value={option.value}
                    checked={reportType === option.value}
                    onChange={() => setReportType(option.value)}
                    className="mt-1 h-4 w-4 text-primary-600"
                    required
                  />

                  <span className="ml-3 flex-1">
                    <span className="block font-medium text-gray-900">{option.label}</span>
                    <span className="block text-sm text-gray-600">{option.description}</span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          <div>
            <label htmlFor="report-description" className="mb-2 block text-sm font-semibold text-gray-900">
              Description <span className="text-red-600">*</span>
            </label>

            <p id="report-description-help" className="mb-2 text-xs text-gray-600">
              Provide detailed information about the issue. Minimum {MIN_DESCRIPTION_LENGTH} characters, maximum {MAX_DESCRIPTION_LENGTH} characters.
            </p>

            <textarea
              id="report-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Describe the issue in detail..."
              className="w-full resize-none rounded-lg border border-gray-300 px-4 py-3 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-primary-600"
              rows={6}
              minLength={MIN_DESCRIPTION_LENGTH}
              maxLength={MAX_DESCRIPTION_LENGTH}
              required
              aria-describedby="report-description-help report-description-count"
              aria-invalid={description.length > 0 && !isDescriptionValid}
            />

            <p id="report-description-count" className="mt-2 text-xs text-gray-500">
              {description.length}/{MAX_DESCRIPTION_LENGTH} characters
            </p>
          </div>

          <div className="flex gap-3 border-t border-gray-200 pt-4">
            <button
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
              className="flex-1 rounded-lg border border-gray-300 px-4 py-2 font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={!canSubmit}
              className="flex-1 rounded-lg bg-red-600 px-4 py-2 font-medium text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-gray-400"
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