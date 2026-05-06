import { useCallback, useId, useMemo, useRef, useState } from 'react';
import {
  Edit,
  Eye,
  Flame,
  Key,
  Lock,
  MoreVertical,
  Trash2,
  Unlock,
} from 'lucide-react';
import toast from 'react-hot-toast';

import ConfirmationModal from '@/components/common/ConfirmationModal';
import adminService from '@/services/admin.service';
import { UserRole, type User } from '@/types';
import { useOverlayAccessibility } from '@/hooks';
import { extractErrorMessage } from '@/utils/error-handler';

interface UserActionsMenuProps {
  user: User & { isLocked?: boolean };
  onEdit: (user: User) => void;
  onViewDetails: (user: User) => void;
  onRefresh: () => void;
}

type PendingAction =
  | 'resetPassword'
  | 'lockAccount'
  | 'deleteUser'
  | 'forceDeleteTeacher'
  | null;

type ConfirmationTone = 'warning' | 'danger';

interface ConfirmationConfig {
  title: string;
  description: string;
  confirmLabel: string;
  tone: ConfirmationTone;
  details?: string[];
  confirmationText?: string;
  confirmationHint?: string;
}

const TEMP_PASSWORD_LENGTH = 16;
const PASSWORD_CHARACTERS =
  'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';

const generateTemporaryPassword = () => {
  if (
    typeof globalThis.crypto === 'undefined' ||
    typeof globalThis.crypto.getRandomValues !== 'function'
  ) {
    throw new Error('Secure password generation is not available in this browser.');
  }

  const randomValues = new Uint32Array(TEMP_PASSWORD_LENGTH - 3);
  globalThis.crypto.getRandomValues(randomValues);

  const randomPart = Array.from(randomValues, (value) => {
    return PASSWORD_CHARACTERS[value % PASSWORD_CHARACTERS.length];
  }).join('');

  return `Aa9${randomPart}`;
};

/**
 * UserActionsMenu
 *
 * Displays admin actions for a single user account.
 * Sensitive actions require confirmation before execution.
 */
const UserActionsMenu = ({
  user,
  onEdit,
  onViewDetails,
  onRefresh,
}: UserActionsMenuProps) => {
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const firstMenuItemRef = useRef<HTMLButtonElement | null>(null);

  const menuId = useId();

  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);

  const fullName = `${user.firstName} ${user.lastName}`;
  const isLocked = user.isLocked ?? false;
  const isTeacher = user.role === UserRole.TEACHER;
  const isAdmin = user.role === UserRole.ADMIN;

  const closeMenu = useCallback(() => {
    if (!isLoading) {
      setIsOpen(false);
    }
  }, [isLoading]);

  useOverlayAccessibility({
    isOpen,
    containerRef: menuRef,
    initialFocusRef: firstMenuItemRef,
    returnFocusRef: triggerRef,
    onClose: closeMenu,
    trapFocus: true,
    lockBodyScroll: false,
  });

  const closeConfirmation = useCallback(() => {
    if (!isLoading) {
      setPendingAction(null);
    }
  }, [isLoading]);

  const openConfirmation = useCallback(
    (action: Exclude<PendingAction, null>) => {
      if (isLoading) return;

      setPendingAction(action);
      setIsOpen(false);
    },
    [isLoading]
  );

  const handleViewDetails = () => {
    onViewDetails(user);
    setIsOpen(false);
  };

  const handleEdit = () => {
    onEdit(user);
    setIsOpen(false);
  };

  const handleResetPassword = async () => {
    setIsLoading(true);

    try {
      const temporaryPassword = generateTemporaryPassword();

      await adminService.resetUserPassword(user.id, temporaryPassword);

      try {
        if (navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(temporaryPassword);
          toast.success(
            'Password reset successfully. Temporary password copied to clipboard.'
          );
        } else {
          toast.success(`Password reset. Temporary password: ${temporaryPassword}`);
        }
      } catch {
        toast.success(`Password reset. Temporary password: ${temporaryPassword}`);
      }

      onRefresh();
    } catch (error: unknown) {
      toast.error(extractErrorMessage(error, 'Failed to reset password'));
    } finally {
      setIsLoading(false);
      setPendingAction(null);
      setIsOpen(false);
    }
  };

  const handleLockAccount = async () => {
    setIsLoading(true);

    try {
      await adminService.lockUserAccount(user.id, !isLocked);
      toast.success(`Account ${isLocked ? 'unlocked' : 'locked'} successfully`);
      onRefresh();
    } catch (error: unknown) {
      toast.error(
        extractErrorMessage(error, 'Failed to update account lock status')
      );
    } finally {
      setIsLoading(false);
      setPendingAction(null);
      setIsOpen(false);
    }
  };

  const handleDeleteUser = async () => {
    setIsLoading(true);

    try {
      await adminService.deleteUser(user.id);
      toast.success('User deactivated successfully');
      onRefresh();
    } catch (error: unknown) {
      toast.error(extractErrorMessage(error, 'Failed to delete user'));
    } finally {
      setIsLoading(false);
      setPendingAction(null);
      setIsOpen(false);
    }
  };

  const handleForceDeleteTeacher = async () => {
    if (!isTeacher) {
      toast.error('Force delete is only available for teacher accounts.');
      setPendingAction(null);
      return;
    }

    setIsLoading(true);

    try {
      await adminService.deleteUser(user.id, { force: true });
      toast.success('Teacher account force deleted successfully');
      onRefresh();
    } catch (error: unknown) {
      toast.error(extractErrorMessage(error, 'Failed to force delete teacher'));
    } finally {
      setIsLoading(false);
      setPendingAction(null);
      setIsOpen(false);
    }
  };

  const handleConfirmAction = async () => {
    if (isLoading || !pendingAction) return;

    switch (pendingAction) {
      case 'resetPassword':
        await handleResetPassword();
        break;

      case 'lockAccount':
        await handleLockAccount();
        break;

      case 'deleteUser':
        await handleDeleteUser();
        break;

      case 'forceDeleteTeacher':
        await handleForceDeleteTeacher();
        break;

      default:
        break;
    }
  };

  const confirmationConfig = useMemo<ConfirmationConfig | null>(() => {
    switch (pendingAction) {
      case 'resetPassword':
        return {
          title: 'Reset User Password',
          description: `A new temporary password will be generated for ${fullName}. Store it securely before sharing it with the user.`,
          confirmLabel: 'Reset Password',
          tone: 'warning',
        };

      case 'lockAccount':
        return {
          title: `${isLocked ? 'Unlock' : 'Lock'} Account`,
          description: `${isLocked ? 'Restore access to' : 'Temporarily block access for'} ${fullName}'s account.`,
          confirmLabel: isLocked ? 'Unlock Account' : 'Lock Account',
          tone: 'warning',
        };

      case 'deleteUser':
        return {
          title: 'Deactivate User Account',
          description: `Deactivate ${fullName}'s account while preserving audit, financial, support, and learning records.`,
          confirmLabel: 'Deactivate User',
          tone: 'warning',
        };

      case 'forceDeleteTeacher':
        return {
          title: 'Force Delete Teacher',
          description: `This will permanently remove ${fullName}'s teacher account and related teaching data. This action cannot be undone.`,
          confirmLabel: 'Force Delete Teacher',
          tone: 'danger',
          details: [
            'The teacher account',
            'All courses created by this teacher',
            'Lessons, packages, materials, and enrollments under those courses',
            'Related teaching records connected to this account',
          ],
          confirmationText: 'FORCE DELETE',
          confirmationHint: 'Type FORCE DELETE',
        };

      default:
        return null;
    }
  }, [pendingAction, fullName, isLocked]);

  return (
    <>
      <div className="relative">
        <button
          ref={triggerRef}
          type="button"
          onClick={() => {
            if (!isLoading) {
              setIsOpen((currentValue) => !currentValue);
            }
          }}
          disabled={isLoading}
          className="rounded-lg p-2 transition-colors hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          title="More actions"
          aria-label={`Open actions for ${fullName}`}
          aria-haspopup="menu"
          aria-expanded={isOpen}
          aria-controls={menuId}
        >
          <MoreVertical className="h-5 w-5 text-gray-600" />
        </button>

        {isOpen && (
          <>
            <button
              type="button"
              className="fixed inset-0 z-30 cursor-default"
              onClick={closeMenu}
              tabIndex={-1}
              aria-label="Close user actions menu"
            />

            <div
              ref={menuRef}
              id={menuId}
              role="menu"
              tabIndex={-1}
              aria-label={`Actions for ${fullName}`}
              className="absolute right-0 z-40 mt-2 w-52 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg"
            >
              <button
                ref={firstMenuItemRef}
                type="button"
                role="menuitem"
                onClick={handleViewDetails}
                className="flex w-full items-center gap-2 border-b px-4 py-2 text-left text-gray-700 transition-colors hover:bg-gray-50 focus:bg-gray-50 focus:outline-none"
              >
                <Eye className="h-4 w-4" />
                View Details
              </button>

              {!isAdmin && (
                <button
                  type="button"
                  role="menuitem"
                  onClick={handleEdit}
                  className="flex w-full items-center gap-2 border-b px-4 py-2 text-left text-gray-700 transition-colors hover:bg-gray-50 focus:bg-gray-50 focus:outline-none"
                >
                  <Edit className="h-4 w-4" />
                  Edit User
                </button>
              )}

              <button
                type="button"
                role="menuitem"
                onClick={() => openConfirmation('resetPassword')}
                disabled={isLoading}
                className="flex w-full items-center gap-2 border-b px-4 py-2 text-left text-gray-700 transition-colors hover:bg-gray-50 focus:bg-gray-50 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Key className="h-4 w-4" />
                Reset Password
              </button>

              {!isAdmin && (
                <>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => openConfirmation('lockAccount')}
                    disabled={isLoading}
                    className="flex w-full items-center gap-2 border-b px-4 py-2 text-left text-gray-700 transition-colors hover:bg-gray-50 focus:bg-gray-50 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isLocked ? (
                      <>
                        <Unlock className="h-4 w-4" />
                        Unlock Account
                      </>
                    ) : (
                      <>
                        <Lock className="h-4 w-4" />
                        Lock Account
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => openConfirmation('deleteUser')}
                    disabled={isLoading}
                    className="flex w-full items-center gap-2 px-4 py-2 text-left text-yellow-700 transition-colors hover:bg-yellow-50 focus:bg-yellow-50 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Trash2 className="h-4 w-4" />
                    Deactivate Account
                  </button>
                </>
              )}

              {isTeacher && (
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => openConfirmation('forceDeleteTeacher')}
                  disabled={isLoading}
                  className="flex w-full items-center gap-2 border-t px-4 py-2 text-left text-red-700 transition-colors hover:bg-red-100 focus:bg-red-100 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                  title="Force delete teacher with related teaching data"
                >
                  <Flame className="h-4 w-4" />
                  Force Delete
                </button>
              )}
            </div>
          </>
        )}
      </div>

      {confirmationConfig && (
        <ConfirmationModal
          isOpen={Boolean(pendingAction)}
          title={confirmationConfig.title}
          description={confirmationConfig.description}
          confirmLabel={confirmationConfig.confirmLabel}
          tone={confirmationConfig.tone}
          details={confirmationConfig.details}
          confirmationText={confirmationConfig.confirmationText}
          confirmationHint={confirmationConfig.confirmationHint}
          isLoading={isLoading}
          onClose={closeConfirmation}
          onConfirm={handleConfirmAction}
        />
      )}
    </>
  );
};

export default UserActionsMenu;
