import { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { User, Mail, Shield, Edit2, Save, X } from 'lucide-react';
import toast from 'react-hot-toast';

/**
 * Profile Page
 * User profile management with edit capabilities
 */
const ProfilePage = () => {
  const { user, updateProfile } = useAuthStore();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (user) {
      setFormData({
        firstName: user.firstName,
        lastName: user.lastName,
      });
    }
  }, [user]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSave = async () => {
    if (!formData.firstName.trim() || !formData.lastName.trim()) {
      toast.error('First name and last name are required');
      return;
    }

    setIsSaving(true);
    try {
      await updateProfile(formData);
      setIsEditing(false);
      toast.success('Profile updated successfully');
    } catch (error) {
      toast.error('Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      firstName: user?.firstName || '',
      lastName: user?.lastName || '',
    });
    setIsEditing(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50">
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
          <div className="mb-12">
            <h1 className="section-title">My Profile</h1>
            <p className="section-subtitle">Manage your account information</p>
        </div>

        {/* Profile Card */}
          <div className="card mb-6 shadow-lg">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl font-bold text-gray-900">Personal Information</h2>
            {!isEditing ? (
              <button
                onClick={() => setIsEditing(true)}
                className="btn-outline btn-sm flex items-center space-x-2"
              >
                <Edit2 className="w-4 h-4" />
                <span>Edit</span>
              </button>
            ) : (
              <div className="flex space-x-2">
                <button
                  onClick={handleCancel}
                  className="btn-secondary btn-sm flex items-center space-x-2"
                >
                  <X className="w-4 h-4" />
                  <span>Cancel</span>
                </button>
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="btn-primary btn-sm flex items-center space-x-2"
                >
                  <Save className="w-4 h-4" />
                  <span>{isSaving ? 'Saving...' : 'Save'}</span>
                </button>
              </div>
            )}
          </div>

          <div className="space-y-6">
            {/* Avatar */}
              <div className="flex items-center space-x-6 pb-6 border-b border-gray-200">
                <div className="w-24 h-24 bg-gradient-to-br from-primary-600 to-primary-700 text-white rounded-2xl flex items-center justify-center text-3xl font-bold shadow-lg">
                {user?.firstName?.[0] || ''}{user?.lastName?.[0] || ''}
              </div>
              <div>
                  <p className="font-bold text-2xl text-gray-900">
                  {user?.firstName} {user?.lastName}
                </p>
                  <p className="text-sm text-gray-600 mt-1">{user?.email}</p>
              </div>
            </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* First Name */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-3 flex items-center space-x-2">
                    <div className="p-2 bg-primary-100 rounded-lg">
                      <User className="w-4 h-4 text-primary-600" />
                    </div>
                    <span>First Name</span>
                  </label>
                  {isEditing ? (
                    <input
                      type="text"
                      name="firstName"
                      value={formData.firstName}
                      onChange={handleChange}
                      className="input"
                      placeholder="Enter first name"
                    />
                  ) : (
                    <p className="text-lg font-semibold text-gray-900">{user?.firstName}</p>
                  )}
                </div>

                {/* Last Name */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-3 flex items-center space-x-2">
                    <div className="p-2 bg-primary-100 rounded-lg">
                      <User className="w-4 h-4 text-primary-600" />
                    </div>
                    <span>Last Name</span>
                  </label>
                  {isEditing ? (
                    <input
                      type="text"
                      name="lastName"
                      value={formData.lastName}
                      onChange={handleChange}
                      className="input"
                      placeholder="Enter last name"
                    />
                  ) : (
                    <p className="text-lg font-semibold text-gray-900">{user?.lastName}</p>
                  )}
                </div>

                {/* Email (Read-only) */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-3 flex items-center space-x-2">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <Mail className="w-4 h-4 text-blue-600" />
                    </div>
                    <span>Email Address</span>
                  </label>
                  <p className="text-lg font-semibold text-gray-900">{user?.email}</p>
                  <p className="text-xs text-gray-500 mt-2">Email cannot be changed</p>
                </div>

                {/* Role (Read-only) */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-3 flex items-center space-x-2">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <Shield className="w-4 h-4 text-purple-600" />
                    </div>
                    <span>Account Type</span>
                  </label>
                  <div className="inline-block">
                    <span className="badge-primary capitalize">
                      {user?.role.toLowerCase()}
                    </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Account Status */}
          <div className="card bg-gradient-to-r from-green-50 to-green-100 border-2 border-green-200 mb-6">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-green-200 rounded-lg flex-shrink-0">
                <Shield className="w-6 h-6 text-green-700" />
            </div>
            <div>
                <h3 className="font-bold text-green-900 text-lg">Account Active</h3>
                <p className="text-sm text-green-700 mt-1">
                Your account is in good standing
              </p>
            </div>
          </div>
        </div>

        {/* Teacher Profile Link */}
        {user?.role === 'TEACHER' && (
            <div className="card bg-gradient-to-r from-primary-50 to-primary-100 border-2 border-primary-200 mb-6">
              <h3 className="font-bold text-lg text-gray-900 mb-2">Teacher Profile</h3>
              <p className="text-sm text-gray-700 mb-4">
              Manage your teaching profile, certifications, and verification status
            </p>
            <button className="btn-primary">
              Go to Teacher Profile
            </button>
          </div>
        )}

        {/* Security Section */}
        <div className="card mt-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Security</h2>
          <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl border border-gray-200 hover:border-gray-300 transition-all">
              <div>
                  <p className="font-bold text-gray-900">Password</p>
                  <p className="text-sm text-gray-600 mt-1">••••••••</p>
              </div>
              <button className="btn-outline btn-sm">
                Change Password
              </button>
            </div>

              <div className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl border border-gray-200">
              <div>
                  <p className="font-bold text-gray-900">Account Created</p>
                  <p className="text-sm text-gray-600 mt-1">
                  {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Danger Zone */}
          <div className="card border-2 border-red-200 mt-6 bg-gradient-to-r from-red-50 to-red-100">
            <h2 className="text-2xl font-bold text-red-700 mb-6">Danger Zone</h2>
          <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-red-100 rounded-xl border border-red-300">
              <div>
                  <p className="font-bold text-red-900">Delete Account</p>
                  <p className="text-sm text-red-700 mt-1">
                  Permanently delete your account and all associated data
                </p>
              </div>
              <button className="btn-danger btn-sm">
                Delete Account
              </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
