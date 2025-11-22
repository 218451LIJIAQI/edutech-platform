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
      setTeachers(result.teachers || []);
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
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-4">Find Your Perfect Teacher</h1>
        <p className="text-gray-600">
          Browse our community of verified, experienced educators
        </p>
      </div>

      {/* Filters */}
      <div className="card mb-8">
        <form onSubmit={handleSearch} className="space-y-4">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
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
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="verified"
                className="w-4 h-4 text-primary-600 rounded"
                checked={verifiedOnly}
                onChange={(e) => setVerifiedOnly(e.target.checked)}
              />
              <label htmlFor="verified" className="text-sm font-medium">
                Verified Only
              </label>
            </div>

            {/* Rating Filter */}
            <div className="flex items-center space-x-2">
              <label htmlFor="rating" className="text-sm font-medium whitespace-nowrap">
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
          <div className="spinner"></div>
        </div>
      ) : teachers.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {teachers.map((teacher) => (
            <Link
              key={teacher.id}
              to={`/teachers/${teacher.id}`}
              className="card-hover"
            >
              {/* Teacher Avatar */}
              <div className="flex items-center space-x-4 mb-4">
                <div className="w-16 h-16 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center text-xl font-bold">
                  {teacher.user?.firstName?.[0]}{teacher.user?.lastName?.[0]}
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-lg">
                    {teacher.user?.firstName} {teacher.user?.lastName}
                  </h3>
                  {teacher.isVerified && (
                    <div className="flex items-center space-x-1 text-green-600 text-sm">
                      <Award className="w-4 h-4" />
                      <span>Verified Teacher</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Headline */}
              {teacher.headline && (
                <p className="text-gray-700 font-medium mb-2">{teacher.headline}</p>
              )}

              {/* Bio */}
              {teacher.bio && (
                <p className="text-gray-600 text-sm mb-4 line-clamp-2">{teacher.bio}</p>
              )}

              {/* Stats */}
              <div className="flex items-center justify-between pt-4 border-t">
                <div className="flex items-center space-x-1">
                  <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                  <span className="font-semibold">
                    {teacher.averageRating?.toFixed(1) || 'N/A'}
                  </span>
                </div>

                <div className="flex items-center space-x-1 text-gray-600">
                  <Users className="w-5 h-5" />
                  <span className="text-sm">{teacher.totalStudents || 0} students</span>
                </div>

                {teacher.hourlyRate && (
                  <div className="text-primary-600 font-semibold">
                    ${teacher.hourlyRate}/hr
                  </div>
                )}
              </div>

              {/* Certifications Count */}
              {teacher.certifications && teacher.certifications.length > 0 && (
                <div className="mt-3 pt-3 border-t">
                  <p className="text-sm text-gray-600">
                    {teacher.certifications.length} certification
                    {teacher.certifications.length !== 1 ? 's' : ''}
                  </p>
                </div>
              )}
            </Link>
          ))}
        </div>
      ) : (
        <div className="text-center py-20">
          <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold mb-2">No teachers found</h3>
          <p className="text-gray-600 mb-4">Try adjusting your filters</p>
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
  );
};

export default TeachersPage;
