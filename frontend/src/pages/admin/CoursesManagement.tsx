import { useEffect, useState } from 'react';
import adminService from '@/services/admin.service';
import SearchFilter from '@/components/common/SearchFilter';
import { BookOpen, CheckCircle, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';

const CoursesManagement = () => {
  const [courses, setCourses] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState<any>({});

  useEffect(() => {
    fetchCourses();
  }, [filters]);

  const fetchCourses = async () => {
    setIsLoading(true);
    try {
      const data = await adminService.getAllCourses(filters);
      setCourses(data.courses || []);
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
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Courses Management</h1>
      
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

      <div className="card mt-6">
        {isLoading ? (
          <div className="flex justify-center py-12"><div className="spinner"></div></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-left">Course</th>
                  <th className="px-6 py-3 text-left">Teacher</th>
                  <th className="px-6 py-3 text-left">Category</th>
                  <th className="px-6 py-3 text-left">Status</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {courses.map((course) => (
                  <tr key={course.id}>
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <img src={course.thumbnail} className="w-16 h-10 object-cover rounded" />
                        <span className="ml-3 font-medium">{course.title}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {course.teacherProfile.user.firstName} {course.teacherProfile.user.lastName}
                    </td>
                    <td className="px-6 py-4">{course.category}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                        course.isPublished ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {course.isPublished ? 'Published' : 'Draft'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleTogglePublish(course.id, course.isPublished)}
                        className="btn-sm btn-primary"
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
  );
};

export default CoursesManagement;

