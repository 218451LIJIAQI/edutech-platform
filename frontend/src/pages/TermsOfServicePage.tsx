import { FileText } from 'lucide-react';

/**
 * Terms of Service Page
 */
const TermsOfServicePage = () => {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="card">
          {/* Header */}
          <div className="flex items-center space-x-3 mb-8">
            <FileText className="w-8 h-8 text-primary-600" />
            <h1 className="text-3xl font-bold">Terms of Service</h1>
          </div>

          <p className="text-gray-600 mb-8">
            Last updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
          </p>

          {/* Content */}
          <div className="prose prose-lg max-w-none">
            <h2>1. Acceptance of Terms</h2>
            <p>
              By accessing and using Edutech ("the Platform"), you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to these terms, please do not use this Platform.
            </p>

            <h2>2. Description of Service</h2>
            <p>
              Edutech is an online learning management system that connects students with qualified teachers. The Platform provides:
            </p>
            <ul>
              <li>Access to online courses and learning materials</li>
              <li>Live and recorded lessons</li>
              <li>Tools for teachers to create and manage courses</li>
              <li>Payment processing for course enrollments</li>
              <li>Communication features between teachers and students</li>
            </ul>

            <h2>3. User Accounts</h2>
            <h3>3.1 Registration</h3>
            <p>
              You must register an account to access certain features. You agree to provide accurate, current, and complete information during registration and to update such information to keep it accurate, current, and complete.
            </p>

            <h3>3.2 Account Security</h3>
            <p>
              You are responsible for safeguarding your password and for all activities that occur under your account. You must notify us immediately of any unauthorized use of your account.
            </p>

            <h3>3.3 Account Types</h3>
            <p>
              The Platform supports three types of accounts:
            </p>
            <ul>
              <li><strong>Students:</strong> Can browse and enroll in courses</li>
              <li><strong>Teachers:</strong> Can create and manage courses, subject to verification</li>
              <li><strong>Administrators:</strong> Platform management personnel</li>
            </ul>

            <h2>4. Teacher Verification</h2>
            <p>
              Teachers must undergo a verification process to ensure quality and credibility:
            </p>
            <ul>
              <li>Submit valid identification and credentials</li>
              <li>Provide proof of qualifications relevant to teaching areas</li>
              <li>Agree to maintain professional standards</li>
            </ul>
            <p>
              Edutech reserves the right to approve or reject teacher applications at its discretion.
            </p>

            <h2>5. Course Content and Intellectual Property</h2>
            <h3>5.1 Teacher Content</h3>
            <p>
              Teachers retain ownership of their course content. By uploading content to the Platform, teachers grant Edutech a non-exclusive, worldwide license to host, display, and distribute the content through the Platform.
            </p>

            <h3>5.2 Student Use</h3>
            <p>
              Students may access course content solely for personal, non-commercial learning purposes. Students may not:
            </p>
            <ul>
              <li>Reproduce, distribute, or share course materials</li>
              <li>Use content for commercial purposes</li>
              <li>Remove copyright or proprietary notices</li>
            </ul>

            <h2>6. Payments and Refunds</h2>
            <h3>6.1 Course Pricing</h3>
            <p>
              Teachers set their own course prices. All prices are displayed in USD unless otherwise stated. Prices include applicable taxes where required by law.
            </p>

            <h3>6.2 Platform Commission</h3>
            <p>
              Edutech charges a 10% commission on all course sales. Teachers receive 90% of the course price after successful completion of payment.
            </p>

            <h3>6.3 Payment Processing</h3>
            <p>
              All payments are processed securely through Stripe. Edutech does not store credit card information.
            </p>

            <h3>6.4 Refund Policy</h3>
            <p>
              Refund requests must be submitted within 30 days of purchase. Refunds are granted at the discretion of the teacher and Edutech, considering factors such as:
            </p>
            <ul>
              <li>Course completion percentage</li>
              <li>Time elapsed since purchase</li>
              <li>Reason for refund request</li>
            </ul>

            <h2>7. User Conduct</h2>
            <p>
              You agree not to:
            </p>
            <ul>
              <li>Violate any laws or regulations</li>
              <li>Infringe on intellectual property rights</li>
              <li>Post offensive, discriminatory, or harmful content</li>
              <li>Harass or abuse other users</li>
              <li>Attempt to gain unauthorized access to the Platform</li>
              <li>Upload viruses or malicious code</li>
              <li>Engage in fraudulent activities</li>
            </ul>

            <h2>8. Content Moderation</h2>
            <p>
              Edutech reserves the right to:
            </p>
            <ul>
              <li>Review and moderate course content</li>
              <li>Remove content that violates these terms</li>
              <li>Suspend or terminate accounts for violations</li>
              <li>Investigate reports and complaints</li>
            </ul>

            <h2>9. Disclaimers and Limitations of Liability</h2>
            <h3>9.1 Service Availability</h3>
            <p>
              The Platform is provided "as is" without warranties of any kind. We do not guarantee that the service will be uninterrupted or error-free.
            </p>

            <h3>9.2 Course Quality</h3>
            <p>
              While we verify teacher credentials, Edutech does not guarantee the quality, accuracy, or effectiveness of any course content.
            </p>

            <h3>9.3 Limitation of Liability</h3>
            <p>
              To the maximum extent permitted by law, Edutech shall not be liable for any indirect, incidental, special, consequential, or punitive damages resulting from your use of the Platform.
            </p>

            <h2>10. Termination</h2>
            <p>
              We may terminate or suspend your account immediately, without prior notice, for:
            </p>
            <ul>
              <li>Violation of these Terms</li>
              <li>Fraudulent or illegal activity</li>
              <li>Abuse of other users</li>
              <li>Extended period of inactivity</li>
            </ul>

            <h2>11. Changes to Terms</h2>
            <p>
              We reserve the right to modify these Terms at any time. Changes will be effective immediately upon posting to the Platform. Your continued use of the Platform after changes constitutes acceptance of the modified Terms.
            </p>

            <h2>12. Governing Law</h2>
            <p>
              These Terms shall be governed by and construed in accordance with the laws of the State of California, United States, without regard to its conflict of law provisions.
            </p>

            <h2>13. Contact Information</h2>
            <p>
              For questions about these Terms, please contact us at:
            </p>
            <ul>
              <li><strong>Email:</strong> legal@edutech.com</li>
              <li><strong>Address:</strong> San Francisco, CA, United States</li>
              <li><strong>Phone:</strong> +1 (555) 123-4567</li>
            </ul>

            <hr className="my-8" />

            <p className="text-sm text-gray-600">
              By using Edutech, you acknowledge that you have read, understood, and agree to be bound by these Terms of Service.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TermsOfServicePage;

