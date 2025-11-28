import { useState } from 'react';
import { Search, ChevronDown, ChevronUp, Mail, MessageCircle, Phone } from 'lucide-react';

/**
 * Help Center Page
 * Provides FAQs and support information
 */

interface FAQItem {
  question: string;
  answer: string;
  category: string;
}

const HelpCenterPage = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const categories = [
    { id: 'all', name: 'All Topics' },
    { id: 'getting-started', name: 'Getting Started' },
    { id: 'courses', name: 'Courses & Learning' },
    { id: 'payments', name: 'Payments & Billing' },
    { id: 'teachers', name: 'For Teachers' },
    { id: 'technical', name: 'Technical Support' },
  ];

  const faqs: FAQItem[] = [
    {
      category: 'getting-started',
      question: 'How do I create an account?',
      answer: 'Click on "Sign Up" in the top right corner, choose your role (Student or Teacher), fill in your information, and verify your email address.',
    },
    {
      category: 'getting-started',
      question: 'What are the different user roles?',
      answer: 'Edutech has three roles: Students (learn from courses), Teachers (create and teach courses), and Admins (manage the platform).',
    },
    {
      category: 'courses',
      question: 'How do I enroll in a course?',
      answer: 'Browse courses, select one you like, choose a pricing package, and complete the payment process. You will have immediate access after payment.',
    },
    {
      category: 'courses',
      question: 'Can I get a refund for a course?',
      answer: 'Refund policies vary by course. Please contact support@edutech.com with your enrollment details for refund requests.',
    },
    {
      category: 'courses',
      question: 'How long do I have access to a course?',
      answer: 'Access duration depends on the package you purchased. Some courses offer lifetime access, while others have time-limited access (30, 60, or 90 days).',
    },
    {
      category: 'payments',
      question: 'What payment methods do you accept?',
      answer: 'We accept all major credit cards (Visa, MasterCard, American Express) through our secure payment processor Stripe.',
    },
    {
      category: 'payments',
      question: 'Is my payment information secure?',
      answer: 'Yes, all payment information is processed securely through Stripe. We do not store your credit card information on our servers.',
    },
    {
      category: 'teachers',
      question: 'How do I become a teacher on Edutech?',
      answer: 'Register as a teacher, complete your profile, submit verification documents, and once approved, you can create and publish courses.',
    },
    {
      category: 'teachers',
      question: 'How do I get paid as a teacher?',
      answer: 'Teachers receive 90% of course revenue (platform takes 10% commission). Payments are processed monthly to your registered bank account.',
    },
    {
      category: 'teachers',
      question: 'Can I offer live classes?',
      answer: 'Yes! You can create LIVE lessons which support real-time video sessions with students. You can also offer RECORDED or HYBRID lessons.',
    },
    {
      category: 'technical',
      question: 'What browsers are supported?',
      answer: 'Edutech works best on the latest versions of Chrome, Firefox, Safari, and Edge. We recommend keeping your browser updated.',
    },
    {
      category: 'technical',
      question: 'I forgot my password. How do I reset it?',
      answer: 'Click "Forgot Password" on the login page, enter your email, and follow the instructions sent to your email to reset your password.',
    },
    {
      category: 'technical',
      question: 'The video player is not working. What should I do?',
      answer: 'Try clearing your browser cache, using a different browser, or checking your internet connection. If the issue persists, contact support.',
    },
  ];

  const filteredFAQs = faqs.filter((faq) => {
    const matchesCategory = selectedCategory === 'all' || faq.category === selectedCategory;
    const matchesSearch = searchQuery === '' || 
      faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const toggleFAQ = (index: number) => {
    setExpandedId(expandedId === index ? null : index);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50 py-12">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="section-title mb-6 text-5xl">Help Center</h1>
          <p className="section-subtitle mb-12 text-xl">
            Find answers to common questions and get support
          </p>

          {/* Search Bar */}
          <div className="max-w-2xl mx-auto">
            <div className="relative">
              <div className="absolute left-4 top-1/2 transform -translate-y-1/2">
                <Search className="text-primary-600 w-6 h-6" />
              </div>
              <input
                type="text"
                placeholder="Search for help..."
                className="input pl-14 w-full shadow-lg border-2 border-primary-200 focus:border-primary-600 rounded-xl py-4 text-base"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Category Filter */}
        <div className="mb-12">
          <div className="flex flex-wrap justify-center gap-3">
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`px-6 py-3 rounded-full font-bold text-sm transition-all border-2 transform hover:scale-105 ${
                  selectedCategory === category.id
                    ? 'bg-gradient-to-r from-primary-600 to-primary-700 text-white border-primary-600 shadow-lg'
                    : 'bg-white text-gray-700 border-gray-200 hover:border-primary-300 hover:text-primary-700 hover:shadow-md'
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
                  {filteredFAQs.map((faq, index) => (
                    <div
                      key={index}
                      className="border-2 border-gray-200 rounded-xl overflow-hidden hover:border-primary-400 hover:shadow-lg transition-all duration-300 transform hover:scale-102"
                    >
                      <button
                        onClick={() => toggleFAQ(index)}
                        className="w-full px-6 py-6 flex items-center justify-between hover:bg-gradient-to-r hover:from-primary-50 hover:to-primary-100 transition-all"
                      >
                        <span className="font-bold text-left text-gray-900 text-lg">{faq.question}</span>
                        {expandedId === index ? (
                          <ChevronUp className="w-6 h-6 text-primary-600 flex-shrink-0" />
                        ) : (
                          <ChevronDown className="w-6 h-6 text-gray-500 flex-shrink-0" />
                        )}
                      </button>
                      {expandedId === index && (
                        <div className="px-6 py-6 bg-gradient-to-r from-primary-50 to-primary-100 border-t-2 border-primary-200">
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
            <div className="card bg-gradient-to-br from-primary-600 to-primary-700 text-white border-2 border-primary-400 sticky top-20 shadow-2xl rounded-2xl">
              <h3 className="text-3xl font-bold mb-6 text-white">Still Need Help?</h3>
              <p className="text-primary-100 mb-10 leading-relaxed text-lg">
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
                <p className="text-sm text-primary-100">
                  <strong className="text-white">Response Time:</strong> We typically respond within 24 hours on business days.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HelpCenterPage;

