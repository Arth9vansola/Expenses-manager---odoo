// Validation utilities
export const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const validatePassword = (password) => {
  // At least 8 characters, 1 uppercase, 1 lowercase, 1 number
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/;
  return passwordRegex.test(password);
};

export const validateRequired = (value) => {
  return value && value.trim().length > 0;
};

export const validatePasswordMatch = (password, confirmPassword) => {
  return password === confirmPassword;
};

export const getPasswordStrength = (password) => {
  if (!password) return { strength: 0, message: '' };
  
  let strength = 0;
  let message = 'Weak';
  
  if (password.length >= 8) strength++;
  if (/[a-z]/.test(password)) strength++;
  if (/[A-Z]/.test(password)) strength++;
  if (/\d/.test(password)) strength++;
  if (/[@$!%*?&]/.test(password)) strength++;
  
  if (strength >= 4) message = 'Strong';
  else if (strength >= 2) message = 'Medium';
  
  return { strength: (strength / 5) * 100, message };
};