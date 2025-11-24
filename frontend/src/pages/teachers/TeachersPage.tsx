import { useEffect, useState } from 'react';
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

  useEffect(() => {
    fetchTeachers();
  }, [verifiedOnly, minRating]);

  const fetchTeachers = async () => {
    setIsLoading(true);
    try {
      const result = await teacherService.getAllTeachers({
        isVerified: verifiedOnly || undefined,
        minRating: minRating || undefined,
        search: searchTerm || undefined,
      });
      setTeachers(result.items || result.teachers || []);
    } catch (error) {
      console.error('Failed to fetch teachers:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchTeachers();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-10">
          <h1 className="section-title mb-4">Find Your Perfect Teacher</h1>
          <p className="section-subtitle">
            Browse our community of verified, experienced educators
          </p>
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

        {/* Teachers Grid */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="flex flex-col items-center space-y-4">
              <div className="spinner"></div>
              <p className="text-gray-600 font-medium">Loading teachers...</p>
            </div>
          </div>
        ) : teachers.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {teachers.map((teacher) => (
              <Link
                key={teacher.id}
                to={`/teachers/${teacher.id}`}
                className="card-hover shadow-lg"
              >
                {/* Teacher Avatar */}
                <div className="flex items-center space-x-4 mb-4">
                  <div className="w-16 h-16 bg-gradient-to-br from-primary-600 to-primary-700 text-white rounded-full flex items-center justify-center text-xl font-bold shadow-md">
                    {teacher.user?.firstName?.[0]}{teacher.user?.lastName?.[0]}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-lg text-gray-900">
                      {teacher.user?.firstName} {teacher.user?.lastName}
                    </h3>
                    {teacher.isVerified && (
                      <div className="flex items-center space-x-1 text-green-600 text-sm font-semibold">
                        <Award className="w-4 h-4" />
                        <span>Verified Teacher</span>
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
