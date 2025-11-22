import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Star, Users, Award, Calendar, CheckCircle, BookOpen } from 'lucide-react';
import teacherService from '@/services/teacher.service';
import courseService from '@/services/course.service';
import { TeacherProfile, Course } from '@/types';
import { formatDate, formatCurrency } from '@/utils/helpers';

/**
 * Teacher Profile Page
 * Displays complete teacher information and courses
 */
const TeacherProfilePage = () => {
  const { id } = useParams<{ id: string }>();
  const [teacher, setTeacher] = useState<TeacherProfile | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (id) {
      fetchTeacherData();
    }
  }, [id]);

  const fetchTeacherData = async () => {
    setIsLoading(true);
    try {
      const teacherData = await teacherService.getTeacherById(id!);
      setTeacher(teacherData);

      // Fetch teacher's courses
      const coursesData = await courseService.getAllCourses({
        teacherId: id,
      });
      setCourses(coursesData.courses || []);
    } catch (error) {
      console.error('Failed to fetch teacher data:', error);
    } finally {
      setIsLoading(false);
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

  if (!teacher) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Teacher not found</h2>
          <Link to="/teachers" className="btn-primary">
            Back to Teachers
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-800 text-white py-12">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-start md:items-center space-y-4 md:space-y-0 md:space-x-6">
            {/* Avatar */}
            <div className="w-24 h-24 bg-white text-primary-600 rounded-full flex items-center justify-center text-3xl font-bold">
              {teacher.user?.firstName?.[0]}{teacher.user?.lastName?.[0]}
            </div>

            {/* Info */}
            <div className="flex-1">
              <div className="flex items-center space-x-3 mb-2">
                <h1 className="text-3xl font-bold">
                  {teacher.user?.firstName} {teacher.user?.lastName}
                </h1>
                {teacher.isVerified && (
                  <div className="flex items-center space-x-1 bg-green-500 px-3 py-1 rounded-full text-sm">
                    <Award className="w-4 h-4" />
                    <span>Verified</span>
                  </div>
                )}
              </div>

              {teacher.headline && (
                <p className="text-xl text-primary-100 mb-4">{teacher.headline}</p>
              )}

              {/* Stats */}
              <div className="flex flex-wrap items-center gap-6 text-primary-100">
                <div className="flex items-center space-x-2">
                  <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                  <span className="font-semibold">
                    {teacher.averageRating?.toFixed(1) || 'N/A'}
                  </span>
                </div>

                <div className="flex items-center space-x-2">
                  <Users className="w-5 h-5" />
                  <span>{teacher.totalStudents || 0} students</span>
                </div>

                <div className="flex items-center space-x-2">
                  <BookOpen className="w-5 h-5" />
                  <span>{courses.length} courses</span>
                </div>

                {teacher.hourlyRate && (
                  <div className="font-semibold">
                    ${teacher.hourlyRate}/hour
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* About */}
            {teacher.bio && (
              <div className="card">
                <h2 className="text-2xl font-bold mb-4">About</h2>
                <p className="text-gray-700 whitespace-pre-line">{teacher.bio}</p>
              </div>
            )}

            {/* Courses */}
            <div className="card">
              <h2 className="text-2xl font-bold mb-4">Courses by this Teacher</h2>
              {courses.length > 0 ? (
                <div className="space-y-4">
                  {courses.map((course) => (
                    <Link
                      key={course.id}
                      to={`/courses/${course.id}`}
                      className="block p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg mb-2">{course.title}</h3>
                          <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                            {course.description}
                          </p>
                          <div className="flex items-center space-x-4">
                            <span className="badge-primary">{course.category}</span>
                            {course.packages && course.packages.length > 0 && (
                              <span className="text-primary-600 font-semibold">
                                From {formatCurrency(course.packages[0].finalPrice)}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="text-gray-600">No courses available yet.</p>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            {/* Certifications */}
            {teacher.certifications && teacher.certifications.length > 0 && (
              <div className="card">
                <h3 className="text-xl font-bold mb-4">Certifications</h3>
                <div className="space-y-4">
                  {teacher.certifications.map((cert) => (
                    <div key={cert.id} className="border-l-4 border-primary-600 pl-4">
                      <h4 className="font-semibold">{cert.title}</h4>
                      <p className="text-sm text-gray-600">{cert.issuer}</p>
                      <div className="flex items-center space-x-1 text-sm text-gray-500 mt-1">
                        <Calendar className="w-4 h-4" />
                        <span>{formatDate(cert.issueDate)}</span>
                      </div>
                      {cert.credentialUrl && (
                        <a
                          href={cert.credentialUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-primary-600 hover:underline mt-1 inline-block"
                        >
                          View Credential →
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Verification Status - Showing Certifications */}
            {teacher.certifications && teacher.certifications.length > 0 && (
              <div className="card">
                <h3 className="text-xl font-bold mb-4">Professional Certifications</h3>
                <div className="space-y-3">
                  {teacher.certifications.map((cert: any) => (
                    <div
                      key={cert.id}
                      className="flex items-start space-x-2"
                    >
                      <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium">
                          {cert.title}
                        </p>
                        <p className="text-xs text-gray-600">
                          Issued by {cert.issuer} on {formatDate(cert.issueDate)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Contact */}
            <div className="card bg-primary-50 border-primary-200">
              <h3 className="text-xl font-bold mb-4">Interested in learning?</h3>
              <p className="text-gray-700 mb-4">
                Browse {teacher.user?.firstName}'s courses and start your learning
                journey today!
              </p>
              <Link to="/courses" className="btn-primary w-full text-center">
                View All Courses
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TeacherProfilePage;
