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
} from 'lucide-react';
import { Course, Lesson, LessonPackage, LessonType } from '@/types';
import courseService from '@/services/course.service';
import uploadService from '@/services/upload.service';
import FileUpload from '@/components/common/FileUpload';
import LessonModal from '@/components/teacher/LessonModal';
import PackageModal from '@/components/teacher/PackageModal';
import toast from 'react-hot-toast';

interface CourseFormData {
  title: string;
  description: string;
  category: string;
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
  const [activeTab, setActiveTab] = useState<'basic' | 'lessons' | 'packages' | 'materials'>(
    'basic'
  );
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [previewVideoFile, setPreviewVideoFile] = useState<File | null>(null);
  const [showLessonModal, setShowLessonModal] = useState(false);
  const [showPackageModal, setShowPackageModal] = useState(false);
  const [editingLessonId, setEditingLessonId] = useState<string | undefined>();
  const [editingPackageId, setEditingPackageId] = useState<string | undefined>();

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

      // Populate form
      setValue('title', data.title);
      setValue('description', data.description);
      setValue('category', data.category);
      setValue('thumbnail', data.thumbnail);
      setValue('previewVideoUrl', data.previewVideoUrl);
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
      // Upload files if selected
      if (thumbnailFile) {
        data.thumbnail = await uploadService.uploadThumbnail(thumbnailFile);
      }
      if (previewVideoFile) {
        toast.info('Uploading preview video...');
        data.previewVideoUrl = await uploadService.uploadVideo(previewVideoFile);
      }

      let savedCourse: Course;
      if (isEditMode) {
        savedCourse = await courseService.updateCourse(courseId!, data);
        toast.success('Course updated successfully!');
      } else {
        savedCourse = await courseService.createCourse(data);
        toast.success('Course created successfully!');
      }

      setCourse(savedCourse);
      if (!isEditMode) {
        navigate(`/teacher/courses/${savedCourse.id}/edit`);
      }
    } catch (error) {
      console.error('Failed to save course:', error);
      toast.error('Failed to save course');
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => navigate('/teacher/courses')}
            className="btn-outline mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Courses
          </button>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">
                {isEditMode ? 'Edit Course' : 'Create New Course'}
              </h1>
              <p className="text-gray-600">
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
                      ? 'bg-yellow-600 hover:bg-yellow-700'
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
        <div className="mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              {[
                { id: 'basic', label: 'Basic Info', icon: FileText },
                { id: 'lessons', label: 'Lessons', icon: PlayCircle },
                { id: 'packages', label: 'Pricing', icon: DollarSign },
                { id: 'materials', label: 'Materials', icon: Upload },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab.id
                      ? 'border-primary-500 text-primary-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
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
        <div className="card">
          {/* Basic Info Tab */}
          {activeTab === 'basic' && (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Course Title *
                </label>
                <input
                  type="text"
                  {...register('title', { required: 'Title is required' })}
                  className="input"
                  placeholder="Enter course title"
                />
                {errors.title && (
                  <p className="text-red-600 text-sm mt-1">{errors.title.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description *
                </label>
                <textarea
                  {...register('description', { required: 'Description is required' })}
                  rows={6}
                  className="input"
                  placeholder="Describe your course, what students will learn, prerequisites, etc."
                />
                {errors.description && (
                  <p className="text-red-600 text-sm mt-1">{errors.description.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
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

              <div>
                <FileUpload
                  label="Course Thumbnail"
                  accept="image/*"
                  maxSize={5}
                  onFileSelect={setThumbnailFile}
                  preview={true}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Recommended: 1280x720px, PNG or JPG
                </p>
              </div>

              <div>
                <FileUpload
                  label="Preview Video (Optional)"
                  accept="video/*"
                  maxSize={100}
                  onFileSelect={setPreviewVideoFile}
                  preview={true}
                />
                <p className="text-xs text-gray-500 mt-1">
                  A short preview video to attract students (max 100MB)
                </p>
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
                    <button className="btn-primary">
                      <Plus className="w-4 h-4 mr-2" />
                      Upload Material
                    </button>
                  </div>
                  <div className="text-center py-12 bg-gray-50 rounded-lg">
                    <Upload className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-600 mb-4">No materials uploaded yet</p>
                    <p className="text-sm text-gray-500">
                      Upload PDFs, documents, or other resources for your students
                    </p>
                  </div>
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
      </div>
    </div>
  );
};

export default CreateCoursePage;

