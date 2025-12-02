import { useState, useRef } from 'react';
import { Upload, X, Plus, Loader } from 'lucide-react';
import teacherService from '@/services/teacher.service';
import uploadService from '@/services/upload.service';
import { TeacherProfile } from '@/types';

interface TeacherProfileCompletionFormProps {
  onSuccess: (profile: TeacherProfile) => void;
  onError: (error: string) => void;
  initialData?: TeacherProfile;
  isEditingApproved?: boolean;
}

/**
 * Teacher Profile Completion Form Component
 * Allows teachers to fill in extended profile information for verification
 */
const TeacherProfileCompletionForm = ({
  onSuccess,
  onError,
  initialData,
  isEditingApproved = false,
}: TeacherProfileCompletionFormProps) => {
  // Form state
  const [formData, setFormData] = useState({
    selfIntroduction: initialData?.selfIntroduction || '',
    educationBackground: initialData?.educationBackground || '',
    teachingExperience: initialData?.teachingExperience || '',
    awards: Array.isArray(initialData?.awards) ? initialData.awards : [],
    specialties: Array.isArray(initialData?.specialties) ? initialData.specialties : [],
    teachingStyle: initialData?.teachingStyle || '',
    languages: Array.isArray(initialData?.languages) ? initialData.languages : [],
    yearsOfExperience: initialData?.yearsOfExperience || 0,
    profilePhoto: initialData?.profilePhoto || '',
    certificatePhotos: Array.isArray(initialData?.certificatePhotos) ? initialData.certificatePhotos : [],
  });

  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newAward, setNewAward] = useState('');
  const [newSpecialty, setNewSpecialty] = useState('');
  const [newLanguage, setNewLanguage] = useState('');
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadingCerts, setUploadingCerts] = useState(false);

  // File input refs
  const profilePhotoInputRef = useRef<HTMLInputElement>(null);
  const certificatePhotosInputRef = useRef<HTMLInputElement>(null);

  /**
   * Handle text input changes
   */
  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'yearsOfExperience' ? parseInt(value) || 0 : value,
    }));
  };

  /**
   * Add award to list
   */
  const addAward = () => {
    if (newAward.trim()) {
      setFormData((prev) => ({
        ...prev,
        awards: [...prev.awards, newAward.trim()],
      }));
      setNewAward('');
    }
  };

  /**
   * Remove award from list
   */
  const removeAward = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      awards: prev.awards.filter((_, i) => i !== index),
    }));
  };

  /**
   * Add specialty to list
   */
  const addSpecialty = () => {
    if (newSpecialty.trim()) {
      setFormData((prev) => ({
        ...prev,
        specialties: [...prev.specialties, newSpecialty.trim()],
      }));
      setNewSpecialty('');
    }
  };

  /**
   * Remove specialty from list
   */
  const removeSpecialty = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      specialties: prev.specialties.filter((_, i) => i !== index),
    }));
  };

  /**
   * Add language to list
   */
  const addLanguage = () => {
    if (newLanguage.trim()) {
      setFormData((prev) => ({
        ...prev,
        languages: [...prev.languages, newLanguage.trim()],
      }));
      setNewLanguage('');
    }
  };

  /**
   * Remove language from list
   */
  const removeLanguage = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      languages: prev.languages.filter((_, i) => i !== index),
    }));
  };

  /**
   * Handle profile photo upload
   */
  const handleProfilePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingPhoto(true);
    try {
      const uploadResult = await uploadService.uploadFile(file, 'teacher-profiles');
      setFormData((prev) => ({
        ...prev,
        profilePhoto: uploadResult.url,
      }));
    } catch (error) {
      onError('Failed to upload profile photo');
      console.error('Profile photo upload error:', error);
    } finally {
      setUploadingPhoto(false);
      // Reset input to allow re-uploading the same file
      if (profilePhotoInputRef.current) {
        profilePhotoInputRef.current.value = '';
      }
    }
  };

  /**
   * Handle certificate photos upload
   */
  const handleCertificatePhotosUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploadingCerts(true);
    try {
      const uploadedUrls: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const uploadResult = await uploadService.uploadFile(files[i], 'teacher-certificates');
        uploadedUrls.push(uploadResult.url);
      }
      setFormData((prev) => ({
        ...prev,
        certificatePhotos: [...prev.certificatePhotos, ...uploadedUrls],
      }));
    } catch (error) {
      onError('Failed to upload certificate photos');
      console.error('Certificate photos upload error:', error);
    } finally {
      setUploadingCerts(false);
      // Reset input to allow re-uploading the same files
      if (certificatePhotosInputRef.current) {
        certificatePhotosInputRef.current.value = '';
      }
    }
  };

  /**
   * Remove certificate photo
   */
  const removeCertificatePhoto = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      certificatePhotos: prev.certificatePhotos.filter((_, i) => i !== index),
    }));
  };

  /**
   * Handle form submission
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.selfIntroduction.trim()) {
      onError('Self introduction is required');
      return;
    }

    if (formData.specialties.length === 0) {
      onError('Please add at least one specialty');
      return;
    }

    if (formData.languages.length === 0) {
      onError('Please add at least one language');
      return;
    }

    setIsSubmitting(true);
    try {
      let profile;
      if (isEditingApproved) {
        // Use update endpoint for approved profiles
        profile = await teacherService.updateExtendedProfile(formData);
      } else {
        // Use submit endpoint for new submissions
        profile = await teacherService.submitExtendedProfile(formData);
      }
      onSuccess(profile);
    } catch (error) {
      const errorMessage = error instanceof Error && 'response' in error
        ? (error as { response?: { data?: { message?: string } } }).response?.data?.message || 'Failed to submit profile'
        : error instanceof Error
        ? error.message
        : 'Failed to submit profile';
      onError(errorMessage);
      console.error('Profile submission error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Self Introduction */}
      <div className="card shadow-lg">
        <h3 className="text-xl font-bold mb-4 text-gray-900">Self Introduction</h3>
        <textarea
          name="selfIntroduction"
          value={formData.selfIntroduction}
          onChange={handleInputChange}
          placeholder="Tell students about yourself, your teaching philosophy, and what makes you a great teacher..."
          className="input min-h-32"
          required
          maxLength={500}
        />
        <p className="text-sm text-gray-500 mt-2">
          {formData.selfIntroduction.length}/500 characters
        </p>
      </div>

      {/* Education Background */}
      <div className="card shadow-lg">
        <h3 className="text-xl font-bold mb-4 text-gray-900">Education Background</h3>
        <textarea
          name="educationBackground"
          value={formData.educationBackground}
          onChange={handleInputChange}
          placeholder="Describe your educational qualifications, degrees, and institutions..."
          className="input min-h-24"
        />
      </div>

      {/* Teaching Experience */}
      <div className="card shadow-lg">
        <h3 className="text-xl font-bold mb-4 text-gray-900">Teaching Experience</h3>
        <textarea
          name="teachingExperience"
          value={formData.teachingExperience}
          onChange={handleInputChange}
          placeholder="Describe your teaching experience, previous positions, and achievements..."
          className="input min-h-24"
        />
      </div>

      {/* Years of Experience */}
      <div className="card shadow-lg">
        <h3 className="text-xl font-bold mb-4 text-gray-900">Years of Experience</h3>
        <input
          type="number"
          name="yearsOfExperience"
          value={formData.yearsOfExperience}
          onChange={handleInputChange}
          min="0"
          max="70"
          className="input"
          required
          aria-label="Years of experience"
          placeholder="Enter your years of experience"
        />
      </div>

      {/* Teaching Style */}
      <div className="card shadow-lg">
        <h3 className="text-xl font-bold mb-4 text-gray-900">Teaching Style</h3>
        <textarea
          name="teachingStyle"
          value={formData.teachingStyle}
          onChange={handleInputChange}
          placeholder="Describe your teaching approach, methods, and how you engage students..."
          className="input min-h-24"
        />
      </div>

      {/* Specialties */}
      <div className="card shadow-lg">
        <h3 className="text-xl font-bold mb-4 text-gray-900">Specialties</h3>
        <div className="flex gap-2 mb-4">
          <input
            type="text"
            value={newSpecialty}
            onChange={(e) => setNewSpecialty(e.target.value)}
            placeholder="Add a specialty (e.g., Mathematics, Web Development)"
            className="input flex-1"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addSpecialty();
              }
            }}
          />
          <button
            type="button"
            onClick={addSpecialty}
            className="btn-primary flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {formData.specialties.map((specialty, index) => (
            <div
              key={index}
              className="badge-primary flex items-center gap-2"
            >
              {specialty}
              <button
                type="button"
                onClick={() => removeSpecialty(index)}
                className="hover:text-red-600"
                aria-label={`Remove ${specialty}`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Languages */}
      <div className="card shadow-lg">
        <h3 className="text-xl font-bold mb-4 text-gray-900">Languages</h3>
        <div className="flex gap-2 mb-4">
          <input
            type="text"
            value={newLanguage}
            onChange={(e) => setNewLanguage(e.target.value)}
            placeholder="Add a language (e.g., English, Spanish)"
            className="input flex-1"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addLanguage();
              }
            }}
          />
          <button
            type="button"
            onClick={addLanguage}
            className="btn-primary flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {formData.languages.map((language, index) => (
            <div
              key={index}
              className="badge-primary flex items-center gap-2"
            >
              {language}
              <button
                type="button"
                onClick={() => removeLanguage(index)}
                className="hover:text-red-600"
                aria-label={`Remove ${language}`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Awards & Honors */}
      <div className="card shadow-lg">
        <h3 className="text-xl font-bold mb-4 text-gray-900">Awards & Honors</h3>
        <div className="flex gap-2 mb-4">
          <input
            type="text"
            value={newAward}
            onChange={(e) => setNewAward(e.target.value)}
            placeholder="Add an award or honor"
            className="input flex-1"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addAward();
              }
            }}
          />
          <button
            type="button"
            onClick={addAward}
            className="btn-primary flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add
          </button>
        </div>
        <div className="space-y-2">
          {formData.awards.map((award, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200"
            >
              <span className="text-gray-700">{award}</span>
              <button
                type="button"
                onClick={() => removeAward(index)}
                className="text-red-600 hover:text-red-700"
                aria-label={`Remove ${award}`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Profile Photo */}
      <div className="card shadow-lg">
        <h3 className="text-xl font-bold mb-4 text-gray-900">Profile Photo</h3>
        <div className="space-y-4">
          {formData.profilePhoto && (
            <div className="relative inline-block">
              <img
                src={formData.profilePhoto}
                alt="Profile"
                className="w-32 h-32 rounded-lg object-cover"
              />
              <button
                type="button"
                onClick={() => setFormData((prev) => ({ ...prev, profilePhoto: '' }))}
                className="absolute top-2 right-2 bg-red-600 text-white p-1 rounded-full hover:bg-red-700"
                aria-label="Remove profile photo"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
          <button
            type="button"
            onClick={() => profilePhotoInputRef.current?.click()}
            disabled={uploadingPhoto}
            className="btn-outline flex items-center gap-2 w-full justify-center"
          >
            {uploadingPhoto ? (
              <>
                <Loader className="w-4 h-4 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                Upload Profile Photo
              </>
            )}
          </button>
          <input
            ref={profilePhotoInputRef}
            type="file"
            accept="image/*"
            onChange={handleProfilePhotoUpload}
            className="hidden"
            aria-label="Upload profile photo"
          />
        </div>
      </div>

      {/* Certificate Photos */}
      <div className="card shadow-lg">
        <h3 className="text-xl font-bold mb-4 text-gray-900">Certificate Photos</h3>
        <div className="space-y-4">
          {formData.certificatePhotos.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {formData.certificatePhotos.map((photo, index) => (
                <div key={index} className="relative">
                  <img
                    src={photo}
                    alt={`Certificate ${index + 1}`}
                    className="w-full h-32 rounded-lg object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => removeCertificatePhoto(index)}
                    className="absolute top-2 right-2 bg-red-600 text-white p-1 rounded-full hover:bg-red-700"
                    aria-label={`Remove certificate ${index + 1}`}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
          <button
            type="button"
            onClick={() => certificatePhotosInputRef.current?.click()}
            disabled={uploadingCerts}
            className="btn-outline flex items-center gap-2 w-full justify-center"
          >
            {uploadingCerts ? (
              <>
                <Loader className="w-4 h-4 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                Upload Certificate Photos
              </>
            )}
          </button>
          <input
            ref={certificatePhotosInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleCertificatePhotosUpload}
            className="hidden"
            aria-label="Upload certificate photos"
          />
        </div>
      </div>

      {/* Submit Button */}
      <div className="flex gap-4">
        <button
          type="submit"
          disabled={isSubmitting}
          className="btn-primary flex-1 flex items-center justify-center gap-2"
        >
          {isSubmitting ? (
            <>
              <Loader className="w-4 h-4 animate-spin" />
              {isEditingApproved ? 'Updating...' : 'Submitting...'}
            </>
          ) : (
            isEditingApproved ? 'Update Profile' : 'Submit Profile for Review'
          )}
        </button>
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-800">
          <strong>Note:</strong> {isEditingApproved 
            ? 'Your profile updates will be reviewed by our admin team before being published.'
            : 'Your profile will be reviewed by our admin team. Once approved, your extended profile information will be visible to students, and you\'ll receive a verified badge.'
          }
        </p>
      </div>
    </form>
  );
};

export default TeacherProfileCompletionForm;
