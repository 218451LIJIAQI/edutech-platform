import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useCourseStore } from '@/store/courseStore';
import { useAuthStore } from '@/store/authStore';
import { formatCurrency, formatDuration } from '@/utils/helpers';
import { CourseType } from '@/types';
import { BookOpen, Clock, Star, Users, CheckCircle, PlayCircle, Video, Radio, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import UniversalVideoPlayer from '@/components/common/UniversalVideoPlayer';
import ReportSubmissionModal from '@/components/common/ReportSubmissionModal';

/**
 * Course Detail Page
 * Displays complete course information with purchase option
 */
const CourseDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentCourse, isLoading, fetchCourseById } = useCourseStore();
  const { isAuthenticated, user } = useAuthStore();
  const [selectedPackage, setSelectedPackage] = useState<string | null>(null);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);

  useEffect(() => {
    if (id) {
      fetchCourseById(id);
    }
  }, [id, fetchCourseById]);

  const handleOpenLesson = (_lessonId?: string) => {
    if (!currentCourse?.isEnrolled) {
      toast.error('Please select a package to start learning');
      document.getElementById('packages-section')?.scrollIntoView({ behavior: 'smooth' });
      return;
    }
    if (!id) return;
    navigate(`/courses/${id}/learn`);
  };

  const handlePurchase = async () => {
    if (!isAuthenticated) {
      toast.error('Please login to purchase courses');
      navigate('/login');
      return;
    }

    if (!selectedPackage) {
      toast.error('Please select a package');
      return;
    }

    if (!id) {
      toast.error('Course ID is missing');
      return;
    }

    setIsPurchasing(true);
    try {
      // Redirect to secure checkout page
      navigate(`/courses/${id}/checkout/${selectedPackage}`);
    } catch (error) {
      const message = error instanceof Error && 'response' in error 
        ? (error as { response?: { data?: { message?: string } } }).response?.data?.message 
        : error instanceof Error 
        ? error.message 
        : undefined;
      toast.error(message || 'Failed to initiate purchase');
    } finally {
      setIsPurchasing(false);
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

  if (!currentCourse) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50">
        <div className="text-center">
          <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-3xl font-bold mb-4 text-gray-900">Course not found</h2>
          <p className="text-gray-600 mb-8">The course you're looking for doesn't exist.</p>
          <button onClick={() => navigate('/courses')} className="btn-primary">
            Back to Courses
          </button>
        </div>
      </div>
    );
  }

  const teacher = currentCourse.teacherProfile;
  const isEnrolled = currentCourse.isEnrolled;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50">
      {/* Hero Section */}
      <div className="relative bg-gradient-to-br from-primary-600 via-primary-700 to-primary-900 text-white py-16 md:py-20 overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-96 h-96 bg-white rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-white rounded-full blur-3xl"></div>
        </div>
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-4xl">
            <div className="flex items-center flex-wrap gap-3 mb-6">
              <span className="badge bg-primary-400 text-white font-semibold">{currentCourse.category}</span>
              
              {/* Course Type - Platform Feature */}
              {currentCourse.courseType === CourseType.LIVE && (
                <span className="badge bg-red-500 text-white flex items-center gap-1 font-semibold">
                  <Radio className="w-3 h-3" />
                  Live Sessions
                </span>
              )}
              {currentCourse.courseType === CourseType.RECORDED && (
                <span className="badge bg-blue-500 text-white flex items-center gap-1 font-semibold">
                  <Video className="w-3 h-3" />
                  Recorded Course
                </span>
              )}
              {currentCourse.courseType === CourseType.HYBRID && (
                <span className="badge bg-purple-500 text-white flex items-center gap-1 font-semibold">
                  <PlayCircle className="w-3 h-3" />
                  Hybrid (Live + Recorded)
                </span>
              )}
              
              {isEnrolled && (
                <span className="badge bg-green-500 text-white font-semibold">✓ Enrolled</span>
              )}
            </div>
            <div className="flex items-start justify-between mb-6">
              <h1 className="text-5xl md:text-6xl font-bold leading-tight flex-1">{currentCourse.title}</h1>
              {isAuthenticated && user?.role === 'STUDENT' && (
                <button
                  onClick={() => setIsReportModalOpen(true)}
                  className="ml-4 p-3 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors flex items-center gap-2 whitespace-nowrap"
                  title="Report this course"
                >
                  <AlertCircle className="w-5 h-5" />
                  <span className="hidden md:inline">Report</span>
                </button>
              )}
            </div>
            <p className="text-xl text-primary-100 mb-8 leading-relaxed max-w-2xl">{currentCourse.description}</p>
            
            {/* Teacher Info */}
            <div className="flex items-center space-x-5 pt-6 border-t border-primary-400 border-opacity-30">
              <div className="w-16 h-16 bg-gradient-to-br from-white to-primary-100 rounded-full flex items-center justify-center text-primary-700 font-bold text-xl shadow-lg">
                {(teacher?.user?.firstName?.[0] || '')}{(teacher?.user?.lastName?.[0] || '')}
              </div>
              <div>
                <p className="font-bold text-lg">
                  {teacher?.user?.firstName} {teacher?.user?.lastName}
                </p>
                <div className="flex items-center space-x-3 text-sm text-primary-100 mt-1">
                  <div className="flex items-center space-x-1">
                  <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    <span className="font-semibold">{teacher?.averageRating?.toFixed(1) || 'N/A'}</span>
                  </div>
                  <span>•</span>
                  <div className="flex items-center space-x-1">
                  <Users className="w-4 h-4" />
                  <span>{teacher?.totalStudents || 0} students</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Preview Video */}
            {currentCourse.previewVideoUrl && (
              <div className="card shadow-xl border border-gray-100 rounded-2xl">
                <h3 className="text-2xl font-bold mb-6 text-gray-900">Course Preview</h3>
                <div className="rounded-xl overflow-hidden shadow-md">
                <UniversalVideoPlayer 
                  src={currentCourse.previewVideoUrl}
                  poster={currentCourse.thumbnail}
                  title={currentCourse.title}
                />
                </div>
              </div>
            )}

            {/* Course Content */}
            <div className="card shadow-xl border border-gray-100 rounded-2xl">
              <h3 className="text-2xl font-bold mb-6 text-gray-900">Course Content</h3>
              {currentCourse.lessons && currentCourse.lessons.length > 0 ? (
                <div className="space-y-3">
                  {currentCourse.lessons.map((lesson, index) => (
                    <div
                      key={lesson.id}
                      onClick={() => handleOpenLesson(lesson.id)}
                      className={`flex items-center justify-between p-5 rounded-xl transition-all duration-300 ${isEnrolled ? 'bg-gradient-to-r from-gray-50 to-gray-100 hover:from-gray-100 hover:to-gray-200 cursor-pointer hover:shadow-md border border-gray-200' : 'bg-gradient-to-r from-gray-50 to-gray-100 border border-gray-200'}`}
                      role="button"
                      tabIndex={0}
                    >
                      <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 bg-gradient-to-br from-primary-600 to-primary-700 text-white rounded-full flex items-center justify-center font-bold text-sm shadow-md">
                          {index + 1}
                        </div>
                        <div>
                          <p className="font-bold text-gray-900">{lesson.title}</p>
                          {lesson.description && (
                            <p className="text-sm text-gray-600 mt-1">{lesson.description}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-4 text-sm">
                        {lesson.duration && (
                          <div className="flex items-center space-x-1 text-gray-600">
                            <Clock className="w-4 h-4" />
                            <span className="font-medium">{formatDuration(lesson.duration)}</span>
                          </div>
                        )}
                        <span className="px-3 py-1 bg-primary-100 text-primary-700 rounded-full text-xs font-semibold">{lesson.type}</span>
                        {lesson.isFree && (
                          <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold">Free Preview</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-600">No lessons available yet.</p>
                </div>
              )}
            </div>

            {/* Learning Materials */}
            {currentCourse.materials && currentCourse.materials.length > 0 && (
              <div className="card shadow-xl border border-gray-100 rounded-2xl">
                <h3 className="text-2xl font-bold mb-6 text-gray-900">Learning Materials</h3>
                <div className="space-y-3">
                  {currentCourse.materials.map((material) => (
                    <div
                      key={material.id}
                      className="flex items-center justify-between p-5 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl border border-gray-200 hover:border-gray-300 transition-all"
                    >
                      <div>
                        <p className="font-bold text-gray-900">{material.title}</p>
                        {material.description && (
                          <p className="text-sm text-gray-600 mt-1">{material.description}</p>
                        )}
                      </div>
                      <div className="flex items-center space-x-3">
                        <span className="text-sm font-medium text-gray-600 bg-white px-3 py-1 rounded-lg">{material.fileType}</span>
                        {material.isDownloadable && (
                          <CheckCircle className="w-5 h-5 text-green-600" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar - Packages */}
          <div className="lg:col-span-1">
            <div id="packages-section" className="sticky top-20 space-y-4">
              {currentCourse.packages && currentCourse.packages.length > 0 ? (
                <>
                  {currentCourse.packages.map((pkg) => (
                    <div
                      key={pkg.id}
                      className={`card transition-all duration-300 cursor-pointer ${
                        selectedPackage === pkg.id
                          ? 'ring-2 ring-primary-600 shadow-xl bg-gradient-to-br from-primary-50 to-primary-100'
                          : 'hover:shadow-lg hover:border-primary-200'
                      }`}
                    >
                      <div
                        className="cursor-pointer"
                        onClick={() => setSelectedPackage(pkg.id)}
                      >
                        <div className="mb-5">
                          <h4 className="text-xl font-bold text-gray-900 mb-2">{pkg.name}</h4>
                          {pkg.description && (
                            <p className="text-sm text-gray-600 mb-3">{pkg.description}</p>
                          )}
                        </div>

                        <div className="mb-6 p-4 bg-gradient-to-r from-primary-50 to-primary-100 rounded-xl">
                          <div className="flex items-baseline space-x-2">
                            {pkg.discount && pkg.discount > 0 ? (
                              <>
                                <span className="text-4xl font-bold text-primary-600">
                                  {formatCurrency(pkg.finalPrice)}
                                </span>
                                <span className="text-lg text-gray-400 line-through">
                                  {formatCurrency(pkg.price)}
                                </span>
                                <span className="px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-semibold ml-2">-{pkg.discount}%</span>
                              </>
                            ) : (
                              <span className="text-4xl font-bold text-primary-600">
                                {formatCurrency(pkg.price)}
                              </span>
                            )}
                          </div>
                        </div>

                        {pkg.features && Array.isArray(pkg.features) && (
                          <ul className="space-y-3 mb-6">
                            {pkg.features.map((feature, index) => (
                              <li key={index} className="flex items-start space-x-3 text-sm">
                                <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                                <span className="text-gray-700 font-medium">{feature}</span>
                              </li>
                            ))}
                          </ul>
                        )}

                        {pkg.duration && (
                          <p className="text-sm text-gray-600 mb-4 p-3 bg-gray-50 rounded-lg">
                            ⏱️ Access for <span className="font-semibold">{pkg.duration} days</span>
                          </p>
                        )}
                      </div>

                      {!isEnrolled && (
                        <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-200">
                          <button
                            onClick={() => setSelectedPackage(pkg.id)}
                            className="btn-outline flex-1 text-sm"
                          >
                            Select
                          </button>
                          <button
                            onClick={async () => {
                              try {
                                const { default: cartService } = await import('@/services/cart.service');
                                await cartService.addItem(pkg.id);
                                setSelectedPackage(pkg.id);
                                toast.success('Added to cart');
                              } catch (e) {
                                const message = e instanceof Error && 'response' in e 
                                  ? (e as { response?: { data?: { message?: string } } }).response?.data?.message 
                                  : undefined;
                                toast.error(message || 'Failed to add to cart');
                              }
                            }}
                            className="btn-primary flex-1 text-sm"
                          >
                            Add to Cart
                          </button>
                        </div>
                      )}
                    </div>
                  ))}

                  {isEnrolled ? (
                    <button
                      onClick={() => navigate('/student/courses')}
                      className="btn-primary w-full justify-center"
                    >
                      <BookOpen className="w-5 h-5 mr-2" />
                      Go to My Courses
                    </button>
                  ) : (
                    <button
                      onClick={handlePurchase}
                      disabled={!selectedPackage || isPurchasing}
                      className="btn-primary w-full justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isPurchasing ? (
                        <>
                          <div className="spinner mr-2"></div>
                          Processing...
                        </>
                      ) : (
                        <>Purchase Now</>
                      )}
                    </button>
                  )}

                  {!isAuthenticated && (
                    <div className="text-sm text-center text-gray-600 p-4 bg-blue-50 rounded-lg border border-blue-200">
                      Please{' '}
                      <button
                        onClick={() => navigate('/login')}
                        className="text-primary-600 hover:underline font-semibold"
                      >
                        login
                      </button>{' '}
                      to purchase
                    </div>
                  )}
                </>
              ) : (
                <div className="card text-center py-8">
                  <p className="text-gray-600">No packages available yet.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Report Modal */}
      {currentCourse.teacherProfile?.user && (
        <ReportSubmissionModal
          isOpen={isReportModalOpen}
          onClose={() => setIsReportModalOpen(false)}
          reportedId={currentCourse.teacherProfile.user.id}
          reportedName={`${currentCourse.teacherProfile.user.firstName} ${currentCourse.teacherProfile.user.lastName}`}
          contentType="course"
          contentId={currentCourse.id}
        />
      )}
    </div>
  );
};

export default CourseDetailPage;
