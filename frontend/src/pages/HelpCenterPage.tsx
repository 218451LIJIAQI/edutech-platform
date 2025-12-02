import { useState, useMemo } from 'react';
import { Search, ChevronDown, ChevronUp, Mail, MessageCircle, Phone, HelpCircle, Sparkles } from 'lucide-react';
import { usePageTitle } from '@/hooks';

/**
 * Help Center Page
 * Provides FAQs and support information
 */

interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category: string;
}

const HelpCenterPage = () => {
  usePageTitle('Help Center');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const categories = [
    { id: 'all', name: 'All Topics' },
    { id: 'getting-started', name: 'Getting Started' },
    { id: 'courses', name: 'Courses & Learning' },
    { id: 'payments', name: 'Payments & Billing' },
    { id: 'teachers', name: 'For Teachers' },
    { id: 'technical', name: 'Technical Support' },
  ];

  const faqs: FAQItem[] = useMemo(() => [
    {
      id: 'faq-1',
      category: 'getting-started',
      question: 'How do I create an account?',
      answer: 'Click on "Sign Up" in the top right corner, choose your role (Student or Teacher), fill in your information, and verify your email address.',
    },
    {
      id: 'faq-2',
      category: 'getting-started',
      question: 'What are the different user roles?',
      answer: 'Edutech has three roles: Students (learn from courses), Teachers (create and teach courses), and Admins (manage the platform).',
    },
    {
      id: 'faq-3',
      category: 'courses',
      question: 'How do I enroll in a course?',
      answer: 'Browse courses, select one you like, choose a pricing package, and complete the payment process. You will have immediate access after payment.',
    },
    {
      id: 'faq-4',
      category: 'courses',
      question: 'Can I get a refund for a course?',
      answer: 'Refund policies vary by course. Please contact support@edutech.com with your enrollment details for refund requests.',
    },
    {
      id: 'faq-5',
      category: 'courses',
      question: 'How long do I have access to a course?',
      answer: 'Access duration depends on the package you purchased. Some courses offer lifetime access, while others have time-limited access (30, 60, or 90 days).',
    },
    {
      id: 'faq-6',
      category: 'payments',
      question: 'What payment methods do you accept?',
      answer: 'We accept all major credit cards (Visa, MasterCard, American Express) through our secure payment processor Stripe.',
    },
    {
      id: 'faq-7',
      category: 'payments',
      question: 'Is my payment information secure?',
      answer: 'Yes, all payment information is processed securely through Stripe. We do not store your credit card information on our servers.',
    },
    {
      id: 'faq-8',
      category: 'teachers',
      question: 'How do I become a teacher on Edutech?',
      answer: 'Register as a teacher, complete your profile, submit verification documents, and once approved, you can create and publish courses.',
    },
    {
      id: 'faq-9',
      category: 'teachers',
      question: 'How do I get paid as a teacher?',
      answer: 'Teachers receive 90% of course revenue (platform takes 10% commission). Payments are processed monthly to your registered bank account.',
    },
    {
      id: 'faq-10',
      category: 'teachers',
      question: 'Can I offer live classes?',
      answer: 'Yes! You can create LIVE lessons which support real-time video sessions with students. You can also offer RECORDED or HYBRID lessons.',
    },
    {
      id: 'faq-11',
      category: 'technical',
      question: 'What browsers are supported?',
      answer: 'Edutech works best on the latest versions of Chrome, Firefox, Safari, and Edge. We recommend keeping your browser updated.',
    },
    {
      id: 'faq-12',
      category: 'technical',
      question: 'I forgot my password. How do I reset it?',
      answer: 'Click "Forgot Password" on the login page, enter your email, and follow the instructions sent to your email to reset your password.',
    },
    {
      id: 'faq-13',
      category: 'technical',
      question: 'The video player is not working. What should I do?',
      answer: 'Try clearing your browser cache, using a different browser, or checking your internet connection. If the issue persists, contact support.',
    },
  ], []);

  const filteredFAQs = useMemo(() => {
    return faqs.filter((faq) => {
      const matchesCategory = selectedCategory === 'all' || faq.category === selectedCategory;
      const matchesSearch = searchQuery === '' || 
        faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
        faq.answer.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [faqs, selectedCategory, searchQuery]);

  const toggleFAQ = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-primary-50/10 to-indigo-50/20 py-12 relative">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.015)_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none"></div>
      
      {/* Decorative Elements */}
      <div className="absolute top-20 right-[10%] w-72 h-72 bg-primary-400/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-40 left-[5%] w-80 h-80 bg-indigo-400/10 rounded-full blur-3xl pointer-events-none"></div>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-primary-500 via-primary-600 to-indigo-600 rounded-2xl mb-6 shadow-xl shadow-primary-500/30">
            <HelpCircle className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 tracking-tight mb-4">
            Help <span className="bg-gradient-to-r from-primary-600 to-indigo-600 bg-clip-text text-transparent">Center</span>
          </h1>
          <p className="text-xl text-gray-500 font-medium mb-10">
            Find answers to common questions and get support
          </p>

          {/* Search Bar */}
          <div className="max-w-2xl mx-auto">
            <div className="relative group">
              <div className="absolute left-5 top-1/2 transform -translate-y-1/2 text-gray-400 group-focus-within:text-primary-500 transition-colors">
                <Search className="w-5 h-5" />
              </div>
              <input
                type="text"
                placeholder="Search for help..."
                className="w-full pl-14 pr-5 py-4 bg-white/95 backdrop-blur-sm border border-gray-200/80 rounded-2xl text-gray-900 placeholder-gray-400 shadow-lg focus:outline-none focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 hover:border-gray-300 transition-all duration-200"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Category Filter */}
        <div className="mb-12">
          <div className="flex flex-wrap justify-center gap-2">
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`px-5 py-2.5 rounded-xl font-semibold text-sm transition-all duration-300 ${
                  selectedCategory === category.id
                    ? 'bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-lg shadow-primary-500/25'
                    : 'bg-white/90 text-gray-600 border border-gray-200/80 hover:border-primary-300 hover:text-primary-600 hover:bg-primary-50/50'
                }`}
              >
                {category.name}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* FAQs */}
          <div className="lg:col-span-2">
            <div className="card shadow-xl border border-gray-100 rounded-2xl">
              <h2 className="text-3xl font-bold mb-8 text-gray-900">
                Frequently Asked Questions
              </h2>

              {filteredFAQs.length === 0 ? (
                <div className="text-center py-16">
                  <Search className="w-20 h-20 text-gray-300 mx-auto mb-6" />
                  <p className="text-gray-600 text-lg font-medium">No results found. Try a different search term.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredFAQs.map((faq) => (
                    <div
                      key={faq.id}
                      className="border-2 border-gray-200 rounded-xl overflow-hidden hover:border-primary-400 hover:shadow-lg transition-all duration-300 transform hover:scale-[1.02]"
                    >
                      <button
                        onClick={() => toggleFAQ(faq.id)}
                        className="w-full px-6 py-6 flex items-center justify-between hover:bg-gradient-to-r hover:from-primary-50 hover:to-primary-100 transition-all"
                        aria-expanded={expandedId === faq.id}
                        aria-controls={`faq-answer-${faq.id}`}
                      >
                        <span className="font-bold text-left text-gray-900 text-lg">{faq.question}</span>
                        {expandedId === faq.id ? (
                          <ChevronUp className="w-6 h-6 text-primary-600 flex-shrink-0" aria-hidden="true" />
                        ) : (
                          <ChevronDown className="w-6 h-6 text-gray-500 flex-shrink-0" aria-hidden="true" />
                        )}
                      </button>
                      {expandedId === faq.id && (
                        <div 
                          id={`faq-answer-${faq.id}`}
                          className="px-6 py-6 bg-gradient-to-r from-primary-50 to-primary-100 border-t-2 border-primary-200"
                          role="region"
                        >
                          <p className="text-gray-700 leading-relaxed text-base">{faq.answer}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Contact Support */}
          <div className="lg:col-span-1">
            <div className="bg-gradient-to-br from-primary-500 via-primary-600 to-indigo-600 text-white rounded-2xl p-8 sticky top-20 shadow-xl shadow-primary-500/20 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2"></div>
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2"></div>
              <div className="relative">
                <div className="flex items-center gap-3 mb-4">
                  <Sparkles className="w-6 h-6" />
                  <h3 className="text-2xl font-bold">Still Need Help?</h3>
                </div>
                <p className="text-white/80 mb-8 leading-relaxed">
                  Can't find what you're looking for? Our support team is here to help!
                </p>

              <div className="space-y-4">
                <a
                  href="mailto:support@edutech.com"
                  className="flex items-center gap-4 p-5 bg-white/20 rounded-xl hover:bg-white/30 transition-all border border-white/30 backdrop-blur-sm hover:shadow-lg transform hover:scale-105"
                >
                  <div className="p-3 bg-white/30 rounded-lg">
                    <Mail className="w-7 h-7 text-white" />
                  </div>
                  <div>
                    <p className="font-bold text-white text-lg">Email Support</p>
                    <p className="text-sm text-primary-100">support@edutech.com</p>
                  </div>
                </a>

                <a
                  href="tel:+15551234567"
                  className="flex items-center gap-4 p-5 bg-white/20 rounded-xl hover:bg-white/30 transition-all border border-white/30 backdrop-blur-sm hover:shadow-lg transform hover:scale-105"
                >
                  <div className="p-3 bg-white/30 rounded-lg">
                    <Phone className="w-7 h-7 text-white" />
                  </div>
                  <div>
                    <p className="font-bold text-white text-lg">Phone Support</p>
                    <p className="text-sm text-primary-100">+1 (555) 123-4567</p>
                  </div>
                </a>

                <div className="flex items-center gap-4 p-5 bg-white/20 rounded-xl border border-white/30 backdrop-blur-sm">
                  <div className="p-3 bg-white/30 rounded-lg">
                    <MessageCircle className="w-7 h-7 text-white" />
                  </div>
                  <div>
                    <p className="font-bold text-white text-lg">Live Chat</p>
                    <p className="text-sm text-primary-100">Available Mon-Fri 9AM-5PM</p>
                  </div>
                </div>
              </div>

              <div className="mt-8 p-5 bg-white/20 rounded-xl border border-white/30 backdrop-blur-sm">
                <p className="text-sm text-white/80">
                  <strong className="text-white">Response Time:</strong> We typically respond within 24 hours on business days.
                </p>
              </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HelpCenterPage;
