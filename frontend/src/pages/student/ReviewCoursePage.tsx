import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Star, ArrowLeft, Send } from 'lucide-react';
import { Course, Enrollment } from '@/types';
import courseService from '@/services/course.service';
import enrollmentService from '@/services/enrollment.service';
import reviewService from '@/services/review.service';
import toast from 'react-hot-toast';

/**
 * Review Course Page
 * Student interface for submitting course reviews
 */
const ReviewCoursePage = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();

  const [course, setCourse] = useState<Course | null>(null);
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

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

      const enrollments = await enrollmentService.getMyCourses();
      const currentEnrollment = enrollments.find(
        (e) => e.package?.course?.id === courseId
      );
      
      if (!currentEnrollment) {
        toast.error('You must complete this course first');
        navigate(`/courses/${courseId}`);
        return;
      }

      setEnrollment(currentEnrollment);
    } catch (error) {
      console.error('Failed to fetch data:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to load course';
      toast.error(errorMessage);
      navigate('/courses');
    } finally {
      setIsLoading(false);
    }
  }, [courseId, navigate]);

  useEffect(() => {
    fetchData();
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
      const trimmedComment = comment.trim();
      await reviewService.createReview(enrollment.id, rating, trimmedComment);
      toast.success('Thank you for your review!');
      navigate('/student/courses');
    } catch (error) {
      const message = error instanceof Error && 'response' in error 
        ? (error as { response?: { data?: { message?: string } } }).response?.data?.message 
        : undefined;
      console.error('Failed to submit review:', error);
      toast.error(
        message || 'Failed to submit review. Please try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50">
        <div className="flex flex-col items-center space-y-4">
          <div className="spinner"></div>
          <p className="text-gray-600 font-medium">Loading course...</p>
        </div>
      </div>
    );
  }

  if (!courseId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Course ID is missing</p>
          <button className="btn-primary" onClick={() => navigate('/courses')}>Browse Courses</button>
        </div>
      </div>
    );
  }

  if (!course || !enrollment) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Course not found</p>
          <button className="btn-primary" onClick={() => navigate('/courses')}>Browse Courses</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50 py-8">
      <div className="container mx-auto px-4">
        <div className="max-w-3xl mx-auto">
          {/* Header */}
          <button
            onClick={() => navigate('/student/courses')}
            className="btn-outline mb-8"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to My Courses
          </button>

          <div className="card shadow-xl border border-gray-100 rounded-2xl">
            {/* Course Info */}
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
                  by {course.teacherProfile?.user?.firstName}{' '}
                  {course.teacherProfile?.user?.lastName}
                </p>
              </div>
            </div>

            {/* Review Form */}
            <form onSubmit={handleSubmitReview} className="space-y-8">
              <div>
                <h2 className="text-2xl font-bold mb-6 text-gray-900">How would you rate this course?</h2>
                
                {/* Star Rating */}
                <div className="flex items-center justify-center space-x-3 mb-4">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(0)}
                      className="focus:outline-none transition-transform hover:scale-125 active:scale-95"
                    >
                      <Star
                        className={`w-12 h-12 ${
                          star <= (hoverRating || rating)
                            ? 'fill-yellow-400 text-yellow-400'
                            : 'text-gray-300'
                        }`}
                      />
                    </button>
                  ))}
                </div>
                
                {/* Rating Label */}
                <div className="text-center">
                  {rating > 0 && (
                    <p className="text-2xl font-bold text-primary-600">
                      {rating === 5 && '⭐ Excellent!'}
                      {rating === 4 && '👍 Very Good'}
                      {rating === 3 && '😊 Good'}
                      {rating === 2 && '😐 Fair'}
                      {rating === 1 && '😞 Poor'}
                    </p>
                  )}
                </div>
              </div>

              {/* Comment */}
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
                <p className={`text-xs mt-2 font-medium ${comment.trim().length >= 50 ? 'text-green-600' : 'text-gray-500'}`}>
                  Minimum 50 characters ({comment.trim().length}/50)
                </p>
              </div>

              {/* Review Guidelines */}
              <div className="bg-gradient-to-r from-blue-50 to-blue-100 border-2 border-blue-200 rounded-xl p-5">
                <p className="font-bold text-blue-900 mb-3">Review Guidelines:</p>
                <ul className="text-sm text-blue-800 space-y-2">
                  <li className="flex items-start">
                    <span className="mr-2">✓</span>
                    <span>Be honest and constructive in your feedback</span>
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2">✓</span>
                    <span>Focus on the course content and teaching quality</span>
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2">✓</span>
                    <span>Avoid personal attacks or inappropriate language</span>
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2">✓</span>
                    <span>Share specific examples when possible</span>
                  </li>
                </ul>
              </div>

              {/* Submit Button */}
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
                  title={rating === 0 || comment.trim().length < 50 ? 'Select a rating and write at least 50 characters to enable submit' : ''}
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

          {/* Previous Reviews Display */}
          <div className="card mt-8 shadow-lg">
            <h3 className="text-2xl font-bold mb-6 text-gray-900">What others are saying</h3>
            <div className="space-y-4">
              {/* Other course reviews would be fetched and displayed here */}
              <div className="text-center py-12">
                <Star className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 text-lg">
                  Be the first to review this course!
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReviewCoursePage;

