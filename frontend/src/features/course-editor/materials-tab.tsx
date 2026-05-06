import { Download, Edit, File as FileIcon, Plus, Trash2, Upload } from 'lucide-react';
import type { Material } from '@/types';

interface CourseEditorMaterialsTabProps {
  courseExists: boolean;
  materials: Material[];
  onAddMaterial: () => void;
  onEditMaterial: (materialId: string) => void;
  onRequestDelete: (materialId: string, materialTitle: string) => void;
}

const formatFileSize = (fileSize?: number | null): string | null => {
  if (!fileSize || fileSize <= 0) {
    return null;
  }

  const sizeInMb = fileSize / 1024 / 1024;

  if (sizeInMb >= 1) {
    return `${sizeInMb.toFixed(2)} MB`;
  }

  return `${Math.max(fileSize / 1024, 1).toFixed(0)} KB`;
};

const formatFileType = (fileType?: string | null): string => {
  if (!fileType) {
    return 'Unknown file type';
  }

  const normalizedType = fileType.trim();

  if (!normalizedType) {
    return 'Unknown file type';
  }

  const mimeTypeLabels: Record<string, string> = {
    'application/pdf': 'PDF',
    'application/msword': 'DOC',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'DOCX',
    'application/vnd.ms-excel': 'XLS',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'XLSX',
    'application/vnd.ms-powerpoint': 'PPT',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'PPTX',
    'application/zip': 'ZIP',
    'text/plain': 'TXT',
  };

  if (mimeTypeLabels[normalizedType]) {
    return mimeTypeLabels[normalizedType];
  }

  if (normalizedType.includes('/')) {
    return normalizedType.split('/').pop()?.toUpperCase() || normalizedType;
  }

  return normalizedType.toUpperCase();
};

export default function CourseEditorMaterialsTab({
  courseExists,
  materials,
  onAddMaterial,
  onEditMaterial,
  onRequestDelete,
}: CourseEditorMaterialsTabProps) {
  if (!courseExists) {
    return (
      <section className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-6 py-12 text-center">
        <Upload className="mx-auto mb-4 h-16 w-16 text-gray-300" aria-hidden="true" />
        <h2 className="text-lg font-semibold text-gray-900">Save the course first</h2>
        <p className="mt-2 text-sm text-gray-600">
          Please save the basic course information before uploading course materials.
        </p>
      </section>
    );
  }

  return (
    <section aria-labelledby="course-materials-heading">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 id="course-materials-heading" className="text-xl font-bold text-gray-900">
            Course Materials
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Upload supporting files and learning resources for your students.
          </p>
        </div>

        <button
          type="button"
          onClick={onAddMaterial}
          className="btn-primary inline-flex items-center justify-center"
        >
          <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
          Upload Material
        </button>
      </div>

      {materials.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-6 py-12 text-center">
          <Upload className="mx-auto mb-4 h-16 w-16 text-gray-300" aria-hidden="true" />
          <h3 className="text-lg font-semibold text-gray-900">No materials uploaded yet</h3>
          <p className="mx-auto mt-2 max-w-md text-sm text-gray-500">
            Upload PDFs, documents, slides, spreadsheets, ZIP files, or text resources that
            students can use together with this course.
          </p>
          <button
            type="button"
            onClick={onAddMaterial}
            className="btn-primary mt-6 inline-flex items-center justify-center"
          >
            <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
            Upload Your First Material
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {materials.map((material) => {
            const title = material.title?.trim() || 'Untitled material';
            const description = material.description?.trim();
            const fileSizeLabel = formatFileSize(material.fileSize);
            const fileTypeLabel = formatFileType(material.fileType);

            return (
              <article
                key={material.id}
                className="flex flex-col gap-4 rounded-2xl border border-gray-100 bg-gray-50 p-4 transition hover:border-primary-100 hover:bg-white hover:shadow-sm md:flex-row md:items-center md:justify-between"
              >
                <div className="flex min-w-0 flex-1 items-start gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                    <FileIcon className="h-6 w-6" aria-hidden="true" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <h3 className="truncate font-semibold text-gray-900" title={title}>
                      {title}
                    </h3>

                    {description ? (
                      <p className="mt-1 line-clamp-2 text-sm text-gray-600">
                        {description}
                      </p>
                    ) : (
                      <p className="mt-1 text-sm text-gray-400">No description provided</p>
                    )}

                    <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                      <span className="badge-sm">{fileTypeLabel}</span>

                      {fileSizeLabel ? <span>{fileSizeLabel}</span> : null}

                      {material.isDownloadable ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-1 font-medium text-green-700">
                          <Download className="h-3 w-3" aria-hidden="true" />
                          Downloadable
                        </span>
                      ) : (
                        <span className="rounded-full bg-gray-100 px-2 py-1 font-medium text-gray-600">
                          View only
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-2 self-end md:self-center">
                  <button
                    type="button"
                    onClick={() => onEditMaterial(material.id)}
                    className="btn-sm btn-outline inline-flex items-center justify-center"
                    title={`Edit material: ${title}`}
                    aria-label={`Edit material: ${title}`}
                  >
                    <Edit className="h-4 w-4" aria-hidden="true" />
                  </button>

                  <button
                    type="button"
                    onClick={() => onRequestDelete(material.id, title)}
                    className="btn-sm inline-flex items-center justify-center text-red-600 hover:bg-red-50 focus-visible:ring-red-500"
                    title={`Delete material: ${title}`}
                    aria-label={`Delete material: ${title}`}
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
