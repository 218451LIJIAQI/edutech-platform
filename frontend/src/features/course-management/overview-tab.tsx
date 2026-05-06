import { Eye, Edit } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { Course } from '@/types';

interface CourseManagementOverviewTabProps {
  course: Course;
  courseId: string;
}

export default function CourseManagementOverviewTab({
  course,
  courseId,
}: CourseManagementOverviewTabProps) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-bold text-gray-900 mb-4">Course Description</h3>
        <p className="text-gray-700 leading-relaxed">{course.description}</p>
      </div>

      {course.thumbnail && (
        <div>
          <h3 className="text-xl font-bold text-gray-900 mb-4">Course Thumbnail</h3>
          <img
            src={course.thumbnail}
            alt={course.title}
            className="w-full max-w-md h-auto rounded-lg shadow-lg"
          />
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-gray-50 p-6 rounded-lg">
          <h4 className="font-bold text-gray-900 mb-3">Course Information</h4>
          <div className="space-y-2 text-sm">
            <p>
              <span className="font-medium text-gray-700">Category:</span>{' '}
              {course.category}
            </p>
            <p>
              <span className="font-medium text-gray-700">Type:</span>{' '}
              {course.courseType}
            </p>
            <p>
              <span className="font-medium text-gray-700">Status:</span>{' '}
              {course.isPublished ? 'Published' : 'Draft'}
            </p>
            <p>
              <span className="font-medium text-gray-700">Created:</span>{' '}
              {new Date(course.createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>

        <div className="bg-gray-50 p-6 rounded-lg">
          <h4 className="font-bold text-gray-900 mb-3">Quick Actions</h4>
          <div className="space-y-2">
            <Link
              to={`/courses/${courseId}`}
              className="btn-outline btn-sm w-full justify-center flex items-center space-x-2"
            >
              <Eye className="w-4 h-4" />
              <span>View Course Page</span>
            </Link>
            <Link
              to={`/teacher/courses/${courseId}/edit`}
              className="btn-primary btn-sm w-full justify-center flex items-center space-x-2"
            >
              <Edit className="w-4 h-4" />
              <span>Edit Course</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
