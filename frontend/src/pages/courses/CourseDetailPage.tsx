import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useCourseStore } from '@/store/courseStore';
import { useAuthStore } from '@/store/authStore';
import { formatCurrency, formatDuration } from '@/utils/helpers';
import { BookOpen, Clock, Star, Users, CheckCircle, PlayCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import paymentService from '@/services/payment.service';

/**
 * Course Detail Page
 * Displays complete course information with purchase option
 */
const CourseDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentCourse, isLoading, fetchCourseById } = useCourseStore();
  const { isAuthenticated } = useAuthStore();
  const [selectedPackage, setSelectedPackage] = useState<string | null>(null);
  const [isPurchasing, setIsPurchasing] = useState(false);

  useEffect(() => {
    if (id) {
      fetchCourseById(id);
    }
  }, [id]);

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

    setIsPurchasing(true);
    try {
      // Redirect to secure checkout page
      navigate(`/courses/${courseId}/checkout/${selectedPackage}`);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to initiate purchase');
    } finally {
      setIsPurchasing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="spinner"></div>
        </div>
      </div>
    );
  }

  if (!currentCourse) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Course not found</h2>
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
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-800 text-white py-12">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl">
            <div className="flex items-center space-x-2 mb-4">
              <span className="badge bg-primary-400 text-white">{currentCourse.category}</span>
              {isEnrolled && (
                <span className="badge bg-green-500 text-white">Enrolled</span>
              )}
            </div>
            <h1 className="text-4xl font-bold mb-4">{currentCourse.title}</h1>
            <p className="text-xl text-primary-100 mb-6">{currentCourse.description}</p>
            
            {/* Teacher Info */}
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-primary-600 font-bold">
                {teacher?.user?.firstName[0]}{teacher?.user?.lastName[0]}
              </div>
              <div>
                <p className="font-semibold">
                  {teacher?.user?.firstName} {teacher?.user?.lastName}
                </p>
                <div className="flex items-center space-x-2 text-sm text-primary-100">
                  <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                  <span>{teacher?.averageRating?.toFixed(1) || 'N/A'}</span>
                  <span>•</span>
                  <Users className="w-4 h-4" />
                  <span>{teacher?.totalStudents || 0} students</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Preview Video */}
            {currentCourse.previewVideoUrl && (
              <div className="card">
                <h3 className="text-xl font-semibold mb-4">Course Preview</h3>
                <div className="aspect-video bg-gray-200 rounded-lg flex items-center justify-center">
                  <PlayCircle className="w-16 h-16 text-gray-400" />
                </div>
              </div>
            )}

            {/* Course Content */}
            <div className="card">
              <h3 className="text-xl font-semibold mb-4">Course Content</h3>
              {currentCourse.lessons && currentCourse.lessons.length > 0 ? (
                <div className="space-y-3">
                  {currentCourse.lessons.map((lesson, index) => (
                    <div
                      key={lesson.id}
                      className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center font-semibold">
                          {index + 1}
                        </div>
                        <div>
                          <p className="font-medium">{lesson.title}</p>
                          {lesson.description && (
                            <p className="text-sm text-gray-600">{lesson.description}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-4 text-sm text-gray-600">
                        {lesson.duration && (
                          <div className="flex items-center space-x-1">
                            <Clock className="w-4 h-4" />
                            <span>{formatDuration(lesson.duration)}</span>
                          </div>
                        )}
                        <span className="badge-primary">{lesson.type}</span>
                        {lesson.isFree && (
                          <span className="badge-success">Free Preview</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-600">No lessons available yet.</p>
              )}
            </div>

            {/* Learning Materials */}
            {currentCourse.materials && currentCourse.materials.length > 0 && (
              <div className="card">
                <h3 className="text-xl font-semibold mb-4">Learning Materials</h3>
                <div className="space-y-3">
                  {currentCourse.materials.map((material) => (
                    <div
                      key={material.id}
                      className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                    >
                      <div>
                        <p className="font-medium">{material.title}</p>
                        {material.description && (
                          <p className="text-sm text-gray-600">{material.description}</p>
                        )}
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-gray-600">{material.fileType}</span>
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
            <div className="sticky top-4 space-y-4">
              {currentCourse.packages && currentCourse.packages.length > 0 ? (
                <>
                  {currentCourse.packages.map((pkg) => (
                    <div
                      key={pkg.id}
                      className={`card cursor-pointer transition-all ${
                        selectedPackage === pkg.id
                          ? 'ring-2 ring-primary-600 shadow-lg'
                          : 'hover:shadow-lg'
                      }`}
                      onClick={() => setSelectedPackage(pkg.id)}
                    >
                      <div className="mb-4">
                        <h4 className="text-lg font-semibold mb-2">{pkg.name}</h4>
                        {pkg.description && (
                          <p className="text-sm text-gray-600 mb-3">{pkg.description}</p>
                        )}
                      </div>

                      <div className="mb-4">
                        <div className="flex items-baseline space-x-2">
                          {pkg.discount && pkg.discount > 0 ? (
                            <>
                              <span className="text-3xl font-bold text-primary-600">
                                {formatCurrency(pkg.finalPrice)}
                              </span>
                              <span className="text-lg text-gray-400 line-through">
                                {formatCurrency(pkg.price)}
                              </span>
                            </>
                          ) : (
                            <span className="text-3xl font-bold text-primary-600">
                              {formatCurrency(pkg.price)}
                            </span>
                          )}
                        </div>
                      </div>

                      {pkg.features && Array.isArray(pkg.features) && (
                        <ul className="space-y-2 mb-4">
                          {pkg.features.map((feature, index) => (
                            <li key={index} className="flex items-start space-x-2 text-sm">
                              <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                              <span>{feature}</span>
                            </li>
                          ))}
                        </ul>
                      )}

                      {pkg.duration && (
                        <p className="text-sm text-gray-600 mb-4">
                          Access for {pkg.duration} days
                        </p>
                      )}
                    </div>
                  ))}

                  {isEnrolled ? (
                    <button
                      onClick={() => navigate('/student/courses')}
                      className="btn-primary w-full"
                    >
                      <BookOpen className="w-5 h-5 mr-2" />
                      Go to My Courses
                    </button>
                  ) : (
                    <button
                      onClick={handlePurchase}
                      disabled={!selectedPackage || isPurchasing}
                      className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isPurchasing ? (
                        <>
                          <div className="spinner mr-2"></div>
                          Processing...
                        </>
                      ) : (
                        <>Purchase Course</>
                      )}
                    </button>
                  )}

                  {!isAuthenticated && (
                    <p className="text-sm text-center text-gray-600">
                      Please{' '}
                      <button
                        onClick={() => navigate('/login')}
                        className="text-primary-600 hover:underline"
                      >
                        login
                      </button>{' '}
                      to purchase
                    </p>
                  )}
                </>
              ) : (
                <div className="card">
                  <p className="text-gray-600">No packages available yet.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CourseDetailPage;
