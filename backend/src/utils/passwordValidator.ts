import zxcvbn from 'zxcvbn';

/**
 * Password Strength Validator
 * Uses zxcvbn library for realistic password strength estimation
 */

export interface PasswordStrengthResult {
  score: 0 | 1 | 2 | 3 | 4; // 0 = weak, 4 = very strong
  strength: 'very_weak' | 'weak' | 'fair' | 'strong' | 'very_strong';
  feedback: {
    warning: string;
    suggestions: string[];
  };
  crackTime: string;
  isValid: boolean;
  errors: string[];
}

export interface PasswordPolicy {
  minLength: number;
  maxLength: number;
  minScore: number; // Minimum zxcvbn score (0-4)
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumbers: boolean;
  requireSpecialChars: boolean;
  disallowCommonPasswords: boolean;
}

// Default password policy
export const defaultPasswordPolicy: PasswordPolicy = {
  minLength: 8,
  maxLength: 128,
  minScore: 2, // At least "fair" strength
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChars: false, // Optional for better UX
  disallowCommonPasswords: true,
};

const strengthLabels: Record<number, PasswordStrengthResult['strength']> = {
  0: 'very_weak',
  1: 'weak',
  2: 'fair',
  3: 'strong',
  4: 'very_strong',
};

/**
 * Validate password against policy and return strength analysis
 */
export const validatePassword = (
  password: string,
  userInputs: string[] = [], // User-specific data to check against (email, name, etc.)
  policy: Partial<PasswordPolicy> = {}
): PasswordStrengthResult => {
  const fullPolicy = { ...defaultPasswordPolicy, ...policy };
  const errors: string[] = [];

  // Basic length validation
  if (password.length < fullPolicy.minLength) {
    errors.push(`Password must be at least ${fullPolicy.minLength} characters long`);
  }
  if (password.length > fullPolicy.maxLength) {
    errors.push(`Password must not exceed ${fullPolicy.maxLength} characters`);
  }

  // Character requirements
  if (fullPolicy.requireUppercase && !/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  if (fullPolicy.requireLowercase && !/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  if (fullPolicy.requireNumbers && !/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  if (fullPolicy.requireSpecialChars && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }

  // Use zxcvbn for strength analysis
  const result = zxcvbn(password, userInputs);
  
  // Check minimum score
  if (result.score < fullPolicy.minScore) {
    errors.push(`Password is too weak. Please choose a stronger password`);
  }

  // Format crack time for display
  const crackTime = result.crack_times_display.offline_slow_hashing_1e4_per_second as string;

  return {
    score: result.score as 0 | 1 | 2 | 3 | 4,
    strength: strengthLabels[result.score],
    feedback: {
      warning: result.feedback.warning || '',
      suggestions: result.feedback.suggestions || [],
    },
    crackTime,
    isValid: errors.length === 0,
    errors,
  };
};

/**
 * Quick check if password meets minimum requirements
 */
export const isPasswordValid = (
  password: string,
  userInputs: string[] = [],
  policy: Partial<PasswordPolicy> = {}
): boolean => {
  return validatePassword(password, userInputs, policy).isValid;
};

/**
 * Get password strength score (0-4)
 */
export const getPasswordScore = (
  password: string,
  userInputs: string[] = []
): number => {
  return zxcvbn(password, userInputs).score;
};

/**
 * Express validator custom validation function
 */
export const passwordStrengthValidator = (
  password: string,
  { req }: { req: Express.Request & { body?: { email?: string; firstName?: string; lastName?: string } } }
) => {
  // Get user inputs to check against
  const userInputs: string[] = [];
  if (req.body?.email) userInputs.push(req.body.email);
  if (req.body?.firstName) userInputs.push(req.body.firstName);
  if (req.body?.lastName) userInputs.push(req.body.lastName);

  const result = validatePassword(password, userInputs);
  
  if (!result.isValid) {
    throw new Error(result.errors[0] || 'Password does not meet requirements');
  }
  
  return true;
};

export default validatePassword;
