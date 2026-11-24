import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useCourseStore } from '@/store/course-store';
import { formatCurrency } from '@/utils/helpers';
import { getCourseLessonCount } from '@/utils/course-counts';
import { Course, CourseType } from '@/types';
import { usePageTitle, useDebounce, useSmoothLoading } from '@/hooks';
import {
  Video,
  Radio,
  PlayCircle,
  Search,
  SlidersHorizontal,
  BookOpen,
  AlertCircle,
} from 'lucide-react';
import EmptyState from '@/components/common/EmptyState';
import { CardSkeleton } from '@/components/common/Skeleton';

const PAGE_LIMIT = 12;

const getMinPackagePrice = (course: Course): number | null => {
  if (!course.packages || course.packages.length === 0) {
    return null;
  }
  return Math.min(...course.packages.map((pkg) => pkg.finalPrice));
};

const CoursesPage = () => {
  usePageTitle('Explore Courses');
  const {
    courses,
    pagination,
    categories,
    isLoading,
    error,
    fetchCourses,
    fetchCategories,
    clearError,
  } = useCourseStore();
  const [searchParams, setSearchParams] = useSearchParams();

  const { showSkeleton, contentClass } = useSmoothLoading(isLoading);

  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [category, setCategory] = useState(searchParams.get('category') || '');
  const [courseType, setCourseType] = useState<'' | 'LIVE' | 'RECORDED' | 'HYBRID'>(
    (searchParams.get('type') as '' | 'LIVE' | 'RECORDED' | 'HYBRID') || ''
  );
  const [minRating, setMinRating] = useState<number | ''>(
    searchParams.get('minRating') ? Number(searchParams.get('minRating')) : ''
  );
  const [minPrice, setMinPrice] = useState<number | ''>(
    searchParams.get('minPrice') ? Number(searchParams.get('minPrice')) : ''
  );
  const [maxPrice, setMaxPrice] = useState<number | ''>(
    searchParams.get('maxPrice') ? Number(searchParams.get('maxPrice')) : ''
  );
  const [sortBy, setSortBy] = useState<
    'NEWEST' | 'RATING' | 'POPULARITY' | 'PRICE_ASC' | 'PRICE_DESC'
  >(
    (searchParams.get('sortBy') as
      | 'NEWEST'
      | 'RATING'
      | 'POPULARITY'
      | 'PRICE_ASC'
      | 'PRICE_DESC') || 'NEWEST'
  );
  const [page, setPage] = useState<number>(() => {
    const parsed = Number(searchParams.get('page'));
    return Number.isInteger(parsed) && parsed > 0 ? parsed : 1;
  });

  const [showFilters, setShowFilters] = useState(false);

  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  const hasPriceRangeError = useMemo(
    () =>
      minPrice !== '' &&
      maxPrice !== '' &&
      !Number.isNaN(minPrice) &&
      !Number.isNaN(maxPrice) &&
      Number(minPrice) > Number(maxPrice),
    [minPrice, maxPrice]
  );

  const hasActiveFilters = Boolean(
    searchQuery.trim() ||
      category ||
      courseType ||
      minRating !== '' ||
      minPrice !== '' ||
      maxPrice !== ''
  );

  const clearAllFilters = useCallback(() => {
    setSearchQuery('');
    setCategory('');
    setCourseType('');
    setMinRating('');
    setMinPrice('');
    setMaxPrice('');
    setSortBy('NEWEST');
    setPage(1);
    clearError();
  }, [clearError]);

  useEffect(() => {
    void fetchCategories();
  }, [fetchCategories]);

  useEffect(() => {
    const sp = new URLSearchParams();
    if (searchQuery) sp.set('q', searchQuery);
    if (category) sp.set('category', category);
    if (courseType) sp.set('type', courseType);
    if (minRating !== '' && !Number.isNaN(minRating)) sp.set('minRating', String(minRating));
    if (minPrice !== '' && !Number.isNaN(minPrice)) sp.set('minPrice', String(minPrice));
    if (maxPrice !== '' && !Number.isNaN(maxPrice)) sp.set('maxPrice', String(maxPrice));
    if (sortBy && sortBy !== 'NEWEST') sp.set('sortBy', sortBy);
    if (page > 1) sp.set('page', String(page));
    setSearchParams(sp, { replace: true });
  }, [
    searchQuery,
    category,
    courseType,
    minRating,
    minPrice,
    maxPrice,
    sortBy,
    page,
    setSearchParams,
  ]);

  const loadCourses = useCallback(() => {
    if (hasPriceRangeError) {
      return;
    }

    const params: {
      search?: string;
      category?: string;
      courseType?: 'LIVE' | 'RECORDED' | 'HYBRID';
      minRating?: number;
      minPrice?: number;
      maxPrice?: number;
      sortBy?: 'NEWEST' | 'RATING' | 'POPULARITY' | 'PRICE_ASC' | 'PRICE_DESC';
      page: number;
      limit: number;
    } = {
      page,
      limit: PAGE_LIMIT,
    };

    if (debouncedSearchQuery.trim()) params.search = debouncedSearchQuery.trim();
    if (category) params.category = category;
    if (courseType) params.courseType = courseType;
    if (minRating !== '' && !Number.isNaN(minRating)) params.minRating = Number(minRating);
    if (minPrice !== '' && !Number.isNaN(minPrice)) params.minPrice = Number(minPrice);
    if (maxPrice !== '' && !Number.isNaN(maxPrice)) params.maxPrice = Number(maxPrice);
    if (sortBy) params.sortBy = sortBy;

    void fetchCourses(params);
  }, [
    hasPriceRangeError,
    page,
    debouncedSearchQuery,
    category,
    courseType,
    minRating,
    minPrice,
    maxPrice,
    sortBy,
    fetchCourses,
  ]);

  useEffect(() => {
    loadCourses();
  }, [loadCourses]);

  const renderSkeletons = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="skeleton-breathe">
          <CardSkeleton />
        </div>
      ))}
    </div>
  );

  const totalPages = pagination?.totalPages ?? 1;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-primary-50/10 to-indigo-50/20 relative">
      <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.015)_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative">
        <div className="mb-8">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-primary-600 to-indigo-700 rounded-2xl flex items-center justify-center shadow-lg shadow-primary-500/25">
                <BookOpen className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900">
                  Explore{' '}
                  <span className="bg-gradient-to-r from-primary-600 to-indigo-600 bg-clip-text text-transparent">
                    Courses
                  </span>
                </h1>
                <p className="text-slate-600 font-medium mt-0.5">
                  Structured recorded, live, and hybrid courses from verified instructors
                </p>
              </div>
            </div>

            {pagination && !isLoading && !error && (
              <p className="text-sm text-slate-600 font-medium tabular-nums">
                {pagination.total} course{pagination.total !== 1 ? 's' : ''} available
              </p>
            )}
          </div>

          <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
              <input
                className="input w-full pl-10"
                placeholder="Search courses by title, topic, or category..."
                aria-label="Search courses"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(1);
                }}
              />
            </div>

            <div className="flex items-center gap-2">
              <label
                htmlFor="sort-select"
                className="text-sm text-slate-600 font-semibold whitespace-nowrap"
              >
                Sort:
              </label>
              <select
                id="sort-select"
                title="Sort courses"
                className="input py-2.5 w-48"
                value={sortBy}
                onChange={(e) => {
                  setSortBy(
                    e.target.value as
                      | 'NEWEST'
                      | 'RATING'
                      | 'POPULARITY'
                      | 'PRICE_ASC'
                      | 'PRICE_DESC'
                  );
                  setPage(1);
                }}
              >
                <option value="NEWEST">Newest</option>
                <option value="RATING">Top Rated</option>
                <option value="POPULARITY">Most Popular</option>
                <option value="PRICE_ASC">Price: Low to High</option>
                <option value="PRICE_DESC">Price: High to Low</option>
              </select>
            </div>

            <button
              type="button"
              onClick={() => setShowFilters((v) => !v)}
              aria-expanded={showFilters}
              className={`btn ${
                showFilters
                  ? 'bg-primary-50 border border-primary-300 text-primary-800'
                  : 'btn-secondary'
              }`}
            >
              <SlidersHorizontal className="w-4 h-4" />
              Filters
            </button>
          </div>
        </div>

        {showFilters && (
          <div className="card mb-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label
                  htmlFor="category-select"
                  className="block text-sm font-semibold text-slate-700 mb-1.5"
                >
                  Category
                </label>
                <select
                  id="category-select"
                  value={category}
                  onChange={(e) => {
                    setCategory(e.target.value);
                    setPage(1);
                  }}
                  className="input py-2"
                >
                  <option value="">All Categories</option>
                  {categories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="type-select"
                  className="block text-sm font-semibold text-slate-700 mb-1.5"
                >
                  Delivery Format
                </label>
                <select
                  id="type-select"
                  value={courseType}
                  onChange={(e) => {
                    setCourseType(e.target.value as '' | 'LIVE' | 'RECORDED' | 'HYBRID');
                    setPage(1);
                  }}
                  className="input py-2"
                >
                  <option value="">All Formats</option>
                  <option value="LIVE">Live Classroom</option>
                  <option value="RECORDED">Self-Paced Recorded</option>
                  <option value="HYBRID">Hybrid</option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="rating-select"
                  className="block text-sm font-semibold text-slate-700 mb-1.5"
                >
                  Minimum Rating
                </label>
                <select
                  id="rating-select"
                  value={minRating}
                  onChange={(e) => {
                    setMinRating(e.target.value ? Number(e.target.value) : '');
                    setPage(1);
                  }}
                  className="input py-2"
                >
                  <option value="">Any Rating</option>
                  <option value="4.5">4.5+ Stars</option>
                  <option value="4">4.0+ Stars</option>
                  <option value="3.5">3.5+ Stars</option>
                  <option value="3">3.0+ Stars</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="min-price-input"
                    className="block text-sm font-semibold text-slate-700 mb-1.5"
                  >
                    Min ($)
                  </label>
                  <input
                    id="min-price-input"
                    type="number"
                    min={0}
                    value={minPrice}
                    onChange={(e) => {
                      setMinPrice(e.target.value !== '' ? Number(e.target.value) : '');
                      setPage(1);
                    }}
                    placeholder="0"
                    aria-invalid={hasPriceRangeError}
                    aria-describedby={hasPriceRangeError ? 'courses-price-range-error' : undefined}
                    className={`input py-2 tabular-nums ${hasPriceRangeError ? 'input-error' : ''}`}
                  />
                </div>
                <div>
                  <label
                    htmlFor="max-price-input"
                    className="block text-sm font-semibold text-slate-700 mb-1.5"
                  >
                    Max ($)
                  </label>
                  <input
                    id="max-price-input"
                    type="number"
                    min={0}
                    value={maxPrice}
                    onChange={(e) => {
                      setMaxPrice(e.target.value !== '' ? Number(e.target.value) : '');
                      setPage(1);
                    }}
                    placeholder="500"
                    aria-invalid={hasPriceRangeError}
                    aria-describedby={hasPriceRangeError ? 'courses-price-range-error' : undefined}
                    className={`input py-2 tabular-nums ${hasPriceRangeError ? 'input-error' : ''}`}
                  />
                </div>
              </div>
            </div>

            {hasPriceRangeError && (
              <p id="courses-price-range-error" className="mt-3 text-sm text-red-600 font-medium">
                Minimum price cannot be greater than maximum price.
              </p>
            )}

            {hasActiveFilters && (
              <div className="mt-4 pt-4 border-t border-slate-100 flex flex-wrap items-center gap-2">
                {searchQuery && <span className="badge-primary">Search: {searchQuery}</span>}
                {category && <span className="badge-primary">Category: {category}</span>}
                {courseType && <span className="badge-primary">Format: {courseType}</span>}
                {minRating !== '' && <span className="badge-primary">Rating: {minRating}+</span>}
                {minPrice !== '' && <span className="badge-primary">Min ${minPrice}</span>}
                {maxPrice !== '' && <span className="badge-primary">Max ${maxPrice}</span>}

                <button
                  type="button"
                  className="ml-auto text-sm text-primary-700 hover:text-primary-800 font-semibold"
                  onClick={clearAllFilters}
                >
                  Clear all filters
                </button>
              </div>
            )}
          </div>
        )}

        {showSkeleton ? (
          renderSkeletons()
        ) : error ? (
          <div className="card max-w-lg mx-auto text-center space-y-4 py-12">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
            <h2 className="text-xl font-bold text-slate-900">Unable to load courses</h2>
            <p className="text-sm text-slate-600">{error}</p>
            <div className="flex items-center justify-center gap-3">
              <button type="button" onClick={loadCourses} className="btn-primary">
                Retry
              </button>
              {hasActiveFilters && (
                <button type="button" onClick={clearAllFilters} className="btn-secondary">
                  Reset Filters
                </button>
              )}
            </div>
          </div>
        ) : courses.length === 0 ? (
          <div className={contentClass}>
            <EmptyState
              title={hasActiveFilters ? 'No matching courses found' : 'No published courses yet'}
              description={
                hasActiveFilters
                  ? 'Try broadening your search terms, price range, or category filters.'
                  : 'New courses from verified instructors will appear here once published.'
              }
              variant="courses"
              action={
                hasActiveFilters
                  ? {
                      label: 'Clear Filters',
                      onClick: clearAllFilters,
                    }
                  : undefined
              }
            />
          </div>
        ) : (
          <>
            <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 ${contentClass}`}>
              {courses.map((course) => {
                const minPkgPrice = getMinPackagePrice(course);

                return (
                  <Link
                    key={course.id}
                    to={`/courses/${course.id}`}
                    className="group overflow-hidden border border-slate-200/80 rounded-2xl bg-white shadow-card card-smooth flex flex-col"
                  >
                    {course.thumbnail ? (
                      <div className="aspect-video bg-slate-100 overflow-hidden">
                        <img
                          src={course.thumbnail}
                          alt={course.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="aspect-video bg-gradient-to-br from-primary-600 to-indigo-700 flex items-center justify-center">
                        <BookOpen className="w-12 h-12 text-white/70" />
                      </div>
                    )}

                    <div className="p-5 flex-1 flex flex-col justify-between">
                      <div>
                        <h3 className="text-lg font-bold mb-2 text-slate-900 group-hover:text-primary-700 transition-colors line-clamp-2">
                          {course.title}
                        </h3>
                        <p className="text-slate-600 mb-4 line-clamp-2 text-sm leading-relaxed">
                          {course.description}
                        </p>

                        <div className="flex items-center flex-wrap gap-2 mb-4">
                          <span className="badge-primary">{course.category}</span>

                          {course.courseType === CourseType.LIVE && (
                            <span className="badge-danger">
                              <Radio className="w-3 h-3" />
                              Live
                            </span>
                          )}
                          {course.courseType === CourseType.RECORDED && (
                            <span className="badge-info">
                              <Video className="w-3 h-3" />
                              Recorded
                            </span>
                          )}
                          {course.courseType === CourseType.HYBRID && (
                            <span className="badge-primary">
                              <PlayCircle className="w-3 h-3" />
                              Hybrid
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="border-t border-slate-100 pt-3.5 flex items-center justify-between">
                        <div className="text-sm font-semibold text-slate-600 flex items-center gap-1.5 tabular-nums">
                          <BookOpen className="w-4 h-4 text-primary-600" />
                          <span>{getCourseLessonCount(course)} lessons</span>
                        </div>
                        {minPkgPrice !== null && (
                          <span className="text-xl font-bold text-primary-700 tabular-nums">
                            {minPkgPrice === 0 ? 'Free' : formatCurrency(minPkgPrice)}
                          </span>
                        )}
                      </div>
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
                  onClick={() => {
                    setPage((p) => Math.max(1, p - 1));
                    window.scrollTo(0, 0);
                  }}
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
                  onClick={() => {
                    setPage((p) => Math.min(totalPages, p + 1));
                    window.scrollTo(0, 0);
                  }}
                  className="btn-primary btn-sm"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default CoursesPage;
