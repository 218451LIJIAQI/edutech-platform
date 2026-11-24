import { Download, FileText, Upload } from 'lucide-react';
import toast from 'react-hot-toast';
import type { Course } from '@/types';
import { downloadProtectedAsset } from '@/utils/protected-assets';
import { extractErrorMessage } from '@/utils/error-handler';
import { formatFileSize } from '@/utils/helpers';
import clientLogger from '@/utils/logger';

interface CourseManagementMaterialsTabProps {
  materials: NonNullable<Course['materials']>;
}

export default function CourseManagementMaterialsTab({
  materials,
}: CourseManagementMaterialsTabProps) {
  const handleDownload = async (url: string, title: string) => {
    try {
      await downloadProtectedAsset(url, title);
    } catch (error) {
      clientLogger.error('Failed to download course material:', error);
      toast.error(extractErrorMessage(error, 'Failed to download material'));
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 p-6 rounded-xl">
        <h3 className="text-lg font-bold text-emerald-950 mb-1.5 flex items-center gap-2">
          <Upload className="w-5 h-5 text-emerald-700" />
          <span>Course Study Materials</span>
        </h3>
        <p className="text-sm text-emerald-900">
          Review study resources attached to this course. Use &ldquo;Edit Course Content&rdquo; above to upload new files or update student download permissions.
        </p>
      </div>

      <div className="bg-slate-50 p-6 rounded-xl border border-slate-200">
        <div className="flex items-center justify-between mb-4">
          <h4 className="font-bold text-slate-900 tabular-nums">
            Uploaded Materials ({materials.length})
          </h4>
        </div>
        {materials.length > 0 ? (
          <div className="space-y-3">
            {materials.map((material) => {
              const targetUrl = material.accessUrl ?? material.fileUrl;
              return (
                <div
                  key={material.id}
                  className="flex flex-wrap items-center justify-between gap-4 p-4 bg-white border border-slate-200 rounded-xl hover:border-slate-300 transition-colors"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="p-2 bg-primary-50 rounded-lg shrink-0">
                      <FileText className="w-5 h-5 text-primary-600" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-slate-900">{material.title}</p>
                        <span className="badge-sm uppercase">{material.fileType}</span>
                        <span
                          className={
                            material.isDownloadable ? 'badge-success' : 'badge-warning'
                          }
                        >
                          {material.isDownloadable ? 'Student Downloadable' : 'Instructor Only'}
                        </span>
                      </div>
                      {material.description ? (
                        <p className="text-sm text-slate-600 mt-1">{material.description}</p>
                      ) : null}
                      <p className="text-xs text-slate-500 mt-1 tabular-nums">
                        {formatFileSize(material.fileSize)} &middot; Uploaded{' '}
                        {new Date(material.uploadedAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  {targetUrl ? (
                    <button
                      type="button"
                      onClick={() => void handleDownload(targetUrl, material.title)}
                      className="btn-outline btn-sm shrink-0"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Download
                    </button>
                  ) : null}
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-slate-600">
            No study materials have been uploaded for this course yet.
          </p>
        )}
      </div>
    </div>
  );
}
