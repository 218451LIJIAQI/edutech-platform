import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Edit,
  Users,
  BookOpen,
  Radio,
  Bell,
  Video,
  FileText,
  Upload,
  Send,
  Play,
  Trash2,
  Plus,
  Eye,
  Settings,
} from 'lucide-react';
import courseService from '@/services/course.service';
import notificationService from '@/services/notification.service';
import LessonModal from '@/components/teacher/LessonModal';
import { Course, CourseType, LessonType } from '@/types';
import toast from 'react-hot-toast';

/**
 * Course Management Page
 * Detailed course management with live teaching, notifications, and materials
 */
const CourseManagementPage = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const [course, setCourse] = useState<Course | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'live' | 'notifications' | 'materials' | 'recordings'>('overview');
  const [notificationTitle, setNotificationTitle] = useState('');
  const [notificationMessage, setNotificationMessage] = useState('');
  const [isSendingNotification, setIsSendingNotification] = useState(false);
  const [showRecordingModal, setShowRecordingModal] = useState(false);
  const [editingRecordingId, setEditingRecordingId] = useState<string | undefined>(undefined);
  const [recordingDefaultVideoType] = useState<'upload' | 'link'>('upload');

  useEffect(() => {
    fetchCourse();
  }, [courseId]);

  const fetchCourse = async () => {
    setIsLoading(true);
    try {
      const data = await courseService.getCourseById(courseId!);
      setCourse(data);
    } catch (error) {
      console.error('Failed to fetch course:', error);
      toast.error('Failed to load course');
      navigate('/teacher/courses');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendNotification = async () => {
    if (!notificationTitle.trim() || !notificationMessage.trim()) {
      toast.error('Please fill in all notification fields');
      return;
    }

    setIsSendingNotification(true);
    try {
      await notificationService.sendCourseNotification(courseId!, {
        title: notificationTitle.trim(),
        message: notificationMessage.trim(),
        type: 'COURSE_ANNOUNCEMENT',
      });
      toast.success('Notification sent to all students');
      setNotificationTitle('');
      setNotificationMessage('');
    } catch (error) {
      const message = error instanceof Error && 'response' in error
        ? (error as { response?: { data?: { message?: string } } }).response?.data?.message
        : error instanceof Error
        ? error.message
        : undefined;
      toast.error(message || 'Failed to send notification');
    } finally {
      setIsSendingNotification(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50">
        <div className="flex flex-col items-center space-y-4">
          <div className="spinner"></div>
          <p className="text-gray-600 font-medium">Loading course details...</p>
        </div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Course not found</h1>
          <Link to="/teacher/courses" className="btn-primary">
            Back to My Courses
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <button type="button"
            onClick={() => navigate('/teacher/courses')}
            className="flex items-center space-x-2 text-primary-600 hover:text-primary-700 font-semibold mb-4"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back to My Courses</span>
          </button>

          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">{course.title}</h1>
              <div className="flex items-center space-x-4 flex-wrap">
                <span className={`badge ${course.isPublished ? 'badge-success' : 'badge-warning'}`}>
                  {course.isPublished ? 'Published' : 'Draft'}
                </span>
                <span className="badge-primary">{course.category}</span>
                {course.courseType === CourseType.LIVE && (
                  <span className="badge bg-gradient-to-r from-red-100 to-red-50 text-red-800 border border-red-200 flex items-center gap-1">
                    <Radio className="w-3 h-3" />
                    Live Course
                  </span>
                )}
                {course.courseType === CourseType.RECORDED && (
                  <span className="badge bg-gradient-to-r from-blue-100 to-blue-50 text-blue-800 border border-blue-200 flex items-center gap-1">
                    <Video className="w-3 h-3" />
                    Recorded Course
                  </span>
                )}
                {course.courseType === CourseType.HYBRID && (
                  <span className="badge bg-gradient-to-r from-purple-100 to-purple-50 text-purple-800 border border-purple-200 flex items-center gap-1">
                    <Play className="w-3 h-3" />
                    Hybrid Course
                  </span>
                )}
              </div>
            </div>
            <Link
              to={`/teacher/courses/${courseId}/edit`}
              className="btn-outline flex items-center space-x-2"
            >
              <Edit className="w-5 h-5" />
              <span>Edit Course</span>
            </Link>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="card bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105 border border-blue-400/30 rounded-2xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-blue-100 uppercase tracking-wide">Students Enrolled</p>
                <p className="text-4xl font-bold text-white mt-3">
                  {(course as Course & { _count?: { enrollments?: number } })._count?.enrollments || 0}
                </p>
              </div>
              <Users className="w-16 h-16 text-blue-200 opacity-50" />
            </div>
          </div>

          <div className="card bg-gradient-to-br from-purple-500 to-purple-600 text-white shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105 border border-purple-400/30 rounded-2xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-purple-100 uppercase tracking-wide">Lessons</p>
                <p className="text-4xl font-bold text-white mt-3">{course.lessons?.length || 0}</p>
              </div>
              <BookOpen className="w-16 h-16 text-purple-200 opacity-50" />
            </div>
          </div>

          <div className="card bg-gradient-to-br from-green-500 to-green-600 text-white shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105 border border-green-400/30 rounded-2xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-green-100 uppercase tracking-wide">Materials</p>
                <p className="text-4xl font-bold text-white mt-3">{course.materials?.length || 0}</p>
              </div>
              <FileText className="w-16 h-16 text-green-200 opacity-50" />
            </div>
          </div>

          <div className="card bg-gradient-to-br from-orange-500 to-orange-600 text-white shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105 border border-orange-400/30 rounded-2xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-orange-700 uppercase tracking-wide">Pricing Options</p>
                <p className="text-3xl font-bold text-orange-900 mt-2">{course.packages?.length || 0}</p>
              </div>
              <Settings className="w-12 h-12 text-orange-300" />
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="card mb-8">
          <div className="flex items-center space-x-2 border-b border-gray-200 overflow-x-auto">
            {(['overview', 'live', 'notifications', 'materials', 'recordings'] as const).map((tab) => (
              <button
                type="button"
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-6 py-4 font-medium transition-all whitespace-nowrap ${
                  activeTab === tab
                    ? 'text-primary-600 border-b-2 border-primary-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {tab === 'overview' && 'Overview'}
                {tab === 'live' && 'Live Teaching'}
                {tab === 'notifications' && 'Notifications'}
                {tab === 'materials' && 'Materials'}
                {tab === 'recordings' && 'Recordings'}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-4">Course Description</h3>
                  <p className="text-gray-700 leading-relaxed">{course.description}</p>
                </div>

                {course.thumbnail && (
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 mb-4">Course Thumbnail</h3>
                    <img
                      src={course.thumbnail}
                      alt={course.title}
                      className="w-full max-w-md h-auto rounded-lg shadow-lg"
                    />
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-gray-50 p-6 rounded-lg">
                    <h4 className="font-bold text-gray-900 mb-3">Course Information</h4>
                    <div className="space-y-2 text-sm">
                      <p>
                        <span className="font-medium text-gray-700">Category:</span> {course.category}
                      </p>
                      <p>
                        <span className="font-medium text-gray-700">Type:</span> {course.courseType}
                      </p>
                      <p>
                        <span className="font-medium text-gray-700">Status:</span>{' '}
                        {course.isPublished ? 'Published' : 'Draft'}
                      </p>
                      <p>
                        <span className="font-medium text-gray-700">Created:</span>{' '}
                        {new Date(course.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  <div className="bg-gray-50 p-6 rounded-lg">
                    <h4 className="font-bold text-gray-900 mb-3">Quick Actions</h4>
                    <div className="space-y-2">
                      <Link
                        to={`/courses/${courseId}`}
                        className="btn-outline btn-sm w-full justify-center flex items-center space-x-2"
                      >
                        <Eye className="w-4 h-4" />
                        <span>View Course Page</span>
                      </Link>
                      <Link
                        to={`/teacher/courses/${courseId}/edit`}
                        className="btn-primary btn-sm w-full justify-center flex items-center space-x-2"
                      >
                        <Edit className="w-4 h-4" />
                        <span>Edit Course</span>
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Live Teaching Tab */}
            {activeTab === 'live' && (
              <div className="space-y-6">
                <div className="bg-gradient-to-r from-red-50 to-red-100 border-2 border-red-200 p-6 rounded-lg">
                  <div className="flex items-start space-x-4">
                    <Radio className="w-8 h-8 text-red-600 flex-shrink-0 mt-1" />
                    <div>
                      <h3 className="text-lg font-bold text-red-900 mb-2">Live Teaching Session</h3>
                      <p className="text-red-800 mb-4">
                        Start a live teaching session for your students. They will receive notifications and can join the live class.
                      </p>
                      <button type="button" className="btn-primary flex items-center space-x-2">
                        <Radio className="w-4 h-4" />
                        <span>Start Live Session</span>
                      </button>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 p-6 rounded-lg">
                  <h4 className="font-bold text-gray-900 mb-4">Previous Live Sessions</h4>
                  <p className="text-gray-600">No live sessions yet. Start your first session above.</p>
                </div>
              </div>
            )}

            {/* Notifications Tab */}
            {activeTab === 'notifications' && (
              <div className="space-y-6">
                <div className="bg-gradient-to-r from-blue-50 to-blue-100 border-2 border-blue-200 p-6 rounded-lg">
                  <h3 className="text-lg font-bold text-blue-900 mb-4 flex items-center space-x-2">
                    <Bell className="w-5 h-5" />
                    <span>Send Notification to All Students</span>
                  </h3>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Notification Title
                      </label>
                      <input
                        type="text"
                        value={notificationTitle}
                        onChange={(e) => setNotificationTitle(e.target.value)}
                        placeholder="e.g., New Class Schedule, New Course Material, etc."
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Message
                      </label>
                      <textarea
                        value={notificationMessage}
                        onChange={(e) => setNotificationMessage(e.target.value)}
                        placeholder="Write your notification message here..."
                        rows={5}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={handleSendNotification}
                      disabled={isSendingNotification}
                      className="btn-primary flex items-center space-x-2 w-full justify-center"
                    >
                      <Send className="w-4 h-4" />
                      <span>{isSendingNotification ? 'Sending...' : 'Send Notification'}</span>
                    </button>
                  </div>
                </div>

                <div className="bg-gray-50 p-6 rounded-lg">
                  <h4 className="font-bold text-gray-900 mb-4">Notification History</h4>
                  <p className="text-gray-600">No notifications sent yet.</p>
                </div>
              </div>
            )}

            {/* Materials Tab */}
            {activeTab === 'materials' && (
              <div className="space-y-6">
                <div className="bg-gradient-to-r from-green-50 to-green-100 border-2 border-green-200 p-6 rounded-lg">
                  <h3 className="text-lg font-bold text-green-900 mb-4 flex items-center space-x-2">
                    <Upload className="w-5 h-5" />
                    <span>Course Materials</span>
                  </h3>

                  <div className="space-y-4">
                    <p className="text-green-800">
                      Upload course materials such as PDFs, documents, images, and other resources for your students.
                    </p>

                    <div className="border-2 border-dashed border-green-300 rounded-lg p-8 text-center hover:bg-green-50 transition-colors cursor-pointer">
                      <FileText className="w-12 h-12 text-green-400 mx-auto mb-3" />
                      <p className="text-gray-700 font-medium mb-2">Upload Course Materials</p>
                      <p className="text-sm text-gray-600">Drag and drop files or click to browse</p>
                    </div>

                    <button type="button" className="btn-outline w-full flex items-center justify-center space-x-2">
                      <Plus className="w-4 h-4" />
                      <span>Add Material</span>
                    </button>
                  </div>
                </div>

                <div className="bg-gray-50 p-6 rounded-lg">
                  <h4 className="font-bold text-gray-900 mb-4">Uploaded Materials</h4>
                  {course.materials && course.materials.length > 0 ? (
                    <div className="space-y-3">
                      {course.materials.map((material) => (
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
                          <button type="button" aria-label="Delete material" title="Delete material" className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-600">No materials uploaded yet.</p>
                  )}
                </div>
              </div>
            )}

            {/* Recordings Tab */}
            {activeTab === 'recordings' && (
              <div className="space-y-6">
                <div className="bg-gradient-to-r from-purple-50 to-purple-100 border-2 border-purple-200 p-6 rounded-lg">
                  <h3 className="text-lg font-bold text-purple-900 mb-4 flex items-center space-x-2">
                    <Video className="w-5 h-5" />
                    <span>Upload Recording Videos</span>
                  </h3>

                  <div className="space-y-4">
                    <p className="text-purple-800">
                      Add recorded videos from your live sessions or pre-recorded content. You can upload files or paste a video link.
                    </p>

                    <div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setEditingRecordingId(undefined);
                          setShowRecordingModal(true);
                        }}
                        className="btn-primary w-full flex items-center justify-center gap-2"
                      >
                        <Upload className="w-4 h-4" />
                        Add Recording
                      </button>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 p-6 rounded-lg">
                  <h4 className="font-bold text-gray-900 mb-4">Uploaded Recordings</h4>
                  {course.lessons?.filter((l) => l.type === LessonType.RECORDED).length ? (
                    <div className="space-y-3">
                      {course.lessons
                        ?.filter((l) => l.type === LessonType.RECORDED)
                        .map((lesson, index) => (
                          <div key={lesson.id} className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-shadow">
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 bg-purple-200 text-purple-800 rounded-full flex items-center justify-center font-bold">
                                {index + 1}
                              </div>
                              <div>
                                <p className="font-semibold text-gray-900">{lesson.title}</p>
                                <div className="text-sm text-gray-600 flex items-center gap-3">
                                  <span>Recorded</span>
                                  {lesson.duration ? <span>{lesson.duration} min</span> : null}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => {
                                  setEditingRecordingId(lesson.id);
                                  setShowRecordingModal(true);
                                }}
                                type="button" className="btn-sm btn-outline"
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                aria-label="Delete recording"
                                title="Delete recording"
                                onClick={async () => {
                                  if (!confirm('Delete this recording?')) return;
                                  try {
                                    await courseService.deleteLesson(lesson.id);
                                    toast.success('Recording deleted');
                                    await fetchCourse();
                                  } catch (e) {
                                    toast.error('Failed to delete');
                                  }
                                }}
                                className="btn-sm text-red-600 hover:bg-red-50"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                    </div>
                  ) : (
                    <p className="text-gray-600">No recordings uploaded yet.</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
        {/* Modals */}
        {showRecordingModal && (
          <LessonModal
            courseId={courseId!}
            lessonId={editingRecordingId}
            initialLesson={editingRecordingId ? (course?.lessons || []).find(l => l.id === editingRecordingId) : undefined}
            defaultVideoType={recordingDefaultVideoType}
            onClose={() => {
              setShowRecordingModal(false);
              setEditingRecordingId(undefined);
            }}
            onSuccess={fetchCourse}
          />
        )}
      </div>
    </div>
  );
};

export default CourseManagementPage;

