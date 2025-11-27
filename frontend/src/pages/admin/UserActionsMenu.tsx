import { useState } from 'react';
import { User } from '@/types';
import { MoreVertical, Edit, Lock, Unlock, Key, Trash2, Eye } from 'lucide-react';
import toast from 'react-hot-toast';
import adminService from '@/services/admin.service';

interface UserActionsMenuProps {
  user: User;
  onEdit: (user: User) => void;
  onViewDetails: (user: User) => void;
  onRefresh: () => void;
}

/**
 * User Actions Menu Component
 * Dropdown menu for user actions
 */
const UserActionsMenu = ({
  user,
  onEdit,
  onViewDetails,
  onRefresh,
}: UserActionsMenuProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleResetPassword = async () => {
    if (!confirm('Are you sure you want to reset this user\'s password?')) return;

    setIsLoading(true);
    try {
      // Generate a temporary password
      const tempPassword = Math.random().toString(36).slice(-8);
      await adminService.resetUserPassword(user.id, tempPassword);
      toast.success(`Password reset to: ${tempPassword}`);
      onRefresh();
    } catch (error) {
      const message = error instanceof Error && 'response' in error 
        ? (error as { response?: { data?: { message?: string } } }).response?.data?.message 
        : undefined;
      toast.error(message || 'Failed to reset password');
    } finally {
      setIsLoading(false);
      setIsOpen(false);
    }
  };

  const handleLockAccount = async () => {
    if (!confirm(`Are you sure you want to ${user.isLocked ? 'unlock' : 'lock'} this account?`)) return;

    setIsLoading(true);
    try {
      await adminService.lockUserAccount(user.id, !user.isLocked);
      toast.success(`Account ${user.isLocked ? 'unlocked' : 'locked'} successfully`);
      onRefresh();
    } catch (error) {
      const message = error instanceof Error && 'response' in error 
        ? (error as { response?: { data?: { message?: string } } }).response?.data?.message 
        : undefined;
      toast.error(message || 'Failed to update account lock status');
    } finally {
      setIsLoading(false);
      setIsOpen(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) return;

    setIsLoading(true);
    try {
      await adminService.deleteUser(user.id);
      toast.success('User deleted successfully');
      onRefresh();
    } catch (error) {
      const message = error instanceof Error && 'response' in error 
        ? (error as { response?: { data?: { message?: string } } }).response?.data?.message 
        : undefined;
      toast.error(message || 'Failed to delete user');
    } finally {
      setIsLoading(false);
      setIsOpen(false);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isLoading}
        className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
        title="More actions"
      >
        <MoreVertical className="w-5 h-5 text-gray-600" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-40">
          <button
            onClick={() => {
              onViewDetails(user);
              setIsOpen(false);
            }}
            className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center gap-2 text-gray-700 border-b"
          >
            <Eye className="w-4 h-4" />
            View Details
          </button>

          <button
            onClick={() => {
              onEdit(user);
              setIsOpen(false);
            }}
            className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center gap-2 text-gray-700 border-b"
          >
            <Edit className="w-4 h-4" />
            Edit User
          </button>

          <button
            onClick={handleResetPassword}
            disabled={isLoading}
            className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center gap-2 text-gray-700 border-b disabled:opacity-50"
          >
            <Key className="w-4 h-4" />
            Reset Password
          </button>

          <button
            onClick={handleLockAccount}
            disabled={isLoading}
            className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center gap-2 text-gray-700 border-b disabled:opacity-50"
          >
            {user.isLocked ? (
              <>
                <Unlock className="w-4 h-4" />
                Unlock Account
              </>
            ) : (
              <>
                <Lock className="w-4 h-4" />
                Lock Account
              </>
            )}
          </button>

          <button
            onClick={handleDelete}
            disabled={isLoading}
            className="w-full text-left px-4 py-2 hover:bg-red-50 flex items-center gap-2 text-red-600 disabled:opacity-50"
          >
            <Trash2 className="w-4 h-4" />
            Delete User
          </button>
        </div>
      )}

      {isOpen && (
        <div
          className="fixed inset-0 z-30"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
};

export default UserActionsMenu;

