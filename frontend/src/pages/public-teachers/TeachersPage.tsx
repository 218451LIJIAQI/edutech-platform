import { useEffect, useState, useCallback, useRef } from 'react';
import clientLogger from '@/utils/logger';
import { Link } from 'react-router-dom';
import { Star, Users, Award, Search, GraduationCap, Trophy } from 'lucide-react';
import teacherService from '@/services/teacher.service';
import { TeacherProfile } from '@/types';
import { extractErrorMessage } from '@/utils/error-handler';
import { getTeacherDisplayPhoto } from '@/utils/asset-normalizers';
import { useDebounce, usePageTitle } from '@/hooks';

const PAGE_LIMIT = 12;

const TeachersPage = () => {
  usePageTitle('Find Teachers');
  const [teachers, setTeachers] = useState<TeacherProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [verifiedOnly, setVerifiedOnly] = useState(true);
  const [minRating, setMinRating] = useState<number>(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef(0);

  const debouncedSearch = useDebounce(searchTerm, 300);
  const hasActiveFilters = Boolean(searchTerm.trim() || !verifiedOnly || minRating > 0);

  const fetchTeachers = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    setIsLoading(true);
    setError(null);
    try {
      const query = {
        search: debouncedSearch.trim() || undefined,
        minRating: minRating > 0 ? minRating : undefined,
        page,
        limit: PAGE_LIMIT,
      };

      const result = verifiedOnly
        ? await teacherService.getVerifiedTeachers(query)
        : await teacherService.getAllTeachers(query);

      if (requestId !== requestIdRef.current) return;

      setTeachers(result.items || result.teachers || []);
      setTotalPages(Math.max(1, result.pagination?.totalPages || 1));
    } catch (fetchError) {
      if (requestId !== requestIdRef.current) return;
      const errorMessage = extractErrorMessage(fetchError, 'Failed to fetch teachers');
      clientLogger.error('Failed to fetch teachers:', fetchError);
      setError(errorMessage);
      setTeachers([]);
    } finally {
      if (requestId === requestIdRef.current) {
        setIsLoading(false);
      }
    }
  }, [verifiedOnly, minRating, debouncedSearch, page]);

  useEffect(() => {
    void fetchTeachers();
  }, [fetchTeachers]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    void fetchTeachers();
  };

  const resetFilters = () => {
    setSearchTerm('');
    setVerifiedOnly(true);
    setMinRating(0);
    setPage(1);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-primary-50/10 to-indigo-50/20 relative">
      <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.015)_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-gradient-to-br from-primary-600 to-indigo-700 rounded-2xl flex items-center justify-center shadow-lg shadow-primary-500/25">
              <GraduationCap className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900">
                Find Your{' '}
                <span className="bg-gradient-to-r from-primary-600 to-indigo-600 bg-clip-text text-transparent">
                  Instructor
                </span>
              </h1>
              <p className="text-slate-600 font-medium mt-0.5">
                {verifiedOnly
                  ? 'Browse credential-verified educators across subjects'
                  : 'Browse approved teachers with completed public profiles'}
              </p>
            </div>
          </div>
        </div>

        <div className="card mb-8">
          <form onSubmit={handleSearch}>
            <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                  <input
                    type="text"
                    placeholder="Search by instructor name, specialty, or headline..."
                    aria-label="Search teachers"
                    className="input pl-10"
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      setPage(1);
                    }}
                  />
                </div>
              </div>

              <label
                htmlFor="verified"
                className="flex items-center gap-2.5 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer select-none"
              >
                <input
                  type="checkbox"
                  id="verified"
                  className="w-4 h-4 text-primary-600 rounded"
                  checked={verifiedOnly}
                  onChange={(e) => {
                    setVerifiedOnly(e.target.checked);
                    setPage(1);
                  }}
                />
                <span className="text-sm font-semibold text-slate-700 whitespace-nowrap">
                  Verified Only
                </span>
              </label>

              <div className="flex items-center gap-2">
                <label
                  htmlFor="rating"
                  className="text-sm font-semibold text-slate-700 whitespace-nowrap"
                >
                  Min Rating:
                </label>
                <select
                  id="rating"
                  className="input py-2.5 w-36"
                  value={minRating}
                  onChange={(e) => {
                    setMinRating(Number(e.target.value));
                    setPage(1);
                  }}
                >
                  <option value="0">Any</option>
                  <option value="3">3.0+ Stars</option>
                  <option value="4">4.0+ Stars</option>
                  <option value="4.5">4.5+ Stars</option>
                </select>
              </div>

              <button type="submit" className="btn-primary whitespace-nowrap">
                Search
              </button>
            </div>
          </form>
        </div>

        {error && (
          <div className="card mb-6 bg-red-50 border border-red-200 flex items-center justify-between gap-4">
            <p className="text-red-800 text-sm font-medium">{error}</p>
            <button
              type="button"
              onClick={() => void fetchTeachers()}
              className="btn-outline btn-sm"
            >
              Retry
            </button>
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="flex flex-col items-center space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-600 to-indigo-700 animate-pulse flex items-center justify-center">
                <GraduationCap className="w-8 h-8 text-white" />
              </div>
              <p className="text-slate-600 font-medium">Loading teachers...</p>
            </div>
          </div>
        ) : teachers.length > 0 ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {teachers.map((teacher) => {
                const displayPhoto = getTeacherDisplayPhoto(teacher);

                return (
                  <Link
                    key={teacher.id}
                    to={`/teachers/${teacher.id}`}
                    className="card card-smooth flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center gap-4 mb-4">
                        {displayPhoto ? (
                          <img
                            src={displayPhoto}
                            alt={`${teacher.user?.firstName ?? ''} ${teacher.user?.lastName ?? ''}`.trim()}
                            className="w-16 h-16 rounded-full object-cover shadow-md border-2 border-primary-100 shrink-0"
                          />
                        ) : (
                          <div className="w-16 h-16 bg-gradient-to-br from-primary-600 to-indigo-700 text-white rounded-full flex items-center justify-center text-xl font-bold shadow-md shrink-0">
                            {teacher.user?.firstName?.[0]}
                            {teacher.user?.lastName?.[0]}
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <h3 className="font-bold text-lg text-slate-900 truncate">
                            {teacher.user?.firstName} {teacher.user?.lastName}
                          </h3>
                          {teacher.isVerified && (
                            <span className="badge-success mt-1">
                              <Award className="w-3.5 h-3.5" />
                              Verified
                            </span>
                          )}
                        </div>
                      </div>

                      {teacher.headline && (
                        <p className="text-slate-800 font-semibold text-sm mb-1.5 line-clamp-2">
                          {teacher.headline}
                        </p>
                      )}

                      {teacher.bio && (
                        <p className="text-slate-600 text-sm mb-4 line-clamp-2">{teacher.bio}</p>
                      )}
                    </div>

                    <div>
                      <div className="flex items-center justify-between pt-4 border-t border-slate-100 tabular-nums">
                        <div className="flex items-center gap-1">
                          <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                          <span className="font-bold text-slate-900 text-sm">
                            {teacher.averageRating ? teacher.averageRating.toFixed(1) : 'New'}
                          </span>
                        </div>

                        <div className="flex items-center gap-1 text-slate-600">
                          <Users className="w-4 h-4" />
                          <span className="text-sm font-medium">
                            {teacher.totalStudents || 0} students
                          </span>
                        </div>

                        {teacher.hourlyRate ? (
                          <div className="text-primary-700 font-bold text-sm">
                            ${teacher.hourlyRate}/hr
                          </div>
                        ) : null}
                      </div>

                      {teacher.certifications && teacher.certifications.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-slate-100">
                          <p className="text-xs text-slate-600 font-medium flex items-center gap-1.5 tabular-nums">
                            <Trophy className="w-3.5 h-3.5 text-amber-500" />
                            <span>
                              {teacher.certifications.length} credential
                              {teacher.certifications.length !== 1 ? 's' : ''}
                            </span>
                          </p>
                        </div>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>

            {totalPages > 1 && (
              <div className="mt-10 flex items-center justify-center gap-3">
                <button
                  type="button"
                  disabled={page <= 1 || isLoading}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="btn-secondary btn-sm"
                >
                  Previous
                </button>
                <span className="text-sm text-slate-700 font-medium tabular-nums">
                  Page {page} of {totalPages}
                </span>
                <button
                  type="button"
                  disabled={page >= totalPages || isLoading}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="btn-primary btn-sm"
                >
                  Next
                </button>
              </div>
            )}
          </>
        ) : !error ? (
          <div className="card text-center py-14 max-w-md mx-auto">
            <Users className="w-14 h-14 text-slate-300 mx-auto mb-3" />
            <h3 className="text-xl font-bold text-slate-900 mb-2">
              {hasActiveFilters ? 'No matching teachers found' : 'No teachers listed yet'}
            </h3>
            <p className="text-slate-600 text-sm mb-6">
              {hasActiveFilters
                ? 'Try clearing your search query, lowering the rating threshold, or viewing all approved teachers.'
                : 'Approved educators will appear here once their public profiles are published.'}
            </p>
            {hasActiveFilters && (
              <button type="button" onClick={resetFilters} className="btn-outline">
                Reset Filters
              </button>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default TeachersPage;
