import { Shield, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

/**
 * Privacy Policy Page
 */
const PrivacyPolicyPage = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-primary-50/10 to-indigo-50/20 py-12 relative">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.015)_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none"></div>
      
      {/* Decorative Elements */}
      <div className="absolute top-20 right-[10%] w-72 h-72 bg-primary-400/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-40 left-[5%] w-80 h-80 bg-indigo-400/10 rounded-full blur-3xl pointer-events-none"></div>
      
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        {/* Back Button */}
        <Link to="/" className="inline-flex items-center gap-2 text-gray-600 hover:text-primary-600 font-medium mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </Link>
        
        <div className="bg-white/95 backdrop-blur-sm shadow-xl border border-gray-100/60 rounded-2xl p-8 md:p-10">
          {/* Header */}
          <div className="flex items-center gap-4 mb-8 pb-8 border-b border-gray-200/80">
            <div className="w-14 h-14 bg-gradient-to-br from-primary-500 via-primary-600 to-indigo-600 rounded-2xl flex items-center justify-center shadow-xl shadow-primary-500/25">
              <Shield className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 tracking-tight">
                Privacy <span className="bg-gradient-to-r from-primary-600 to-indigo-600 bg-clip-text text-transparent">Policy</span>
              </h1>
              <p className="text-gray-500 font-medium mt-1">
                Last updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
              </p>
            </div>
          </div>

          {/* Content */}
          <article className="prose prose-lg max-w-none">
            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">1. Introduction</h2>
            <p className="text-gray-700 leading-relaxed">
              Welcome to Edutech. We respect your privacy and are committed to protecting your personal data. This privacy policy explains how we collect, use, store, and protect your information when you use our Platform.
            </p>

            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">2. Information We Collect</h2>
            <h3 className="text-xl font-bold text-gray-900 mt-6 mb-3">2.1 Information You Provide</h3>
            <p className="text-gray-700 leading-relaxed">
              When you register and use our Platform, we collect:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-gray-700">
              <li><strong className="text-gray-900">Account Information:</strong> Name, email address, password, role (student/teacher)</li>
              <li><strong className="text-gray-900">Profile Information:</strong> Avatar, bio, headline, qualifications (for teachers)</li>
              <li><strong className="text-gray-900">Payment Information:</strong> Processed securely through Stripe (we do not store credit card details)</li>
              <li><strong className="text-gray-900">Course Content:</strong> Videos, materials, descriptions uploaded by teachers</li>
              <li><strong className="text-gray-900">Communication Data:</strong> Messages, reviews, and reports submitted on the Platform</li>
            </ul>

            <h3 className="text-xl font-bold text-gray-900 mt-6 mb-3">2.2 Information We Collect Automatically</h3>
            <ul className="list-disc pl-6 space-y-2 text-gray-700">
              <li><strong className="text-gray-900">Usage Data:</strong> Pages visited, features used, time spent on Platform</li>
              <li><strong className="text-gray-900">Device Information:</strong> Browser type, operating system, IP address</li>
              <li><strong className="text-gray-900">Cookies:</strong> Session data, preferences, authentication tokens</li>
              <li><strong className="text-gray-900">Learning Progress:</strong> Course enrollment, completion status, quiz results</li>
            </ul>

            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">3. How We Use Your Information</h2>
            <p className="text-gray-700 leading-relaxed">
              We use your information to:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-gray-700">
              <li>Provide and maintain the Platform</li>
              <li>Process course enrollments and payments</li>
              <li>Verify teacher credentials</li>
              <li>Facilitate communication between students and teachers</li>
              <li>Improve and personalize your learning experience</li>
              <li>Send important notifications about your account or courses</li>
              <li>Prevent fraud and ensure Platform security</li>
              <li>Comply with legal obligations</li>
              <li>Analyze Platform usage and improve our services</li>
            </ul>

            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">4. Information Sharing and Disclosure</h2>
            <h3 className="text-xl font-bold text-gray-900 mt-6 mb-3">4.1 With Other Users</h3>
            <ul className="list-disc pl-6 space-y-2 text-gray-700">
              <li><strong className="text-gray-900">Public Profile:</strong> Your name, avatar, and bio are visible to other users</li>
              <li><strong className="text-gray-900">Course Reviews:</strong> Your reviews and ratings are publicly visible</li>
              <li><strong className="text-gray-900">Teacher Information:</strong> Teacher credentials and course content are visible to students</li>
            </ul>

            <h3 className="text-xl font-bold text-gray-900 mt-6 mb-3">4.2 With Service Providers</h3>
            <p className="text-gray-700 leading-relaxed">
              We share information with trusted third-party services:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-gray-700">
              <li><strong className="text-gray-900">Payment Processing:</strong> Stripe (for secure payment transactions)</li>
              <li><strong className="text-gray-900">Cloud Hosting:</strong> For storing course content and data</li>
              <li><strong className="text-gray-900">Email Services:</strong> For sending notifications and updates</li>
              <li><strong className="text-gray-900">Analytics:</strong> For understanding Platform usage and improvements</li>
            </ul>

            <h3 className="text-xl font-bold text-gray-900 mt-6 mb-3">4.3 Legal Requirements</h3>
            <p className="text-gray-700 leading-relaxed">
              We may disclose your information if required by law or in response to valid legal requests (subpoenas, court orders, etc.).
            </p>

            <h3 className="text-xl font-bold text-gray-900 mt-6 mb-3">4.4 Business Transfers</h3>
            <p className="text-gray-700 leading-relaxed">
              In the event of a merger, acquisition, or sale of assets, your information may be transferred to the new owner.
            </p>

            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">5. Data Security</h2>
            <p className="text-gray-700 leading-relaxed">
              We implement appropriate security measures to protect your information:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-gray-700">
              <li>Encryption of data in transit and at rest</li>
              <li>Secure password hashing</li>
              <li>Regular security audits and updates</li>
              <li>Access controls and authentication</li>
              <li>Secure payment processing through PCI-compliant providers</li>
            </ul>
            <p className="text-gray-700 leading-relaxed">
              However, no method of transmission over the Internet is 100% secure, and we cannot guarantee absolute security.
            </p>

            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">6. Data Retention</h2>
            <p className="text-gray-700 leading-relaxed">
              We retain your information for as long as:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-gray-700">
              <li>Your account is active</li>
              <li>Needed to provide services to you</li>
              <li>Required to comply with legal obligations</li>
              <li>Necessary to resolve disputes or enforce agreements</li>
            </ul>
            <p className="text-gray-700 leading-relaxed">
              After account deletion, we may retain certain information for legal and security purposes, but it will no longer be associated with your personal identity.
            </p>

            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">7. Your Rights and Choices</h2>
            <h3 className="text-xl font-bold text-gray-900 mt-6 mb-3">7.1 Access and Update</h3>
            <p className="text-gray-700 leading-relaxed">
              You can access and update your profile information at any time through your account settings.
            </p>

            <h3 className="text-xl font-bold text-gray-900 mt-6 mb-3">7.2 Data Portability</h3>
            <p className="text-gray-700 leading-relaxed">
              You can request a copy of your personal data in a machine-readable format.
            </p>

            <h3 className="text-xl font-bold text-gray-900 mt-6 mb-3">7.3 Deletion</h3>
            <p className="text-gray-700 leading-relaxed">
              You can request deletion of your account and personal data. Note that:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-gray-700">
              <li>Teachers with active enrollments cannot delete accounts immediately</li>
              <li>Some information may be retained for legal purposes</li>
              <li>Publicly posted content (reviews, etc.) may remain visible</li>
            </ul>

            <h3 className="text-xl font-bold text-gray-900 mt-6 mb-3">7.4 Marketing Communications</h3>
            <p className="text-gray-700 leading-relaxed">
              You can opt-out of marketing emails by clicking "unsubscribe" in any marketing email or updating your notification preferences.
            </p>

            <h3 className="text-xl font-bold text-gray-900 mt-6 mb-3">7.5 Cookies</h3>
            <p className="text-gray-700 leading-relaxed">
              You can control cookie preferences through your browser settings. Note that disabling cookies may affect Platform functionality.
            </p>

            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">8. Children's Privacy</h2>
            <p className="text-gray-700 leading-relaxed">
              Our Platform is not intended for users under 18 years of age. We do not knowingly collect information from children under 18. If you believe we have collected information from a child, please contact us immediately.
            </p>

            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">9. International Data Transfers</h2>
            <p className="text-gray-700 leading-relaxed">
              Your information may be transferred to and processed in countries other than your country of residence. These countries may have different data protection laws. We ensure appropriate safeguards are in place for such transfers.
            </p>

            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">10. Third-Party Links</h2>
            <p className="text-gray-700 leading-relaxed">
              Our Platform may contain links to third-party websites. We are not responsible for the privacy practices of these sites. We encourage you to read their privacy policies.
            </p>

            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">11. Changes to This Privacy Policy</h2>
            <p className="text-gray-700 leading-relaxed">
              We may update this Privacy Policy from time to time. We will notify you of significant changes by:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-gray-700">
              <li>Posting the updated policy on the Platform</li>
              <li>Updating the "Last updated" date</li>
              <li>Sending an email notification for material changes</li>
            </ul>
            <p className="text-gray-700 leading-relaxed">
              Your continued use of the Platform after changes constitutes acceptance of the updated policy.
            </p>

            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">12. California Privacy Rights (CCPA)</h2>
            <p className="text-gray-700 leading-relaxed">
              If you are a California resident, you have additional rights under the California Consumer Privacy Act (CCPA):
            </p>
            <ul className="list-disc pl-6 space-y-2 text-gray-700">
              <li>Right to know what personal information is collected</li>
              <li>Right to know if personal information is sold or disclosed</li>
              <li>Right to opt-out of the sale of personal information</li>
              <li>Right to deletion of personal information</li>
              <li>Right to non-discrimination for exercising your rights</li>
            </ul>

            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">13. European Privacy Rights (GDPR)</h2>
            <p className="text-gray-700 leading-relaxed">
              If you are in the European Economic Area (EEA), you have rights under the General Data Protection Regulation (GDPR):
            </p>
            <ul className="list-disc pl-6 space-y-2 text-gray-700">
              <li>Right of access to your personal data</li>
              <li>Right to rectification of inaccurate data</li>
              <li>Right to erasure ("right to be forgotten")</li>
              <li>Right to restrict processing</li>
              <li>Right to data portability</li>
              <li>Right to object to processing</li>
              <li>Right to withdraw consent</li>
            </ul>

            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">14. Contact Us</h2>
            <p className="text-gray-700 leading-relaxed">
              If you have questions about this Privacy Policy or wish to exercise your rights, please contact us:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-gray-700">
              <li><strong className="text-gray-900">Email:</strong> privacy@edutech.com</li>
              <li><strong className="text-gray-900">Address:</strong> San Francisco, CA, United States</li>
              <li><strong className="text-gray-900">Phone:</strong> +1 (555) 123-4567</li>
            </ul>

            <p className="text-gray-700 leading-relaxed">
              For data protection concerns in the EEA, you also have the right to lodge a complaint with your local data protection authority.
            </p>

            <hr className="my-8" />

            <p className="text-sm text-gray-600">
              By using Edutech, you acknowledge that you have read and understood this Privacy Policy and agree to the collection, use, and disclosure of your information as described herein.
            </p>
          </article>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicyPage;

