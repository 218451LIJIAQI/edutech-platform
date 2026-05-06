import { useEffect, useState } from 'react';
import clientLogger from '@/utils/logger';
import { Course } from '@/types';
import adminService from '@/services/admin.service';
import SearchFilter from '@/components/common/SearchFilter';
import { BookOpen } from 'lucide-react';
import toast from 'react-hot-toast';
import { extractErrorMessage } from '@/utils/error-handler';
import { usePageTitle } from '@/hooks';

const CoursesManagement = () => {
  usePageTitle('Course Management');
  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pagination, setPagination] = useState<{
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  } | null>(null);
  const [filters, setFilters] = useState<{
    isPublished?: boolean;
    category?: string;
    search?: string;
    page?: number;
    limit?: number;
  }>({
    page: 1,
    limit: 10,
  });

  useEffect(() => {
    let isActive = true;

    const loadCourses = async () => {
      setIsLoading(true);
      try {
        const data = await adminService.getAllCourses(filters);
        if (!isActive) {
          return;
        }

        setCourses(data.items || data.courses || []);
        setPagination(data.pagination ?? null);
      } catch (error: unknown) {
        if (!isActive) {
          return;
        }

        clientLogger.error('Failed to fetch courses:', error);
        const errorMessage = extractErrorMessage(error, 'Failed to load courses');
        toast.error(errorMessage);
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    };

    void loadCourses();

    return () => {
      isActive = false;
    };
  }, [filters]);

  const handleTogglePublish = async (id: string, currentStatus: boolean) => {
    try {
      await adminService.updateCourseStatus(id, !currentStatus);
      toast.success(`Course ${!currentStatus ? 'published' : 'unpublished'}`);
      setFilters((currentFilters) => ({ ...currentFilters }));
    } catch (error: unknown) {
      clientLogger.error('Failed to update course status:', error);
      const errorMessage = extractErrorMessage(error, 'Failed to update course');
      toast.error(errorMessage);
    }
  };

  const handleFilterChange = (newFilters: Record<string, string>) => {
    setFilters((currentFilters) => {
      const updatedFilters: typeof filters = {
        ...currentFilters,
        page: 1,
      };

      if (newFilters.isPublished === 'true' || newFilters.isPublished === 'false') {
        updatedFilters.isPublished = newFilters.isPublished === 'true';
      } else {
        delete updatedFilters.isPublished;
      }

      if (newFilters.category) {
        updatedFilters.category = newFilters.category;
      } else {
        delete updatedFilters.category;
      }

      return updatedFilters;
    });
  };

  const handlePageChange = (newPage: number) => {
    setFilters((currentFilters) => ({ ...currentFilters, page: newPage }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-primary-50/10 to-indigo-50/20 relative">
      <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.015)_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none"></div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-primary-500/25">
            <BookOpen className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-extrabold text-gray-900">
              Course <span className="bg-gradient-to-r from-primary-600 to-indigo-600 bg-clip-text text-transparent">Management</span>
            </h1>
            <p className="text-gray-500 font-medium">Manage all platform courses</p>
          </div>
        </div>

        <div className="card mb-8 shadow-xl border border-gray-100 rounded-2xl">
          <SearchFilter
            placeholder="Search courses..."
            onSearch={(q) => setFilters((currentFilters) => ({ ...currentFilters, search: q || undefined, page: 1 }))}
            filters={[{
              name: 'isPublished',
              label: 'Status',
              options: [
                { label: 'Published', value: 'true' },
                { label: 'Unpublished', value: 'false' },
              ],
            }]}
            onFilterChange={handleFilterChange}
          />
        </div>

        <div className="card shadow-xl border border-gray-100 rounded-2xl">
          {isLoading ? (
            <div className="flex justify-center py-16">
              <div className="flex flex-col items-center space-y-4">
                <div className="relative">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-500 to-indigo-600 animate-pulse flex items-center justify-center">
                    <BookOpen className="w-8 h-8 text-white" />
                  </div>
                  <div className="absolute inset-0 rounded-2xl bg-primary-500/20 animate-ping"></div>
                </div>
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
                          type="button"
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

          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <div className="mt-6 pt-4 border-t flex items-center justify-between">
              <div className="text-sm text-gray-700">
                Showing page {pagination.page} of {pagination.totalPages} ({pagination.total} total courses)
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="btn-outline btn-sm"
                  disabled={pagination.page <= 1 || isLoading}
                  onClick={() => handlePageChange(pagination.page - 1)}
                >
                  Previous
                </button>
                <button
                  type="button"
                  className="btn-primary btn-sm"
                  disabled={pagination.page >= pagination.totalPages || isLoading}
                  onClick={() => handlePageChange(pagination.page + 1)}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CoursesManagement;
