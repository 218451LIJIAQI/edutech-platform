import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useCourseStore } from '@/store/courseStore';
import { formatCurrency } from '@/utils/helpers';
import { CourseType } from '@/types';
import { Video, Radio, PlayCircle, BookOpen } from 'lucide-react';

const CoursesPage = () => {
  const { courses, isLoading, fetchCourses } = useCourseStore();

  useEffect(() => {
    fetchCourses();
  }, [fetchCourses]);

  if (isLoading) return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50">
      <div className="flex flex-col items-center space-y-4">
        <div className="spinner"></div>
        <p className="text-gray-600 font-medium">Loading courses...</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50">
      {/* Header Section */}
      <div className="bg-gradient-to-br from-primary-600 via-primary-700 to-primary-900 text-white py-16 md:py-20 shadow-lg">
        <div className="container mx-auto px-4">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Explore Our Courses</h1>
          <p className="text-lg text-primary-100">Discover thousands of courses from expert instructors</p>
        </div>
      </div>

      {/* Courses Grid */}
      <div className="container mx-auto px-4 py-16">
        {courses.length === 0 ? (
          <div className="text-center py-20">
            <div className="card shadow-lg max-w-md mx-auto">
              <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-2xl font-bold text-gray-900 mb-2">No courses available yet</h3>
              <p className="text-gray-600">Check back later for new courses</p>
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
            
                <h3 className="text-lg font-bold mb-2 text-gray-900 group-hover:text-primary-600 transition-colors line-clamp-2">{course.title}</h3>
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
                  <div className="text-sm font-medium text-gray-600">
                    📚 {course.lessons?.length || 0} lessons
              </div>
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

