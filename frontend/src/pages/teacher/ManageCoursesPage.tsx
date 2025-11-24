import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Edit, Trash2, Eye, EyeOff, Users, Video, Radio, PlayCircle } from 'lucide-react';
import courseService from '@/services/course.service';
import { Course, CourseType } from '@/types';
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
      const courses = await courseService.getMyCourses();
      setCourses(courses);
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
    } catch (error) {
      const message = error instanceof Error && 'response' in error 
        ? (error as { response?: { data?: { message?: string } } }).response?.data?.message 
        : undefined;
      toast.error(message || 'Failed to delete course');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50">
        <div className="flex flex-col items-center space-y-4">
          <div className="spinner"></div>
          <p className="text-gray-600 font-medium">Loading your courses...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50">
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
        <div className="flex items-center justify-between mb-10">
        <div>
            <h1 className="section-title mb-2">Manage Courses</h1>
            <p className="section-subtitle">Create and manage your course offerings</p>
        </div>
          <Link to="/teacher/courses/new" className="btn-primary btn-lg">
          <Plus className="w-5 h-5 mr-2" />
          Create New Course
        </Link>
      </div>

      {/* Courses List */}
      {courses.length > 0 ? (
        <div className="space-y-6">
          {courses.map((course) => (
            <div key={course.id} className="card shadow-lg hover:shadow-xl transition-all">
              <div className="flex items-start justify-between">
                {/* Course Info */}
                <div className="flex-1">
                  <div className="flex items-center flex-wrap gap-3 mb-3">
                    <h3 className="text-2xl font-bold text-gray-900">{course.title}</h3>
                    {course.isPublished ? (
                      <span className="badge-success">Published</span>
                    ) : (
                      <span className="badge-warning">Draft</span>
                    )}
                    <span className="badge-primary">{course.category}</span>
                    
                    {/* Course Type */}
                    {course.courseType === CourseType.LIVE && (
                      <span className="badge bg-gradient-to-r from-red-100 to-red-50 text-red-800 border border-red-200 flex items-center gap-1">
                        <Radio className="w-3 h-3" />
                        Live
                      </span>
                    )}
                    {course.courseType === CourseType.RECORDED && (
                      <span className="badge bg-gradient-to-r from-blue-100 to-blue-50 text-blue-800 border border-blue-200 flex items-center gap-1">
                        <Video className="w-3 h-3" />
                        Recorded
                      </span>
                    )}
                    {course.courseType === CourseType.HYBRID && (
                      <span className="badge bg-gradient-to-r from-purple-100 to-purple-50 text-purple-800 border border-purple-200 flex items-center gap-1">
                        <PlayCircle className="w-3 h-3" />
                        Hybrid
                      </span>
                    )}
                  </div>

                  <p className="text-gray-600 mb-4 line-clamp-2 text-lg">
                    {course.description}
                  </p>

                  {/* Stats */}
                  <div className="flex items-center space-x-6 text-sm">
                    <div className="flex items-center space-x-2 text-gray-700 font-medium">
                      <Users className="w-5 h-5 text-primary-600" />
                      <span>
                        {(course as Course & { _count?: { enrollments?: number } })._count?.enrollments || 0} students
                      </span>
                    </div>
                    <div className="text-gray-700 font-medium">
                      📚 {course.lessons?.length || 0} lessons
                    </div>
                    {course.packages && course.packages.length > 0 && (
                      <div className="text-primary-600 font-bold">
                        💰 From {formatCurrency(course.packages[0].finalPrice)}
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center space-x-2 ml-6">
                  {/* View */}
                  <Link
                    to={`/courses/${course.id}`}
                    className="p-3 text-gray-600 hover:bg-primary-50 hover:text-primary-600 rounded-xl transition-all"
                    title="View Course"
                  >
                    <Eye className="w-5 h-5" />
                  </Link>

                  {/* Toggle Publish */}
                  <button
                    onClick={() => handleTogglePublish(course.id, course.isPublished)}
                    className="p-3 text-gray-600 hover:bg-yellow-50 hover:text-yellow-600 rounded-xl transition-all"
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
                    className="p-3 text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                    title="Edit Course"
                  >
                    <Edit className="w-5 h-5" />
                  </button>

                  {/* Delete */}
                  <button
                    onClick={() => handleDeleteCourse(course.id, course.title)}
                    className="p-3 text-red-600 hover:bg-red-50 rounded-xl transition-all"
                    title="Delete Course"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Course Details Expandable Section */}
              <div className="mt-6 pt-6 border-t border-gray-200">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl">
                    <p className="text-gray-600 mb-2 font-medium">Lessons</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {course.lessons?.length || 0} total
                    </p>
                  </div>
                  <div className="p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl">
                    <p className="text-gray-600 mb-2 font-medium">Materials</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {course.materials?.length || 0} files
                    </p>
                  </div>
                  <div className="p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl">
                    <p className="text-gray-600 mb-2 font-medium">Packages</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {course.packages?.length || 0} pricing options
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="card text-center py-16 shadow-lg max-w-md mx-auto">
          <div className="w-20 h-20 bg-gradient-to-br from-primary-100 to-primary-200 rounded-full flex items-center justify-center mx-auto mb-6">
            <Plus className="w-10 h-10 text-primary-600" />
          </div>
          <h3 className="text-2xl font-bold text-gray-900 mb-3">No courses yet</h3>
          <p className="text-gray-600 mb-8 text-lg">
            Create your first course to start teaching
          </p>
          <Link to="/teacher/courses/new" className="btn-primary btn-lg inline-block">
            <Plus className="w-5 h-5 mr-2" />
            Create Your First Course
          </Link>
        </div>
      )}

      {/* Help Card */}
      <div className="card bg-gradient-to-r from-blue-50 to-blue-100 border-2 border-blue-200 mt-8 shadow-lg">
        <h3 className="font-bold text-lg text-gray-900 mb-4">Course Creation Tips</h3>
        <ul className="space-y-2 text-sm text-gray-700">
          <li className="flex items-start">
            <span className="mr-2 text-green-600 font-bold">✓</span>
            <span>Use clear, descriptive titles</span>
          </li>
          <li className="flex items-start">
            <span className="mr-2 text-green-600 font-bold">✓</span>
            <span>Provide detailed course descriptions</span>
          </li>
          <li className="flex items-start">
            <span className="mr-2 text-green-600 font-bold">✓</span>
            <span>Add preview content to attract students</span>
          </li>
          <li className="flex items-start">
            <span className="mr-2 text-green-600 font-bold">✓</span>
            <span>Structure lessons in a logical order</span>
          </li>
          <li className="flex items-start">
            <span className="mr-2 text-green-600 font-bold">✓</span>
            <span>Include downloadable materials</span>
          </li>
          <li className="flex items-start">
            <span className="mr-2 text-green-600 font-bold">✓</span>
            <span>Set competitive pricing</span>
          </li>
        </ul>
      </div>
      </div>
    </div>
  );
};

export default ManageCoursesPage;
