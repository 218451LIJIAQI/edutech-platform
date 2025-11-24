import { useEffect, useState } from 'react';
import { UserRole, User } from '@/types';
import adminService from '@/services/admin.service';
import SearchFilter from '@/components/common/SearchFilter';
import { Users, Trash2, CheckCircle, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';

/**
 * Users Management Page (Admin)
 * View and manage all platform users
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
  }>({});
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchUsers();
  }, [filters, search]);

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const data = await adminService.getAllUsers({
        ...filters,
        search,
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

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      return;
    }

    try {
      await adminService.deleteUser(userId);
      toast.success('User deleted successfully');
      fetchUsers();
    } catch (error) {
      const message = error instanceof Error && 'response' in error 
        ? (error as { response?: { data?: { message?: string } } }).response?.data?.message 
        : undefined;
      toast.error(message || 'Failed to delete user');
    }
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-10">
          <h1 className="section-title mb-2">Users Management</h1>
          <p className="section-subtitle">View and manage all platform users</p>
        </div>

        {/* Search and Filter */}
        <div className="card mb-8 shadow-lg">
          <SearchFilter
            placeholder="Search by name or email..."
            onSearch={setSearch}
            filters={filterOptions}
            onFilterChange={setFilters}
          />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
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
              <p className="text-gray-600">Try adjusting your filters</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b-2 border-gray-200">
                  <tr>
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
                        <span className={`badge ${getRoleBadgeColor(user.role).replace('bg-', 'bg-gradient-to-r from-').replace('text-', 'text-')}`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap">
                        <span className={`badge ${
                          user.isActive ? 'badge-success' : 'badge-danger'
                        }`}>
                          {user.isActive ? 'Active' : 'Inactive'}
                        </span>
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
                          {user.role !== 'ADMIN' && (
                            <button
                              onClick={() => handleDeleteUser(user.id)}
                              className="p-3 text-red-600 hover:bg-red-50 rounded-xl transition-all"
                              title="Delete user"
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
                          )}
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
    </div>
  );
};

export default UsersManagement;

