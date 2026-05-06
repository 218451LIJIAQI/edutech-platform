import { useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { FileText, Upload, X, Plus, Loader } from 'lucide-react';

import clientLogger from '@/utils/logger';
import teacherService from '@/services/teacher.service';
import uploadService from '@/services/upload.service';
import type { TeacherProfile } from '@/types';
import { extractErrorMessage } from '@/utils/error-handler';

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

      if (Array.isArray(parsedValue)) {
        return normalizeStringArray(parsedValue);
      }

      return [value.trim()];
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

  const fileSizeInMb = file.size / (1024 * 1024);

  if (fileSizeInMb > MAX_IMAGE_SIZE_MB) {
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

/**
 * TeacherProfileCompletionForm
 *
 * Allows teachers to complete or update their extended profile information
 * before admin review and verification.
 */
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
  const [newAward, setNewAward] = useState('');
  const [newSpecialty, setNewSpecialty] = useState('');
  const [newLanguage, setNewLanguage] = useState('');
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadingCerts, setUploadingCerts] = useState(false);

  const profilePhotoInputRef = useRef<HTMLInputElement | null>(null);
  const certificatePhotosInputRef = useRef<HTMLInputElement | null>(null);

  const isBusy = isSubmitting || uploadingPhoto || uploadingCerts;

  const handleInputChange = (
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
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

  const addListItem = (
    field: ListField,
    value: string,
    clearValue: () => void
  ) => {
    const trimmedValue = value.trim();

    if (!trimmedValue) {
      return;
    }

    setFormData((prev) => {
      const alreadyExists = prev[field].some(
        (item) => item.toLowerCase() === trimmedValue.toLowerCase()
      );

      if (alreadyExists) {
        return prev;
      }

      return {
        ...prev,
        [field]: [...prev[field], trimmedValue],
      };
    });

    clearValue();
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
        profilePhoto: uploadUrl,
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
        certificatePhotos: [...prev.certificatePhotos, ...uploadedUrls],
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

  const removeCertificatePhoto = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      certificatePhotos: prev.certificatePhotos.filter(
        (_, itemIndex) => itemIndex !== index
      ),
    }));
  };

  const removeProfilePhoto = () => {
    setFormData((prev) => ({
      ...prev,
      profilePhoto: '',
    }));
  };

  const buildSubmitPayload = (): TeacherProfileFormState => ({
    selfIntroduction: formData.selfIntroduction.trim(),
    educationBackground: formData.educationBackground.trim(),
    teachingExperience: formData.teachingExperience.trim(),
    awards: formData.awards.map((award) => award.trim()).filter(Boolean),
    specialties: formData.specialties
      .map((specialty) => specialty.trim())
      .filter(Boolean),
    teachingStyle: formData.teachingStyle.trim(),
    languages: formData.languages.map((language) => language.trim()).filter(Boolean),
    yearsOfExperience: formData.yearsOfExperience,
    profilePhoto: formData.profilePhoto,
    certificatePhotos: formData.certificatePhotos,
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

  return (
    <form onSubmit={handleSubmit} className="space-y-8" noValidate>
      <section className="card shadow-lg" aria-labelledby="self-introduction-title">
        <h3 id="self-introduction-title" className="mb-4 text-xl font-bold text-gray-900">
          Self Introduction
        </h3>
        <label htmlFor="selfIntroduction" className="sr-only">
          Self introduction
        </label>
        <textarea
          id="selfIntroduction"
          name="selfIntroduction"
          value={formData.selfIntroduction}
          onChange={handleInputChange}
          placeholder="Tell students about yourself, your teaching philosophy, and what makes you a great teacher..."
          className="input min-h-32"
          required
          maxLength={MAX_SELF_INTRODUCTION_LENGTH}
          disabled={isBusy}
          aria-describedby="self-introduction-help"
        />
        <p id="self-introduction-help" className="mt-2 text-sm text-gray-500">
          {formData.selfIntroduction.length}/{MAX_SELF_INTRODUCTION_LENGTH} characters
        </p>
      </section>

      <section className="card shadow-lg" aria-labelledby="education-background-title">
        <h3 id="education-background-title" className="mb-4 text-xl font-bold text-gray-900">
          Education Background
        </h3>
        <label htmlFor="educationBackground" className="sr-only">
          Education background
        </label>
        <textarea
          id="educationBackground"
          name="educationBackground"
          value={formData.educationBackground}
          onChange={handleInputChange}
          placeholder="Describe your educational qualifications, degrees, and institutions..."
          className="input min-h-24"
          disabled={isBusy}
        />
      </section>

      <section className="card shadow-lg" aria-labelledby="teaching-experience-title">
        <h3 id="teaching-experience-title" className="mb-4 text-xl font-bold text-gray-900">
          Teaching Experience
        </h3>
        <label htmlFor="teachingExperience" className="sr-only">
          Teaching experience
        </label>
        <textarea
          id="teachingExperience"
          name="teachingExperience"
          value={formData.teachingExperience}
          onChange={handleInputChange}
          placeholder="Describe your teaching experience, previous positions, and achievements..."
          className="input min-h-24"
          disabled={isBusy}
        />
      </section>

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

      <section className="card shadow-lg" aria-labelledby="teaching-style-title">
        <h3 id="teaching-style-title" className="mb-4 text-xl font-bold text-gray-900">
          Teaching Style
        </h3>
        <label htmlFor="teachingStyle" className="sr-only">
          Teaching style
        </label>
        <textarea
          id="teachingStyle"
          name="teachingStyle"
          value={formData.teachingStyle}
          onChange={handleInputChange}
          placeholder="Describe your teaching approach, methods, and how you engage students..."
          className="input min-h-24"
          disabled={isBusy}
        />
      </section>

      <section className="card shadow-lg" aria-labelledby="specialties-title">
        <h3 id="specialties-title" className="mb-4 text-xl font-bold text-gray-900">
          Specialties
        </h3>

        <div className="mb-4 flex gap-2">
          <label htmlFor="newSpecialty" className="sr-only">
            Add a specialty
          </label>
          <input
            id="newSpecialty"
            type="text"
            value={newSpecialty}
            onChange={(event) => setNewSpecialty(event.target.value)}
            placeholder="Add a specialty, e.g., Mathematics or Web Development"
            className="input flex-1"
            disabled={isBusy}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                addListItem('specialties', newSpecialty, () => setNewSpecialty(''));
              }
            }}
          />
          <button
            type="button"
            onClick={() =>
              addListItem('specialties', newSpecialty, () => setNewSpecialty(''))
            }
            disabled={isBusy || !newSpecialty.trim()}
            className="btn-primary flex items-center gap-2"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Add
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          {formData.specialties.map((specialty, index) => (
            <div
              key={`${specialty}-${index}`}
              className="badge-primary flex items-center gap-2"
            >
              <span>{specialty}</span>
              <button
                type="button"
                onClick={() => removeListItem('specialties', index)}
                className="hover:text-red-600"
                aria-label={`Remove ${specialty}`}
                disabled={isBusy}
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          ))}
        </div>
      </section>

      <section className="card shadow-lg" aria-labelledby="languages-title">
        <h3 id="languages-title" className="mb-4 text-xl font-bold text-gray-900">
          Languages
        </h3>

        <div className="mb-4 flex gap-2">
          <label htmlFor="newLanguage" className="sr-only">
            Add a language
          </label>
          <input
            id="newLanguage"
            type="text"
            value={newLanguage}
            onChange={(event) => setNewLanguage(event.target.value)}
            placeholder="Add a language, e.g., English or Malay"
            className="input flex-1"
            disabled={isBusy}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                addListItem('languages', newLanguage, () => setNewLanguage(''));
              }
            }}
          />
          <button
            type="button"
            onClick={() =>
              addListItem('languages', newLanguage, () => setNewLanguage(''))
            }
            disabled={isBusy || !newLanguage.trim()}
            className="btn-primary flex items-center gap-2"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Add
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          {formData.languages.map((language, index) => (
            <div
              key={`${language}-${index}`}
              className="badge-primary flex items-center gap-2"
            >
              <span>{language}</span>
              <button
                type="button"
                onClick={() => removeListItem('languages', index)}
                className="hover:text-red-600"
                aria-label={`Remove ${language}`}
                disabled={isBusy}
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          ))}
        </div>
      </section>

      <section className="card shadow-lg" aria-labelledby="awards-title">
        <h3 id="awards-title" className="mb-4 text-xl font-bold text-gray-900">
          Awards & Honors
        </h3>

        <div className="mb-4 flex gap-2">
          <label htmlFor="newAward" className="sr-only">
            Add an award or honor
          </label>
          <input
            id="newAward"
            type="text"
            value={newAward}
            onChange={(event) => setNewAward(event.target.value)}
            placeholder="Add an award or honor"
            className="input flex-1"
            disabled={isBusy}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                addListItem('awards', newAward, () => setNewAward(''));
              }
            }}
          />
          <button
            type="button"
            onClick={() => addListItem('awards', newAward, () => setNewAward(''))}
            disabled={isBusy || !newAward.trim()}
            className="btn-primary flex items-center gap-2"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Add
          </button>
        </div>

        <div className="space-y-2">
          {formData.awards.map((award, index) => (
            <div
              key={`${award}-${index}`}
              className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 p-3"
            >
              <span className="text-gray-700">{award}</span>
              <button
                type="button"
                onClick={() => removeListItem('awards', index)}
                className="text-red-600 hover:text-red-700"
                aria-label={`Remove ${award}`}
                disabled={isBusy}
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          ))}
        </div>
      </section>

      <section className="card shadow-lg" aria-labelledby="profile-photo-title">
        <h3 id="profile-photo-title" className="mb-4 text-xl font-bold text-gray-900">
          Profile Photo
        </h3>

        <div className="space-y-4">
          {formData.profilePhoto && (
            <div className="relative inline-block">
              <img
                src={formData.profilePhoto}
                alt="Teacher profile preview"
                className="h-32 w-32 rounded-lg object-cover"
              />
              <button
                type="button"
                onClick={removeProfilePhoto}
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
                    onClick={() => removeCertificatePhoto(index)}
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
