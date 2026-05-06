export enum UserRole {
  STUDENT = 'STUDENT',
  TEACHER = 'TEACHER',
  ADMIN = 'ADMIN',
}

export enum CourseType {
  LIVE = 'LIVE',
  RECORDED = 'RECORDED',
  HYBRID = 'HYBRID',
}

export enum LessonType {
  LIVE = 'LIVE',
  RECORDED = 'RECORDED',
  HYBRID = 'HYBRID',
}

export enum VerificationStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export enum PaymentStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  REFUNDED = 'REFUNDED',
}

export enum OrderStatus {
  PENDING = 'PENDING',
  PAID = 'PAID',
  CANCELLED = 'CANCELLED',
  REFUNDED = 'REFUNDED',
  FAILED = 'FAILED',
}

export enum RefundStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  COMPLETED = 'COMPLETED',
  PROCESSING = 'PROCESSING',
}

export enum RefundMethod {
  ORIGINAL_PAYMENT = 'ORIGINAL_PAYMENT',
  WALLET = 'WALLET',
  BANK_TRANSFER = 'BANK_TRANSFER',
}

export enum SupportTicketStatus {
  OPEN = 'OPEN',
  IN_PROGRESS = 'IN_PROGRESS',
  RESOLVED = 'RESOLVED',
  CLOSED = 'CLOSED',
}

export enum SupportTicketPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
}

export enum RegistrationStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export enum AdPlacement {
  LOGIN_MODAL = 'LOGIN_MODAL',
}

export enum AdStatus {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
  PAUSED = 'PAUSED',
  ARCHIVED = 'ARCHIVED',
}

export enum AdDestinationType {
  INTERNAL = 'INTERNAL',
  EXTERNAL = 'EXTERNAL',
}

export enum AdTheme {
  MIDNIGHT = 'MIDNIGHT',
  SUNSET = 'SUNSET',
  AURORA = 'AURORA',
  OCEAN = 'OCEAN',
  FOREST = 'FOREST',
  ROSE = 'ROSE',
}

export enum ReportType {
  QUALITY_ISSUE = 'QUALITY_ISSUE',
  INAPPROPRIATE_CONTENT = 'INAPPROPRIATE_CONTENT',
  FRAUD = 'FRAUD',
  TECHNICAL_ISSUE = 'TECHNICAL_ISSUE',
  OTHER = 'OTHER',
}

export enum ReportStatus {
  OPEN = 'OPEN',
  UNDER_REVIEW = 'UNDER_REVIEW',
  RESOLVED = 'RESOLVED',
  DISMISSED = 'DISMISSED',
}

export enum WalletTransactionType {
  CREDIT = 'CREDIT',
  DEBIT = 'DEBIT',
  FREEZE = 'FREEZE',
  UNFREEZE = 'UNFREEZE',
  ADJUSTMENT = 'ADJUSTMENT',
}

export enum WalletTransactionSource {
  COURSE_SALE = 'COURSE_SALE',
  REFUND = 'REFUND',
  REVERSAL = 'REVERSAL',
  ADMIN_ADJUSTMENT = 'ADMIN_ADJUSTMENT',
  PAYOUT = 'PAYOUT',
}

export enum PayoutMethodType {
  BANK_TRANSFER = 'BANK_TRANSFER',
  GRABPAY = 'GRABPAY',
  TOUCH_N_GO = 'TOUCH_N_GO',
  PAYPAL = 'PAYPAL',
  OTHER = 'OTHER',
}

export enum PayoutRequestStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  PROCESSING = 'PROCESSING',
  PAID = 'PAID',
  CANCELLED = 'CANCELLED',
}
