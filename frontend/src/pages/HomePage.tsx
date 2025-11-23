import { Link } from 'react-router-dom';
import { BookOpen, Users, Award, TrendingUp, ArrowRight } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { UserRole } from '@/types';

/**
 * Home Page Component
 * Landing page of the application
 */
const HomePage = () => {
  const { user, isAuthenticated } = useAuthStore();

  const getDashboardLink = () => {
    if (!user) return '/';
    switch (user.role) {
      case UserRole.STUDENT:
        return '/student';
      case UserRole.TEACHER:
        return '/teacher';
      case UserRole.ADMIN:
        return '/admin';
      default:
        return '/';
    }
  };

  const getDashboardLabel = () => {
    if (!user) return 'Dashboard';
    switch (user.role) {
      case UserRole.STUDENT:
        return 'My Learning Dashboard';
      case UserRole.TEACHER:
        return 'Teaching Dashboard';
      case UserRole.ADMIN:
        return 'Admin Dashboard';
      default:
        return 'Dashboard';
    }
  };

  return (
    <div>
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-primary-600 to-primary-800 text-white py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl">
            {isAuthenticated ? (
              <>
                <h1 className="text-5xl font-bold mb-6">
                  Welcome back, {user?.firstName}!
                </h1>
                <p className="text-xl mb-8 text-primary-100">
                  {user?.role === UserRole.STUDENT && "Continue your learning journey with our expert teachers."}
                  {user?.role === UserRole.TEACHER && "Manage your courses and connect with your students."}
                  {user?.role === UserRole.ADMIN && "Oversee the platform and manage users and courses."}
                </p>
                <div className="flex flex-wrap gap-4">
                  <Link 
                    to={getDashboardLink()} 
                    className="btn bg-white text-primary-600 hover:bg-gray-100 btn-lg inline-flex items-center gap-2"
                  >
                    Go to {getDashboardLabel()}
                    <ArrowRight className="w-5 h-5" />
                  </Link>
                  {user?.role === UserRole.STUDENT && (
                    <Link to="/courses" className="btn btn-outline border-white text-white hover:bg-white hover:text-primary-600 btn-lg">
                      Browse Courses
                    </Link>
                  )}
                  {user?.role === UserRole.TEACHER && (
                    <Link to="/teacher/courses/new" className="btn btn-outline border-white text-white hover:bg-white hover:text-primary-600 btn-lg">
                      Create New Course
                    </Link>
                  )}
                </div>
              </>
            ) : (
              <>
                <h1 className="text-5xl font-bold mb-6">
                  Learn Anywhere, Anytime with Expert Teachers
                </h1>
                <p className="text-xl mb-8 text-primary-100">
                  Connect with certified teachers for live and recorded lessons. Get personalized
                  education tailored to your needs.
                </p>
                <div className="flex flex-wrap gap-4">
                  <Link to="/courses" className="btn bg-white text-primary-600 hover:bg-gray-100 btn-lg">
                    Browse Courses
                  </Link>
                  <Link to="/register" className="btn btn-outline border-white text-white hover:bg-white hover:text-primary-600 btn-lg">
                    Become a Teacher
                  </Link>
                </div>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">Why Choose Edutech?</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-100 text-primary-600 rounded-full mb-4">
                <Users className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Verified Teachers</h3>
              <p className="text-gray-600">
                All teachers are verified and certified professionals
              </p>
            </div>

            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-100 text-primary-600 rounded-full mb-4">
                <BookOpen className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Flexible Learning</h3>
              <p className="text-gray-600">
                Choose between live classes and recorded lessons
              </p>
            </div>

            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-100 text-primary-600 rounded-full mb-4">
                <Award className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Quality Assurance</h3>
              <p className="text-gray-600">
                Reviews and ratings ensure high teaching standards
              </p>
            </div>

            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-100 text-primary-600 rounded-full mb-4">
                <TrendingUp className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Track Progress</h3>
              <p className="text-gray-600">
                Monitor your learning journey with detailed analytics
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-gray-100 py-20">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to Start Learning?</h2>
          <p className="text-xl text-gray-600 mb-8">
            Join thousands of students learning from the best teachers worldwide
          </p>
          <Link to="/register" className="btn-primary btn-lg">
            Get Started Today
          </Link>
        </div>
      </section>
    </div>
  );
};

export default HomePage;

