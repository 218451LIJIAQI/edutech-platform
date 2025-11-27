import { useEffect, useState } from 'react';
import { UserRole, User } from '@/types';
import adminService from '@/services/admin.service';
import SearchFilter from '@/components/common/SearchFilter';
import UserFormModal from './UserFormModal';
import UserDetailsModal from './UserDetailsModal';
import BatchOperationsModal from './BatchOperationsModal';
import UserActionsMenu from './UserActionsMenu';
import { Users, Plus, Trash2, CheckCircle, XCircle, Download, Lock } from 'lucide-react';
import toast from 'react-hot-toast';

/**
 * Users Management Page (Admin)
 * Comprehensive user management with CRUD, batch operations, and audit logs
 */
const UsersManagement = () => {
  const [users, setUsers] = useState<User[]>([]);
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
  const [selectedUser, setSelectedUser] = useState<User | undefined>();
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [detailsUser, setDetailsUser] = useState<User | undefined>();

  // Batch operations
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
  const [batchOperation, setBatchOperation] = useState<'activate' | 'deactivate' | 'delete' | null>(null);
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, [filters, search]);

  const fetchUsers = async () => {
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
  };

  const handleToggleStatus = async (userId: string, currentStatus: boolean) => {
    if (!confirm(`Are you sure you want to ${currentStatus ? 'deactivate' : 'activate'} this user?`)) {
      return;
    }

    try {
      await adminService.updateUserStatus(userId, !currentStatus);
      toast.success(`User ${!currentStatus ? 'activated' : 'deactivated'} successfully`);
      fetchUsers();
    } catch (error) {
      const message = error instanceof Error && 'response' in error 
        ? (error as { response?: { data?: { message?: string } } }).response?.data?.message 
        : undefined;
      toast.error(message || 'Failed to update user status');
    }
  };

  const handleEditUser = (user: User) => {
    setSelectedUser(user);
    setIsFormModalOpen(true);
  };

  const handleViewDetails = (user: User) => {
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

  const handleExportCSV = () => {
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
      u.phone || '',
      u.role,
      u.isActive ? 'Active' : 'Inactive',
      new Date(u.createdAt).toLocaleDateString(),
    ]);

    const csv = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `users-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success('Users exported successfully');
  };

  const getRoleBadgeColor = (role: string) => {
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
  };

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

  const selectedUserNames = users
    .filter(u => selectedUserIds.has(u.id))
    .map(u => `${u.firstName} ${u.lastName}`);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-10">
          <h1 className="section-title mb-2">Users Management</h1>
          <p className="section-subtitle">Manage all platform users - students, teachers, and administrators</p>
        </div>

        {/* Search and Filter */}
        <div className="card mb-8 shadow-lg">
          <SearchFilter
            placeholder="Search by name, email, or phone..."
            onSearch={setSearch}
            filters={filterOptions}
            onFilterChange={setFilters}
          />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="card bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg">
            <h3 className="text-sm font-semibold text-blue-100 mb-3">Total Users</h3>
            <p className="text-4xl font-bold">{pagination.total || 0}</p>
          </div>
          <div className="card bg-gradient-to-br from-green-500 to-green-600 text-white shadow-lg">
            <h3 className="text-sm font-semibold text-green-100 mb-3">Active Users</h3>
            <p className="text-4xl font-bold">
              {users.filter((u) => u.isActive).length}
            </p>
          </div>
          <div className="card bg-gradient-to-br from-purple-500 to-purple-600 text-white shadow-lg">
            <h3 className="text-sm font-semibold text-purple-100 mb-3">Teachers</h3>
            <p className="text-4xl font-bold">
              {users.filter((u) => u.role === 'TEACHER').length}
            </p>
          </div>
          <div className="card bg-gradient-to-br from-orange-500 to-orange-600 text-white shadow-lg">
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
        <div className="card overflow-hidden shadow-lg">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <div className="flex flex-col items-center space-y-4">
                <div className="spinner"></div>
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
                        checked={selectedUserIds.size === users.length && users.length > 0}
                        onChange={handleSelectAll}
                        className="rounded"
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
                        />
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap">
                        <div className="flex items-center space-x-4">
                          <img
                            src={user.avatar || `https://ui-avatars.com/api/?name=${user.firstName}+${user.lastName}`}
                            alt={`${user.firstName} ${user.lastName}`}
                            className="w-12 h-12 rounded-full shadow-md"
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
                        <span className={`badge ${getRoleBadgeColor(user.role)}`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                        <span className={`badge ${
                          user.isActive ? 'badge-success' : 'badge-danger'
                        }`}>
                          {user.isActive ? 'Active' : 'Inactive'}
                        </span>
                          {user.isLocked && (
                            <span className="badge bg-red-100 text-red-800 flex items-center gap-1">
                              <Lock className="w-3 h-3" /> Locked
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap text-sm">
                        {user.phone && (
                          <div className="text-gray-700">{user.phone}</div>
                        )}
                        {user.department && (
                          <div className="text-gray-600 text-xs">{user.department}</div>
                        )}
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap text-sm">
                        {user.role === 'TEACHER' && user.teacherProfile ? (
                          <div className="space-y-1">
                            <div className="font-medium text-gray-700">{user.teacherProfile.totalStudents} students</div>
                            <div className="text-primary-600 font-bold">⭐ {user.teacherProfile.averageRating.toFixed(1)}</div>
                          </div>
                        ) : user.role === 'STUDENT' ? (
                          <div className="font-medium text-gray-700">
                            {(user as User & { _count?: { enrollments?: number } })._count?.enrollments || 0} enrollments
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
