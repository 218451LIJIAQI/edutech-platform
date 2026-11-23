import { useId, type ChangeEvent } from 'react';
import { CheckCircle, Link, UploadCloud } from 'lucide-react';
import type { MaterialSourceType } from './types';

interface MaterialSourceFieldProps {
  materialType: MaterialSourceType;
  materialFile: File | null;
  materialLink: string;
  onMaterialTypeChange: (type: MaterialSourceType) => void;
  onMaterialFileChange: (file: File | null) => void;
  onMaterialLinkChange: (value: string) => void;
}

const MAX_MATERIAL_FILE_SIZE_BYTES = 50 * 1024 * 1024;

const ACCEPTED_MATERIAL_EXTENSIONS = [
  '.pdf',
  '.doc',
  '.docx',
  '.xls',
  '.xlsx',
  '.ppt',
  '.pptx',
  '.zip',
  '.txt',
] as const;

const ACCEPTED_MATERIAL_FILE_TYPES = ACCEPTED_MATERIAL_EXTENSIONS.join(',');

const formatFileSize = (sizeInBytes: number): string => {
  if (!Number.isFinite(sizeInBytes) || sizeInBytes <= 0) {
    return '0 KB';
  }

  const sizeInMb = sizeInBytes / (1024 * 1024);

  if (sizeInMb >= 1) {
    return `${sizeInMb.toFixed(sizeInMb >= 10 ? 0 : 1)} MB`;
  }

  return `${Math.ceil(sizeInBytes / 1024)} KB`;
};

const getFileExtension = (fileName: string): string => {
  const lastDotIndex = fileName.lastIndexOf('.');

  return lastDotIndex === -1 ? '' : fileName.slice(lastDotIndex).toLowerCase();
};

export default function MaterialSourceField({
  materialType,
  materialFile,
  materialLink,
  onMaterialTypeChange,
  onMaterialFileChange,
  onMaterialLinkChange,
}: MaterialSourceFieldProps) {
  const fieldId = useId();
  const uploadInputId = `${fieldId}-upload-input`;
  const linkInputId = `${fieldId}-link-input`;
  const uploadHelpId = `${fieldId}-upload-help`;
  const linkHelpId = `${fieldId}-link-help`;
  const selectedFileId = `${fieldId}-selected-file`;

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0] ?? null;

    if (!selectedFile) {
      onMaterialFileChange(null);
      return;
    }

    const extension = getFileExtension(selectedFile.name);
    const isSupportedFileType = ACCEPTED_MATERIAL_EXTENSIONS.includes(
      extension as (typeof ACCEPTED_MATERIAL_EXTENSIONS)[number]
    );

    if (!isSupportedFileType) {
      event.target.value = '';
      onMaterialFileChange(null);
      return;
    }

    if (selectedFile.size > MAX_MATERIAL_FILE_SIZE_BYTES) {
      event.target.value = '';
      onMaterialFileChange(null);
      return;
    }

    onMaterialFileChange(selectedFile);
  };

  return (
    <fieldset className="space-y-4">
      <legend className="block text-sm font-semibold text-gray-700">
        Material Source <span className="text-red-500">*</span>
      </legend>

      <div className="grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Material source type">
        <label
          className={`flex cursor-pointer items-center gap-3 rounded-xl border p-4 transition ${
            materialType === 'upload'
              ? 'border-primary-500 bg-primary-50 text-primary-700'
              : 'border-gray-200 bg-white text-gray-700 hover:border-primary-300 hover:bg-gray-50'
          }`}
        >
          <input
            type="radio"
            name="material-source-type"
            value="upload"
            checked={materialType === 'upload'}
            onChange={() => onMaterialTypeChange('upload')}
            className="form-radio text-primary-600 focus:ring-primary-500"
          />
          <UploadCloud className="h-5 w-5" aria-hidden="true" />
          <span className="text-sm font-medium">Upload File</span>
        </label>

        <label
          className={`flex cursor-pointer items-center gap-3 rounded-xl border p-4 transition ${
            materialType === 'link'
              ? 'border-primary-500 bg-primary-50 text-primary-700'
              : 'border-gray-200 bg-white text-gray-700 hover:border-primary-300 hover:bg-gray-50'
          }`}
        >
          <input
            type="radio"
            name="material-source-type"
            value="link"
            checked={materialType === 'link'}
            onChange={() => onMaterialTypeChange('link')}
            className="form-radio text-primary-600 focus:ring-primary-500"
          />
          <Link className="h-5 w-5" aria-hidden="true" />
          <span className="text-sm font-medium">External Link</span>
        </label>
      </div>

      {materialType === 'upload' ? (
        <div className="space-y-2">
          <label htmlFor={uploadInputId} className="sr-only">
            Upload material file
          </label>
          <input
            id={uploadInputId}
            type="file"
            accept={ACCEPTED_MATERIAL_FILE_TYPES}
            onChange={handleFileChange}
            className="input"
            aria-describedby={materialFile ? `${uploadHelpId} ${selectedFileId}` : uploadHelpId}
          />
          <p id={uploadHelpId} className="text-xs text-gray-500">
            Supported formats: PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, ZIP, TXT. Maximum file size: 50MB.
          </p>

          {materialFile ? (
            <p
              id={selectedFileId}
              className="flex items-center gap-2 text-sm font-medium text-green-700"
              title={materialFile.name}
            >
              <CheckCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span className="truncate">
                Selected: {materialFile.name} ({formatFileSize(materialFile.size)})
              </span>
            </p>
          ) : null}
        </div>
      ) : (
        <div className="space-y-2">
          <label htmlFor={linkInputId} className="sr-only">
            Material link
          </label>
          <input
            id={linkInputId}
            type="url"
            value={materialLink}
            onChange={(event) => onMaterialLinkChange(event.target.value)}
            placeholder="https://example.com/document.pdf"
            className="input"
            inputMode="url"
            autoComplete="url"
            aria-describedby={linkHelpId}
          />
          <p id={linkHelpId} className="text-xs text-gray-500">
            Paste a safe http(s) URL or an approved internal material path.
          </p>
        </div>
      )}
    </fieldset>
  );
}
