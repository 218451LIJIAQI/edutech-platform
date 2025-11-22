import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useCourseStore } from '@/store/courseStore';
import { formatCurrency } from '@/utils/helpers';

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
            <h3 className="text-xl font-semibold mb-2">{course.title}</h3>
            <p className="text-gray-600 mb-4 line-clamp-2">{course.description}</p>
            <div className="flex items-center justify-between">
              <span className="badge-primary">{course.category}</span>
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

