import { useEffect, useState } from 'react';
import { Course } from '@/types';
import adminService from '@/services/admin.service';
import SearchFilter from '@/components/common/SearchFilter';
import { BookOpen } from 'lucide-react';
import toast from 'react-hot-toast';

const CoursesManagement = () => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState<{
    isPublished?: boolean;
    category?: string;
    search?: string;
    page?: number;
    limit?: number;
  }>({});

  useEffect(() => {
    fetchCourses();
  }, [filters]);

  const fetchCourses = async () => {
    setIsLoading(true);
    try {
      const data = await adminService.getAllCourses(filters);
      setCourses(data.items || data.courses || []);
    } catch (error) {
      console.error(error);
      toast.error('Failed to load courses');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTogglePublish = async (id: string, currentStatus: boolean) => {
    try {
      await adminService.updateCourseStatus(id, !currentStatus);
      toast.success(`Course ${!currentStatus ? 'published' : 'unpublished'}`);
      fetchCourses();
    } catch (error) {
      toast.error('Failed to update course');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50">
      <div className="container mx-auto px-4 py-8">
        <h1 className="section-title mb-8">Courses Management</h1>
        
        <div className="card mb-8 shadow-lg">
          <SearchFilter
            placeholder="Search courses..."
            onSearch={(q) => setFilters({ ...filters, search: q })}
            filters={[{
              name: 'isPublished',
              label: 'Status',
              options: [
                { label: 'Published', value: 'true' },
                { label: 'Unpublished', value: 'false' },
              ],
            }]}
            onFilterChange={setFilters}
          />
        </div>

        <div className="card shadow-lg">
          {isLoading ? (
            <div className="flex justify-center py-16">
              <div className="flex flex-col items-center space-y-4">
                <div className="spinner"></div>
                <p className="text-gray-600 font-medium">Loading courses...</p>
              </div>
            </div>
          ) : courses.length === 0 ? (
            <div className="text-center py-16">
              <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-gray-900 mb-2">No courses found</h3>
              <p className="text-gray-600">Try adjusting your filters</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b-2 border-gray-200">
                  <tr>
                    <th className="px-6 py-4 text-left font-bold text-gray-900">Course</th>
                    <th className="px-6 py-4 text-left font-bold text-gray-900">Teacher</th>
                    <th className="px-6 py-4 text-left font-bold text-gray-900">Category</th>
                    <th className="px-6 py-4 text-left font-bold text-gray-900">Status</th>
                    <th className="px-6 py-4 text-right font-bold text-gray-900">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {courses.map((course) => (
                    <tr key={course.id} className="hover:bg-gradient-to-r hover:from-gray-50 hover:to-gray-100 transition-all">
                      <td className="px-6 py-5">
                        <div className="flex items-center space-x-4">
                          {course.thumbnail && (
                            <img src={course.thumbnail} className="w-20 h-12 object-cover rounded-lg shadow-md" alt={course.title} />
                          )}
                          <span className="font-bold text-gray-900">{course.title}</span>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <span className="text-gray-700 font-medium">
                          {course.teacherProfile?.user?.firstName} {course.teacherProfile?.user?.lastName}
                        </span>
                      </td>
                      <td className="px-6 py-5">
                        <span className="badge-primary">{course.category}</span>
                      </td>
                      <td className="px-6 py-5">
                        <span className={`badge ${
                          course.isPublished ? 'badge-success' : 'badge-warning'
                        }`}>
                          {course.isPublished ? 'Published' : 'Draft'}
                        </span>
                      </td>
                      <td className="px-6 py-5 text-right">
                        <button
                          onClick={() => handleTogglePublish(course.id, course.isPublished)}
                          className={`btn-sm ${
                            course.isPublished ? 'btn-outline' : 'btn-primary'
                          }`}
                        >
                          {course.isPublished ? 'Unpublish' : 'Publish'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CoursesManagement;

