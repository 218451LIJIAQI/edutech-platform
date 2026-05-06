import { ArrowLeft, Edit, Play, Radio, Settings, Video } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Course, CourseType } from '@/types';

interface CourseManagementHeaderProps {
  course: Course;
  courseId: string;
  onBack: () => void;
}

export default function CourseManagementHeader({
  course,
  courseId,
  onBack,
}: CourseManagementHeaderProps) {
  return (
    <div className="mb-8">
      <button
        type="button"
        onClick={onBack}
        className="flex items-center space-x-2 text-primary-600 hover:text-primary-700 font-semibold mb-4"
      >
        <ArrowLeft className="w-5 h-5" />
        <span>Back to My Courses</span>
      </button>

      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-primary-500/25 flex-shrink-0">
            <Settings className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-extrabold text-gray-900 mb-2">
              {course.title}
            </h1>
            <div className="flex items-center space-x-4 flex-wrap">
              <span
                className={`badge ${
                  course.isPublished ? 'badge-success' : 'badge-warning'
                }`}
              >
                {course.isPublished ? 'Published' : 'Draft'}
              </span>
              <span className="badge-primary">{course.category}</span>
              {course.courseType === CourseType.LIVE && (
                <span className="badge bg-gradient-to-r from-red-100 to-red-50 text-red-800 border border-red-200 flex items-center gap-1">
                  <Radio className="w-3 h-3" />
                  Live Course
                </span>
              )}
              {course.courseType === CourseType.RECORDED && (
                <span className="badge bg-gradient-to-r from-blue-100 to-blue-50 text-blue-800 border border-blue-200 flex items-center gap-1">
                  <Video className="w-3 h-3" />
                  Recorded Course
                </span>
              )}
              {course.courseType === CourseType.HYBRID && (
                <span className="badge bg-gradient-to-r from-purple-100 to-purple-50 text-purple-800 border border-purple-200 flex items-center gap-1">
                  <Play className="w-3 h-3" />
                  Hybrid Course
                </span>
              )}
            </div>
          </div>
        </div>
        <Link
          to={`/teacher/courses/${courseId}/edit`}
          className="btn-outline flex items-center space-x-2"
        >
          <Edit className="w-5 h-5" />
          <span>Edit Course</span>
        </Link>
      </div>
    </div>
  );
}
