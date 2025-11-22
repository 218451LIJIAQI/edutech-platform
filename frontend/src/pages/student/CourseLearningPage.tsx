import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Play,
  Lock,
  CheckCircle,
  BookOpen,
  FileText,
  Download,
  ChevronRight,
  Star,
} from 'lucide-react';
import { Course, Lesson, Enrollment } from '@/types';
import courseService from '@/services/course.service';
import enrollmentService from '@/services/enrollment.service';
import toast from 'react-hot-toast';

/**
 * Course Learning Page
 * Student's main learning interface with video player and course content
 */
const CourseLearningPage = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();

  const [course, setCourse] = useState<Course | null>(null);
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [currentLesson, setCurrentLesson] = useState<Lesson | null>(null);
  const [completedLessons, setCompletedLessons] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [showReviewModal, setShowReviewModal] = useState(false);

  useEffect(() => {
    if (courseId) {
      fetchCourseData();
    }
  }, [courseId]);

  const fetchCourseData = async () => {
    setIsLoading(true);
    try {
      // Check access first
      const hasAccess = await enrollmentService.checkAccess(courseId!);
      if (!hasAccess) {
        toast.error('You need to enroll in this course first');
        navigate(`/courses/${courseId}`);
        return;
      }

      // Fetch course details
      const courseData = await courseService.getCourseById(courseId!);
      setCourse(courseData);

      // Fetch enrollment details
      const enrollments = await enrollmentService.getMyCourses();
      const currentEnrollment = enrollments.find(
        (e) => e.package?.course?.id === courseId
      );
      if (currentEnrollment) {
        setEnrollment(currentEnrollment);
      }

      // Set first lesson as current
      if (courseData.lessons && courseData.lessons.length > 0) {
        setCurrentLesson(courseData.lessons[0]);
      }
    } catch (error) {
      console.error('Failed to fetch course data:', error);
      toast.error('Failed to load course');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLessonComplete = async () => {
    if (!currentLesson || !enrollment) return;

    const newCompleted = new Set(completedLessons);
    newCompleted.add(currentLesson.id);
    setCompletedLessons(newCompleted);

    // Update progress
    const totalLessons = course?.lessons?.length || 1;
    const progress = Math.round((newCompleted.size / totalLessons) * 100);

    try {
      await enrollmentService.updateProgress(enrollment.id, newCompleted.size, progress);
      toast.success('Lesson completed!');

      // If course completed, show review modal
      if (progress === 100) {
        setShowReviewModal(true);
      }
    } catch (error) {
      console.error('Failed to update progress:', error);
    }
  };

  const handleNextLesson = () => {
    if (!course?.lessons || !currentLesson) return;

    const currentIndex = course.lessons.findIndex((l) => l.id === currentLesson.id);
    if (currentIndex < course.lessons.length - 1) {
      setCurrentLesson(course.lessons[currentIndex + 1]);
      window.scrollTo(0, 0);
    }
  };

  const handlePreviousLesson = () => {
    if (!course?.lessons || !currentLesson) return;

    const currentIndex = course.lessons.findIndex((l) => l.id === currentLesson.id);
    if (currentIndex > 0) {
      setCurrentLesson(course.lessons[currentIndex - 1]);
      window.scrollTo(0, 0);
    }
  };

  const isLessonCompleted = (lessonId: string) => {
    return completedLessons.has(lessonId);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="spinner"></div>
      </div>
    );
  }

  if (!course || !currentLesson) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <p className="text-gray-600">Course not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Video Player Section */}
      <div className="bg-black">
        <div className="container mx-auto">
          <div className="aspect-video bg-gray-900 flex items-center justify-center">
            {currentLesson.videoUrl ? (
              <video
                key={currentLesson.id}
                src={currentLesson.videoUrl}
                controls
                controlsList="nodownload"
                className="w-full h-full"
                onEnded={handleLessonComplete}
              >
                Your browser does not support the video tag.
              </video>
            ) : (
              <div className="text-white text-center">
                <Play className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p>No video available for this lesson</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Course Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Lesson Info */}
            <div className="card">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h1 className="text-2xl font-bold mb-2">{currentLesson.title}</h1>
                  <div className="flex items-center space-x-4 text-sm text-gray-600">
                    <span className="badge-primary">{currentLesson.type}</span>
                    {currentLesson.duration && (
                      <span>{currentLesson.duration} minutes</span>
                    )}
                  </div>
                </div>
                {!isLessonCompleted(currentLesson.id) && (
                  <button onClick={handleLessonComplete} className="btn-primary">
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Mark Complete
                  </button>
                )}
              </div>

              {currentLesson.description && (
                <p className="text-gray-700 leading-relaxed">{currentLesson.description}</p>
              )}
            </div>

            {/* Navigation */}
            <div className="flex items-center justify-between">
              <button
                onClick={handlePreviousLesson}
                disabled={course.lessons?.[0].id === currentLesson.id}
                className="btn-outline disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous Lesson
              </button>
              <button
                onClick={handleNextLesson}
                disabled={
                  course.lessons?.[course.lessons.length - 1].id === currentLesson.id
                }
                className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next Lesson
                <ChevronRight className="w-4 h-4 ml-2" />
              </button>
            </div>

            {/* Course Materials */}
            {course.materials && course.materials.length > 0 && (
              <div className="card">
                <h2 className="text-xl font-bold mb-4 flex items-center">
                  <FileText className="w-5 h-5 mr-2" />
                  Course Materials
                </h2>
                <div className="space-y-3">
                  {course.materials.map((material) => (
                    <div
                      key={material.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="flex items-center space-x-3">
                        <FileText className="w-5 h-5 text-gray-400" />
                        <div>
                          <p className="font-medium">{material.title}</p>
                          {material.description && (
                            <p className="text-sm text-gray-600">{material.description}</p>
                          )}
                          <p className="text-xs text-gray-500">
                            {material.fileType} • {(material.fileSize / 1024).toFixed(0)} KB
                          </p>
                        </div>
                      </div>
                      {material.isDownloadable && (
                        <a
                          href={material.fileUrl}
                          download
                          className="btn-sm btn-outline"
                        >
                          <Download className="w-4 h-4 mr-1" />
                          Download
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Course Info */}
            <div className="card">
              <h2 className="text-xl font-bold mb-4">About This Course</h2>
              <p className="text-gray-700 leading-relaxed mb-4">{course.description}</p>
              <div className="flex items-center space-x-4 text-sm">
                <span className="badge-primary">{course.category}</span>
                <span className="text-gray-600">
                  {course.lessons?.length || 0} lessons
                </span>
              </div>
            </div>
          </div>

          {/* Sidebar - Course Outline */}
          <div className="lg:col-span-1">
            <div className="card sticky top-4">
              <div className="mb-4">
                <h2 className="text-lg font-bold mb-2">Course Progress</h2>
                <div className="mb-2">
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-gray-600">Overall Progress</span>
                    <span className="font-semibold">{enrollment?.progress || 0}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-primary-600 h-2 rounded-full transition-all"
                      style={{ width: `${enrollment?.progress || 0}%` }}
                    ></div>
                  </div>
                </div>
                <p className="text-sm text-gray-600">
                  {completedLessons.size} of {course.lessons?.length || 0} lessons
                  completed
                </p>
              </div>

              <hr className="my-4" />

              <h3 className="font-semibold mb-3 flex items-center">
                <BookOpen className="w-4 h-4 mr-2" />
                Course Content
              </h3>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {course.lessons?.map((lesson, index) => (
                  <button
                    key={lesson.id}
                    onClick={() => setCurrentLesson(lesson)}
                    className={`w-full text-left p-3 rounded-lg transition-colors ${
                      currentLesson.id === lesson.id
                        ? 'bg-primary-100 border-primary-500 border-2'
                        : 'bg-gray-50 hover:bg-gray-100'
                    }`}
                  >
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0 mt-1">
                        {isLessonCompleted(lesson.id) ? (
                          <CheckCircle className="w-5 h-5 text-green-600" />
                        ) : lesson.isFree ? (
                          <Play className="w-5 h-5 text-primary-600" />
                        ) : (
                          <Lock className="w-5 h-5 text-gray-400" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {index + 1}. {lesson.title}
                        </p>
                        <div className="flex items-center space-x-2 text-xs text-gray-600 mt-1">
                          <span className="badge-sm">{lesson.type}</span>
                          {lesson.duration && <span>{lesson.duration} min</span>}
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Review Modal */}
      {showReviewModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-2xl font-bold mb-2">Congratulations!</h3>
              <p className="text-gray-600">You've completed this course!</p>
            </div>
            <div className="space-y-3">
              <button
                onClick={() => {
                  setShowReviewModal(false);
                  navigate(`/courses/${courseId}/review`);
                }}
                className="btn-primary w-full"
              >
                <Star className="w-4 h-4 mr-2" />
                Leave a Review
              </button>
              <button
                onClick={() => setShowReviewModal(false)}
                className="btn-outline w-full"
              >
                Maybe Later
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CourseLearningPage;

