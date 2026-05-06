import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  Award,
  Briefcase,
  Calendar,
  Mail,
  MapPin,
  Phone,
  Users,
  X,
} from 'lucide-react';

import type { User } from '@/types';
import { useOverlayAccessibility } from '@/hooks';

interface UserDetailsModalProps {
  isOpen: boolean;
  user?: User;
  onClose: () => void;
}

type UserWithCounts = User & {
  isLocked?: boolean;
  _count?: {
    enrollments?: number;
  };
};

interface InfoItemProps {
  icon?: ReactNode;
  label: string;
  value: ReactNode;
}

const roleBadgeClasses: Record<string, string> = {
  ADMIN: 'bg-red-100 text-red-800',
  TEACHER: 'bg-blue-100 text-blue-800',
  STUDENT: 'bg-green-100 text-green-800',
};

const moneyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const getFullName = (user: User) => {
  const fullName = `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim();
  return fullName || user.email || 'User';
};

const getUserInitials = (user?: User): string => {
  if (!user) return 'U';

  const initials = `${user.firstName?.[0] ?? ''}${user.lastName?.[0] ?? ''}`.trim();

  if (initials) {
    return initials.toUpperCase();
  }

  return user.email?.[0]?.toUpperCase() || 'U';
};

const formatDate = (value?: string | Date | null): string => {
  if (!value) return 'Not available';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'Invalid date';
  }

  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const formatMoney = (value?: number | string | null): string => {
  const numericValue = Number(value ?? 0);

  if (!Number.isFinite(numericValue)) {
    return moneyFormatter.format(0);
  }

  return moneyFormatter.format(numericValue);
};

const InfoItem = ({ icon, label, value }: InfoItemProps) => (
  <div className="flex items-start gap-3">
    {icon ? <div className="mt-1 text-gray-400">{icon}</div> : null}

    <div>
      <p className="text-sm text-gray-600">{label}</p>
      <p className="font-medium text-gray-900">{value}</p>
    </div>
  </div>
);

/**
 * UserDetailsModal
 *
 * Displays detailed user profile, account status, and role-specific information.
 */
const UserDetailsModal = ({ isOpen, user, onClose }: UserDetailsModalProps) => {
  const modalRef = useRef<HTMLDivElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);

  const [showAvatarImage, setShowAvatarImage] = useState(Boolean(user?.avatar));

  const typedUser = user as UserWithCounts | undefined;

  const fullName = useMemo(() => {
    return user ? getFullName(user) : 'User';
  }, [user]);

  const studentEnrollmentCount = typedUser?._count?.enrollments ?? 0;

  const averageRating = Number(typedUser?.teacherProfile?.averageRating ?? 0);
  const formattedAverageRating = Number.isFinite(averageRating)
    ? averageRating.toFixed(1)
    : '0.0';

  const roleClass =
    user?.role && roleBadgeClasses[user.role]
      ? roleBadgeClasses[user.role]
      : 'bg-gray-100 text-gray-800';

  useEffect(() => {
    setShowAvatarImage(Boolean(user?.avatar));
  }, [user?.avatar, user?.id]);

  useOverlayAccessibility({
    isOpen: isOpen && Boolean(user),
    containerRef: modalRef,
    initialFocusRef: closeButtonRef,
    onClose,
    trapFocus: true,
    lockBodyScroll: true,
  });

  if (!isOpen || !user || !typedUser) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 px-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        ref={modalRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="user-details-title"
        aria-describedby="user-details-description"
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-white shadow-xl"
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-white p-6">
          <h2
            id="user-details-title"
            className="text-2xl font-bold text-gray-900"
          >
            User Details
          </h2>

          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            className="rounded-md text-gray-500 transition-colors hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
            aria-label="Close user details modal"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="space-y-6 p-6">
          <p id="user-details-description" className="sr-only">
            Review the selected user profile, account status, and role-specific
            details.
          </p>

          <section className="flex items-center gap-4">
            {showAvatarImage && typedUser.avatar ? (
              <img
                src={typedUser.avatar}
                alt={`${fullName}'s avatar`}
                className="h-20 w-20 rounded-full object-cover shadow-md"
                onError={() => setShowAvatarImage(false)}
              />
            ) : (
              <div
                className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-primary-600 to-indigo-600 shadow-md"
                aria-hidden="true"
              >
                <span className="text-2xl font-bold text-white">
                  {getUserInitials(typedUser)}
                </span>
              </div>
            )}

            <div>
              <h3 className="text-2xl font-bold text-gray-900">{fullName}</h3>

              <div className="mt-1 flex flex-wrap items-center gap-2">
                <span
                  className={`rounded-full px-2 py-1 text-xs font-medium ${roleClass}`}
                >
                  {typedUser.role}
                </span>

                <span
                  className={`rounded-full px-2 py-1 text-xs font-medium ${
                    typedUser.isActive
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {typedUser.isActive ? 'Active' : 'Inactive'}
                </span>

                {typedUser.isLocked && (
                  <span className="rounded-full bg-red-100 px-2 py-1 text-xs font-medium text-red-800">
                    Locked
                  </span>
                )}
              </div>
            </div>
          </section>

          <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <InfoItem
              icon={<Mail className="h-5 w-5" />}
              label="Email"
              value={typedUser.email}
            />

            {typedUser.phone && (
              <InfoItem
                icon={<Phone className="h-5 w-5" />}
                label="Phone"
                value={typedUser.phone}
              />
            )}

            {typedUser.address && (
              <InfoItem
                icon={<MapPin className="h-5 w-5" />}
                label="Address"
                value={typedUser.address}
              />
            )}

            {typedUser.department && (
              <InfoItem
                icon={<Briefcase className="h-5 w-5" />}
                label="Department"
                value={typedUser.department}
              />
            )}
          </section>

          <section className="grid grid-cols-1 gap-4 border-t pt-4 md:grid-cols-2">
            <InfoItem
              icon={<Calendar className="h-4 w-4" />}
              label="Joined"
              value={formatDate(typedUser.createdAt)}
            />

            <InfoItem
              label="Last Login"
              value={formatDate(typedUser.lastLoginAt)}
            />

            {typedUser.loginCount !== undefined && (
              <InfoItem
                label="Login Count"
                value={`${typedUser.loginCount} time${
                  typedUser.loginCount === 1 ? '' : 's'
                }`}
              />
            )}
          </section>

          {typedUser.role === 'TEACHER' && typedUser.teacherProfile && (
            <section className="space-y-4 border-t pt-4">
              <h4 className="font-bold text-gray-900">Teacher Information</h4>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <InfoItem
                  icon={<Users className="h-5 w-5" />}
                  label="Total Students"
                  value={typedUser.teacherProfile.totalStudents ?? 0}
                />

                <InfoItem
                  icon={<Award className="h-5 w-5" />}
                  label="Average Rating"
                  value={`${formattedAverageRating}/5`}
                />

                <InfoItem
                  label="Verification Status"
                  value={
                    <span
                      className={
                        typedUser.teacherProfile.isVerified
                          ? 'text-green-600'
                          : 'text-yellow-600'
                      }
                    >
                      {typedUser.teacherProfile.isVerified
                        ? 'Verified'
                        : 'Pending review'}
                    </span>
                  }
                />

                <InfoItem
                  label="Total Earnings"
                  value={formatMoney(typedUser.teacherProfile.totalEarnings)}
                />
              </div>
            </section>
          )}

          {typedUser.role === 'STUDENT' && (
            <section className="border-t pt-4">
              <h4 className="font-bold text-gray-900">Student Information</h4>

              <div className="mt-4">
                <InfoItem
                  label="Enrolled Courses"
                  value={`${studentEnrollmentCount} course${
                    studentEnrollmentCount === 1 ? '' : 's'
                  }`}
                />
              </div>
            </section>
          )}

          <div className="border-t pt-4">
            <button
              type="button"
              onClick={onClose}
              className="w-full rounded-lg bg-gray-100 px-4 py-2 font-medium text-gray-900 transition-colors hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserDetailsModal;