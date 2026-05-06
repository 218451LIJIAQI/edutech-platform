import { BookOpen, FileText, Settings, Users } from 'lucide-react';
import type { Course } from '@/types';
import { getCourseEnrollmentCount } from './helpers';
import { getCourseLessonCount, getCourseMaterialCount } from '@/utils/course-counts';

interface CourseManagementStatsGridProps {
  course: Course;
}

export default function CourseManagementStatsGrid({
  course,
}: CourseManagementStatsGridProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
      <div className="card bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105 border border-blue-400/30 rounded-2xl">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-bold text-blue-100 uppercase">
              Students Enrolled
            </p>
            <p className="text-4xl font-bold text-white mt-3">
              {getCourseEnrollmentCount(course)}
            </p>
          </div>
          <Users className="w-16 h-16 text-blue-200 opacity-50" />
        </div>
      </div>

      <div className="card bg-gradient-to-br from-purple-500 to-purple-600 text-white shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105 border border-purple-400/30 rounded-2xl">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-bold text-purple-100 uppercase">
              Lessons
            </p>
            <p className="text-4xl font-bold text-white mt-3">
              {getCourseLessonCount(course)}
            </p>
          </div>
          <BookOpen className="w-16 h-16 text-purple-200 opacity-50" />
        </div>
      </div>

      <div className="card bg-gradient-to-br from-green-500 to-green-600 text-white shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105 border border-green-400/30 rounded-2xl">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-bold text-green-100 uppercase">
              Materials
            </p>
            <p className="text-4xl font-bold text-white mt-3">
              {getCourseMaterialCount(course)}
            </p>
          </div>
          <FileText className="w-16 h-16 text-green-200 opacity-50" />
        </div>
      </div>

      <div className="card bg-gradient-to-br from-orange-500 to-orange-600 text-white shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105 border border-orange-400/30 rounded-2xl">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-orange-700 uppercase">
              Pricing Options
            </p>
            <p className="text-3xl font-bold text-orange-900 mt-2">
              {course.packages?.length || 0}
            </p>
          </div>
          <Settings className="w-12 h-12 text-orange-300" />
        </div>
      </div>
    </div>
  );
}
