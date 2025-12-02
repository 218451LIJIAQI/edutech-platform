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
  MessageSquare,
  Smile,
  Hand,
  Mic,
  MicOff,
  Send,
} from 'lucide-react';
import { Course, Lesson, Enrollment } from '@/types';
import courseService from '@/services/course.service';
import enrollmentService from '@/services/enrollment.service';
import toast from 'react-hot-toast';
import UniversalVideoPlayer from '@/components/common/UniversalVideoPlayer';

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

  // Live interactions (frontend-only stub)
  interface ChatMessage {
    id: string;
    user: string;
    type: 'text' | 'reaction' | 'system';
    text: string;
    timestamp: number;
  }

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [showEmojis, setShowEmojis] = useState(false);
  const [handRaised, setHandRaised] = useState(false);
  const [micEnabled, setMicEnabled] = useState(false);

  const generateId = (): string => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  };

  const handleSendMessage = () => {
    if (!chatInput.trim()) return;
    setChatMessages((prev) => [
      ...prev,
      { id: generateId(), user: "You", type: "text" as const, text: chatInput.trim(), timestamp: Date.now() },
    ]);
    setChatInput("");
    setShowEmojis(false);
  };

  const addReaction = (emoji: string) => {
    setChatMessages((prev) => [
      ...prev,
      { id: generateId(), user: "You", type: "reaction" as const, text: emoji, timestamp: Date.now() },
    ]);
  };

  const toggleHand = () => {
    setHandRaised((prev) => {
      const nowRaised = !prev;
      setChatMessages((messages) => [
        ...messages,
        { id: generateId(), user: "System", type: "system" as const, text: nowRaised ? "You raised your hand" : "You lowered your hand", timestamp: Date.now() },
      ]);
      toast.success(nowRaised ? "Hand raised" : "Hand lowered");
      return nowRaised;
    });
  };

  const toggleMic = () => {
    setMicEnabled((prev) => {
      const now = !prev;
      toast(
        now
          ? "Mic requested (teacher approval required in real session)"
          : "Mic off"
      );
      return now;
    });
  };

  useEffect(() => {
    if (courseId) {
      fetchCourseData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId, navigate]);

  const fetchCourseData = async () => {
    if (!courseId) {
      toast.error('Course ID is missing');
      navigate('/courses');
      return;
    }
    
    setIsLoading(true);
    try {
      // Check access first
      const hasAccess = await enrollmentService.checkAccess(courseId);
      if (!hasAccess) {
        toast.error('You need to enroll in this course first');
        navigate(`/courses/${courseId}`);
        return;
      }

      // Fetch course details
      const courseData = await courseService.getCourseById(courseId);
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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-primary-50/10 to-indigo-50/20">
        <div className="flex flex-col items-center space-y-4">
          <div className="relative"><div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-500 to-indigo-600 animate-pulse flex items-center justify-center"><span className="text-2xl">📖</span></div><div className="absolute inset-0 rounded-2xl bg-primary-500/20 animate-ping"></div></div><p className="text-gray-600 font-medium">Loading course...</p>
        </div>
      </div>
    );
  }

  if (!course || !currentLesson) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-primary-50/10 to-indigo-50/20">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Course not found</p>
          <button className="btn-primary" onClick={() => navigate('/courses')}>Browse Courses</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-primary-50/10 to-indigo-50/20 relative">
      <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.015)_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none"></div>
      {/* Video Player */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 relative">
        <div className="max-w-5xl mx-auto">
            {currentLesson.videoUrl ? (
            <div className="rounded-xl overflow-hidden shadow-xl">
              <UniversalVideoPlayer
                key={currentLesson.id}
                src={currentLesson.videoUrl}
                title={currentLesson.title}
                onComplete={handleLessonComplete}
                autoPlay={false}
              />
            </div>
            ) : (
            <div className="aspect-video bg-gray-900 flex items-center justify-center rounded-xl text-white">
              <div className="text-center p-8">
                <Play className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p>No video available for this lesson</p>
              </div>
              </div>
            )}
        </div>
      </div>

      {/* Course Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Lesson Info */}
            <div className="card shadow-xl border border-gray-100 rounded-2xl">
              <div className="flex items-start justify-between mb-6">
                <div className="flex-1">
                  <h1 className="text-3xl font-bold mb-3 text-gray-900">{currentLesson.title}</h1>
                  <div className="flex items-center space-x-4 text-sm">
                    <span className="badge-primary">{currentLesson.type}</span>
                    {currentLesson.duration && (
                      <span className="text-gray-600 font-medium">⏱️ {currentLesson.duration} minutes</span>
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
                <p className="text-gray-700 leading-relaxed text-lg">{currentLesson.description}</p>
              )}
            </div>

            {/* Navigation */}
            <div className="flex items-center justify-between">
              <button
                onClick={handlePreviousLesson}
                disabled={!course.lessons || course.lessons.length === 0 || course.lessons[0]?.id === currentLesson.id}
                className="btn-outline disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous Lesson
              </button>
              <button
                onClick={handleNextLesson}
                disabled={
                  !course.lessons || course.lessons.length === 0 || course.lessons[course.lessons.length - 1]?.id === currentLesson.id
                }
                className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next Lesson
                <ChevronRight className="w-4 h-4 ml-2" />
              </button>
            </div>

            {/* Course Materials */}
            {course.materials && course.materials.length > 0 && (
              <div className="card shadow-xl border border-gray-100 rounded-2xl">
                <h2 className="text-2xl font-bold mb-6 flex items-center text-gray-900">
                  <div className="p-2 bg-primary-100 rounded-lg mr-3">
                    <FileText className="w-5 h-5 text-primary-600" />
                  </div>
                  Course Materials
                </h2>
                <div className="space-y-3">
                  {course.materials.map((material) => (
                    <div
                      key={material.id}
                      className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl border border-gray-200 hover:border-gray-300 transition-all"
                    >
                      <div className="flex items-center space-x-4">
                        <div className="p-2 bg-primary-100 rounded-lg">
                          <FileText className="w-5 h-5 text-primary-600" />
                        </div>
                        <div>
                          <p className="font-bold text-gray-900">{material.title}</p>
                          {material.description && (
                            <p className="text-sm text-gray-600 mt-1">{material.description}</p>
                          )}
                          <p className="text-xs text-gray-500 mt-1">
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
            <div className="card shadow-xl border border-gray-100 rounded-2xl">
              <h2 className="text-2xl font-bold mb-4 text-gray-900">About This Course</h2>
              <p className="text-gray-700 leading-relaxed mb-4 text-lg">{course.description}</p>
              <div className="flex items-center space-x-4 text-sm">
                <span className="badge-primary">{course.category}</span>
                <span className="text-gray-600 font-medium">
                  📚 {course.lessons?.length || 0} lessons
                </span>
              </div>
            </div>
          </div>

          {/* Sidebar - Course Outline */}
          <div className="lg:col-span-1">
            <div className="card sticky top-20 shadow-lg">
              <div className="mb-6">
                <h2 className="text-xl font-bold mb-4 text-gray-900">Course Progress</h2>
                <div className="mb-3">
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="text-gray-600 font-medium">Overall Progress</span>
                    <span className="font-bold text-primary-600">{enrollment?.progress || 0}%</span>
                  </div>
                  <div className="w-full bg-gray-300 rounded-full h-3">
                    <div
                      className="bg-gradient-to-r from-primary-600 to-primary-700 h-3 rounded-full transition-all duration-500"
                      style={{ width: `${enrollment?.progress || 0}%` }}
                    ></div>
                  </div>
                </div>
                <p className="text-sm text-gray-600 font-medium">
                  ✅ {completedLessons.size} of {course.lessons?.length || 0} lessons completed
                </p>
              </div>

              <hr className="my-6 border-gray-200" />

              <h3 className="font-bold text-lg mb-4 flex items-center text-gray-900">
                <BookOpen className="w-5 h-5 mr-2 text-primary-600" />
                Course Content
              </h3>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {course.lessons?.map((lesson, index) => (
                  <button
                    key={lesson.id}
                    onClick={() => setCurrentLesson(lesson)}
                    className={`w-full text-left p-4 rounded-xl transition-all ${
                      currentLesson.id === lesson.id
                        ? 'bg-gradient-to-r from-primary-100 to-primary-50 border-2 border-primary-500 shadow-md'
                        : 'bg-gray-50 hover:bg-gray-100 border border-gray-200'
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
                        <p className="text-sm font-bold truncate text-gray-900">
                          {index + 1}. {lesson.title}
                        </p>
                        <div className="flex items-center space-x-2 text-xs text-gray-600 mt-1">
                          <span className="badge-primary text-xs">{lesson.type}</span>
                          {lesson.duration && <span>{lesson.duration} min</span>}
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>

              <hr className="my-6 border-gray-200" />

              <h3 className="font-bold text-lg mb-4 flex items-center text-gray-900">
                <MessageSquare className="w-5 h-5 mr-2 text-primary-600" />
                Live Interactions
              </h3>

              <div className="mb-4 flex items-center gap-2">
                <button onClick={toggleHand} className={`${handRaised ? 'btn-primary' : 'btn-outline'} btn-sm flex items-center gap-2`}>
                  <Hand className="w-4 h-4" /> {handRaised ? 'Lower Hand' : 'Raise Hand'}
                </button>
                <button onClick={toggleMic} className={`${micEnabled ? 'btn-primary' : 'btn-outline'} btn-sm flex items-center gap-2`}>
                  {micEnabled ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
                  {micEnabled ? 'Mic On' : 'Mic Off'}
                </button>
                <button onClick={() => setShowEmojis((v) => !v)} className="btn-outline btn-sm flex items-center gap-2">
                  <Smile className="w-4 h-4" /> Emojis
                </button>
              </div>

              {showEmojis && (
                <div className="grid grid-cols-8 gap-2 mb-4">
                  {['👍','👏','❤️','🎉','🔥','😊','🤔','🙌','🖐️','😂','😮','🙏','💯','🚀','🥳','😎'].map((e) => (
                    <button key={e} onClick={() => addReaction(e)} className="text-xl p-2 hover:scale-110 transition-transform">
                      {e}
                    </button>
                  ))}
                </div>
              )}

              <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 max-h-60 overflow-y-auto mb-3 space-y-2">
                {chatMessages.length === 0 ? (
                  <p className="text-sm text-gray-500">No messages yet. Say hi!</p>
                ) : (
                  chatMessages.map((m) => (
                    <div key={m.id} className={`${m.type === 'system' ? 'text-xs text-gray-500 italic' : 'text-sm'} `}>
                      {m.type === 'reaction' ? (
                        <div className="inline-flex items-center gap-2 px-2 py-1 bg-white border border-gray-200 rounded-lg">
                          <span className="text-lg">{m.text}</span>
                          <span className="text-xs text-gray-500">{new Date(m.timestamp).toLocaleTimeString()}</span>
                        </div>
                      ) : m.type === 'system' ? (
                        <span>• {m.text}</span>
                      ) : (
                        <div className="px-3 py-2 bg-white border border-gray-200 rounded-lg">
                          <span className="font-semibold mr-1">{m.user}:</span>
                          <span>{m.text}</span>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>

              <div className="flex items-center gap-2">
                <input
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleSendMessage(); }}
                  className="input flex-1"
                  placeholder="Message the class..."
                />
                <button onClick={handleSendMessage} className="btn-primary btn-sm inline-flex items-center gap-1">
                  <Send className="w-4 h-4" />
                  Send
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Review Modal */}
      {showReviewModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-lg-custom">
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-green-500 to-green-600 rounded-full mb-4 shadow-lg">
                <CheckCircle className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-3xl font-bold mb-2 text-gray-900">Congratulations!</h3>
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
