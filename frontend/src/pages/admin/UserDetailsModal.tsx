import { User } from '@/types';
import { X, Mail, Phone, MapPin, Briefcase, Calendar, Award, Users } from 'lucide-react';

interface UserDetailsModalProps {
  isOpen: boolean;
  user?: User;
  onClose: () => void;
}

/**
 * User Details Modal Component
 * Display detailed user information
 */
const UserDetailsModal = ({ isOpen, user, onClose }: UserDetailsModalProps) => {
  if (!isOpen || !user) return null;

  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b sticky top-0 bg-white">
          <h2 className="text-2xl font-bold text-gray-900">User Details</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* User Header */}
          <div className="flex items-center gap-4">
            <img
              src={user.avatar || `https://ui-avatars.com/api/?name=${user.firstName}+${user.lastName}`}
              alt={`${user.firstName} ${user.lastName}`}
              className="w-20 h-20 rounded-full shadow-md"
            />
            <div>
              <h3 className="text-2xl font-bold text-gray-900">
                {user.firstName} {user.lastName}
              </h3>
              <div className="flex items-center gap-2 mt-1">
                <span className={`badge ${
                  user.role === 'ADMIN' ? 'bg-red-100 text-red-800' :
                  user.role === 'TEACHER' ? 'bg-blue-100 text-blue-800' :
                  'bg-green-100 text-green-800'
                }`}>
                  {user.role}
                </span>
                <span className={`badge ${
                  user.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                }`}>
                  {user.isActive ? 'Active' : 'Inactive'}
                </span>
                {user.isLocked && (
                  <span className="badge bg-red-100 text-red-800">Locked</span>
                )}
              </div>
            </div>
          </div>

          {/* Contact Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-start gap-3">
              <Mail className="w-5 h-5 text-gray-400 mt-1" />
              <div>
                <p className="text-sm text-gray-600">Email</p>
                <p className="font-medium text-gray-900">{user.email}</p>
              </div>
            </div>

            {user.phone && (
              <div className="flex items-start gap-3">
                <Phone className="w-5 h-5 text-gray-400 mt-1" />
                <div>
                  <p className="text-sm text-gray-600">Phone</p>
                  <p className="font-medium text-gray-900">{user.phone}</p>
                </div>
              </div>
            )}

            {user.address && (
              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-gray-400 mt-1" />
                <div>
                  <p className="text-sm text-gray-600">Address</p>
                  <p className="font-medium text-gray-900">{user.address}</p>
                </div>
              </div>
            )}

            {user.department && (
              <div className="flex items-start gap-3">
                <Briefcase className="w-5 h-5 text-gray-400 mt-1" />
                <div>
                  <p className="text-sm text-gray-600">Department</p>
                  <p className="font-medium text-gray-900">{user.department}</p>
                </div>
              </div>
            )}
          </div>

          {/* Account Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
            <div>
              <p className="text-sm text-gray-600">Joined</p>
              <p className="font-medium text-gray-900 flex items-center gap-2 mt-1">
                <Calendar className="w-4 h-4" />
                {formatDate(user.createdAt)}
              </p>
            </div>

            {user.lastLoginAt && (
              <div>
                <p className="text-sm text-gray-600">Last Login</p>
                <p className="font-medium text-gray-900">
                  {formatDate(user.lastLoginAt)}
                </p>
              </div>
            )}

            {user.loginCount !== undefined && (
              <div>
                <p className="text-sm text-gray-600">Login Count</p>
                <p className="font-medium text-gray-900">{user.loginCount} times</p>
              </div>
            )}
          </div>

          {/* Teacher-Specific Information */}
          {user.role === 'TEACHER' && user.teacherProfile && (
            <div className="pt-4 border-t space-y-4">
              <h4 className="font-bold text-gray-900">Teacher Information</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-start gap-3">
                  <Users className="w-5 h-5 text-gray-400 mt-1" />
                  <div>
                    <p className="text-sm text-gray-600">Total Students</p>
                    <p className="font-medium text-gray-900">
                      {user.teacherProfile.totalStudents}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Award className="w-5 h-5 text-gray-400 mt-1" />
                  <div>
                    <p className="text-sm text-gray-600">Average Rating</p>
                    <p className="font-medium text-gray-900">
                      ⭐ {user.teacherProfile.averageRating.toFixed(1)}/5
                    </p>
                  </div>
                </div>

                <div>
                  <p className="text-sm text-gray-600">Verification Status</p>
                  <p className={`font-medium mt-1 ${
                    user.teacherProfile.isVerified ? 'text-green-600' : 'text-yellow-600'
                  }`}>
                    {user.teacherProfile.isVerified ? '✓ Verified' : '⏳ Pending'}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-gray-600">Total Earnings</p>
                  <p className="font-medium text-gray-900">
                    ${user.teacherProfile.totalEarnings?.toFixed(2) || '0.00'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Student-Specific Information */}
          {user.role === 'STUDENT' && (
            <div className="pt-4 border-t">
              <h4 className="font-bold text-gray-900">Student Information</h4>
              <div className="mt-4">
                <p className="text-sm text-gray-600">Enrolled Courses</p>
                <p className="font-medium text-gray-900 mt-1">
                  {(user as any)._count?.enrollments || 0} course(s)
                </p>
              </div>
            </div>
          )}

          {/* Close Button */}
          <div className="pt-4 border-t">
            <button
              onClick={onClose}
              className="w-full px-4 py-2 bg-gray-100 text-gray-900 rounded-lg font-medium hover:bg-gray-200 transition-colors"
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

