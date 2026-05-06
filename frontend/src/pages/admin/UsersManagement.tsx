import { useEffect, useState, useCallback, useMemo } from 'react';
import clientLogger from '@/utils/logger';
import { UserRole, User } from '@/types';
import adminService from '@/services/admin.service';
import SearchFilter from '@/components/common/SearchFilter';
import ConfirmationModal from '@/components/common/ConfirmationModal';
import {
  BatchOperationsModal,
  UserActionsMenu,
  UserDetailsModal,
  UserFormModal,
} from '@/components/admin';
import { Users, Plus, Trash2, CheckCircle, XCircle, Download, Lock, Star } from 'lucide-react';
import toast from 'react-hot-toast';
import { extractErrorMessage } from '@/utils/error-handler';
import { buildCsvContent, downloadCsvFile } from '@/utils/download';
import { usePageTitle } from '@/hooks';

interface ExtendedUser extends User {
  phone?: string;
  department?: string;
  isLocked?: boolean;
  _count?: {
    enrollments?: number;
  };
}

const getUserInitials = (user: Pick<ExtendedUser, 'firstName' | 'lastName' | 'email'>): string => {
  const initials = `${user.firstName?.[0] ?? ''}${user.lastName?.[0] ?? ''}`.trim();
  if (initials) {
    return initials.toUpperCase();
  }
  return user.email?.[0]?.toUpperCase() || 'U';
};

const isProtectedAdminUser = (user: Pick<ExtendedUser, 'role'>): boolean =>
  user.role === UserRole.ADMIN;

/**
 * User Management Page (Admin)
 * Comprehensive user management with CRUD, batch operations, and audit logs
 */
const UsersManagement = () => {
  usePageTitle('User Management');
  const [users, setUsers] = useState<ExtendedUser[]>([]);
  const [overview, setOverview] = useState<{
    total?: number;
    active?: number;
    teachers?: number;
    students?: number;
  }>({});
  const [pagination, setPagination] = useState<{
    total?: number;
    page?: number;
    limit?: number;
    totalPages?: number;
  }>({});
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState<{
    role?: string;
    isActive?: boolean;
    search?: string;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }>({
    page: 1,
    limit: 20,
    sortBy: 'createdAt',
    sortOrder: 'desc',
  });
  const [search, setSearch] = useState('');
  const [failedAvatarUserIds, setFailedAvatarUserIds] = useState<Set<string>>(new Set());

  // Modal states
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<ExtendedUser | undefined>();
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [detailsUser, setDetailsUser] = useState<ExtendedUser | undefined>();
  const [statusActionTarget, setStatusActionTarget] = useState<ExtendedUser | null>(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  // Batch operations
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
  const [batchOperation, setBatchOperation] = useState<'activate' | 'deactivate' | 'delete' | null>(null);
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);

  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await adminService.getAllUsers({
        ...filters,
        search,
        isActive: filters.isActive,
        role: filters.role as UserRole,
      });
      setUsers(data.items || []);
      setPagination(data.pagination);
      setOverview(data.overview || {});
    } catch (error) {
      clientLogger.error('Failed to fetch users:', error);
      toast.error(extractErrorMessage(error, 'Failed to load users'));
    } finally {
      setIsLoading(false);
    }
  }, [filters, search]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  useEffect(() => {
    setFailedAvatarUserIds(new Set());
  }, [users]);

  useEffect(() => {
    const manageableUserIds = new Set(
      users.filter((user) => !isProtectedAdminUser(user)).map((user) => user.id)
    );

    setSelectedUserIds((currentIds) => {
      const nextIds = new Set(
        Array.from(currentIds).filter((userId) => manageableUserIds.has(userId))
      );

      return nextIds.size === currentIds.size ? currentIds : nextIds;
    });
  }, [users]);

  const handleToggleStatus = async () => {
    if (!statusActionTarget) {
      return;
    }

    if (isProtectedAdminUser(statusActionTarget)) {
      toast.error('Admin accounts are protected from status changes.');
      setStatusActionTarget(null);
      return;
    }

    const nextStatus = !statusActionTarget.isActive;
    setIsUpdatingStatus(true);
    try {
      await adminService.updateUserStatus(statusActionTarget.id, nextStatus);
      toast.success(`User ${nextStatus ? 'activated' : 'deactivated'} successfully`);
      await fetchUsers();
      setStatusActionTarget(null);
    } catch (error) {
      toast.error(extractErrorMessage(error, 'Failed to update user status'));
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleEditUser = (user: ExtendedUser) => {
    if (isProtectedAdminUser(user)) {
      toast.error('Admin accounts are protected from this user form.');
      return;
    }

    setSelectedUser(user);
    setIsFormModalOpen(true);
  };

  const handleViewDetails = (user: ExtendedUser) => {
    setDetailsUser(user);
    setIsDetailsModalOpen(true);
  };

  const handleCreateUser = () => {
    setSelectedUser(undefined);
    setIsFormModalOpen(true);
  };

  const handleSelectUser = (userId: string) => {
    const targetUser = users.find((user) => user.id === userId);
    if (targetUser && isProtectedAdminUser(targetUser)) {
      toast.error('Admin accounts are protected from batch account actions.');
      return;
    }

    const newSelected = new Set(selectedUserIds);
    if (newSelected.has(userId)) {
      newSelected.delete(userId);
    } else {
      newSelected.add(userId);
    }
    setSelectedUserIds(newSelected);
  };

  const handleSelectAll = () => {
    const selectableUserIds = users
      .filter((user) => !isProtectedAdminUser(user))
      .map((user) => user.id);
    const allSelectableUsersSelected =
      selectableUserIds.length > 0 &&
      selectableUserIds.every((userId) => selectedUserIds.has(userId));

    if (allSelectableUsersSelected) {
      setSelectedUserIds(new Set());
    } else {
      setSelectedUserIds(new Set(selectableUserIds));
    }
  };

  const handleBatchOperation = (operation: 'activate' | 'deactivate' | 'delete') => {
    if (selectedUserIds.size === 0) {
      toast.error('Please select at least one user');
      return;
    }

    const selectedUsers = users.filter((user) => selectedUserIds.has(user.id));
    if (selectedUsers.some(isProtectedAdminUser)) {
      toast.error('Remove protected admin accounts before running this batch action.');
      setSelectedUserIds(new Set(
        selectedUsers
          .filter((user) => !isProtectedAdminUser(user))
          .map((user) => user.id)
      ));
      return;
    }

    setBatchOperation(operation);
    setIsBatchModalOpen(true);
  };

  const handleExportCSV = useCallback(() => {
    if (users.length === 0) {
      toast.error('No users to export');
      return;
    }

    const headers = ['ID', 'First Name', 'Last Name', 'Email', 'Phone', 'Role', 'Status', 'Joined'];
    const rows = users.map(u => [
      u.id,
      u.firstName,
      u.lastName,
      u.email,
      (u as ExtendedUser).phone,
      u.role,
      u.isActive ? 'Active' : 'Inactive',
      new Date(u.createdAt).toLocaleDateString(),
    ]);

    const csv = buildCsvContent([headers, ...rows]);

    downloadCsvFile(csv, `users-${new Date().toISOString().split('T')[0]}.csv`);
    toast.success('Users exported successfully');
  }, [users]);

  const getRoleBadgeColor = useCallback((role: string): string => {
    switch (role) {
      case 'ADMIN':
        return 'bg-red-100 text-red-800';
      case 'TEACHER':
        return 'bg-blue-100 text-blue-800';
      case 'STUDENT':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }, []);

  const filterOptions = [
    {
      name: 'role',
      label: 'Role',
      options: [
        { label: 'Student', value: UserRole.STUDENT },
        { label: 'Teacher', value: UserRole.TEACHER },
        { label: 'Admin', value: UserRole.ADMIN },
      ],
    },
    {
      name: 'isActive',
      label: 'Status',
      options: [
        { label: 'Active', value: 'true' },
        { label: 'Inactive', value: 'false' },
      ],
    },
  ];

  const selectedUserNames = useMemo(() =>
    users
      .filter(u => selectedUserIds.has(u.id))
      .map(u => `${u.firstName} ${u.lastName}`),
    [users, selectedUserIds]
  );

  const selectableUsers = useMemo(
    () => users.filter((user) => !isProtectedAdminUser(user)),
    [users]
  );

  const areAllSelectableUsersSelected =
    selectableUsers.length > 0 &&
    selectableUsers.every((user) => selectedUserIds.has(user.id));

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-primary-50/10 to-indigo-50/20 relative">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.015)_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none"></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative">
        {/* Header */}
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-primary-500/25">
              <Users className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900">
                User <span className="bg-gradient-to-r from-primary-600 to-indigo-600 bg-clip-text text-transparent">Management</span>
              </h1>
              <p className="text-gray-500 font-medium mt-1">Manage all platform users - students, teachers, and administrators</p>
            </div>
          </div>
        </div>

        {/* Search and Filter */}
        <div className="card mb-8 shadow-xl border border-gray-100 rounded-2xl">
          <SearchFilter
            placeholder="Search by name, email, or phone..."
            onSearch={setSearch}
            filters={filterOptions}
            onFilterChange={setFilters}
          />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="card bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-xl">
            <h3 className="text-sm font-semibold text-blue-100 mb-3">Total Users</h3>
            <p className="text-4xl font-bold">{(overview.total ?? pagination.total) || 0}</p>
          </div>
          <div className="card bg-gradient-to-br from-green-500 to-green-600 text-white shadow-xl">
            <h3 className="text-sm font-semibold text-green-100 mb-3">Active Users</h3>
            <p className="text-4xl font-bold">
              {overview.active ?? users.filter((u) => u.isActive).length}
            </p>
          </div>
          <div className="card bg-gradient-to-br from-purple-500 to-purple-600 text-white shadow-xl">
            <h3 className="text-sm font-semibold text-purple-100 mb-3">Teachers</h3>
            <p className="text-4xl font-bold">
              {overview.teachers ?? users.filter((u) => u.role === 'TEACHER').length}
            </p>
          </div>
          <div className="card bg-gradient-to-br from-orange-500 to-orange-600 text-white shadow-xl">
            <h3 className="text-sm font-semibold text-orange-100 mb-3">Students</h3>
            <p className="text-4xl font-bold">
              {overview.students ?? users.filter((u) => u.role === 'STUDENT').length}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mb-8 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={handleCreateUser}
            className="btn btn-primary flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Create User
          </button>

          {selectedUserIds.size > 0 && (
            <>
              <button
                type="button"
                onClick={() => handleBatchOperation('activate')}
                className="btn bg-green-600 text-white hover:bg-green-700 flex items-center gap-2"
              >
                <CheckCircle className="w-5 h-5" />
                Activate ({selectedUserIds.size})
              </button>
              <button
                type="button"
                onClick={() => handleBatchOperation('deactivate')}
                className="btn bg-yellow-600 text-white hover:bg-yellow-700 flex items-center gap-2"
              >
                <XCircle className="w-5 h-5" />
                Deactivate ({selectedUserIds.size})
              </button>
              <button
                type="button"
                onClick={() => handleBatchOperation('delete')}
                className="btn bg-red-600 text-white hover:bg-red-700 flex items-center gap-2"
              >
                <Trash2 className="w-5 h-5" />
                Safe Delete ({selectedUserIds.size})
              </button>
            </>
          )}

          <button
            type="button"
            onClick={handleExportCSV}
            className="btn btn-outline flex items-center gap-2"
          >
            <Download className="w-5 h-5" />
            Export CSV
          </button>
        </div>

        {/* Users Table */}
        <div className="card overflow-hidden shadow-xl">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <div className="flex flex-col items-center space-y-4">
                <div className="relative">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-500 to-indigo-600 animate-pulse flex items-center justify-center">
                    <Users className="w-8 h-8 text-white" />
                  </div>
                  <div className="absolute inset-0 rounded-2xl bg-primary-500/20 animate-ping"></div>
                </div>
                <p className="text-gray-600 font-medium">Loading users...</p>
              </div>
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-16">
              <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-gray-900 mb-2">No users found</h3>
              <p className="text-gray-600">Try adjusting your filters or create a new user</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b-2 border-gray-200">
                  <tr>
                    <th className="px-6 py-4 text-left">
                      <input
                        type="checkbox"
                        checked={areAllSelectableUsersSelected}
                        onChange={handleSelectAll}
                        disabled={selectableUsers.length === 0}
                        className="rounded"
                        aria-label="Select all manageable users"
                      />
                    </th>
                    <th className="px-6 py-4 text-left font-bold text-gray-900">
                      User
                    </th>
                    <th className="px-6 py-4 text-left font-bold text-gray-900">
                      Role
                    </th>
                    <th className="px-6 py-4 text-left font-bold text-gray-900">
                      Status
                    </th>
                    <th className="px-6 py-4 text-left font-bold text-gray-900">
                      Contact
                    </th>
                    <th className="px-6 py-4 text-left font-bold text-gray-900">
                      Stats
                    </th>
                    <th className="px-6 py-4 text-left font-bold text-gray-900">
                      Joined
                    </th>
                    <th className="px-6 py-4 text-right font-bold text-gray-900">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {users.map((user) => (
                    <tr key={user.id} className="hover:bg-gradient-to-r hover:from-gray-50 hover:to-gray-100 transition-all">
                      <td className="px-6 py-5 whitespace-nowrap">
                        <input
                          type="checkbox"
                          checked={!isProtectedAdminUser(user) && selectedUserIds.has(user.id)}
                          onChange={() => handleSelectUser(user.id)}
                          disabled={isProtectedAdminUser(user)}
                          className="rounded"
                          aria-label={
                            isProtectedAdminUser(user)
                              ? `${user.firstName} ${user.lastName} is a protected admin account`
                              : `Select ${user.firstName} ${user.lastName}`
                          }
                          title={isProtectedAdminUser(user) ? 'Admin accounts are protected' : undefined}
                        />
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap">
                        <div className="flex items-center space-x-4">
                          {user.avatar && !failedAvatarUserIds.has(user.id) ? (
                            <img
                              src={user.avatar}
                              alt={`${user.firstName} ${user.lastName}`}
                              className="w-12 h-12 rounded-full shadow-md object-cover"
                              onError={() => {
                                setFailedAvatarUserIds((currentIds) => new Set(currentIds).add(user.id));
                              }}
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary-600 to-indigo-600 flex items-center justify-center shadow-md">
                              <span className="text-sm font-bold text-white">{getUserInitials(user)}</span>
                            </div>
                          )}
                          <div>
                            <div className="text-sm font-bold text-gray-900">
                              {user.firstName} {user.lastName}
                            </div>
                            <div className="text-sm text-gray-600">{user.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRoleBadgeColor(user.role)}`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            user.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                          }`}>
                            {user.isActive ? 'Active' : 'Inactive'}
                          </span>
                          {(user as ExtendedUser).isLocked && (
                            <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 flex items-center gap-1">
                              <Lock className="w-3 h-3" /> Locked
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap text-sm">
                        {(user as ExtendedUser).phone && (
                          <div className="text-gray-700">{(user as ExtendedUser).phone}</div>
                        )}
                        {(user as ExtendedUser).department && (
                          <div className="text-gray-600 text-xs">{(user as ExtendedUser).department}</div>
                        )}
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap text-sm">
                        {user.role === 'TEACHER' && user.teacherProfile ? (
                          <div className="space-y-1">
                            <div className="font-medium text-gray-700">{user.teacherProfile.totalStudents} students</div>
                            <div className="text-primary-600 font-bold flex items-center gap-1">
                              <Star className="w-4 h-4 fill-current" />
                              <span>{typeof user.teacherProfile.averageRating === 'number' && !isNaN(user.teacherProfile.averageRating)
                                ? user.teacherProfile.averageRating.toFixed(1)
                                : '0.0'}</span>
                            </div>
                          </div>
                        ) : user.role === 'STUDENT' ? (
                          <div className="font-medium text-gray-700">
                            {(user as ExtendedUser)._count?.enrollments || 0} enrollments
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap text-sm text-gray-600">
                        {new Date(user.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end space-x-2">
                          {isProtectedAdminUser(user) ? (
                            <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-700">
                              Protected
                            </span>
                          ) : (
                            <button
                              onClick={() => setStatusActionTarget(user)}
                              className={`p-3 rounded-xl transition-all ${
                                user.isActive
                                  ? 'text-red-600 hover:bg-red-50'
                                  : 'text-green-600 hover:bg-green-50'
                              }`}
                              title={user.isActive ? 'Deactivate' : 'Activate'}
                              aria-label={user.isActive ? 'Deactivate user' : 'Activate user'}
                              type="button"
                            >
                              {user.isActive ? <XCircle className="w-5 h-5" /> : <CheckCircle className="w-5 h-5" />}
                            </button>
                          )}
                          <UserActionsMenu
                            user={user}
                            onEdit={handleEditUser}
                            onViewDetails={handleViewDetails}
                            onRefresh={fetchUsers}
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {pagination.totalPages && pagination.totalPages > 1 && (
            <div className="px-6 py-4 border-t flex items-center justify-between">
              <div className="text-sm text-gray-700">
                Showing page {pagination.page || 1} of {pagination.totalPages}
              </div>
              <div className="flex space-x-2">
                <button
                  type="button"
                  disabled={!pagination.page || pagination.page === 1}
                  onClick={() => setFilters({ ...filters, page: (pagination.page || 1) - 1 })}
                  className="btn-outline btn-sm"
                >
                  Previous
                </button>
                <button
                  type="button"
                  disabled={!pagination.page || pagination.page === pagination.totalPages}
                  onClick={() => setFilters({ ...filters, page: (pagination.page || 1) + 1 })}
                  className="btn-primary btn-sm"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <UserFormModal
        isOpen={isFormModalOpen}
        user={selectedUser}
        onClose={() => {
          setIsFormModalOpen(false);
          setSelectedUser(undefined);
        }}
        onSuccess={fetchUsers}
      />

      <UserDetailsModal
        isOpen={isDetailsModalOpen}
        user={detailsUser}
        onClose={() => {
          setIsDetailsModalOpen(false);
          setDetailsUser(undefined);
        }}
      />

      <BatchOperationsModal
        isOpen={isBatchModalOpen}
        selectedUserIds={Array.from(selectedUserIds)}
        selectedUserNames={selectedUserNames}
        operation={batchOperation}
        onClose={() => {
          setIsBatchModalOpen(false);
          setBatchOperation(null);
        }}
        onSuccess={() => {
          fetchUsers();
          setSelectedUserIds(new Set());
        }}
      />

      <ConfirmationModal
        isOpen={Boolean(statusActionTarget)}
        title={statusActionTarget?.isActive ? 'Deactivate user' : 'Activate user'}
        description={
          statusActionTarget
            ? `${statusActionTarget.isActive ? 'Deactivate' : 'Activate'} ${statusActionTarget.firstName} ${statusActionTarget.lastName}'s account.`
            : ''
        }
        confirmLabel={statusActionTarget?.isActive ? 'Deactivate User' : 'Activate User'}
        tone={statusActionTarget?.isActive ? 'warning' : 'primary'}
        isLoading={isUpdatingStatus}
        onClose={() => {
          if (!isUpdatingStatus) {
            setStatusActionTarget(null);
          }
        }}
        onConfirm={handleToggleStatus}
      />
    </div>
  );
};

export default UsersManagement;
