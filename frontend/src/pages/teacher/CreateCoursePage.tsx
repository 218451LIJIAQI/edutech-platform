import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import {
  Save,
  Plus,
  Trash2,
  ArrowLeft,
  Upload,
  PlayCircle,
  FileText,
  DollarSign,
  Edit,
  Download,
  File as FileIcon,
} from 'lucide-react';
import { Course, Lesson, LessonPackage, Material, CourseType } from '@/types';
import courseService from '@/services/course.service';
import uploadService from '@/services/upload.service';
import FileUpload from '@/components/common/FileUpload';
import LessonModal from '@/components/teacher/LessonModal';
import PackageModal from '@/components/teacher/PackageModal';
import MaterialModal from '@/components/teacher/MaterialModal';
import toast from 'react-hot-toast';

interface CourseFormData {
  title: string;
  description: string;
  category: string;
  courseType: CourseType;
  thumbnail?: string;
  previewVideoUrl?: string;
}

/**
 * Create/Edit Course Page
 * Teacher interface for creating and editing courses
 */
const CreateCoursePage = () => {
  const { courseId } = useParams<{ courseId?: string }>();
  const navigate = useNavigate();
  const isEditMode = !!courseId;

  const [course, setCourse] = useState<Course | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [packages, setPackages] = useState<LessonPackage[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [activeTab, setActiveTab] = useState<'basic' | 'lessons' | 'packages' | 'materials'>(
    'basic'
  );
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [thumbnailType, setThumbnailType] = useState<'upload' | 'link'>('upload');
  const [thumbnailLink, setThumbnailLink] = useState('');
  const [previewVideoFile, setPreviewVideoFile] = useState<File | null>(null);
  const [previewVideoType, setPreviewVideoType] = useState<'upload' | 'link'>('upload');
  const [previewVideoLink, setPreviewVideoLink] = useState('');
  const [showLessonModal, setShowLessonModal] = useState(false);
  const [showPackageModal, setShowPackageModal] = useState(false);
  const [showMaterialModal, setShowMaterialModal] = useState(false);
  const [editingLessonId, setEditingLessonId] = useState<string | undefined>();
  const [editingPackageId, setEditingPackageId] = useState<string | undefined>();
  const [editingMaterialId, setEditingMaterialId] = useState<string | undefined>();

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<CourseFormData>();

  useEffect(() => {
    if (isEditMode) {
      fetchCourse();
    }
  }, [courseId]);

  const fetchCourse = async () => {
    setIsLoading(true);
    try {
      const data = await courseService.getCourseById(courseId!);
      setCourse(data);
      setLessons(data.lessons || []);
      setPackages(data.packages || []);
      setMaterials(data.materials || []);

      // Populate form
      setValue('title', data.title);
      setValue('description', data.description);
      setValue('category', data.category);
      setValue('courseType', data.courseType);
      setValue('thumbnail', data.thumbnail);
      setValue('previewVideoUrl', data.previewVideoUrl);
      
      // Determine thumbnail type
      if (data.thumbnail) {
        const isExternalLink = data.thumbnail.startsWith('http://') || 
                               data.thumbnail.startsWith('https://');
        if (isExternalLink) {
          setThumbnailType('link');
          setThumbnailLink(data.thumbnail);
        }
      }
      
      // Determine preview video type
      if (data.previewVideoUrl) {
        const isExternalLink = data.previewVideoUrl.startsWith('http://') || 
                               data.previewVideoUrl.startsWith('https://');
        if (isExternalLink) {
          setPreviewVideoType('link');
          setPreviewVideoLink(data.previewVideoUrl);
        }
      }
    } catch (error) {
      console.error('Failed to fetch course:', error);
      toast.error('Failed to load course');
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmit = async (data: CourseFormData) => {
    setIsSaving(true);
    try {
      // Handle thumbnail based on selected type
      if (thumbnailType === 'upload' && thumbnailFile) {
        data.thumbnail = await uploadService.uploadThumbnail(thumbnailFile);
      } else if (thumbnailType === 'link' && thumbnailLink.trim()) {
        data.thumbnail = thumbnailLink.trim();
      }
      
      // Handle preview video based on selected type
      if (previewVideoType === 'upload' && previewVideoFile) {
        toast.loading('Uploading preview video...');
        data.previewVideoUrl = await uploadService.uploadVideo(previewVideoFile);
      } else if (previewVideoType === 'link' && previewVideoLink.trim()) {
        data.previewVideoUrl = previewVideoLink.trim();
      }

      // Remove empty strings to avoid validation errors
      const cleanData: Partial<Course> = {
        title: data.title,
        description: data.description,
        category: data.category,
        courseType: data.courseType || CourseType.RECORDED,
      };

      // Only add optional fields if they have values
      if (data.thumbnail) {
        cleanData.thumbnail = data.thumbnail;
      }
      if (data.previewVideoUrl) {
        cleanData.previewVideoUrl = data.previewVideoUrl;
      }

      let savedCourse: Course;
      if (isEditMode) {
        savedCourse = await courseService.updateCourse(courseId!, cleanData);
        toast.success('Course updated successfully!');
      } else {
        savedCourse = await courseService.createCourse(cleanData);
        toast.success('Course created successfully!');
      }

      setCourse(savedCourse);
      if (!isEditMode) {
        navigate(`/teacher/courses/${savedCourse.id}/edit`);
      }
    } catch (error) {
      console.error('Failed to save course:', error);
      let errorMessage = 'Failed to save course';
      if (error instanceof Error && 'response' in error) {
        const err = error as { response?: { data?: { message?: string; errors?: Record<string, string[]> } } };
        if (err.response?.data?.message) {
          errorMessage = err.response.data.message;
        } else if (err.response?.data?.errors) {
          errorMessage = Object.values(err.response.data.errors).flat().join(', ');
        }
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }
      toast.error(errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  const handlePublishToggle = async () => {
    if (!course) return;

    try {
      await courseService.updateCourse(course.id, {
        isPublished: !course.isPublished,
      });
      setCourse({ ...course, isPublished: !course.isPublished });
      toast.success(
        course.isPublished ? 'Course unpublished' : 'Course published successfully!'
      );
    } catch (error) {
      toast.error('Failed to update course status');
    }
  };

  const handleAddLesson = () => {
    setEditingLessonId(undefined);
    setShowLessonModal(true);
  };

  const handleEditLesson = (lessonId: string) => {
    setEditingLessonId(lessonId);
    setShowLessonModal(true);
  };

  const handleDeleteLesson = async (lessonId: string) => {
    if (!confirm('Are you sure you want to delete this lesson?')) return;

    try {
      await courseService.deleteLesson(lessonId);
      toast.success('Lesson deleted successfully!');
      fetchCourse();
    } catch (error) {
      toast.error('Failed to delete lesson');
    }
  };

  const handleAddPackage = () => {
    setEditingPackageId(undefined);
    setShowPackageModal(true);
  };

  const handleEditPackage = (packageId: string) => {
    setEditingPackageId(packageId);
    setShowPackageModal(true);
  };

  const handleDeletePackage = async (packageId: string) => {
    if (!confirm('Are you sure you want to delete this package?')) return;

    try {
      await courseService.deletePackage(packageId);
      toast.success('Package deleted successfully!');
      fetchCourse();
    } catch (error) {
      toast.error('Failed to delete package');
    }
  };

  const handleAddMaterial = () => {
    setEditingMaterialId(undefined);
    setShowMaterialModal(true);
  };

  const handleEditMaterial = (materialId: string) => {
    setEditingMaterialId(materialId);
    setShowMaterialModal(true);
  };

  const handleDeleteMaterial = async (materialId: string) => {
    if (!confirm('Are you sure you want to delete this material?')) return;

    try {
      await courseService.deleteMaterial(materialId);
      toast.success('Material deleted successfully!');
      fetchCourse();
    } catch (error) {
      toast.error('Failed to delete material');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50">
        <div className="flex flex-col items-center space-y-4">
          <div className="spinner"></div>
          <p className="text-gray-600 font-medium">Loading course editor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50 py-8">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate('/teacher/courses')}
            className="btn-outline mb-6"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Courses
          </button>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="section-title mb-2">
                {isEditMode ? 'Edit Course' : 'Create New Course'}
              </h1>
              <p className="section-subtitle">
                {isEditMode
                  ? 'Update your course information'
                  : 'Create a new course for your students'}
              </p>
            </div>
            {isEditMode && course && (
              <div className="flex items-center space-x-4">
                <button
                  onClick={handlePublishToggle}
                  className={`btn ${
                    course.isPublished
                      ? 'bg-gradient-to-r from-yellow-600 to-yellow-700 hover:from-yellow-700 hover:to-yellow-800 text-white'
                      : 'btn-primary'
                  }`}
                >
                  {course.isPublished ? 'Unpublish' : 'Publish'}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-8">
          <div className="bg-white rounded-xl p-2 shadow-md border border-gray-200">
            <nav className="flex space-x-2">
              {([
                { id: 'basic' as const, label: 'Basic Info', icon: FileText },
                { id: 'lessons' as const, label: 'Lessons', icon: PlayCircle },
                { id: 'packages' as const, label: 'Pricing', icon: DollarSign },
                { id: 'materials' as const, label: 'Materials', icon: Upload },
              ] as const).map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 py-3 px-4 rounded-lg font-semibold text-sm transition-all ${
                    activeTab === tab.id
                      ? 'bg-primary-600 text-white shadow-md'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <tab.icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Tab Content */}
        <div className="card shadow-lg">
          {/* Basic Info Tab */}
          {activeTab === 'basic' && (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Course Title *
                </label>
                <input
                  type="text"
                  {...register('title', { 
                    required: 'Title is required',
                    minLength: {
                      value: 5,
                      message: 'Title must be at least 5 characters'
                    },
                    maxLength: {
                      value: 200,
                      message: 'Title must not exceed 200 characters'
                    }
                  })}
                  className="input"
                  placeholder="Enter course title (minimum 5 characters)"
                />
                {errors.title && (
                  <p className="text-red-600 text-sm mt-2 font-medium">{errors.title.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Description *
                </label>
                <textarea
                  {...register('description', { 
                    required: 'Description is required',
                    minLength: {
                      value: 20,
                      message: 'Description must be at least 20 characters'
                    },
                    maxLength: {
                      value: 2000,
                      message: 'Description must not exceed 2000 characters'
                    }
                  })}
                  rows={6}
                  className="input"
                  placeholder="Describe your course, what students will learn, prerequisites, etc. (minimum 20 characters)"
                />
                {errors.description && (
                  <p className="text-red-600 text-sm mt-2 font-medium">{errors.description.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Category *
                </label>
                <select
                  {...register('category', { required: 'Category is required' })}
                  className="input"
                >
                  <option value="">Select a category</option>
                  <option value="Programming">Programming</option>
                  <option value="Business">Business</option>
                  <option value="Design">Design</option>
                  <option value="Marketing">Marketing</option>
                  <option value="Photography">Photography</option>
                  <option value="Music">Music</option>
                  <option value="Language">Language</option>
                  <option value="Other">Other</option>
                </select>
                {errors.category && (
                  <p className="text-red-600 text-sm mt-1">{errors.category.message}</p>
                )}
              </div>

              {/* Course Type - Platform's Key Feature */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Course Type * 
                  <span className="ml-2 text-xs font-normal text-primary-600">
                    ⭐ Platform Feature
                  </span>
                </label>
                <select
                  {...register('courseType', { required: 'Course type is required' })}
                  className="input"
                  defaultValue={CourseType.RECORDED}
                >
                  <option value="">Select course type</option>
                  <option value={CourseType.LIVE}>
                    🔴 Live Sessions - Real-time online classes with students
                  </option>
                  <option value={CourseType.RECORDED}>
                    📹 Recorded - Pre-recorded video lessons students can watch anytime
                  </option>
                  <option value={CourseType.HYBRID}>
                    🎯 Hybrid - Mix of live sessions and recorded content
                  </option>
                </select>
                {errors.courseType && (
                  <p className="text-red-600 text-sm mt-1">{errors.courseType.message}</p>
                )}
                <p className="text-xs text-gray-500 mt-1">
                  This is a key differentiator of our platform - clearly showing students whether they'll attend live classes or watch recorded videos.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Course Thumbnail (Optional)
                </label>
                
                {/* Thumbnail Type Selection */}
                <div className="flex space-x-4 mb-4">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="radio"
                      value="upload"
                      checked={thumbnailType === 'upload'}
                      onChange={(e) => {
                        setThumbnailType(e.target.value as 'upload');
                        setThumbnailLink('');
                      }}
                      className="form-radio text-primary-600"
                    />
                    <span className="text-sm">Upload Image File</span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="radio"
                      value="link"
                      checked={thumbnailType === 'link'}
                      onChange={(e) => {
                        setThumbnailType(e.target.value as 'link');
                        setThumbnailFile(null);
                      }}
                      className="form-radio text-primary-600"
                    />
                    <span className="text-sm">Image URL Link</span>
                  </label>
                </div>

                {/* Upload File Option */}
                {thumbnailType === 'upload' && (
                  <>
                    <FileUpload
                      label=""
                      accept="image/*"
                      maxSize={5}
                      onFileSelect={setThumbnailFile}
                      preview={true}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Recommended: 1280x720px, PNG or JPG (max 5MB)
                    </p>
                  </>
                )}

                {/* Image Link Option */}
                {thumbnailType === 'link' && (
                  <>
                    <input
                      type="url"
                      value={thumbnailLink}
                      onChange={(e) => setThumbnailLink(e.target.value)}
                      placeholder="https://example.com/image.jpg"
                      className="input"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Paste an image URL (JPEG, PNG, WebP, etc.)
                    </p>
                    {thumbnailLink && (
                      <div className="mt-2">
                        <p className="text-xs font-medium text-gray-700 mb-1">Preview:</p>
                        <div className="w-full max-w-xs aspect-video bg-gray-100 rounded-lg overflow-hidden">
                          <img 
                            src={thumbnailLink} 
                            alt="Thumbnail preview" 
                            className="w-full h-full object-cover"
                            onError={() => toast.error('Failed to load image')}
                          />
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Preview Video (Optional)
                </label>
                
                {/* Video Type Selection */}
                <div className="flex space-x-4 mb-4">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="radio"
                      value="upload"
                      checked={previewVideoType === 'upload'}
                      onChange={(e) => {
                        setPreviewVideoType(e.target.value as 'upload');
                        setPreviewVideoLink('');
                      }}
                      className="form-radio text-primary-600"
                    />
                    <span className="text-sm">Upload Video File</span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="radio"
                      value="link"
                      checked={previewVideoType === 'link'}
                      onChange={(e) => {
                        setPreviewVideoType(e.target.value as 'link');
                        setPreviewVideoFile(null);
                      }}
                      className="form-radio text-primary-600"
                    />
                    <span className="text-sm">Video Link (YouTube, Vimeo, etc.)</span>
                  </label>
                </div>

                {/* Upload File Option */}
                {previewVideoType === 'upload' && (
                  <>
                    <FileUpload
                      label=""
                      accept="video/*"
                      maxSize={100}
                      onFileSelect={setPreviewVideoFile}
                      preview={true}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Upload a video file (max 100MB). Supported formats: MP4, WebM, MOV
                    </p>
                  </>
                )}

                {/* Video Link Option */}
                {previewVideoType === 'link' && (
                  <>
                    <input
                      type="url"
                      value={previewVideoLink}
                      onChange={(e) => setPreviewVideoLink(e.target.value)}
                      placeholder="https://www.youtube.com/watch?v=... or https://vimeo.com/..."
                      className="input"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Paste a video URL from YouTube, Vimeo, or direct video link
                    </p>
                    {previewVideoLink && (
                      <div className="mt-2">
                        <p className="text-xs font-medium text-gray-700 mb-1">Preview:</p>
                        <div className="aspect-video bg-gray-100 rounded-lg overflow-hidden">
                          {previewVideoLink.includes('youtube.com') || previewVideoLink.includes('youtu.be') ? (
                            <iframe
                              src={previewVideoLink.replace('watch?v=', 'embed/').replace('youtu.be/', 'youtube.com/embed/')}
                              className="w-full h-full"
                              allowFullScreen
                              title="Preview"
                            />
                          ) : previewVideoLink.includes('vimeo.com') ? (
                            <iframe
                              src={previewVideoLink.replace('vimeo.com/', 'player.vimeo.com/video/')}
                              className="w-full h-full"
                              allowFullScreen
                              title="Preview"
                            />
                          ) : (
                            <video src={previewVideoLink} controls className="w-full h-full" />
                          )}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>

              <div className="flex items-center justify-end space-x-4">
                <button
                  type="button"
                  onClick={() => navigate('/teacher/courses')}
                  className="btn-outline"
                >
                  Cancel
                </button>
                <button type="submit" disabled={isSaving} className="btn-primary">
                  {isSaving ? (
                    <>
                      <div className="spinner mr-2"></div>
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      {isEditMode ? 'Update Course' : 'Create Course'}
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* Lessons Tab */}
          {activeTab === 'lessons' && (
            <div>
              {!course ? (
                <div className="text-center py-12">
                  <PlayCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-600">
                    Please save the basic course information first
                  </p>
                </div>
              ) : (
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold">Course Lessons</h2>
                    <button onClick={handleAddLesson} className="btn-primary">
                      <Plus className="w-4 h-4 mr-2" />
                      Add Lesson
                    </button>
                  </div>

                  {lessons.length === 0 ? (
                    <div className="text-center py-12 bg-gray-50 rounded-lg">
                      <PlayCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-600 mb-4">No lessons yet</p>
                      <button onClick={handleAddLesson} className="btn-primary">
                        Add Your First Lesson
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {lessons.map((lesson, index) => (
                        <div
                          key={lesson.id}
                          className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                        >
                          <div className="flex items-center space-x-4">
                            <span className="text-gray-400 font-medium">{index + 1}</span>
                            <div>
                              <h3 className="font-medium">{lesson.title}</h3>
                              <div className="flex items-center space-x-2 text-sm text-gray-600">
                                <span className="badge-sm">{lesson.type}</span>
                                {lesson.duration && <span>{lesson.duration} min</span>}
                                {lesson.isFree && (
                                  <span className="badge-sm bg-green-100 text-green-800">
                                    Free
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <button
                              type="button"
                              onClick={() => handleEditLesson(lesson.id)}
                              className="btn-sm btn-outline"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteLesson(lesson.id)}
                              className="btn-sm text-red-600 hover:bg-red-50"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Packages Tab */}
          {activeTab === 'packages' && (
            <div>
              {!course ? (
                <div className="text-center py-12">
                  <DollarSign className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-600">
                    Please save the basic course information first
                  </p>
                </div>
              ) : (
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold">Pricing Packages</h2>
                    <button onClick={handleAddPackage} className="btn-primary">
                      <Plus className="w-4 h-4 mr-2" />
                      Add Package
                    </button>
                  </div>

                  {packages.length === 0 ? (
                    <div className="text-center py-12 bg-gray-50 rounded-lg">
                      <DollarSign className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-600 mb-4">No packages yet</p>
                      <button onClick={handleAddPackage} className="btn-primary">
                        Create Your First Package
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {packages.map((pkg) => (
                        <div key={pkg.id} className="border rounded-lg p-6">
                          <h3 className="text-xl font-bold mb-2">{pkg.name}</h3>
                          <p className="text-sm text-gray-600 mb-4">{pkg.description}</p>
                          <div className="mb-4">
                            <span className="text-3xl font-bold text-primary-600">
                              ${pkg.finalPrice}
                            </span>
                            {pkg.discount && pkg.discount > 0 && (
                              <span className="ml-2 text-sm text-gray-500 line-through">
                                ${pkg.price}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center space-x-2">
                            <button
                              type="button"
                              onClick={() => handleEditPackage(pkg.id)}
                              className="btn-sm btn-outline flex-1"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeletePackage(pkg.id)}
                              className="btn-sm text-red-600 hover:bg-red-50"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Materials Tab */}
          {activeTab === 'materials' && (
            <div>
              {!course ? (
                <div className="text-center py-12">
                  <Upload className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-600">
                    Please save the basic course information first
                  </p>
                </div>
              ) : (
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold">Course Materials</h2>
                    <button onClick={handleAddMaterial} className="btn-primary">
                      <Plus className="w-4 h-4 mr-2" />
                      Upload Material
                    </button>
                  </div>

                  {materials.length === 0 ? (
                    <div className="text-center py-12 bg-gray-50 rounded-lg">
                      <Upload className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-600 mb-4">No materials uploaded yet</p>
                      <p className="text-sm text-gray-500 mb-6">
                        Upload PDFs, documents, or other resources for your students
                      </p>
                      <button onClick={handleAddMaterial} className="btn-primary">
                        Upload Your First Material
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {materials.map((material) => (
                        <div
                          key={material.id}
                          className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                        >
                          <div className="flex items-center space-x-4 flex-1">
                            <FileIcon className="w-6 h-6 text-blue-600" />
                            <div className="flex-1">
                              <h3 className="font-medium">{material.title}</h3>
                              {material.description && (
                                <p className="text-sm text-gray-600">{material.description}</p>
                              )}
                              <div className="flex items-center space-x-2 text-xs text-gray-500 mt-1">
                                <span className="badge-sm">{material.fileType}</span>
                                {material.fileSize && (
                                  <span>{(material.fileSize / 1024 / 1024).toFixed(2)} MB</span>
                                )}
                                {material.isDownloadable && (
                                  <span className="flex items-center space-x-1">
                                    <Download className="w-3 h-3" />
                                    Downloadable
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <button
                              type="button"
                              onClick={() => handleEditMaterial(material.id)}
                              className="btn-sm btn-outline"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteMaterial(material.id)}
                              className="btn-sm text-red-600 hover:bg-red-50"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modals */}
        {showLessonModal && course && (
          <LessonModal
            courseId={course.id}
            lessonId={editingLessonId}
            onClose={() => setShowLessonModal(false)}
            onSuccess={fetchCourse}
          />
        )}

        {showPackageModal && course && (
          <PackageModal
            courseId={course.id}
            packageId={editingPackageId}
            onClose={() => setShowPackageModal(false)}
            onSuccess={fetchCourse}
          />
        )}

        {showMaterialModal && course && (
          <MaterialModal
            courseId={course.id}
            materialId={editingMaterialId}
            onClose={() => setShowMaterialModal(false)}
            onSuccess={fetchCourse}
          />
        )}
      </div>
    </div>
  );
};

export default CreateCoursePage;

