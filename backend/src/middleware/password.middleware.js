/**
 * Password Validation Middleware
 * 
 * Validates password strength and sanitizes input to prevent:
 * - SQL/NoSQL injection via long passwords
 * - DoS attacks via bcrypt (extremely long passwords)
 * - Weak passwords
 */

// Common weak passwords to block
const COMMON_PASSWORDS = [
  'password', '123456', '12345678', 'qwerty', 'abc123',
  'password123', 'admin', 'letmein', 'welcome', 'monkey',
  '1234567890', 'password1', 'iloveyou', 'sunshine', 'princess'
];

/**
 * Validate password strength
 * @param {string} password 
 * @returns {{ valid: boolean, errors: string[] }}
 */
export const validatePassword = (password) => {
  const errors = [];

  // Type check
  if (typeof password !== 'string') {
    return { valid: false, errors: ['Password must be a string'] };
  }

  // Length checks (prevent DoS via bcrypt)
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters');
  }
  if (password.length > 128) {
    errors.push('Password must be less than 128 characters');
  }

  // Complexity checks
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  if (!/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }

  // Common password check
  if (COMMON_PASSWORDS.includes(password.toLowerCase())) {
    errors.push('Password is too common, please choose a stronger password');
  }

  return {
    valid: errors.length === 0,
    errors
  };
};

/**
 * Middleware to validate password on registration/change
 */
export const validatePasswordMiddleware = (req, res, next) => {
  const password = req.body.password || req.body.newPassword;
  
  if (!password) {
    return next();
  }

  const { valid, errors } = validatePassword(password);
  
  if (!valid) {
    return res.status(400).json({
      error: 'Password requirements not met',
      details: errors
    });
  }

  next();
};

/**
 * Sanitize password - strip control characters
 */
export const sanitizePassword = (password) => {
  if (typeof password !== 'string') return '';
  
  // Remove control characters and null bytes
  return password.replace(/[\x00-\x1F\x7F]/g, '');
};

export default {
  validatePassword,
  validatePasswordMiddleware,
  sanitizePassword
};
