import { useEffect, useState, useCallback } from 'react';
import {
  MessageCircle,
  Clock,
  CheckCircle,
  AlertCircle,
  ChevronRight,
  Loader,
} from 'lucide-react';
import toast from 'react-hot-toast';
import customerSupportService, { SupportStats } from '@/services/customer-support.service';

/**
 * Customer Support Widget Component
 * Displays support statistics and quick access to chat
 * Shows: Total conversations, active chats, resolution rate, response time
 */
interface CustomerSupportWidgetProps {
  onOpenChat?: () => void;
}

const CustomerSupportWidget = ({ onOpenChat }: CustomerSupportWidgetProps) => {
  const [stats, setStats] = useState<SupportStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  /**
   * Load support statistics
   */
  const loadStats = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await customerSupportService.getStats();
      setStats(data);
    } catch (error) {
      console.error('Failed to load support stats:', error);
      toast.error('Failed to load support statistics');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  if (isLoading) {
    return (
      <div className="card p-6">
        <div className="flex items-center justify-center h-40">
          <Loader className="w-6 h-6 text-primary-600 animate-spin" />
        </div>
      </div>
    );
  }

  if (!stats) {
    return null;
  }

  // Calculate resolution rate
  const resolutionRate =
    stats.totalConversations > 0
      ? Math.round((stats.resolvedConversations / stats.totalConversations) * 100)
      : 0;

  return (
    <div className="card p-6 hover:shadow-lg transition-shadow">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-blue-100 rounded-lg">
            <MessageCircle className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">Customer Support</h3>
            <p className="text-sm text-gray-600">Chat with our support team</p>
          </div>
        </div>
        <button
          onClick={onOpenChat}
          className="text-primary-600 hover:text-primary-700 transition-colors"
          aria-label="Open customer support chat"
        >
          <ChevronRight className="w-6 h-6" />
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        {/* Total Conversations */}
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-lg border border-blue-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Total Chats</span>
            <MessageCircle className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {stats.totalConversations}
          </p>
          <p className="text-xs text-gray-600 mt-1">All conversations</p>
        </div>

        {/* Active Conversations */}
        <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-lg border border-green-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Active</span>
            <AlertCircle className="w-4 h-4 text-green-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {stats.activeConversations}
          </p>
          <p className="text-xs text-gray-600 mt-1">Ongoing chats</p>
        </div>

        {/* Resolution Rate */}
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-lg border border-purple-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Resolved</span>
            <CheckCircle className="w-4 h-4 text-purple-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{resolutionRate}%</p>
          <p className="text-xs text-gray-600 mt-1">
            {stats.resolvedConversations} resolved
          </p>
        </div>

        {/* Average Response Time */}
        <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-4 rounded-lg border border-orange-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Response</span>
            <Clock className="w-4 h-4 text-orange-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {stats.averageResponseTime}
            <span className="text-sm text-gray-600 ml-1">min</span>
          </p>
          <p className="text-xs text-gray-600 mt-1">Average response time</p>
        </div>
      </div>

      {/* Satisfaction Rating */}
      <div className="bg-gradient-to-r from-yellow-50 to-yellow-100 p-4 rounded-lg border border-yellow-200 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-700 mb-1">
              Customer Satisfaction
            </p>
            <div className="flex items-center gap-1">
              {[...Array(5)].map((_, i) => (
                <span
                  key={i}
                  className={`text-lg ${
                    i < Math.round(stats.satisfactionRating)
                      ? 'text-yellow-400'
                      : 'text-gray-300'
                  }`}
                >
                  ★
                </span>
              ))}
              <span className="text-sm font-semibold text-gray-900 ml-2">
                {stats.satisfactionRating.toFixed(1)}/5
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Button */}
      <button
        onClick={onOpenChat}
        className="w-full bg-gradient-to-r from-primary-600 to-primary-700 text-white py-3 rounded-lg hover:shadow-lg transition-all font-medium flex items-center justify-center gap-2 group"
      >
        <MessageCircle className="w-5 h-5 group-hover:scale-110 transition-transform" />
        <span>Start Chat with Support</span>
      </button>

      {/* Info Text */}
      <p className="text-xs text-gray-600 text-center mt-4">
        Our support team is available 24/7 to help you with any questions or issues
      </p>
    </div>
  );
};

export default CustomerSupportWidget;

