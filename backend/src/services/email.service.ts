import { Job } from 'bullmq';
import { addJob, createWorker, QUEUE_NAMES } from '../config/queue';
import logger from '../utils/logger';

/**
 * Email Service
 * Handles email sending via background job queue
 * 
 * Note: This is a template. You need to integrate with an actual
 * email provider (SendGrid, AWS SES, Nodemailer, etc.)
 */

// Email job data interface
export interface EmailJobData {
  to: string | string[];
  subject: string;
  template: EmailTemplate;
  data: Record<string, unknown>;
  from?: string;
  replyTo?: string;
  attachments?: EmailAttachment[];
}

export interface EmailAttachment {
  filename: string;
  content: string | Buffer;
  contentType?: string;
}

// Available email templates
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

// Template subject lines
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
  private initialized = false;

  /**
   * Initialize the email worker
   * Only initializes if queue system is available (requires Redis)
   */
  initialize(): void {
    if (this.initialized) return;

    const worker = createWorker<EmailJobData>(
      QUEUE_NAMES.EMAIL,
      this.processEmail.bind(this),
      3 // concurrency
    );

    if (worker) {
      this.initialized = true;
      logger.info('Email service worker initialized');
    } else {
      logger.info('ℹ️  Email queue disabled - emails will be logged only');
    }
  }

  /**
   * Process an email job
   */
  private async processEmail(job: Job<EmailJobData>): Promise<void> {
    const { to, subject, template } = job.data;

    logger.info(`Processing email job ${job.id}`, {
      template,
      to: Array.isArray(to) ? to.join(', ') : to,
    });

    try {
      // TODO: Integrate with actual email provider
      // Example with Nodemailer:
      // await transporter.sendMail({
      //   from: job.data.from || 'noreply@edutech.com',
      //   to,
      //   subject,
      //   html: await this.renderTemplate(template, job.data.data),
      // });

      // For now, just log
      logger.info(`Email sent successfully`, {
        jobId: job.id,
        template,
        to,
        subject,
      });
    } catch (error) {
      logger.error(`Failed to send email`, {
        jobId: job.id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error; // Re-throw to trigger retry
    }
  }

  /**
   * Queue an email for sending
   */
  async send(options: Omit<EmailJobData, 'subject'> & { subject?: string }): Promise<boolean> {
    const subject = options.subject || TEMPLATE_SUBJECTS[options.template] || 'Notification';

    const job = await addJob<EmailJobData>(
      QUEUE_NAMES.EMAIL,
      `email-${options.template}`,
      { ...options, subject },
      {
        attempts: 3,
        removeOnComplete: 100,
        removeOnFail: 50,
      }
    );

    return job !== null;
  }

  /**
   * Send welcome email
   */
  async sendWelcome(to: string, data: { firstName: string }): Promise<boolean> {
    return this.send({
      to,
      template: 'welcome',
      data,
    });
  }

  /**
   * Send password reset email
   */
  async sendPasswordReset(to: string, data: { firstName: string; resetLink: string }): Promise<boolean> {
    return this.send({
      to,
      template: 'password-reset',
      data,
    });
  }

  /**
   * Send course enrollment confirmation
   */
  async sendEnrollmentConfirmation(
    to: string,
    data: { firstName: string; courseName: string; teacherName: string }
  ): Promise<boolean> {
    return this.send({
      to,
      template: 'course-enrollment',
      data,
    });
  }

  /**
   * Send payment confirmation
   */
  async sendPaymentConfirmation(
    to: string,
    data: { firstName: string; amount: number; currency: string; orderNo: string }
  ): Promise<boolean> {
    return this.send({
      to,
      template: 'payment-confirmation',
      data,
    });
  }

  /**
   * Send refund processed notification
   */
  async sendRefundProcessed(
    to: string,
    data: { firstName: string; amount: number; currency: string; reason?: string }
  ): Promise<boolean> {
    return this.send({
      to,
      template: 'refund-processed',
      data,
    });
  }

  /**
   * Send new message notification
   */
  async sendNewMessageNotification(
    to: string,
    data: { firstName: string; senderName: string; preview: string }
  ): Promise<boolean> {
    return this.send({
      to,
      template: 'new-message',
      data,
    });
  }
}

export const emailService = new EmailService();
export default emailService;
