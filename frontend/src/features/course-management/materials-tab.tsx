import { FileText, Upload } from 'lucide-react';
import type { Course } from '@/types';

interface CourseManagementMaterialsTabProps {
  materials: NonNullable<Course['materials']>;
}

export default function CourseManagementMaterialsTab({
  materials,
}: CourseManagementMaterialsTabProps) {
  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-green-50 to-green-100 border-2 border-green-200 p-6 rounded-lg">
        <h3 className="text-lg font-bold text-green-900 mb-4 flex items-center space-x-2">
          <Upload className="w-5 h-5" />
          <span>Course Materials</span>
        </h3>

        <div className="space-y-4">
          <p className="text-green-800">
            Course materials already attached to this course are listed below.
          </p>
        </div>
      </div>

      <div className="bg-gray-50 p-6 rounded-lg">
        <h4 className="font-bold text-gray-900 mb-4">Uploaded Materials</h4>
        {materials.length > 0 ? (
          <div className="space-y-3">
            {materials.map((material) => (
              <div
                key={material.id}
                className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-shadow"
              >
                <div className="flex items-center space-x-3">
                  <FileText className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="font-medium text-gray-900">{material.title}</p>
                    <p className="text-sm text-gray-600">{material.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-600">No materials uploaded yet.</p>
        )}
      </div>
    </div>
  );
}
