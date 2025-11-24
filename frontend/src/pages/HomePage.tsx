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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary-600 via-primary-700 to-primary-900 text-white py-32 md:py-40">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-96 h-96 bg-white rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-white rounded-full blur-3xl"></div>
        </div>
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-3xl animate-fadeInUp">
            {isAuthenticated ? (
              <>
                <h1 className="text-6xl md:text-7xl font-bold mb-6 leading-tight">
                  Welcome back, <span className="text-primary-200">{user?.firstName}!</span>
                </h1>
                <p className="text-xl md:text-2xl mb-8 text-primary-100 leading-relaxed">
                  {user?.role === UserRole.STUDENT && "Continue your learning journey with our expert teachers and unlock your potential."}
                  {user?.role === UserRole.TEACHER && "Manage your courses, connect with students, and grow your teaching career."}
                  {user?.role === UserRole.ADMIN && "Oversee the platform, manage users, and ensure quality education delivery."}
                </p>
                <div className="flex flex-wrap gap-4">
                  <Link 
                    to={getDashboardLink()} 
                    className="btn border-2 border-white/80 bg-white/10 backdrop-blur-sm text-white hover:bg-white hover:text-primary-600 hover:border-white btn-lg shadow-lg hover:shadow-xl transition-all duration-300 inline-flex items-center gap-2"
                  >
                    Go to {getDashboardLabel()}
                    <ArrowRight className="w-5 h-5" />
                  </Link>
                  {user?.role === UserRole.STUDENT && (
                    <Link to="/courses" className="btn border-2 border-white/80 bg-white/10 backdrop-blur-sm text-white hover:bg-white hover:text-primary-600 hover:border-white btn-lg shadow-lg hover:shadow-xl transition-all duration-300">
                      Browse Courses
                    </Link>
                  )}
                  {user?.role === UserRole.TEACHER && (
                    <Link to="/teacher/courses/new" className="btn border-2 border-white/80 bg-white/10 backdrop-blur-sm text-white hover:bg-white hover:text-primary-600 hover:border-white btn-lg shadow-lg hover:shadow-xl transition-all duration-300">
                      Create New Course
                    </Link>
                  )}
                </div>
              </>
            ) : (
              <>
                <h1 className="text-6xl md:text-7xl font-bold mb-6 leading-tight">
                  Learn Anywhere, <span className="text-primary-200">Anytime</span> with Expert Teachers
                </h1>
                <p className="text-xl md:text-2xl mb-8 text-primary-100 leading-relaxed">
                  Connect with certified teachers for live and recorded lessons. Get personalized
                  education tailored to your needs and goals.
                </p>
                <div className="flex flex-wrap gap-4">
                  <Link to="/courses" className="btn border-2 border-white/80 bg-white/10 backdrop-blur-sm text-white hover:bg-white hover:text-primary-600 hover:border-white btn-lg shadow-lg hover:shadow-xl transition-all duration-300">
                    Browse Courses
                  </Link>
                  <Link to="/register" className="btn border-2 border-white/80 bg-white/10 backdrop-blur-sm text-white hover:bg-white hover:text-primary-600 hover:border-white btn-lg shadow-lg hover:shadow-xl transition-all duration-300">
                    Become a Teacher
                  </Link>
                </div>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 md:py-32 bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="section-title">Why Choose Edutech?</h2>
            <p className="section-subtitle">Experience the best online learning platform</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { icon: Users, title: "Verified Teachers", desc: "All teachers are verified and certified professionals" },
              { icon: BookOpen, title: "Flexible Learning", desc: "Choose between live classes and recorded lessons" },
              { icon: Award, title: "Quality Assurance", desc: "Reviews and ratings ensure high teaching standards" },
              { icon: TrendingUp, title: "Track Progress", desc: "Monitor your learning journey with detailed analytics" }
            ].map((feature, idx) => (
              <div key={idx} className="card-hover group">
                <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-primary-100 to-primary-50 text-primary-600 rounded-2xl mb-6 group-hover:from-primary-200 group-hover:to-primary-100 transition-all">
                  <feature.icon className="w-10 h-10" />
              </div>
                <h3 className="text-xl font-bold mb-3 text-gray-900">{feature.title}</h3>
                <p className="text-gray-600 leading-relaxed">
                  {feature.desc}
              </p>
            </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative bg-gradient-to-r from-primary-600 to-primary-800 py-24 md:py-32 overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-96 h-96 bg-white rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-white rounded-full blur-3xl"></div>
        </div>
        <div className="container mx-auto px-4 text-center relative z-10">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6 leading-tight">Ready to Start Learning?</h2>
          <p className="text-xl text-primary-100 mb-10 max-w-2xl mx-auto">
            Join thousands of students learning from the best teachers worldwide. Start your journey today!
          </p>
          <Link to="/register" className="btn-primary btn-lg shadow-lg hover:shadow-xl inline-flex items-center gap-2">
            Get Started Today
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>
    </div>
  );
};

export default HomePage;

