import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useCourseStore } from '@/store/courseStore';
import { formatCurrency } from '@/utils/helpers';
import { CourseType } from '@/types';
import { Video, Radio, PlayCircle, BookOpen, Search, SlidersHorizontal } from 'lucide-react';

/**
 * Courses Page (Student)
 * Adds full-text search and advanced filters similar to e-commerce platforms.
 * All UI text and comments are in English.
 */
const CoursesPage = () => {
  const { courses, categories, isLoading, fetchCourses, fetchCategories } = useCourseStore();
  const [searchParams, setSearchParams] = useSearchParams();

  // Local state bound to URL params
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [category, setCategory] = useState(searchParams.get('category') || '');
  const [courseType, setCourseType] = useState<'' | 'LIVE' | 'RECORDED' | 'HYBRID'>(
    (searchParams.get('type') as any) || ''
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
  >((searchParams.get('sortBy') as any) || 'NEWEST');

  const [showFilters, setShowFilters] = useState(false);

  // Fetch categories once
  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  // Build query object for API
  const queryParams = useMemo(() => {
    const qp: Record<string, any> = {};
    if (searchQuery) qp.search = searchQuery;
    if (category) qp.category = category;
    if (courseType) qp.courseType = courseType;
    if (minRating !== '' && !Number.isNaN(minRating)) qp.minRating = Number(minRating);
    if (minPrice !== '' && !Number.isNaN(minPrice)) qp.minPrice = Number(minPrice);
    if (maxPrice !== '' && !Number.isNaN(maxPrice)) qp.maxPrice = Number(maxPrice);
    if (sortBy) qp.sortBy = sortBy;
    return qp;
  }, [searchQuery, category, courseType, minRating, minPrice, maxPrice, sortBy]);

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

  // Debounce search to avoid excessive requests
  useEffect(() => {
    const t = setTimeout(() => {
      fetchCourses(queryParams);
    }, 300);
    return () => clearTimeout(t);
  }, [queryParams, fetchCourses]);

  if (isLoading && courses.length === 0) return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50">
      <div className="flex flex-col items-center space-y-4">
        <div className="spinner"></div>
        <p className="text-gray-600 font-medium">Loading courses...</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50">
      {/* Header */}
      <div className="bg-gradient-to-br from-primary-600 via-primary-700 to-primary-900 text-white py-12 shadow-lg">
        <div className="container mx-auto px-4">
          <h1 className="text-3xl md:text-4xl font-bold mb-2">Explore Our Courses</h1>
          <p className="text-primary-100">Discover thousands of courses from expert instructors</p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 space-y-6">
        {/* Search & Sort Bar */}
        <div className="card shadow-lg">
          <div className="flex flex-col md:flex-row gap-3 md:items-center">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-600"
                placeholder="Search courses by title or description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Sort */}
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600 font-medium">Sort by:</label>
              <select
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-600"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
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
              className={`px-4 py-2 rounded-lg border flex items-center gap-2 ${
                showFilters ? 'bg-primary-50 border-primary-300 text-primary-700' : 'border-gray-300 text-gray-700'
              }`}
            >
              <SlidersHorizontal className="w-4 h-4" />
              Filters
            </button>
          </div>
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <div className="card shadow-lg">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Category */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Category</label>
                <select
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
                <label className="block text-sm font-semibold text-gray-700 mb-2">Course Type</label>
                <select
                  value={courseType}
                  onChange={(e) => setCourseType(e.target.value as any)}
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
                <label className="block text-sm font-semibold text-gray-700 mb-2">Minimum Rating</label>
                <select
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
                <span className="badge-primary">Search: {searchQuery}</span>
              )}
              {category && <span className="badge-primary">Category: {category}</span>}
              {courseType && <span className="badge-primary">Type: {courseType}</span>}
              {minRating !== '' && <span className="badge-primary">Rating: {minRating}+</span>}
              {minPrice !== '' && <span className="badge-primary">Min ${minPrice}</span>}
              {maxPrice !== '' && <span className="badge-primary">Max ${maxPrice}</span>}

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

        {/* Results */}
        {courses.length === 0 ? (
          <div className="text-center py-20">
            <div className="card shadow-lg max-w-md mx-auto">
              <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-2xl font-bold text-gray-900 mb-2">No courses found</h3>
              <p className="text-gray-600">Try adjusting filters or search terms</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {courses.map((course, idx) => (
              <Link 
                key={course.id} 
                to={`/courses/${course.id}`} 
                className="card-hover group overflow-hidden"
                style={{ animationDelay: `${idx * 50}ms` }}
              >
            {/* Thumbnail */}
            {course.thumbnail && (
                  <div className="aspect-video bg-gradient-to-br from-gray-200 to-gray-300 rounded-xl overflow-hidden mb-4 relative">
                <img 
                  src={course.thumbnail} 
                  alt={course.title} 
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                />
                    <div className="absolute inset-0 bg-black opacity-0 group-hover:opacity-20 transition-opacity duration-300"></div>
              </div>
            )}
            
                <h3 className="text-lg font-bold mb-2 text-gray-900 group-hover:text-primary-600 transition-colors line-clamp-2">
                  {course.title}
                </h3>
                <p className="text-gray-600 mb-4 line-clamp-2 text-sm leading-relaxed">{course.description}</p>
            
                <div className="flex items-center flex-wrap gap-2 mb-4">
              <span className="badge-primary">{course.category}</span>
              
              {/* Course Type Badge */}
              {course.courseType === CourseType.LIVE && (
                    <span className="badge bg-gradient-to-r from-red-100 to-red-50 text-red-700 flex items-center gap-1 border border-red-200">
                  <Radio className="w-3 h-3" />
                  Live
                </span>
              )}
              {course.courseType === CourseType.RECORDED && (
                    <span className="badge bg-gradient-to-r from-blue-100 to-blue-50 text-blue-700 flex items-center gap-1 border border-blue-200">
                  <Video className="w-3 h-3" />
                  Recorded
                </span>
              )}
              {course.courseType === CourseType.HYBRID && (
                    <span className="badge bg-gradient-to-r from-purple-100 to-purple-50 text-purple-700 flex items-center gap-1 border border-purple-200">
                  <PlayCircle className="w-3 h-3" />
                  Hybrid
                </span>
              )}
            </div>
            
                <div className="border-t pt-4 flex items-center justify-between">
                  <div className="text-sm font-medium text-gray-600">📚 {course.lessons?.length || 0} lessons</div>
              {course.packages && course.packages.length > 0 && (
                    <span className="text-lg font-bold text-primary-600">
                  {formatCurrency(course.packages[0].finalPrice)}
                </span>
              )}
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

