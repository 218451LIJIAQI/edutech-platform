import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Edit, Trash2, Eye, EyeOff, Users } from 'lucide-react';
import courseService from '@/services/course.service';
import { Course } from '@/types';
import { formatCurrency } from '@/utils/helpers';
import toast from 'react-hot-toast';

/**
 * Manage Courses Page
 * Teacher's course management interface
 */
const ManageCoursesPage = () => {
  const navigate = useNavigate();
  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchMyCourses();
  }, []);

  const fetchMyCourses = async () => {
    setIsLoading(true);
    try {
      // In a real app, there would be a separate endpoint for teacher's courses
      // For now, we'll use the general endpoint
      const result = await courseService.getAllCourses({});
      setCourses(result.courses || []);
    } catch (error) {
      console.error('Failed to fetch courses:', error);
      toast.error('Failed to load courses');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTogglePublish = async (courseId: string, currentStatus: boolean) => {
    try {
      await courseService.updateCourse(courseId, {
        isPublished: !currentStatus,
      });
      toast.success(
        !currentStatus ? 'Course published successfully' : 'Course unpublished'
      );
      fetchMyCourses();
    } catch (error) {
      toast.error('Failed to update course status');
    }
  };

  const handleDeleteCourse = async (courseId: string, courseTitle: string) => {
    if (
      !window.confirm(
        `Are you sure you want to delete "${courseTitle}"? This action cannot be undone.`
      )
    ) {
      return;
    }

    try {
      await courseService.deleteCourse(courseId);
      toast.success('Course deleted successfully');
      fetchMyCourses();
    } catch (error: any) {
      toast.error(
        error.response?.data?.message || 'Failed to delete course'
      );
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="spinner"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Manage Courses</h1>
          <p className="text-gray-600">Create and manage your course offerings</p>
        </div>
        <Link to="/teacher/courses/new" className="btn-primary">
          <Plus className="w-5 h-5 mr-2" />
          Create New Course
        </Link>
      </div>

      {/* Courses List */}
      {courses.length > 0 ? (
        <div className="space-y-4">
          {courses.map((course) => (
            <div key={course.id} className="card">
              <div className="flex items-start justify-between">
                {/* Course Info */}
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <h3 className="text-xl font-semibold">{course.title}</h3>
                    {course.isPublished ? (
                      <span className="badge-success">Published</span>
                    ) : (
                      <span className="badge-warning">Draft</span>
                    )}
                    <span className="badge-primary">{course.category}</span>
                  </div>

                  <p className="text-gray-600 mb-4 line-clamp-2">
                    {course.description}
                  </p>

                  {/* Stats */}
                  <div className="flex items-center space-x-6 text-sm text-gray-600">
                    <div className="flex items-center space-x-1">
                      <Users className="w-4 h-4" />
                      <span>
                        {(course as any)._count?.enrollments || 0} students
                      </span>
                    </div>
                    <div>
                      {course.lessons?.length || 0} lessons
                    </div>
                    {course.packages && course.packages.length > 0 && (
                      <div>
                        From {formatCurrency(course.packages[0].finalPrice)}
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center space-x-2 ml-4">
                  {/* View */}
                  <Link
                    to={`/courses/${course.id}`}
                    className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition"
                    title="View Course"
                  >
                    <Eye className="w-5 h-5" />
                  </Link>

                  {/* Toggle Publish */}
                  <button
                    onClick={() => handleTogglePublish(course.id, course.isPublished)}
                    className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition"
                    title={course.isPublished ? 'Unpublish' : 'Publish'}
                  >
                    {course.isPublished ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>

                  {/* Edit */}
                  <button
                    onClick={() => navigate(`/teacher/courses/${course.id}/edit`)}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                    title="Edit Course"
                  >
                    <Edit className="w-5 h-5" />
                  </button>

                  {/* Delete */}
                  <button
                    onClick={() => handleDeleteCourse(course.id, course.title)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                    title="Delete Course"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Course Details Expandable Section */}
              <div className="mt-4 pt-4 border-t">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600 mb-1">Lessons</p>
                    <p className="font-medium">
                      {course.lessons?.length || 0} total
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-600 mb-1">Materials</p>
                    <p className="font-medium">
                      {course.materials?.length || 0} files
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-600 mb-1">Packages</p>
                    <p className="font-medium">
                      {course.packages?.length || 0} pricing options
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="card text-center py-12">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Plus className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-xl font-semibold mb-2">No courses yet</h3>
          <p className="text-gray-600 mb-6">
            Create your first course to start teaching
          </p>
          <Link to="/teacher/courses/new" className="btn-primary inline-block">
            <Plus className="w-5 h-5 mr-2" />
            Create Your First Course
          </Link>
        </div>
      )}

      {/* Help Card */}
      <div className="card bg-blue-50 border-blue-200 mt-6">
        <h3 className="font-semibold mb-2">Course Creation Tips</h3>
        <ul className="space-y-1 text-sm text-gray-700">
          <li>✓ Use clear, descriptive titles</li>
          <li>✓ Provide detailed course descriptions</li>
          <li>✓ Add preview content to attract students</li>
          <li>✓ Structure lessons in a logical order</li>
          <li>✓ Include downloadable materials</li>
          <li>✓ Set competitive pricing</li>
        </ul>
      </div>
    </div>
  );
};

export default ManageCoursesPage;
