import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Star, Users, Award, Search } from 'lucide-react';
import teacherService from '@/services/teacher.service';
import { TeacherProfile } from '@/types';

/**
 * Teachers Browse Page
 * Lists all verified teachers with filtering options
 */
const TeachersPage = () => {
  const [teachers, setTeachers] = useState<TeacherProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [minRating, setMinRating] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);

  const fetchTeachers = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Use verified teachers endpoint if verified filter is selected
      const result = verifiedOnly
        ? await teacherService.getVerifiedTeachers({
            search: searchTerm || undefined,
          })
        : await teacherService.getAllTeachers({
            minRating: minRating > 0 ? minRating : undefined,
            search: searchTerm || undefined,
          });
      setTeachers(result.items || result.teachers || []);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch teachers';
      console.error('Failed to fetch teachers:', err);
      setError(errorMessage);
      setTeachers([]);
    } finally {
      setIsLoading(false);
    }
  }, [verifiedOnly, minRating, searchTerm]);

  useEffect(() => {
    fetchTeachers();
  }, [fetchTeachers]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchTeachers();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-primary-50/10 to-indigo-50/20 relative">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.015)_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none"></div>
      
      {/* Decorative Elements */}
      <div className="absolute top-20 right-[10%] w-72 h-72 bg-primary-400/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-40 left-[5%] w-80 h-80 bg-indigo-400/10 rounded-full blur-3xl pointer-events-none"></div>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative">
        {/* Header */}
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-primary-500/25">
              <span className="text-2xl">👨‍🏫</span>
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 tracking-tight">
                Find Your <span className="bg-gradient-to-r from-primary-600 to-indigo-600 bg-clip-text text-transparent">Perfect Teacher</span>
              </h1>
              <p className="text-gray-500 font-medium mt-1">Browse our community of verified, experienced educators</p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="card mb-10 shadow-lg">
          <form onSubmit={handleSearch} className="space-y-4">
            <div className="flex flex-col md:flex-row gap-4">
              {/* Search */}
              <div className="flex-1">
                <div className="relative">
                  <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                    <Search className="text-gray-400 w-5 h-5" />
                  </div>
                  <input
                    type="text"
                    placeholder="Search by name or expertise..."
                    className="input pl-10"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>

              {/* Verified Filter */}
              <div className="flex items-center space-x-2 px-4 py-2 bg-gray-50 rounded-xl">
                <input
                  type="checkbox"
                  id="verified"
                  className="w-5 h-5 text-primary-600 rounded"
                  checked={verifiedOnly}
                  onChange={(e) => setVerifiedOnly(e.target.checked)}
                />
                <label htmlFor="verified" className="text-sm font-semibold text-gray-700">
                  Verified Only
                </label>
              </div>

              {/* Rating Filter */}
              <div className="flex items-center space-x-2 px-4 py-2 bg-gray-50 rounded-xl">
                <label htmlFor="rating" className="text-sm font-semibold text-gray-700 whitespace-nowrap">
                  Min Rating:
                </label>
                <select
                  id="rating"
                  className="input py-2"
                  value={minRating}
                  onChange={(e) => setMinRating(Number(e.target.value))}
                >
                  <option value="0">All</option>
                  <option value="3">3+ Stars</option>
                  <option value="4">4+ Stars</option>
                  <option value="4.5">4.5+ Stars</option>
                </select>
              </div>

              {/* Search Button */}
              <button type="submit" className="btn-primary whitespace-nowrap">
                Search
              </button>
            </div>
          </form>
        </div>

        {/* Error Message */}
        {error && (
          <div className="card mb-6 bg-red-50 border border-red-200 shadow-lg">
            <div className="flex items-center justify-between">
              <p className="text-red-800 font-medium">{error}</p>
              <button
                onClick={() => setError(null)}
                className="text-red-600 hover:text-red-800 font-bold text-xl"
                aria-label="Dismiss error"
              >
                ×
              </button>
            </div>
          </div>
        )}

        {/* Teachers Grid */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="flex flex-col items-center space-y-4">
              <div className="relative">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-500 to-indigo-600 animate-pulse flex items-center justify-center">
                  <span className="text-2xl">👨‍🏫</span>
                </div>
                <div className="absolute inset-0 rounded-2xl bg-primary-500/20 animate-ping"></div>
              </div>
              <p className="text-gray-600 font-medium">Loading teachers...</p>
            </div>
          </div>
        ) : teachers.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {teachers.map((teacher) => (
              <Link
                key={teacher.id}
                to={`/teachers/${teacher.id}`}
                className="card-hover shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105 border border-gray-100 hover:border-primary-200 rounded-2xl"
              >
                {/* Teacher Avatar */}
                <div className="flex items-center gap-4 mb-5">
                  {teacher.user?.avatar ? (
                    <img
                      src={teacher.user.avatar}
                      alt={`${teacher.user.firstName} ${teacher.user.lastName}`}
                      className="w-20 h-20 rounded-full object-cover shadow-lg border-2 border-primary-200"
                    />
                  ) : (
                  <div className="w-20 h-20 bg-gradient-to-br from-primary-600 to-primary-700 text-white rounded-full flex items-center justify-center text-2xl font-bold shadow-lg border-2 border-primary-300">
                    {teacher.user?.firstName?.[0]}{teacher.user?.lastName?.[0]}
                  </div>
                  )}
                  <div className="flex-1">
                    <h3 className="font-bold text-xl text-gray-900">
                      {teacher.user?.firstName} {teacher.user?.lastName}
                    </h3>
                    {teacher.isVerified && (
                      <div className="flex items-center gap-1 text-green-600 text-sm font-bold bg-green-50 px-2 py-1 rounded-lg w-fit mt-1">
                        <Award className="w-4 h-4" />
                        <span>Verified</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Headline */}
                {teacher.headline && (
                  <p className="text-gray-700 font-semibold mb-2">{teacher.headline}</p>
                )}

                {/* Bio */}
                {teacher.bio && (
                  <p className="text-gray-600 text-sm mb-4 line-clamp-2">{teacher.bio}</p>
                )}

                {/* Stats */}
                <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                  <div className="flex items-center space-x-1">
                    <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                    <span className="font-bold text-gray-900">
                      {teacher.averageRating?.toFixed(1) || 'N/A'}
                    </span>
                  </div>

                  <div className="flex items-center space-x-1 text-gray-600">
                    <Users className="w-5 h-5" />
                    <span className="text-sm font-medium">{teacher.totalStudents || 0} students</span>
                  </div>

                  {teacher.hourlyRate && (
                    <div className="text-primary-600 font-bold">
                      ${teacher.hourlyRate}/hr
                    </div>
                  )}
                </div>

                {/* Certifications Count */}
                {teacher.certifications && teacher.certifications.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <p className="text-sm text-gray-600 font-medium">
                      🏆 {teacher.certifications.length} certification
                      {teacher.certifications.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                )}
              </Link>
            ))}
          </div>
        ) : (
          <div className="card text-center py-16 shadow-lg max-w-md mx-auto">
            <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-2xl font-bold text-gray-900 mb-2">No teachers found</h3>
            <p className="text-gray-600 mb-6">Try adjusting your filters</p>
            <button
              onClick={() => {
                setSearchTerm('');
                setVerifiedOnly(false);
                setMinRating(0);
                fetchTeachers();
              }}
              className="btn-outline"
            >
              Clear Filters
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default TeachersPage;
