import { useState, useEffect, useCallback } from 'react';
import clientLogger from '@/utils/logger';
import { useParams, useNavigate } from 'react-router-dom';
import { Star, ArrowLeft, Send, CheckCircle } from 'lucide-react';
import { Course, Enrollment, Review } from '@/types';
import courseService from '@/services/course.service';
import enrollmentService from '@/services/enrollment.service';
import reviewService from '@/services/review.service';
import toast from 'react-hot-toast';
import { extractErrorMessage } from '@/utils/error-handler';
import { selectPreferredCourseEnrollment } from '@/utils/enrollment';
import { usePageTitle } from '@/hooks';

/**
 * Review Course Page
 * Student interface for submitting course reviews
 */
const ReviewCoursePage = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();

  const [course, setCourse] = useState<Course | null>(null);
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [courseReviews, setCourseReviews] = useState<Review[]>([]);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  usePageTitle(course ? `Review ${course.title}` : 'Review Course');

  const fetchData = useCallback(async () => {
    if (!courseId) {
      toast.error('Course ID is missing');
      navigate('/courses');
      return;
    }

    setIsLoading(true);
    try {
      const courseData = await courseService.getCourseById(courseId);
      setCourse(courseData);

      const [enrollments, myReviews, teacherReviews] = await Promise.all([
        enrollmentService.getMyCourses(),
        reviewService.getMyReviews(),
        reviewService.getCourseReviews(courseId, { limit: 20 }),
      ]);
      const currentEnrollment = selectPreferredCourseEnrollment(enrollments, courseId);

      if (!currentEnrollment) {
        toast.error('You need an active enrollment before reviewing this course');
        navigate(`/courses/${courseId}`);
        return;
      }

      if (currentEnrollment.progress < 100) {
        toast.error(`Finish the course before reviewing it. Current progress: ${currentEnrollment.progress}%`);
        navigate(`/courses/${courseId}`);
        return;
      }

      const existingReview = myReviews.find(
        (item) => item.enrollment?.package?.course?.id === courseId
      );
      if (existingReview) {
        toast.error('You have already reviewed this course');
        navigate(`/courses/${courseId}`);
        return;
      }

      setEnrollment(currentEnrollment);
      setCourseReviews(teacherReviews.reviews.filter((item) => item.isPublished));
    } catch (error) {
      clientLogger.error('Failed to fetch data:', error);
      toast.error(extractErrorMessage(error, 'Failed to load course'));
      navigate('/courses');
    } finally {
      setIsLoading(false);
    }
  }, [courseId, navigate]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();

    if (rating === 0) {
      toast.error('Please select a rating');
      return;
    }

    const trimmed = comment.trim();
    if (trimmed.length < 50) {
      toast.error('Please write at least 50 characters');
      return;
    }

    if (!enrollment) {
      toast.error('Enrollment not found');
      return;
    }

    setIsSubmitting(true);
    try {
      await reviewService.createReview(enrollment.id, rating, trimmed);
      toast.success('Thank you for your review!');
      navigate('/student/courses');
    } catch (error) {
      clientLogger.error('Failed to submit review:', error);
      toast.error(extractErrorMessage(error, 'Failed to submit review. Please try again.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const getRatingLabel = (value: number): string => {
    switch (value) {
      case 5:
        return 'Excellent';
      case 4:
        return 'Very Good';
      case 3:
        return 'Good';
      case 2:
        return 'Fair';
      case 1:
        return 'Poor';
      default:
        return '';
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-primary-50/10 to-indigo-50/20">
        <div className="flex flex-col items-center space-y-4">
          <div className="relative">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-500 to-indigo-600 animate-pulse flex items-center justify-center">
              <Star className="w-8 h-8 text-white" />
            </div>
            <div className="absolute inset-0 rounded-2xl bg-primary-500/20 animate-ping"></div>
          </div>
          <p className="text-gray-600 font-medium">Loading course...</p>
        </div>
      </div>
    );
  }

  if (!courseId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-primary-50/10 to-indigo-50/20">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Course ID is missing</p>
          <button type="button" className="btn-primary" onClick={() => navigate('/courses')}>
            Browse Courses
          </button>
        </div>
      </div>
    );
  }

  if (!course || !enrollment) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-primary-50/10 to-indigo-50/20">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Course not found</p>
          <button type="button" className="btn-primary" onClick={() => navigate('/courses')}>
            Browse Courses
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-primary-50/10 to-indigo-50/20 py-8 relative">
      <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.015)_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none"></div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        <div className="max-w-3xl mx-auto">
          <button type="button" onClick={() => navigate('/student/courses')} className="btn-outline mb-6">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to My Courses
          </button>

          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-2xl flex items-center justify-center shadow-lg shadow-yellow-500/25">
              <Star className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-extrabold text-gray-900">
                Write a{' '}
                <span className="bg-gradient-to-r from-yellow-600 to-orange-600 bg-clip-text text-transparent">
                  Review
                </span>
              </h1>
              <p className="text-gray-500 font-medium">Share your experience with this course</p>
            </div>
          </div>

          <div className="card shadow-xl border border-gray-100 rounded-2xl">
            <div className="flex items-start gap-6 mb-10 pb-8 border-b border-gray-200">
              {course.thumbnail && (
                <img
                  src={course.thumbnail}
                  alt={course.title}
                  className="w-40 h-24 object-cover rounded-xl shadow-md"
                />
              )}
              <div className="flex-1">
                <h1 className="text-3xl font-bold mb-3 text-gray-900">{course.title}</h1>
                <p className="text-gray-600 text-lg">
                  by {course.teacherProfile?.user?.firstName} {course.teacherProfile?.user?.lastName}
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmitReview} className="space-y-8">
              <div>
                <h2 className="text-2xl font-bold mb-6 text-gray-900">
                  How would you rate this course?
                </h2>

                <div className="flex items-center justify-center space-x-3 mb-4">
                  {[1, 2, 3, 4, 5].map((starValue) => (
                    <button
                      key={starValue}
                      type="button"
                      onClick={() => setRating(starValue)}
                      onMouseEnter={() => setHoverRating(starValue)}
                      onMouseLeave={() => setHoverRating(0)}
                      className="focus:outline-none transition-transform hover:scale-125 active:scale-95"
                      aria-label={`Rate ${starValue} star${starValue > 1 ? 's' : ''}`}
                    >
                      <Star
                        className={`w-12 h-12 ${
                          starValue <= (hoverRating || rating)
                            ? 'fill-yellow-400 text-yellow-400'
                            : 'text-gray-300'
                        }`}
                      />
                    </button>
                  ))}
                </div>

                <div className="text-center">
                  {rating > 0 && (
                    <p className="text-2xl font-bold text-primary-600">{getRatingLabel(rating)}</p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Share your experience with this course *
                </label>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  rows={8}
                  className="input"
                  placeholder="What did you like or dislike about this course? What did you learn? Would you recommend it to others?"
                  required
                />
                <p
                  className={`text-xs mt-2 font-medium ${
                    comment.trim().length >= 50 ? 'text-green-600' : 'text-gray-500'
                  }`}
                >
                  Minimum 50 characters ({comment.trim().length}/50)
                </p>
              </div>

              <div className="bg-gradient-to-r from-blue-50 to-blue-100 border-2 border-blue-200 rounded-xl p-5">
                <p className="font-bold text-blue-900 mb-3">Review Guidelines:</p>
                <ul className="text-sm text-blue-800 space-y-2">
                  {[
                    'Be honest and constructive in your feedback',
                    'Focus on the course content and teaching quality',
                    'Avoid personal attacks or inappropriate language',
                    'Share specific examples when possible',
                  ].map((rule) => (
                    <li key={rule} className="flex items-start">
                      <CheckCircle className="w-4 h-4 mr-2 mt-0.5 text-blue-700 flex-shrink-0" />
                      <span>{rule}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="flex items-center justify-end space-x-4 pt-4">
                <button
                  type="button"
                  onClick={() => navigate('/student/courses')}
                  className="btn-outline"
                  disabled={isSubmitting}
                >
                  Skip for Now
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || rating === 0 || comment.trim().length < 50}
                  className="btn-primary btn-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  title={
                    rating === 0 || comment.trim().length < 50
                      ? 'Select a rating and write at least 50 characters to enable submit'
                      : ''
                  }
                >
                  {isSubmitting ? (
                    <span className="flex items-center">
                      <div className="spinner mr-2"></div>
                      Submitting...
                    </span>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Submit Review
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          <div className="card mt-8 shadow-lg">
            <h3 className="text-2xl font-bold mb-6 text-gray-900">What others are saying</h3>
            {courseReviews.length === 0 ? (
              <div className="space-y-4">
                <div className="text-center py-12">
                  <Star className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 text-lg">Be the first to review this course!</p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {courseReviews.slice(0, 3).map((review) => (
                  <div key={review.id} className="rounded-2xl border border-gray-200 bg-gray-50 p-5">
                    <div className="mb-3 flex items-start justify-between gap-4">
                      <div>
                        <p className="font-semibold text-gray-900">
                          {[review.reviewer?.firstName, review.reviewer?.lastName].filter(Boolean).join(' ') || 'Student'}
                        </p>
                        <p className="text-sm text-gray-500">
                          {new Date(review.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 text-yellow-500">
                        {Array.from({ length: 5 }, (_, index) => (
                          <Star
                            key={`${review.id}-star-${index + 1}`}
                            className={`h-4 w-4 ${index < review.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`}
                          />
                        ))}
                      </div>
                    </div>
                    <p className="text-sm leading-6 text-gray-700">
                      {review.comment?.trim() || 'No written comment provided.'}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReviewCoursePage;
