import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useCourseStore } from '@/store/courseStore';
import { formatCurrency } from '@/utils/helpers';
import { CourseType } from '@/types';
import { Video, Radio, PlayCircle } from 'lucide-react';

const CoursesPage = () => {
  const { courses, isLoading, fetchCourses } = useCourseStore();

  useEffect(() => {
    fetchCourses();
  }, []);

  if (isLoading) return <div className="container mx-auto px-4 py-8">Loading...</div>;

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Browse Courses</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {courses.map((course) => (
          <Link key={course.id} to={`/courses/${course.id}`} className="card-hover">
            {/* Thumbnail */}
            {course.thumbnail && (
              <div className="aspect-video bg-gray-200 rounded-t-lg overflow-hidden mb-4">
                <img 
                  src={course.thumbnail} 
                  alt={course.title} 
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            
            <h3 className="text-xl font-semibold mb-2">{course.title}</h3>
            <p className="text-gray-600 mb-4 line-clamp-2">{course.description}</p>
            
            <div className="flex items-center flex-wrap gap-2 mb-3">
              <span className="badge-primary">{course.category}</span>
              
              {/* Course Type Badge */}
              {course.courseType === CourseType.LIVE && (
                <span className="badge bg-red-100 text-red-700 flex items-center gap-1 text-xs">
                  <Radio className="w-3 h-3" />
                  Live
                </span>
              )}
              {course.courseType === CourseType.RECORDED && (
                <span className="badge bg-blue-100 text-blue-700 flex items-center gap-1 text-xs">
                  <Video className="w-3 h-3" />
                  Recorded
                </span>
              )}
              {course.courseType === CourseType.HYBRID && (
                <span className="badge bg-purple-100 text-purple-700 flex items-center gap-1 text-xs">
                  <PlayCircle className="w-3 h-3" />
                  Hybrid
                </span>
              )}
            </div>
            
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-500">
                {course.lessons?.length || 0} lessons
              </div>
              {course.packages && course.packages.length > 0 && (
                <span className="text-lg font-semibold text-primary-600">
                  {formatCurrency(course.packages[0].finalPrice)}
                </span>
              )}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default CoursesPage;

