import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useCourseStore } from '@/store/courseStore';
import { formatCurrency } from '@/utils/helpers';
import { CourseType } from '@/types';
import { usePageTitle, useDebounce, useSmoothLoading } from '@/hooks';
import { Video, Radio, PlayCircle, Search, SlidersHorizontal } from 'lucide-react';
import { CardSkeleton, EmptyState } from '@/components/common';

/**
 * Courses Page (Student)
 * Adds full-text search and advanced filters similar to e-commerce platforms.
 * All UI text and comments are in English.
 */
const CoursesPage = () => {
  usePageTitle('Explore Courses');
  const { courses, categories, isLoading, fetchCourses, fetchCategories } = useCourseStore();
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Smooth loading transition
  const { showSkeleton, contentClass } = useSmoothLoading(isLoading);

  // Local state bound to URL params
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
  >((searchParams.get('sortBy') as 'NEWEST' | 'RATING' | 'POPULARITY' | 'PRICE_ASC' | 'PRICE_DESC') || 'NEWEST');

  const [showFilters, setShowFilters] = useState(false);

  // Fetch categories once
  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  // Keep URL in sync with local state
  useEffect(() => {
    const sp = new URLSearchParams();
    if (searchQuery) sp.set('q', searchQuery);
    if (category) sp.set('category', category);
    if (courseType) sp.set('type', courseType);
    if (minRating !== '' && !Number.isNaN(minRating)) sp.set('minRating', String(minRating));
    if (minPrice !== '' && !Number.isNaN(minPrice)) sp.set('minPrice', String(minPrice));
    if (maxPrice !== '' && !Number.isNaN(maxPrice)) sp.set('maxPrice', String(maxPrice));
    if (sortBy) sp.set('sortBy', sortBy);
    setSearchParams(sp, { replace: true });
  }, [searchQuery, category, courseType, minRating, minPrice, maxPrice, sortBy, setSearchParams]);

  // Debounce search query for better performance
  const debouncedSearchQuery = useDebounce(searchQuery, 300);
  
  // Fetch courses when filters change
  useEffect(() => {
    const params: Record<string, string | number> = {};
    if (debouncedSearchQuery) params.search = debouncedSearchQuery;
    if (category) params.category = category;
    if (courseType) params.courseType = courseType;
    if (minRating !== '' && !Number.isNaN(minRating)) params.minRating = Number(minRating);
    if (minPrice !== '' && !Number.isNaN(minPrice)) params.minPrice = Number(minPrice);
    if (maxPrice !== '' && !Number.isNaN(maxPrice)) params.maxPrice = Number(maxPrice);
    if (sortBy) params.sortBy = sortBy;
    fetchCourses(params);
  }, [debouncedSearchQuery, category, courseType, minRating, minPrice, maxPrice, sortBy, fetchCourses]);

  // Skeleton - ultra soft breathing effect
  const renderSkeletons = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="skeleton-breathe">
          <CardSkeleton />
        </div>
      ))}
    </div>
  );

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
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-primary-500/25">
              <span className="text-2xl">📚</span>
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 tracking-tight">
                Explore <span className="bg-gradient-to-r from-primary-600 to-indigo-600 bg-clip-text text-transparent">Courses</span>
              </h1>
              <p className="text-gray-500 font-medium mt-1">Discover courses from expert teachers</p>
            </div>
          </div>

          {/* Search and Filters Bar */}
          <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                className="input w-full pl-12"
                placeholder="Search courses by title or description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Sort */}
            <div className="flex items-center gap-2">
              <label htmlFor="sort-select" className="text-sm text-gray-600 font-semibold whitespace-nowrap">Sort:</label>
              <select
                id="sort-select"
                title="Sort courses"
                className="input py-3"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'NEWEST' | 'RATING' | 'POPULARITY' | 'PRICE_ASC' | 'PRICE_DESC')}
              >
                <option value="NEWEST">Newest</option>
                <option value="RATING">Top Rated</option>
                <option value="POPULARITY">Most Popular</option>
                <option value="PRICE_ASC">Price: Low to High</option>
                <option value="PRICE_DESC">Price: High to Low</option>
              </select>
            </div>

            {/* Filter Toggle */}
            <button
              onClick={() => setShowFilters((v) => !v)}
              className={`btn ${
                showFilters ? 'bg-primary-100 border-primary-300 text-primary-700' : 'btn-secondary'
              }`}
            >
              <SlidersHorizontal className="w-4 h-4" />
              Filters
            </button>
          </div>
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <div className="card shadow-xl border border-gray-100 rounded-2xl">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Category */}
              <div>
                <label htmlFor="category-select" className="block text-sm font-semibold text-gray-700 mb-2">Category</label>
                <select
                  id="category-select"
                  title="Filter by category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-600"
                >
                  <option value="">All</option>
                  {categories.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              {/* Type */}
              <div>
                <label htmlFor="type-select" className="block text-sm font-semibold text-gray-700 mb-2">Course Type</label>
                <select
                  id="type-select"
                  title="Filter by course type"
                  value={courseType}
                  onChange={(e) => setCourseType(e.target.value as '' | 'LIVE' | 'RECORDED' | 'HYBRID')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-600"
                >
                  <option value="">All</option>
                  <option value="LIVE">Live</option>
                  <option value="RECORDED">Recorded</option>
                  <option value="HYBRID">Hybrid</option>
                </select>
              </div>

              {/* Rating */}
              <div>
                <label htmlFor="rating-select" className="block text-sm font-semibold text-gray-700 mb-2">Minimum Rating</label>
                <select
                  id="rating-select"
                  title="Filter by minimum rating"
                  value={minRating}
                  onChange={(e) => setMinRating(e.target.value ? Number(e.target.value) : '')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-600"
                >
                  <option value="">All</option>
                  <option value="4.5">4.5+</option>
                  <option value="4">4.0+</option>
                  <option value="3.5">3.5+</option>
                  <option value="3">3.0+</option>
                </select>
              </div>

              {/* Price Min/Max */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Min Price</label>
                  <input
                    type="number"
                    min={0}
                    value={minPrice}
                    onChange={(e) => setMinPrice(e.target.value ? Number(e.target.value) : '')}
                    placeholder="0"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-600"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Max Price</label>
                  <input
                    type="number"
                    min={0}
                    value={maxPrice}
                    onChange={(e) => setMaxPrice(e.target.value ? Number(e.target.value) : '')}
                    placeholder="1000"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-600"
                  />
                  </div>
                </div>
              </div>

                {/* Active filters summary */}
              <div className="mt-4 flex flex-wrap items-center gap-2">
                {searchQuery && (
                  <span className="px-3 py-1 bg-primary-100 text-primary-700 rounded-full text-xs font-semibold">Search: {searchQuery}</span>
                )}
                {category && <span className="px-3 py-1 bg-primary-100 text-primary-700 rounded-full text-xs font-semibold">Category: {category}</span>}
                {courseType && <span className="px-3 py-1 bg-primary-100 text-primary-700 rounded-full text-xs font-semibold">Type: {courseType}</span>}
                {minRating !== '' && <span className="px-3 py-1 bg-primary-100 text-primary-700 rounded-full text-xs font-semibold">Rating: {minRating}+</span>}
                {minPrice !== '' && <span className="px-3 py-1 bg-primary-100 text-primary-700 rounded-full text-xs font-semibold">Min ${minPrice}</span>}
                {maxPrice !== '' && <span className="px-3 py-1 bg-primary-100 text-primary-700 rounded-full text-xs font-semibold">Max ${maxPrice}</span>}

                {(searchQuery || category || courseType || minRating !== '' || minPrice !== '' || maxPrice !== '') && (
                  <button
                    className="ml-auto text-sm text-primary-600 hover:text-primary-700 font-medium"
                    onClick={() => {
                      setSearchQuery('');
                      setCategory('');
                      setCourseType('');
                      setMinRating('');
                      setMinPrice('');
                      setMaxPrice('');
                      setSortBy('NEWEST');
                    }}
                  >
                    Clear all
                  </button>
                )}
              </div>
          </div>
        )}

        {/* Results - smooth transition */}
        {showSkeleton ? renderSkeletons() : courses.length === 0 ? (
          <div className={contentClass}>
            <EmptyState
              title="No courses found"
              description="Try adjusting filters or search terms"
              variant="courses"
              action={{
                label: 'Clear Filters',
                onClick: () => {
                  setSearchQuery('');
                  setCategory('');
                  setCourseType('');
                  setMinRating('');
                  setMinPrice('');
                  setMaxPrice('');
                  setSortBy('NEWEST');
                }
              }}
            />
          </div>
        ) : (
          <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 ${contentClass}`}>
            {courses.map((course) => (
              <Link 
                key={course.id} 
                to={`/courses/${course.id}`} 
                className="group overflow-hidden shadow-lg border border-gray-100 rounded-2xl bg-white card-smooth"
              >
            {/* Thumbnail */}
            {course.thumbnail && (
                  <div className="aspect-video bg-gray-100 rounded-t-2xl overflow-hidden">
                <img 
                  src={course.thumbnail} 
                  alt={course.title} 
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            
            <div className="p-5">
                <h3 className="text-xl font-bold mb-3 text-gray-900 group-hover:text-primary-600 transition-colors line-clamp-2">
                  {course.title}
                </h3>
                <p className="text-gray-600 mb-4 line-clamp-2 text-sm leading-relaxed">{course.description}</p>
            
                <div className="flex items-center flex-wrap gap-2 mb-4">
                  <span className="px-3 py-1 bg-primary-100 text-primary-700 rounded-full text-xs font-semibold">{course.category}</span>
                  
                  {/* Course Type Badge */}
                  {course.courseType === CourseType.LIVE && (
                    <span className="px-3 py-1 bg-gradient-to-r from-red-100 to-red-50 text-red-700 rounded-full text-xs flex items-center gap-1 border border-red-200 font-semibold">
                      <Radio className="w-3 h-3" />
                      Live
                    </span>
                  )}
                  {course.courseType === CourseType.RECORDED && (
                    <span className="px-3 py-1 bg-gradient-to-r from-blue-100 to-blue-50 text-blue-700 rounded-full text-xs flex items-center gap-1 border border-blue-200 font-semibold">
                      <Video className="w-3 h-3" />
                      Recorded
                    </span>
                  )}
                  {course.courseType === CourseType.HYBRID && (
                    <span className="px-3 py-1 bg-gradient-to-r from-purple-100 to-purple-50 text-purple-700 rounded-full text-xs flex items-center gap-1 border border-purple-200 font-semibold">
                      <PlayCircle className="w-3 h-3" />
                      Hybrid
                    </span>
                  )}
                </div>
            
                <div className="border-t pt-4 flex items-center justify-between">
                  <div className="text-sm font-bold text-gray-700">📚 {course.lessons?.length || 0} lessons</div>
              {course.packages && course.packages.length > 0 && (
                    <span className="text-2xl font-bold text-primary-600">
                  {formatCurrency(course.packages[0].finalPrice)}
                </span>
              )}
            </div>
            </div>
          </Link>
        ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CoursesPage;
