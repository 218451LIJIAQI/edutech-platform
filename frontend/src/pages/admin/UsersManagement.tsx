import { useEffect, useState, useCallback, useMemo } from 'react';
import { UserRole, User } from '@/types';
import adminService from '@/services/admin.service';
import SearchFilter from '@/components/common/SearchFilter';
import UserFormModal from './UserFormModal';
import UserDetailsModal from './UserDetailsModal';
import BatchOperationsModal from './BatchOperationsModal';
import UserActionsMenu from './UserActionsMenu';
import { Users, Plus, Trash2, CheckCircle, XCircle, Download, Lock } from 'lucide-react';
import toast from 'react-hot-toast';

interface ExtendedUser extends User {
  phone?: string;
  department?: string;
  isLocked?: boolean;
  _count?: {
    enrollments?: number;
  };
}

/**
 * Users Management Page (Admin)
 * Comprehensive user management with CRUD, batch operations, and audit logs
 */
const UsersManagement = () => {
  const [users, setUsers] = useState<ExtendedUser[]>([]);
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

  // Modal states
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<ExtendedUser | undefined>();
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [detailsUser, setDetailsUser] = useState<ExtendedUser | undefined>();

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
    } catch (error) {
      console.error('Failed to fetch users:', error);
      toast.error('Failed to load users');
    } finally {
      setIsLoading(false);
    }
  }, [filters, search]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleToggleStatus = async (userId: string, currentStatus: boolean) => {
    const action = currentStatus ? 'deactivate' : 'activate';
    if (!window.confirm(`Are you sure you want to ${action} this user?`)) {
      return;
    }

    try {
      await adminService.updateUserStatus(userId, !currentStatus);
      toast.success(`User ${!currentStatus ? 'activated' : 'deactivated'} successfully`);
      fetchUsers();
    } catch (error) {
      let errorMessage = 'Failed to update user status';
      
      if (error instanceof Error) {
        if ('response' in error) {
          const responseError = error as { response?: { data?: { message?: string } } };
          errorMessage = responseError.response?.data?.message || errorMessage;
        } else {
          errorMessage = error.message || errorMessage;
        }
      }
      
      toast.error(errorMessage);
    }
  };

  const handleEditUser = (user: ExtendedUser) => {
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
    const newSelected = new Set(selectedUserIds);
    if (newSelected.has(userId)) {
      newSelected.delete(userId);
    } else {
      newSelected.add(userId);
    }
    setSelectedUserIds(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedUserIds.size === users.length) {
      setSelectedUserIds(new Set());
    } else {
      setSelectedUserIds(new Set(users.map(u => u.id)));
    }
  };

  const handleBatchOperation = (operation: 'activate' | 'deactivate' | 'delete') => {
    if (selectedUserIds.size === 0) {
      toast.error('Please select at least one user');
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

    const escapeCSV = (value: string | number | undefined): string => {
      if (value === undefined || value === null) return '';
      const str = String(value);
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const headers = ['ID', 'First Name', 'Last Name', 'Email', 'Phone', 'Role', 'Status', 'Joined'];
    const rows = users.map(u => [
      escapeCSV(u.id),
      escapeCSV(u.firstName),
      escapeCSV(u.lastName),
      escapeCSV(u.email),
      escapeCSV((u as ExtendedUser).phone),
      escapeCSV(u.role),
      escapeCSV(u.isActive ? 'Active' : 'Inactive'),
      escapeCSV(new Date(u.createdAt).toLocaleDateString()),
    ]);

    const csv = [
      headers.join(','),
      ...rows.map(row => row.join(',')),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `users-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
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

  const handleImageError = useCallback((e: React.SyntheticEvent<HTMLImageElement, Event>, user: ExtendedUser) => {
    const target = e.currentTarget;
    const name = `${user.firstName}+${user.lastName}`;
    target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}`;
  }, []);

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
              <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 tracking-tight">
                Users <span className="bg-gradient-to-r from-primary-600 to-indigo-600 bg-clip-text text-transparent">Management</span>
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
            <p className="text-4xl font-bold">{pagination.total || 0}</p>
          </div>
          <div className="card bg-gradient-to-br from-green-500 to-green-600 text-white shadow-xl">
            <h3 className="text-sm font-semibold text-green-100 mb-3">Active Users</h3>
            <p className="text-4xl font-bold">
              {users.filter((u) => u.isActive).length}
            </p>
          </div>
          <div className="card bg-gradient-to-br from-purple-500 to-purple-600 text-white shadow-xl">
            <h3 className="text-sm font-semibold text-purple-100 mb-3">Teachers</h3>
            <p className="text-4xl font-bold">
              {users.filter((u) => u.role === 'TEACHER').length}
            </p>
          </div>
          <div className="card bg-gradient-to-br from-orange-500 to-orange-600 text-white shadow-xl">
            <h3 className="text-sm font-semibold text-orange-100 mb-3">Students</h3>
            <p className="text-4xl font-bold">
              {users.filter((u) => u.role === 'STUDENT').length}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mb-8 flex flex-wrap gap-3">
          <button
            onClick={handleCreateUser}
            className="btn btn-primary flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Create User
          </button>

          {selectedUserIds.size > 0 && (
            <>
              <button
                onClick={() => handleBatchOperation('activate')}
                className="btn bg-green-600 text-white hover:bg-green-700 flex items-center gap-2"
              >
                <CheckCircle className="w-5 h-5" />
                Activate ({selectedUserIds.size})
              </button>
              <button
                onClick={() => handleBatchOperation('deactivate')}
                className="btn bg-yellow-600 text-white hover:bg-yellow-700 flex items-center gap-2"
              >
                <XCircle className="w-5 h-5" />
                Deactivate ({selectedUserIds.size})
              </button>
              <button
                onClick={() => handleBatchOperation('delete')}
                className="btn bg-red-600 text-white hover:bg-red-700 flex items-center gap-2"
              >
                <Trash2 className="w-5 h-5" />
                Delete ({selectedUserIds.size})
              </button>
            </>
          )}

          <button
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
                <div className="relative"><div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-500 to-indigo-600 animate-pulse flex items-center justify-center"><span className="text-2xl">👥</span></div><div className="absolute inset-0 rounded-2xl bg-primary-500/20 animate-ping"></div></div><p className="text-gray-600 font-medium">Loading users...</p>
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
                        checked={selectedUserIds.size === users.length && users.length > 0}
                        onChange={handleSelectAll}
                        className="rounded"
                        aria-label="Select all users"
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
                          checked={selectedUserIds.has(user.id)}
                          onChange={() => handleSelectUser(user.id)}
                          className="rounded"
                          aria-label={`Select ${user.firstName} ${user.lastName}`}
                        />
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap">
                        <div className="flex items-center space-x-4">
                          <img
                            src={user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.firstName)}+${encodeURIComponent(user.lastName)}`}
                            alt={`${user.firstName} ${user.lastName}`}
                            className="w-12 h-12 rounded-full shadow-md object-cover"
                            onError={(e) => handleImageError(e, user)}
                          />
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
                            <div className="text-primary-600 font-bold">
                              ⭐ {typeof user.teacherProfile.averageRating === 'number' && !isNaN(user.teacherProfile.averageRating)
                                ? user.teacherProfile.averageRating.toFixed(1)
                                : '0.0'}
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
                          <button
                            onClick={() => handleToggleStatus(user.id, user.isActive)}
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
                  disabled={!pagination.page || pagination.page === 1}
                  onClick={() => setFilters({ ...filters, page: (pagination.page || 1) - 1 })}
                  className="btn-outline btn-sm"
                >
                  Previous
                </button>
                <button
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
    </div>
  );
};

export default UsersManagement;
