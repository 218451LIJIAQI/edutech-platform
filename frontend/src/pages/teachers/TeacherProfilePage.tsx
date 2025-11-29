import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Star, Users, Award, Calendar, BookOpen, AlertCircle, Globe, Briefcase, GraduationCap } from 'lucide-react';
import teacherService from '@/services/teacher.service';
import courseService from '@/services/course.service';
import { TeacherProfile, Course } from '@/types';
import { formatDate, formatCurrency } from '@/utils/helpers';
import { useAuthStore } from '@/store/authStore';
import ReportSubmissionModal from '@/components/common/ReportSubmissionModal';

/**
 * Teacher Profile Page
 * Displays complete teacher information and courses
 */
const TeacherProfilePage = () => {
  const { id } = useParams<{ id: string }>();
  const { isAuthenticated, user } = useAuthStore();
  const [teacher, setTeacher] = useState<TeacherProfile | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isReportOpen, setIsReportOpen] = useState(false);

  useEffect(() => {
    if (id) {
      fetchTeacherData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const fetchTeacherData = async () => {
    if (!id) return;
    setIsLoading(true);
    try {
      const teacherData = await teacherService.getTeacherById(id);
      setTeacher(teacherData);

      // Fetch teacher's courses
      const coursesData = await courseService.getAllCourses({
        teacherId: id,
      });
      setCourses(coursesData.items || coursesData.courses || []);
    } catch (error) {
      console.error('Failed to fetch teacher data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50">
        <div className="flex flex-col items-center space-y-4">
          <div className="spinner"></div>
          <p className="text-gray-600 font-medium">Loading teacher profile...</p>
        </div>
      </div>
    );
  }

  if (!teacher) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4 text-gray-900">Teacher not found</h2>
          <Link to="/teachers" className="btn-primary">
            Back to Teachers
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50">
      {/* Hero Section */}
      <div className="bg-gradient-to-br from-primary-600 via-primary-700 to-primary-900 text-white py-16 shadow-lg">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-start md:items-center space-y-4 md:space-y-0 md:space-x-6">
            {/* Avatar */}
            {teacher.user?.avatar ? (
              <img
                src={teacher.user.avatar}
                alt={`${teacher.user.firstName} ${teacher.user.lastName}`}
                className="w-28 h-28 rounded-2xl object-cover shadow-xl"
              />
            ) : (
            <div className="w-28 h-28 bg-white text-primary-600 rounded-2xl flex items-center justify-center text-4xl font-bold shadow-xl">
              {teacher.user?.firstName?.[0]}{teacher.user?.lastName?.[0]}
            </div>
            )}

            {/* Info */}
            <div className="flex-1">
              <div className="flex items-center space-x-3 mb-3">
                <h1 className="text-4xl font-bold flex-1">
                  {teacher.user?.firstName} {teacher.user?.lastName}
                </h1>
                {isAuthenticated && user?.role === 'STUDENT' && teacher.user && (
                  <button
                    onClick={() => setIsReportOpen(true)}
                    className="p-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors flex items-center gap-2"
                    title="Report this teacher"
                  >
                    <AlertCircle className="w-5 h-5" />
                    <span className="hidden sm:inline">Report</span>
                  </button>
                )}
                {teacher.isVerified && (
                  <div className="flex items-center space-x-1 bg-gradient-to-r from-green-500 to-green-600 px-4 py-2 rounded-full text-sm font-bold shadow-md">
                    <Award className="w-4 h-4" />
                    <span>Verified</span>
                  </div>
                )}
              </div>

              {teacher.headline && (
                <p className="text-xl text-primary-100 mb-6 font-medium">{teacher.headline}</p>
              )}

              {/* Stats */}
              <div className="flex flex-wrap items-center gap-6 text-primary-100">
                <div className="flex items-center space-x-2 bg-white bg-opacity-20 px-4 py-2 rounded-xl">
                  <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                  <span className="font-bold text-lg">
                    {teacher.averageRating?.toFixed(1) || 'N/A'}
                  </span>
                </div>

                <div className="flex items-center space-x-2 bg-white bg-opacity-20 px-4 py-2 rounded-xl">
                  <Users className="w-5 h-5" />
                  <span className="font-semibold">{teacher.totalStudents || 0} students</span>
                </div>

                <div className="flex items-center space-x-2 bg-white bg-opacity-20 px-4 py-2 rounded-xl">
                  <BookOpen className="w-5 h-5" />
                  <span className="font-semibold">{courses.length} courses</span>
                </div>

                {teacher.hourlyRate && (
                  <div className="bg-white bg-opacity-20 px-4 py-2 rounded-xl font-bold">
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
            {/* Self Introduction */}
            {teacher.selfIntroduction && (
              <div className="card shadow-xl border border-gray-100 rounded-2xl">
                <h2 className="text-2xl font-bold mb-6 text-gray-900">About Me</h2>
                <p className="text-gray-700 whitespace-pre-line text-lg leading-relaxed">{teacher.selfIntroduction}</p>
              </div>
            )}

            {/* Teaching Style */}
            {teacher.teachingStyle && (
              <div className="card shadow-xl border border-gray-100 rounded-2xl">
                <h2 className="text-2xl font-bold mb-6 text-gray-900">Teaching Style</h2>
                <p className="text-gray-700 whitespace-pre-line text-lg leading-relaxed">{teacher.teachingStyle}</p>
              </div>
            )}

            {/* Education Background */}
            {teacher.educationBackground && (
              <div className="card shadow-xl border border-gray-100 rounded-2xl">
                <div className="flex items-center space-x-3 mb-6">
                  <GraduationCap className="w-6 h-6 text-primary-600" />
                  <h2 className="text-2xl font-bold text-gray-900">Education Background</h2>
                </div>
                <p className="text-gray-700 whitespace-pre-line text-lg leading-relaxed">{teacher.educationBackground}</p>
              </div>
            )}

            {/* Teaching Experience */}
            {teacher.teachingExperience && (
              <div className="card shadow-xl border border-gray-100 rounded-2xl">
                <div className="flex items-center space-x-3 mb-6">
                  <Briefcase className="w-6 h-6 text-primary-600" />
                  <h2 className="text-2xl font-bold text-gray-900">Teaching Experience</h2>
                </div>
                <p className="text-gray-700 whitespace-pre-line text-lg leading-relaxed">{teacher.teachingExperience}</p>
              </div>
            )}

            {/* About */}
            {teacher.bio && (
              <div className="card shadow-xl border border-gray-100 rounded-2xl">
                <h2 className="text-2xl font-bold mb-6 text-gray-900">Bio</h2>
                <p className="text-gray-700 whitespace-pre-line text-lg leading-relaxed">{teacher.bio}</p>
              </div>
            )}

            {/* Courses */}
            <div className="card shadow-xl border border-gray-100 rounded-2xl">
              <h2 className="text-2xl font-bold mb-6 text-gray-900">Courses by this Teacher</h2>
              {courses.length > 0 ? (
                <div className="space-y-4">
                  {courses.map((course) => (
                    <Link
                      key={course.id}
                      to={`/courses/${course.id}`}
                      className="block p-5 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl hover:from-gray-100 hover:to-gray-200 transition-all border border-gray-200 hover:border-primary-300 hover:shadow-md"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-bold text-lg mb-2 text-gray-900">{course.title}</h3>
                          <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                            {course.description}
                          </p>
                          <div className="flex items-center space-x-4">
                            <span className="badge-primary">{course.category}</span>
                            {course.packages && course.packages.length > 0 && (
                              <span className="text-primary-600 font-bold">
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
                <div className="text-center py-12">
                  <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-600 text-lg">No courses available yet.</p>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            {/* Years of Experience */}
            {teacher.yearsOfExperience && (
              <div className="card shadow-lg bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-200">
                <div className="flex items-center space-x-3 mb-2">
                  <Briefcase className="w-6 h-6 text-blue-600" />
                  <h3 className="text-lg font-bold text-gray-900">Experience</h3>
                </div>
                <p className="text-2xl font-bold text-blue-600">
                  {teacher.yearsOfExperience} {teacher.yearsOfExperience === 1 ? 'year' : 'years'}
                </p>
              </div>
            )}

            {/* Specialties */}
            {Array.isArray(teacher.specialties) && teacher.specialties.length > 0 && (
              <div className="card shadow-xl border border-gray-100 rounded-2xl">
                <h3 className="text-lg font-bold mb-4 text-gray-900">Specialties</h3>
                <div className="flex flex-wrap gap-2">
                  {teacher.specialties.map((specialty: string, idx: number) => (
                    <span key={idx} className="badge-primary">
                      {specialty}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Languages */}
            {Array.isArray(teacher.languages) && teacher.languages.length > 0 && (
              <div className="card shadow-xl border border-gray-100 rounded-2xl">
                <div className="flex items-center space-x-3 mb-4">
                  <Globe className="w-5 h-5 text-primary-600" />
                  <h3 className="text-lg font-bold text-gray-900">Languages</h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  {teacher.languages.map((language: string, idx: number) => (
                    <span key={idx} className="badge-primary">
                      {language}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Awards & Honors */}
            {Array.isArray(teacher.awards) && teacher.awards.length > 0 && (
              <div className="card shadow-xl border border-gray-100 rounded-2xl">
                <h3 className="text-lg font-bold mb-4 text-gray-900">Awards & Honors</h3>
                <div className="space-y-2">
                  {teacher.awards.map((award: string, idx: number) => (
                    <div key={idx} className="flex items-start space-x-2 p-2 bg-yellow-50 rounded">
                      <Award className="w-4 h-4 text-yellow-600 flex-shrink-0 mt-0.5" />
                      <span className="text-sm text-gray-700">{award}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Certificate Photos */}
            {Array.isArray(teacher.certificatePhotos) && teacher.certificatePhotos.length > 0 && (
              <div className="card shadow-xl border border-gray-100 rounded-2xl">
                <h3 className="text-lg font-bold mb-4 text-gray-900">Certificates</h3>
                <div className="grid grid-cols-2 gap-3">
                  {teacher.certificatePhotos.map((photo: string, idx: number) => (
                    <a
                      key={idx}
                      href={photo}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="relative group"
                    >
                      <img
                        src={photo}
                        alt={`Certificate ${idx + 1}`}
                        className="w-full h-24 rounded-lg object-cover group-hover:opacity-75 transition-opacity"
                      />
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black bg-opacity-50 rounded-lg">
                        <span className="text-white text-xs font-semibold">View</span>
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Certifications */}
            {teacher.certifications && teacher.certifications.length > 0 && (
              <div className="card shadow-xl border border-gray-100 rounded-2xl">
                <h3 className="text-xl font-bold mb-6 text-gray-900">Certifications</h3>
                <div className="space-y-4">
                  {teacher.certifications.map((cert) => (
                    <div key={cert.id} className="border-l-4 border-primary-600 pl-4 py-3 bg-gradient-to-r from-primary-50 to-primary-100 rounded-r-xl">
                      <h4 className="font-bold text-gray-900">{cert.title}</h4>
                      <p className="text-sm text-gray-600 font-medium">{cert.issuer}</p>
                      <div className="flex items-center space-x-1 text-sm text-gray-500 mt-2">
                        <Calendar className="w-4 h-4" />
                        <span>{formatDate(cert.issueDate)}</span>
                      </div>
                      {cert.credentialUrl && (
                        <a
                          href={cert.credentialUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-primary-600 hover:underline mt-2 inline-block font-semibold"
                        >
                          View Credential →
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Contact */}
            <div className="card bg-gradient-to-br from-primary-50 to-primary-100 border-2 border-primary-200 shadow-lg">
              <h3 className="text-xl font-bold mb-4 text-gray-900">Interested in learning?</h3>
              <p className="text-gray-700 mb-6 leading-relaxed">
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
      {/* Report Modal */}
      {teacher?.user && (
        <ReportSubmissionModal
          isOpen={isReportOpen}
          onClose={() => setIsReportOpen(false)}
          reportedId={teacher.user.id}
          reportedName={`${teacher.user.firstName} ${teacher.user.lastName}`}
          contentType="teacher"
        />
      )}
    </div>
  );
};

export default TeacherProfilePage;
