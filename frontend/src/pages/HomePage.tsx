import { Link } from 'react-router-dom';
import { BookOpen, Users, Award, TrendingUp, ArrowRight } from 'lucide-react';
import { useMemo } from 'react';
import { useAuthStore } from '@/store/authStore';
import { UserRole } from '@/types';
import { usePageTitle } from '@/hooks';

/**
 * Home Page Component
 * Landing page of the application
 */

const FEATURES = [
  { icon: Users, title: "Verified Teachers", desc: "All teachers are verified and certified professionals" },
  { icon: BookOpen, title: "Flexible Learning", desc: "Choose between live classes and recorded lessons" },
  { icon: Award, title: "Quality Assurance", desc: "Reviews and ratings ensure high teaching standards" },
  { icon: TrendingUp, title: "Track Progress", desc: "Monitor your learning journey with detailed analytics" }
] as const;

const HomePage = () => {
  usePageTitle('Learn Anything, Anywhere with Expert Teachers');
  const { user, isAuthenticated } = useAuthStore();

  const dashboardLink = useMemo(() => {
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
  }, [user]);

  const dashboardLabel = useMemo(() => {
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
  }, [user]);

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative min-h-[90vh] flex items-center overflow-hidden">
        {/* Gradient Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary-600 via-primary-700 to-indigo-900"></div>
        
        {/* Animated Background Elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-20 right-20 w-96 h-96 bg-white/10 rounded-full blur-3xl animate-float"></div>
          <div className="absolute bottom-20 left-20 w-80 h-80 bg-indigo-400/20 rounded-full blur-3xl animate-float delay-200"></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary-400/10 rounded-full blur-3xl animate-pulse-slow"></div>
        </div>
        
        {/* Grid Pattern Overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:64px_64px]"></div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="max-w-4xl">
            {isAuthenticated ? (
              <>
                <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-4 py-2 mb-8">
                  <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                  <span className="text-white/90 text-sm font-medium">Welcome back to your dashboard</span>
                </div>
                <h1 className="text-5xl md:text-6xl lg:text-7xl font-extrabold text-white mb-6 leading-[1.1] tracking-tight">
                  Hello, <span className="bg-gradient-to-r from-primary-200 to-indigo-200 bg-clip-text text-transparent">{user?.firstName}!</span>
                </h1>
                <p className="text-xl md:text-2xl mb-10 text-white/80 leading-relaxed max-w-2xl">
                  {user?.role === UserRole.STUDENT && "Continue your learning journey with our expert teachers and unlock your full potential."}
                  {user?.role === UserRole.TEACHER && "Manage your courses, connect with students, and grow your teaching career."}
                  {user?.role === UserRole.ADMIN && "Oversee the platform, manage users, and ensure quality education delivery."}
                </p>
                <div className="flex flex-wrap gap-4">
                  <Link 
                    to={dashboardLink} 
                    className="group inline-flex items-center gap-3 bg-white text-primary-700 px-8 py-4 rounded-2xl font-bold text-lg shadow-2xl shadow-black/20 hover:shadow-white/20 transition-all duration-300 hover:scale-105"
                  >
                    Go to {dashboardLabel}
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </Link>
                  {user?.role === UserRole.STUDENT && (
                    <Link to="/courses" className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border-2 border-white/30 text-white px-8 py-4 rounded-2xl font-bold text-lg hover:bg-white/20 transition-all duration-300">
                      Browse Courses
                    </Link>
                  )}
                  {user?.role === UserRole.TEACHER && (
                    <Link to="/teacher/courses/new" className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border-2 border-white/30 text-white px-8 py-4 rounded-2xl font-bold text-lg hover:bg-white/20 transition-all duration-300">
                      Create New Course
                    </Link>
                  )}
                </div>
              </>
            ) : (
              <>
                <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-4 py-2 mb-8">
                  <span className="text-2xl">🚀</span>
                  <span className="text-white/90 text-sm font-medium">Start learning today with expert teachers</span>
                </div>
                <h1 className="text-5xl md:text-6xl lg:text-7xl font-extrabold text-white mb-6 leading-[1.1] tracking-tight">
                  Learn Anything,{' '}
                  <span className="bg-gradient-to-r from-primary-200 via-indigo-200 to-purple-200 bg-clip-text text-transparent">
                    Anywhere
                  </span>
                  <br />with Expert Teachers
                </h1>
                <p className="text-xl md:text-2xl mb-10 text-white/80 leading-relaxed max-w-2xl">
                  Connect with certified teachers for live and recorded lessons. Get personalized
                  education tailored to your needs and goals.
                </p>
                <div className="flex flex-wrap gap-4">
                  <Link 
                    to="/courses" 
                    className="group inline-flex items-center gap-3 bg-white text-primary-700 px-8 py-4 rounded-2xl font-bold text-lg shadow-2xl shadow-black/20 hover:shadow-white/20 transition-all duration-300 hover:scale-105"
                  >
                    Explore Courses
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </Link>
                  <Link 
                    to="/register" 
                    className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border-2 border-white/30 text-white px-8 py-4 rounded-2xl font-bold text-lg hover:bg-white/20 transition-all duration-300"
                  >
                    Start Teaching
                  </Link>
                </div>
                
                {/* Stats */}
                <div className="flex flex-wrap gap-8 mt-16 pt-8 border-t border-white/10">
                  <div>
                    <div className="text-4xl font-extrabold text-white">10K+</div>
                    <div className="text-white/60 text-sm font-medium mt-1">Active Students</div>
                  </div>
                  <div>
                    <div className="text-4xl font-extrabold text-white">500+</div>
                    <div className="text-white/60 text-sm font-medium mt-1">Expert Teachers</div>
                  </div>
                  <div>
                    <div className="text-4xl font-extrabold text-white">1000+</div>
                    <div className="text-white/60 text-sm font-medium mt-1">Courses</div>
                  </div>
                  <div>
                    <div className="text-4xl font-extrabold text-white">4.9★</div>
                    <div className="text-white/60 text-sm font-medium mt-1">Avg. Rating</div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
        
        {/* Bottom Wave */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full">
            <path d="M0 120L60 105C120 90 240 60 360 45C480 30 600 30 720 37.5C840 45 960 60 1080 67.5C1200 75 1320 75 1380 75L1440 75V120H1380C1320 120 1200 120 1080 120C960 120 840 120 720 120C600 120 480 120 360 120C240 120 120 120 60 120H0Z" fill="#f8fafc"/>
          </svg>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 md:py-32 bg-slate-50 relative">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.02)_1px,transparent_1px)] bg-[size:32px_32px] opacity-50"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="text-center mb-16 animate-fadeInUp">
            <div className="inline-flex items-center gap-2 bg-primary-100 text-primary-700 rounded-full px-4 py-2 mb-6 font-semibold text-sm">
              <span>✨</span> Why Choose Us
            </div>
            <h2 className="text-4xl md:text-5xl font-extrabold text-gray-900 mb-4 tracking-tight">
              Everything You Need to{' '}
              <span className="bg-gradient-to-r from-primary-600 to-indigo-600 bg-clip-text text-transparent">Succeed</span>
            </h2>
            <p className="text-xl text-gray-500 max-w-2xl mx-auto">
              Experience the best online learning platform with features designed for your success
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {FEATURES.map((feature, index) => {
              const IconComponent = feature.icon;
              return (
                <div 
                  key={feature.title} 
                  className="group bg-white rounded-3xl p-8 shadow-card hover:shadow-card-hover transition-all duration-500 border border-gray-100 hover:border-primary-200 hover:-translate-y-2"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <div className="w-16 h-16 bg-gradient-to-br from-primary-500 to-indigo-600 text-white rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-primary-500/30 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                    <IconComponent className="w-8 h-8" />
                  </div>
                  <h3 className="text-xl font-bold mb-3 text-gray-900 group-hover:text-primary-700 transition-colors">{feature.title}</h3>
                  <p className="text-gray-500 leading-relaxed">
                    {feature.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative py-24 md:py-32 overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary-600 via-primary-700 to-indigo-800"></div>
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:32px_32px]"></div>
        
        {/* Floating Elements */}
        <div className="absolute top-10 left-10 w-64 h-64 bg-white/10 rounded-full blur-3xl animate-float"></div>
        <div className="absolute bottom-10 right-10 w-80 h-80 bg-indigo-400/20 rounded-full blur-3xl animate-float delay-300"></div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-4 py-2 mb-8">
              <span className="text-xl">🎯</span>
              <span className="text-white/90 text-sm font-medium">Join our learning community</span>
            </div>
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-white mb-6 leading-tight tracking-tight">
              Ready to Start Your{' '}
              <span className="bg-gradient-to-r from-primary-200 to-indigo-200 bg-clip-text text-transparent">
                Learning Journey?
              </span>
            </h2>
            <p className="text-xl text-white/80 mb-10 max-w-xl mx-auto">
              Join thousands of students learning from the best teachers worldwide. Start your journey today!
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link 
                to="/register" 
                className="group inline-flex items-center gap-3 bg-white text-primary-700 px-8 py-4 rounded-2xl font-bold text-lg shadow-2xl shadow-black/20 hover:shadow-white/20 transition-all duration-300 hover:scale-105"
              >
                Get Started Free
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link 
                to="/courses" 
                className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border-2 border-white/30 text-white px-8 py-4 rounded-2xl font-bold text-lg hover:bg-white/20 transition-all duration-300"
              >
                Browse Courses
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default HomePage;

