import { useState, useEffect } from 'react';
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

  useEffect(() => {
    fetchData();
  }, [courseId]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const courseData = await courseService.getCourseById(courseId!);
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
      toast.error('Failed to load course');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();

    if (rating === 0) {
      toast.error('Please select a rating');
      return;
    }

    if (!comment.trim()) {
      toast.error('Please write a review comment');
      return;
    }

    if (!enrollment) {
      toast.error('Enrollment not found');
      return;
    }

    setIsSubmitting(true);
    try {
      await reviewService.createReview(enrollment.id, rating, comment);
      toast.success('Thank you for your review!');
      navigate('/student/courses');
    } catch (error: any) {
      console.error('Failed to submit review:', error);
      toast.error(
        error.response?.data?.message || 'Failed to submit review. Please try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="spinner"></div>
      </div>
    );
  }

  if (!course || !enrollment) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <p className="text-gray-600">Course not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        <div className="max-w-3xl mx-auto">
          {/* Header */}
          <button
            onClick={() => navigate('/student/courses')}
            className="btn-outline mb-6"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to My Courses
          </button>

          <div className="card">
            {/* Course Info */}
            <div className="flex items-start space-x-4 mb-8 pb-8 border-b">
              {course.thumbnail && (
                <img
                  src={course.thumbnail}
                  alt={course.title}
                  className="w-32 h-20 object-cover rounded-lg"
                />
              )}
              <div className="flex-1">
                <h1 className="text-2xl font-bold mb-2">{course.title}</h1>
                <p className="text-gray-600">
                  by {course.teacherProfile?.user?.firstName}{' '}
                  {course.teacherProfile?.user?.lastName}
                </p>
              </div>
            </div>

            {/* Review Form */}
            <form onSubmit={handleSubmitReview} className="space-y-6">
              <div>
                <h2 className="text-xl font-bold mb-4">How would you rate this course?</h2>
                
                {/* Star Rating */}
                <div className="flex items-center space-x-2 mb-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(0)}
                      className="focus:outline-none transition-transform hover:scale-110"
                    >
                      <Star
                        className={`w-10 h-10 ${
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
                    <p className="text-lg font-medium text-primary-600">
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
                <label className="block text-sm font-medium text-gray-700 mb-2">
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
                <p className="text-xs text-gray-500 mt-1">
                  Minimum 50 characters ({comment.length}/50)
                </p>
              </div>

              {/* Review Guidelines */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="font-medium text-blue-900 mb-2">Review Guidelines:</p>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• Be honest and constructive in your feedback</li>
                  <li>• Focus on the course content and teaching quality</li>
                  <li>• Avoid personal attacks or inappropriate language</li>
                  <li>• Share specific examples when possible</li>
                </ul>
              </div>

              {/* Submit Button */}
              <div className="flex items-center justify-end space-x-4">
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
                  disabled={isSubmitting || rating === 0 || comment.length < 50}
                  className="btn-primary"
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
          <div className="card mt-6">
            <h3 className="text-lg font-bold mb-4">What others are saying</h3>
            <div className="space-y-4">
              {/* Other course reviews would be fetched and displayed here */}
              <p className="text-gray-500 text-sm text-center py-8">
                Be the first to review this course!
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReviewCoursePage;

