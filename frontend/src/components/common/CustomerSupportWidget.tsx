import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  MessageCircle,
  Clock,
  CheckCircle,
  AlertCircle,
  ChevronRight,
  Loader,
  Star,
  RefreshCw,
} from 'lucide-react';
import toast from 'react-hot-toast';

import clientLogger from '@/utils/logger';
import supportService, { type SupportStats } from '@/services/support.service';
import { extractErrorMessage } from '@/utils/error-handler';

/**
 * Customer Support Widget Component
 * Displays support statistics and provides quick access to the support inbox.
 */
interface CustomerSupportWidgetProps {
  onOpenChat: () => void;
}

const toSafeNumber = (value: unknown, fallback = 0): number => {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) && numberValue >= 0 ? numberValue : fallback;
};

const CustomerSupportWidget = ({ onOpenChat }: CustomerSupportWidgetProps) => {
  const [stats, setStats] = useState<SupportStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  /**
   * Load support statistics from the support service.
   */
  const loadStats = useCallback(async () => {
    try {
      setIsLoading(true);
      setErrorMessage(null);

      const data = await supportService.getStats();
      setStats(data);
    } catch (error) {
      const message = extractErrorMessage(error, 'Failed to load support statistics');

      clientLogger.error('Failed to load support stats:', error);
      setErrorMessage(message);
      setStats(null);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  const calculatedStats = useMemo(() => {
    const totalConversations = toSafeNumber(stats?.totalConversations);
    const activeConversations = toSafeNumber(stats?.activeConversations);
    const resolvedConversations = toSafeNumber(stats?.resolvedConversations);
    const averageResponseTime = toSafeNumber(stats?.averageResponseTime);

    const resolutionRate =
      totalConversations > 0
        ? Math.round((resolvedConversations / totalConversations) * 100)
        : 0;

    const rawSatisfactionRating = Number(stats?.satisfactionRating);
    const hasSatisfactionRating =
      Number.isFinite(rawSatisfactionRating) && rawSatisfactionRating > 0;

    const satisfactionRating = hasSatisfactionRating
      ? Math.min(Math.max(rawSatisfactionRating, 0), 5)
      : 0;

    return {
      totalConversations,
      activeConversations,
      resolvedConversations,
      averageResponseTime,
      resolutionRate,
      hasSatisfactionRating,
      satisfactionRating,
    };
  }, [stats]);

  if (isLoading) {
    return (
      <div className="card p-6">
        <div className="flex h-40 items-center justify-center">
          <Loader
            className="h-6 w-6 animate-spin text-primary-600"
            aria-hidden="true"
          />
          <span className="sr-only">Loading support statistics</span>
        </div>
      </div>
    );
  }

  if (errorMessage || !stats) {
    return (
      <div className="card p-6">
        <div className="flex flex-col items-center justify-center rounded-lg border border-red-200 bg-red-50 p-6 text-center">
          <AlertCircle className="mb-3 h-8 w-8 text-red-600" aria-hidden="true" />

          <h3 className="text-base font-semibold text-gray-900">
            Unable to Load Support Statistics
          </h3>

          <p className="mt-2 text-sm text-gray-600">
            {errorMessage ?? 'Support statistics are currently unavailable.'}
          </p>

          <button
            type="button"
            onClick={loadStats}
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-700"
          >
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="card p-6 transition-shadow hover:shadow-lg">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="rounded-lg bg-blue-100 p-3">
            <MessageCircle className="h-6 w-6 text-blue-600" aria-hidden="true" />
          </div>

          <div>
            <h3 className="text-lg font-bold text-gray-900">Customer Support</h3>
            <p className="text-sm text-gray-600">
              Open or track a support ticket
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onOpenChat}
          className="text-primary-600 transition-colors hover:text-primary-700"
          aria-label="Open support inbox"
        >
          <ChevronRight className="h-6 w-6" aria-hidden="true" />
        </button>
      </div>

      {/* Stats Grid */}
      <div className="mb-6 grid grid-cols-2 gap-4">
        <div className="rounded-lg border border-blue-200 bg-gradient-to-br from-blue-50 to-blue-100 p-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">Total Tickets</span>
            <MessageCircle className="h-4 w-4 text-blue-600" aria-hidden="true" />
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {calculatedStats.totalConversations}
          </p>
          <p className="mt-1 text-xs text-gray-600">All submitted tickets</p>
        </div>

        <div className="rounded-lg border border-green-200 bg-gradient-to-br from-green-50 to-green-100 p-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">
              Active Tickets
            </span>
            <AlertCircle className="h-4 w-4 text-green-600" aria-hidden="true" />
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {calculatedStats.activeConversations}
          </p>
          <p className="mt-1 text-xs text-gray-600">Tickets awaiting action</p>
        </div>

        <div className="rounded-lg border border-purple-200 bg-gradient-to-br from-purple-50 to-purple-100 p-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">
              Resolution Rate
            </span>
            <CheckCircle className="h-4 w-4 text-purple-600" aria-hidden="true" />
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {calculatedStats.resolutionRate}%
          </p>
          <p className="mt-1 text-xs text-gray-600">
            {calculatedStats.resolvedConversations} resolved
          </p>
        </div>

        <div className="rounded-lg border border-orange-200 bg-gradient-to-br from-orange-50 to-orange-100 p-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">Response</span>
            <Clock className="h-4 w-4 text-orange-600" aria-hidden="true" />
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {calculatedStats.averageResponseTime}
            <span className="ml-1 text-sm text-gray-600">min</span>
          </p>
          <p className="mt-1 text-xs text-gray-600">Average response time</p>
        </div>
      </div>

      {/* Satisfaction Rating */}
      <div className="mb-6 rounded-lg border border-yellow-200 bg-gradient-to-r from-yellow-50 to-yellow-100 p-4">
        <p className="mb-1 text-sm font-medium text-gray-700">
          Customer Satisfaction
        </p>

        <div className="flex items-center gap-1">
          {Array.from({ length: 5 }).map((_, index) => (
            <Star
              key={index}
              className={`h-4 w-4 ${
                calculatedStats.hasSatisfactionRating &&
                index < Math.round(calculatedStats.satisfactionRating)
                  ? 'fill-current text-yellow-400'
                  : 'text-gray-300'
              }`}
              aria-hidden="true"
            />
          ))}

          <span className="ml-2 text-sm font-semibold text-gray-900">
            {calculatedStats.hasSatisfactionRating
              ? `${calculatedStats.satisfactionRating.toFixed(1)}/5`
              : 'No ratings yet'}
          </span>
        </div>
      </div>

      {/* CTA Button */}
      <button
        type="button"
        onClick={onOpenChat}
        className="group flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-primary-600 to-primary-700 py-3 font-medium text-white transition-all hover:shadow-lg"
      >
        <MessageCircle
          className="h-5 w-5 transition-transform group-hover:scale-110"
          aria-hidden="true"
        />
        <span>Open Support Inbox</span>
      </button>

      <p className="mt-4 text-center text-xs text-gray-600">
        Contact support for billing, access, and course issues. Response times vary
        by queue volume.
      </p>
    </div>
  );
};

export default CustomerSupportWidget;