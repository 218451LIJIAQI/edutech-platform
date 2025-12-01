import logger from '../utils/logger';

/**
 * Email Service (Placeholder implementation)
 * BullMQ queue has been removed for simplicity.
 * Emails are logged only - integrate with actual email provider as needed.
 */

export interface EmailJobData {
  to: string | string[];
  subject: string;
  template: EmailTemplate;
  data: Record<string, unknown>;
  from?: string;
  replyTo?: string;
}

export type EmailTemplate =
  | 'welcome'
  | 'password-reset'
  | 'email-verification'
  | 'course-enrollment'
  | 'payment-confirmation'
  | 'refund-processed'
  | 'new-message'
  | 'support-ticket-update'
  | 'teacher-verification-approved'
  | 'teacher-verification-rejected'
  | 'payout-processed';

const TEMPLATE_SUBJECTS: Record<EmailTemplate, string> = {
  'welcome': 'Welcome to Edutech Platform!',
  'password-reset': 'Reset Your Password',
  'email-verification': 'Verify Your Email Address',
  'course-enrollment': 'Course Enrollment Confirmation',
  'payment-confirmation': 'Payment Received',
  'refund-processed': 'Your Refund Has Been Processed',
  'new-message': 'You Have a New Message',
  'support-ticket-update': 'Support Ticket Update',
  'teacher-verification-approved': 'Your Teacher Account is Approved!',
  'teacher-verification-rejected': 'Teacher Verification Status Update',
  'payout-processed': 'Payout Processed Successfully',
};

class EmailService {
  initialize(): void {
    logger.info('ℹ️  Email service initialized (logging only)');
  }

  async send(options: Omit<EmailJobData, 'subject'> & { subject?: string }): Promise<boolean> {
    const subject = options.subject || TEMPLATE_SUBJECTS[options.template] || 'Notification';
    
    // Log the email (placeholder - integrate with actual email provider)
    logger.info(`[EMAIL] To: ${Array.isArray(options.to) ? options.to.join(', ') : options.to}, Subject: ${subject}, Template: ${options.template}`);
    
    return true;
  }

  async sendWelcome(to: string, data: { firstName: string }): Promise<boolean> {
    return this.send({ to, template: 'welcome', data });
  }

  async sendPasswordReset(to: string, data: { firstName: string; resetLink: string }): Promise<boolean> {
    return this.send({ to, template: 'password-reset', data });
  }

  async sendEnrollmentConfirmation(to: string, data: { firstName: string; courseName: string; teacherName: string }): Promise<boolean> {
    return this.send({ to, template: 'course-enrollment', data });
  }

  async sendPaymentConfirmation(to: string, data: { firstName: string; amount: number; currency: string; orderNo: string }): Promise<boolean> {
    return this.send({ to, template: 'payment-confirmation', data });
  }

  async sendRefundProcessed(to: string, data: { firstName: string; amount: number; currency: string; reason?: string }): Promise<boolean> {
    return this.send({ to, template: 'refund-processed', data });
  }

  async sendNewMessageNotification(to: string, data: { firstName: string; senderName: string; preview: string }): Promise<boolean> {
    return this.send({ to, template: 'new-message', data });
  }
}

export const emailService = new EmailService();
export default emailService;
