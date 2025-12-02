import { useState, useCallback } from 'react';
import { User } from '@/types';
import { MoreVertical, Edit, Lock, Unlock, Key, Trash2, Eye, Flame } from 'lucide-react';
import toast from 'react-hot-toast';
import adminService from '@/services/admin.service';

interface UserActionsMenuProps {
  user: User & { isLocked?: boolean };
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

  /**
   * Extract error message from error object
   */
  const getErrorMessage = useCallback((e: unknown): string | undefined => {
    if (e instanceof Error && 'response' in e) {
      return (e as { response?: { data?: { message?: string } } }).response?.data?.message;
    }
    return undefined;
  }, []);

  const handleResetPassword = async () => {
    if (!window.confirm('Are you sure you want to reset this user\'s password?')) return;

    setIsLoading(true);
    try {
      // Generate a temporary password
      const tempPassword = Math.random().toString(36).slice(-8);
      await adminService.resetUserPassword(user.id, tempPassword);
      toast.success(`Password reset to: ${tempPassword}`);
      onRefresh();
    } catch (error) {
      const message = getErrorMessage(error);
      toast.error(message || 'Failed to reset password');
    } finally {
      setIsLoading(false);
      setIsOpen(false);
    }
  };

  const handleLockAccount = async () => {
    const isLocked = user.isLocked ?? false;
    if (!window.confirm(`Are you sure you want to ${isLocked ? 'unlock' : 'lock'} this account?`)) return;

    setIsLoading(true);
    try {
      await adminService.lockUserAccount(user.id, !isLocked);
      toast.success(`Account ${isLocked ? 'unlocked' : 'locked'} successfully`);
      onRefresh();
    } catch (error) {
      const message = getErrorMessage(error);
      toast.error(message || 'Failed to update account lock status');
    } finally {
      setIsLoading(false);
      setIsOpen(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this user? This action cannot be undone.')) return;

    setIsLoading(true);
    try {
      await adminService.deleteUser(user.id);
      toast.success('User deleted successfully');
      onRefresh();
    } catch (error) {
      const message = getErrorMessage(error);
      toast.error(message || 'Failed to delete user');
    } finally {
      setIsLoading(false);
      setIsOpen(false);
    }
  };

  const handleForceDeleteTeacher = async () => {
    if (user.role !== 'TEACHER') {
      toast.error('Force delete is only available for teachers');
      return;
    }

    const ok = window.confirm(
      'DANGER: You are about to FORCE DELETE this teacher.\n\nThis will permanently remove:\n- The teacher account\n- All courses created by this teacher\n- All lessons, packages, and materials under those courses\n- All enrollments and related payments for those courses\n- Related messages and contacts\n\nThis action CANNOT be undone. Do you want to continue?'
    );
    if (!ok) return;

    const phrase = window.prompt('Type exactly: FORCE DELETE to confirm');
    if ((phrase || '').trim().toUpperCase() !== 'FORCE DELETE') {
      toast.error('Confirmation phrase did not match. Aborted.');
      return;
    }

    setIsLoading(true);
    try {
      await adminService.deleteUser(user.id, { force: true });
      toast.success('Teacher force deleted with cascade');
      onRefresh();
    } catch (error) {
      const message = getErrorMessage(error);
      toast.error(message || 'Failed to force delete teacher');
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
            {(user.isLocked ?? false) ? (
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

          {user.role === 'TEACHER' && (
            <button
              onClick={handleForceDeleteTeacher}
              disabled={isLoading}
              className="w-full text-left px-4 py-2 hover:bg-red-100 flex items-center gap-2 text-red-700 disabled:opacity-50"
              title="Force delete teacher with cascade"
            >
              <Flame className="w-4 h-4" />
              Force Delete (Cascade)
            </button>
          )}
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
