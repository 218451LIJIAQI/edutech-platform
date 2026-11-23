import { useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { FileText, Upload, X, Plus, Loader } from 'lucide-react';

import clientLogger from '@/utils/logger';
import teacherService from '@/services/teacher.service';
import uploadService from '@/services/upload.service';
import type { TeacherProfile } from '@/types';
import { extractErrorMessage } from '@/utils/error-handler';
import { resolveBackendAssetUrl, toStorableBackendAssetPath } from '@/utils/runtime';

interface TeacherProfileCompletionFormProps {
  onSuccess: (profile: TeacherProfile) => void;
  onError: (error: string) => void;
  initialData?: TeacherProfile;
  isEditingApproved?: boolean;
}

interface TeacherProfileFormState {
  selfIntroduction: string;
  educationBackground: string;
  teachingExperience: string;
  awards: string[];
  specialties: string[];
  teachingStyle: string;
  languages: string[];
  yearsOfExperience: number;
  profilePhoto: string;
  certificatePhotos: string[];
}

type ListField = 'awards' | 'specialties' | 'languages';

const MAX_SELF_INTRODUCTION_LENGTH = 500;
const MAX_YEARS_OF_EXPERIENCE = 70;
const MAX_IMAGE_SIZE_MB = 5;
const MAX_CERTIFICATE_PHOTOS = 10;
const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

const normalizeStringArray = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value
      .filter((item): item is string => typeof item === 'string')
      .map((item) => item.trim())
      .filter(Boolean);
  }

  if (typeof value === 'string' && value.trim()) {
    try {
      const parsedValue = JSON.parse(value);
      return Array.isArray(parsedValue)
        ? normalizeStringArray(parsedValue)
        : [value.trim()];
    } catch {
      return [value.trim()];
    }
  }

  return [];
};

const getCertificateDisplayName = (url: string, index: number): string => {
  const fallbackName = `Certificate ${index + 1}`;
  const pathWithoutQuery = url.trim().split(/[?#]/, 1)[0] ?? '';
  const filename = pathWithoutQuery.split('/').filter(Boolean).at(-1);

  if (!filename) {
    return fallbackName;
  }

  try {
    return decodeURIComponent(filename);
  } catch {
    return filename || fallbackName;
  }
};

const clampYearsOfExperience = (value: string): number => {
  const parsedValue = Number.parseInt(value, 10);
  if (!Number.isFinite(parsedValue)) {
    return 0;
  }
  return Math.min(Math.max(parsedValue, 0), MAX_YEARS_OF_EXPERIENCE);
};

const validateImageFile = (file: File): string | null => {
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
    return 'Only JPG, PNG, and WEBP image files are allowed.';
  }
  if (file.size / (1024 * 1024) > MAX_IMAGE_SIZE_MB) {
    return `Image size must not exceed ${MAX_IMAGE_SIZE_MB}MB.`;
  }
  return null;
};

const createInitialFormState = (
  initialData?: TeacherProfile
): TeacherProfileFormState => ({
  selfIntroduction: initialData?.selfIntroduction ?? '',
  educationBackground: initialData?.educationBackground ?? '',
  teachingExperience: initialData?.teachingExperience ?? '',
  awards: normalizeStringArray(initialData?.awards),
  specialties: normalizeStringArray(initialData?.specialties),
  teachingStyle: initialData?.teachingStyle ?? '',
  languages: normalizeStringArray(initialData?.languages),
  yearsOfExperience: initialData?.yearsOfExperience ?? 0,
  profilePhoto: initialData?.profilePhoto ?? '',
  certificatePhotos: normalizeStringArray(initialData?.certificatePhotos),
});

interface TextareaCardSectionProps {
  id: keyof Pick<
    TeacherProfileFormState,
    'selfIntroduction' | 'educationBackground' | 'teachingExperience' | 'teachingStyle'
  >;
  title: string;
  label: string;
  value: string;
  placeholder: string;
  disabled: boolean;
  minHeightClass?: string;
  required?: boolean;
  maxLength?: number;
  helpText?: string;
  onChange: (event: ChangeEvent<HTMLTextAreaElement>) => void;
}

const TextareaCardSection = ({
  id,
  title,
  label,
  value,
  placeholder,
  disabled,
  minHeightClass = 'min-h-24',
  required = false,
  maxLength,
  helpText,
  onChange,
}: TextareaCardSectionProps) => {
  const titleId = `${id}-title`;
  const helpId = `${id}-help`;

  return (
    <section className="card shadow-lg" aria-labelledby={titleId}>
      <h3 id={titleId} className="mb-4 text-xl font-bold text-gray-900">
        {title}
      </h3>
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <textarea
        id={id}
        name={id}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className={`input ${minHeightClass}`}
        required={required}
        maxLength={maxLength}
        disabled={disabled}
        aria-describedby={helpText ? helpId : undefined}
      />
      {helpText ? (
        <p id={helpId} className="mt-2 text-sm text-gray-500">
          {helpText}
        </p>
      ) : null}
    </section>
  );
};

interface EditableStringListSectionProps {
  sectionId: string;
  inputId: string;
  title: string;
  inputLabel: string;
  placeholder: string;
  items: string[];
  disabled: boolean;
  variant?: 'badge' | 'row';
  onAdd: (value: string) => void;
  onRemove: (index: number) => void;
}

const EditableStringListSection = ({
  sectionId,
  inputId,
  title,
  inputLabel,
  placeholder,
  items,
  disabled,
  variant = 'badge',
  onAdd,
  onRemove,
}: EditableStringListSectionProps) => {
  const [draft, setDraft] = useState('');

  const commitItem = () => {
    const trimmed = draft.trim();
    if (!trimmed) {
      return;
    }
    onAdd(trimmed);
    setDraft('');
  };

  return (
    <section className="card shadow-lg" aria-labelledby={sectionId}>
      <h3 id={sectionId} className="mb-4 text-xl font-bold text-gray-900">
        {title}
      </h3>

      <div className="mb-4 flex gap-2">
        <label htmlFor={inputId} className="sr-only">
          {inputLabel}
        </label>
        <input
          id={inputId}
          type="text"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder={placeholder}
          className="input flex-1"
          disabled={disabled}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              commitItem();
            }
          }}
        />
        <button
          type="button"
          onClick={commitItem}
          disabled={disabled || !draft.trim()}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          Add
        </button>
      </div>

      {variant === 'badge' ? (
        <div className="flex flex-wrap gap-2">
          {items.map((item, index) => (
            <div
              key={`${item}-${index}`}
              className="badge-primary flex items-center gap-2"
            >
              <span>{item}</span>
              <button
                type="button"
                onClick={() => onRemove(index)}
                className="hover:text-red-600"
                aria-label={`Remove ${item}`}
                disabled={disabled}
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((item, index) => (
            <div
              key={`${item}-${index}`}
              className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 p-3"
            >
              <span className="text-gray-700">{item}</span>
              <button
                type="button"
                onClick={() => onRemove(index)}
                className="text-red-600 hover:text-red-700"
                aria-label={`Remove ${item}`}
                disabled={disabled}
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
};

const TeacherProfileCompletionForm = ({
  onSuccess,
  onError,
  initialData,
  isEditingApproved = false,
}: TeacherProfileCompletionFormProps) => {
  const [formData, setFormData] = useState<TeacherProfileFormState>(() =>
    createInitialFormState(initialData)
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadingCerts, setUploadingCerts] = useState(false);

  const profilePhotoInputRef = useRef<HTMLInputElement | null>(null);
  const certificatePhotosInputRef = useRef<HTMLInputElement | null>(null);

  const isBusy = isSubmitting || uploadingPhoto || uploadingCerts;

  const handleInputChange = (
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = event.target;
    setFormData((prev) => ({
      ...prev,
      [name]:
        name === 'yearsOfExperience'
          ? clampYearsOfExperience(value)
          : value,
    }));
  };

  const addListItem = (field: ListField, rawValue: string) => {
    const trimmedValue = rawValue.trim();
    if (!trimmedValue) {
      return;
    }

    setFormData((prev) => {
      const alreadyExists = prev[field].some(
        (item) => item.toLowerCase() === trimmedValue.toLowerCase()
      );
      return alreadyExists
        ? prev
        : { ...prev, [field]: [...prev[field], trimmedValue] };
    });
  };

  const removeListItem = (field: ListField, index: number) => {
    setFormData((prev) => ({
      ...prev,
      [field]: prev[field].filter((_, itemIndex) => itemIndex !== index),
    }));
  };

  const handleProfilePhotoUpload = async (
    event: ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const validationError = validateImageFile(file);
    if (validationError) {
      onError(validationError);
      event.target.value = '';
      return;
    }

    setUploadingPhoto(true);
    try {
      const uploadUrl = await uploadService.uploadTeacherProfilePhoto(file);
      setFormData((prev) => ({
        ...prev,
        profilePhoto: toStorableBackendAssetPath(uploadUrl),
      }));
    } catch (error) {
      onError(extractErrorMessage(error, 'Failed to upload profile photo'));
      clientLogger.error('Profile photo upload error:', error);
    } finally {
      setUploadingPhoto(false);
      if (profilePhotoInputRef.current) {
        profilePhotoInputRef.current.value = '';
      }
    }
  };

  const handleCertificatePhotosUpload = async (
    event: ChangeEvent<HTMLInputElement>
  ) => {
    const selectedFiles = Array.from(event.target.files ?? []);
    if (selectedFiles.length === 0) {
      return;
    }

    const remainingSlots =
      MAX_CERTIFICATE_PHOTOS - formData.certificatePhotos.length;

    if (remainingSlots <= 0) {
      onError(`You can upload up to ${MAX_CERTIFICATE_PHOTOS} certificate photos.`);
      event.target.value = '';
      return;
    }

    if (selectedFiles.length > remainingSlots) {
      onError(`You can only upload ${remainingSlots} more certificate photo(s).`);
      event.target.value = '';
      return;
    }

    const invalidFileMessage = selectedFiles
      .map(validateImageFile)
      .find((message): message is string => Boolean(message));

    if (invalidFileMessage) {
      onError(invalidFileMessage);
      event.target.value = '';
      return;
    }

    setUploadingCerts(true);
    try {
      const uploadedUrls = await Promise.all(
        selectedFiles.map((file) =>
          uploadService.uploadTeacherCertificatePhoto(file)
        )
      );

      setFormData((prev) => ({
        ...prev,
        certificatePhotos: [
          ...prev.certificatePhotos,
          ...uploadedUrls.map(toStorableBackendAssetPath).filter(Boolean),
        ],
      }));
    } catch (error) {
      onError(extractErrorMessage(error, 'Failed to upload certificate photos'));
      clientLogger.error('Certificate photos upload error:', error);
    } finally {
      setUploadingCerts(false);
      if (certificatePhotosInputRef.current) {
        certificatePhotosInputRef.current.value = '';
      }
    }
  };

  const buildSubmitPayload = (): TeacherProfileFormState => ({
    selfIntroduction: formData.selfIntroduction.trim(),
    educationBackground: formData.educationBackground.trim(),
    teachingExperience: formData.teachingExperience.trim(),
    awards: formData.awards.map((award) => award.trim()).filter(Boolean),
    specialties: formData.specialties.map((specialty) => specialty.trim()).filter(Boolean),
    teachingStyle: formData.teachingStyle.trim(),
    languages: formData.languages.map((language) => language.trim()).filter(Boolean),
    yearsOfExperience: formData.yearsOfExperience,
    profilePhoto: toStorableBackendAssetPath(formData.profilePhoto),
    certificatePhotos: formData.certificatePhotos
      .map(toStorableBackendAssetPath)
      .filter(Boolean),
  });

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (isBusy) {
      onError('Please wait until the current upload or submission is complete.');
      return;
    }

    const payload = buildSubmitPayload();

    if (!payload.selfIntroduction) {
      onError('Self introduction is required.');
      return;
    }
    if (payload.specialties.length === 0) {
      onError('Please add at least one specialty.');
      return;
    }
    if (payload.languages.length === 0) {
      onError('Please add at least one language.');
      return;
    }

    setIsSubmitting(true);
    try {
      const profile = isEditingApproved
        ? await teacherService.updateExtendedProfile(payload)
        : await teacherService.submitExtendedProfile(payload);
      onSuccess(profile);
    } catch (error) {
      onError(extractErrorMessage(error, 'Failed to submit profile'));
      clientLogger.error('Profile submission error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const profilePhotoPreviewUrl = resolveBackendAssetUrl(formData.profilePhoto);

  return (
    <form onSubmit={handleSubmit} className="space-y-8" noValidate>
      <TextareaCardSection
        id="selfIntroduction"
        title="Self Introduction"
        label="Self introduction"
        value={formData.selfIntroduction}
        placeholder="Tell students about yourself, your teaching philosophy, and what makes you a great teacher..."
        minHeightClass="min-h-32"
        required
        maxLength={MAX_SELF_INTRODUCTION_LENGTH}
        helpText={`${formData.selfIntroduction.length}/${MAX_SELF_INTRODUCTION_LENGTH} characters`}
        disabled={isBusy}
        onChange={handleInputChange}
      />

      <TextareaCardSection
        id="educationBackground"
        title="Education Background"
        label="Education background"
        value={formData.educationBackground}
        placeholder="Describe your educational qualifications, degrees, and institutions..."
        disabled={isBusy}
        onChange={handleInputChange}
      />

      <TextareaCardSection
        id="teachingExperience"
        title="Teaching Experience"
        label="Teaching experience"
        value={formData.teachingExperience}
        placeholder="Describe your teaching experience, previous positions, and achievements..."
        disabled={isBusy}
        onChange={handleInputChange}
      />

      <section className="card shadow-lg" aria-labelledby="years-of-experience-title">
        <h3 id="years-of-experience-title" className="mb-4 text-xl font-bold text-gray-900">
          Years of Experience
        </h3>
        <label htmlFor="yearsOfExperience" className="sr-only">
          Years of experience
        </label>
        <input
          id="yearsOfExperience"
          type="number"
          name="yearsOfExperience"
          value={formData.yearsOfExperience}
          onChange={handleInputChange}
          min="0"
          max={MAX_YEARS_OF_EXPERIENCE}
          className="input"
          required
          placeholder="Enter your years of experience"
          disabled={isBusy}
        />
      </section>

      <TextareaCardSection
        id="teachingStyle"
        title="Teaching Style"
        label="Teaching style"
        value={formData.teachingStyle}
        placeholder="Describe your teaching approach, methods, and how you engage students..."
        disabled={isBusy}
        onChange={handleInputChange}
      />

      <EditableStringListSection
        sectionId="specialties-title"
        inputId="newSpecialty"
        title="Specialties"
        inputLabel="Add a specialty"
        placeholder="Add a specialty, e.g., Mathematics or Web Development"
        items={formData.specialties}
        disabled={isBusy}
        onAdd={(value) => addListItem('specialties', value)}
        onRemove={(index) => removeListItem('specialties', index)}
      />

      <EditableStringListSection
        sectionId="languages-title"
        inputId="newLanguage"
        title="Languages"
        inputLabel="Add a language"
        placeholder="Add a language, e.g., English or Malay"
        items={formData.languages}
        disabled={isBusy}
        onAdd={(value) => addListItem('languages', value)}
        onRemove={(index) => removeListItem('languages', index)}
      />

      <EditableStringListSection
        sectionId="awards-title"
        inputId="newAward"
        title="Awards & Honors"
        inputLabel="Add an award or honor"
        placeholder="Add an award or honor"
        items={formData.awards}
        variant="row"
        disabled={isBusy}
        onAdd={(value) => addListItem('awards', value)}
        onRemove={(index) => removeListItem('awards', index)}
      />

      <section className="card shadow-lg" aria-labelledby="profile-photo-title">
        <h3 id="profile-photo-title" className="mb-4 text-xl font-bold text-gray-900">
          Profile Photo
        </h3>

        <div className="space-y-4">
          {profilePhotoPreviewUrl && (
            <div className="relative inline-block">
              <img
                src={profilePhotoPreviewUrl}
                alt="Teacher profile preview"
                className="h-32 w-32 rounded-lg object-cover"
              />
              <button
                type="button"
                onClick={() => setFormData((prev) => ({ ...prev, profilePhoto: '' }))}
                className="absolute right-2 top-2 rounded-full bg-red-600 p-1 text-white hover:bg-red-700"
                aria-label="Remove profile photo"
                disabled={isBusy}
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={() => profilePhotoInputRef.current?.click()}
            disabled={isBusy}
            className="btn-outline flex w-full items-center justify-center gap-2"
          >
            {uploadingPhoto ? (
              <>
                <Loader className="h-4 w-4 animate-spin" aria-hidden="true" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4" aria-hidden="true" />
                Upload Profile Photo
              </>
            )}
          </button>

          <input
            ref={profilePhotoInputRef}
            type="file"
            accept={ACCEPTED_IMAGE_TYPES.join(',')}
            onChange={handleProfilePhotoUpload}
            className="hidden"
            aria-label="Upload profile photo"
            disabled={isBusy}
          />
        </div>
      </section>

      <section className="card shadow-lg" aria-labelledby="certificate-photos-title">
        <h3 id="certificate-photos-title" className="mb-4 text-xl font-bold text-gray-900">
          Certificate Photos
        </h3>

        <div className="space-y-4">
          {formData.certificatePhotos.length > 0 && (
            <div className="space-y-3">
              {formData.certificatePhotos.map((photo, index) => (
                <div
                  key={`${photo}-${index}`}
                  className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 bg-gray-50 p-3"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <FileText className="h-5 w-5 flex-shrink-0 text-primary-600" />
                    <span className="truncate text-sm font-medium text-gray-700">
                      {getCertificateDisplayName(photo, index)}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setFormData((prev) => ({
                        ...prev,
                        certificatePhotos: prev.certificatePhotos.filter(
                          (_, itemIndex) => itemIndex !== index
                        ),
                      }))
                    }
                    className="flex-shrink-0 rounded-full bg-red-600 p-1 text-white hover:bg-red-700"
                    aria-label={`Remove certificate ${index + 1}`}
                    disabled={isBusy}
                  >
                    <X className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <button
            type="button"
            onClick={() => certificatePhotosInputRef.current?.click()}
            disabled={isBusy}
            className="btn-outline flex w-full items-center justify-center gap-2"
          >
            {uploadingCerts ? (
              <>
                <Loader className="h-4 w-4 animate-spin" aria-hidden="true" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4" aria-hidden="true" />
                Upload Certificate Photos
              </>
            )}
          </button>

          <input
            ref={certificatePhotosInputRef}
            type="file"
            accept={ACCEPTED_IMAGE_TYPES.join(',')}
            multiple
            onChange={handleCertificatePhotosUpload}
            className="hidden"
            aria-label="Upload certificate photos"
            disabled={isBusy}
          />
        </div>
      </section>

      <div className="flex gap-4">
        <button
          type="submit"
          disabled={isBusy}
          className="btn-primary flex flex-1 items-center justify-center gap-2"
        >
          {isSubmitting ? (
            <>
              <Loader className="h-4 w-4 animate-spin" aria-hidden="true" />
              {isEditingApproved ? 'Updating...' : 'Submitting...'}
            </>
          ) : isEditingApproved ? (
            'Update Profile'
          ) : (
            'Submit Profile for Review'
          )}
        </button>
      </div>

      <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
        <p className="text-sm text-blue-800">
          <strong>Note:</strong>{' '}
          {isEditingApproved
            ? 'Your profile updates will be reviewed by our admin team before being published.'
            : 'Your profile will be reviewed by our admin team. Once approved, your extended profile information will be visible to students. Submit verification documents separately to earn a verified badge.'}
        </p>
      </div>
    </form>
  );
};

export default TeacherProfileCompletionForm;
