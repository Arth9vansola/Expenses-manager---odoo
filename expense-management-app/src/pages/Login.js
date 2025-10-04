import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FormInput, LoadingSpinner } from '../components/FormComponents';
import { validateEmail, validateRequired } from '../api/validation';
import { loginUser, requestPasswordReset } from '../api/usersLive';
import './Login.css';

const Login = ({ onLogin }) => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState('');
  const [forgotPasswordSent, setForgotPasswordSent] = useState(false);

  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });

    // Clear error when user starts typing
    if (errors[name]) {
      setErrors({
        ...errors,
        [name]: ''
      });
    }
  };

  const validateForm = () => {
    const newErrors = {};

    // Email validation
    if (!validateRequired(formData.email)) {
      newErrors.email = 'Email is required';
    } else if (!validateEmail(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    // Password validation
    if (!validateRequired(formData.password)) {
      newErrors.password = 'Password is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setErrors({}); // Clear previous errors

    try {
      console.log('Login form submitted:', formData);
      console.log('Making API call to login...');
      
      // Call live backend authentication API
      const response = await loginUser({
        email: formData.email,
        password: formData.password
      });
      
      console.log('Login API response:', response);
      
      if (response && response.token) {
        console.log('Login successful:', response);
        
        // Store the token (this should be handled by the API function)
        localStorage.setItem('authToken', response.token);
        
        // Pass the user data to the parent component
        onLogin(response.user);
        navigate('/dashboard');
      } else if (response && response.error) {
        // Handle authentication failure with specific error message
        console.log('Login failed with error:', response.error);
        setErrors({ submit: response.error });
      } else {
        // Handle authentication failure
        console.log('Login failed - no token in response');
        setErrors({ submit: 'Invalid email or password. Please try again.' });
      }

    } catch (error) {
      console.error('Login error:', error);
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
      
      // Handle specific error types
      if (error.message && error.message.includes('401')) {
        setErrors({ submit: 'Invalid email or password. Please check your credentials.' });
      } else if (error.message && (error.message.includes('network') || error.message.includes('NetworkError') || error.message.includes('Failed to fetch'))) {
        setErrors({ submit: 'Network error. Please check your connection and try again.' });
      } else if (error.message && error.message.includes('CORS')) {
        setErrors({ submit: 'Connection error. Please try again.' });
      } else {
        setErrors({ submit: `Login failed: ${error.message || 'Please try again.'}` });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    
    if (!validateEmail(forgotPasswordEmail)) {
      setErrors({ forgot: 'Please enter a valid email address' });
      return;
    }

    setLoading(true);
    setErrors({ forgot: '' }); // Clear previous errors
    
    try {
      console.log('Password reset requested for:', forgotPasswordEmail);
      
      // Call live backend password reset API
      const response = await requestPasswordReset(forgotPasswordEmail);
      
      if (response.success) {
        console.log('Password reset email sent successfully');
        setForgotPasswordSent(true);
      } else {
        setErrors({ forgot: response.error || 'Failed to send reset email. Please try again.' });
      }
    } catch (error) {
      console.error('Password reset error:', error);
      
      if (error.message && error.message.includes('404')) {
        setErrors({ forgot: 'No account found with this email address.' });
      } else if (error.message && error.message.includes('network')) {
        setErrors({ forgot: 'Network error. Please check your connection and try again.' });
      } else {
        setErrors({ forgot: 'Failed to send reset email. Please try again.' });
      }
    } finally {
      setLoading(false);
    }
  };

  if (showForgotPassword) {
    return (
      <div className="container mt-2">
        <div className="card login-card">
          <h2 className="text-center mb-2">Reset Password</h2>
          
          {forgotPasswordSent ? (
            <div className="success-message">
              <h3>Reset Email Sent!</h3>
              <p>We've sent a password reset link to {forgotPasswordEmail}</p>
              <p>Please check your email and follow the instructions to reset your password.</p>
              <button 
                onClick={() => {
                  setShowForgotPassword(false);
                  setForgotPasswordSent(false);
                  setForgotPasswordEmail('');
                }}
                className="btn btn-primary"
              >
                Back to Login
              </button>
            </div>
          ) : (
            <form onSubmit={handleForgotPassword}>
              <p className="mb-2">Enter your email address and we'll send you a link to reset your password.</p>
              
              <FormInput
                label="Email Address"
                type="email"
                value={forgotPasswordEmail}
                onChange={(e) => setForgotPasswordEmail(e.target.value)}
                error={errors.forgot}
                required
                disabled={loading}
                placeholder="Enter your email address"
              />

              <div className="forgot-actions">
                <button 
                  type="submit" 
                  className="btn btn-primary"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <LoadingSpinner size="small" />
                      Sending...
                    </>
                  ) : (
                    'Send Reset Link'
                  )}
                </button>
                
                <button 
                  type="button"
                  onClick={() => setShowForgotPassword(false)}
                  className="btn btn-secondary"
                  disabled={loading}
                >
                  Back to Login
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="login-container">
        <div className="login-card">
          <div className="login-header">
            <h1 className="login-title">Welcome Back</h1>
            <p className="login-subtitle">Sign in to access your expense dashboard</p>
          </div>

          <form onSubmit={handleSubmit} className="login-form">
            <FormInput
              label="Email Address"
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              error={errors.email}
              required
              disabled={loading}
              placeholder="Enter your email address"
            />

            <FormInput
              label="Password"
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              error={errors.password}
              required
              disabled={loading}
              placeholder="Enter your password"
            />

            <div className="forgot-password-link">
              <button
                type="button"
                onClick={() => setShowForgotPassword(true)}
                className="link-button"
                disabled={loading}
              >
                Forgot Password?
              </button>
            </div>

            {errors.submit && (
              <div className="alert alert-danger">
                <span className="notification-icon">⚠️</span>
                <div className="notification-content">{errors.submit}</div>
              </div>
            )}

            <button 
              type="submit" 
              className="login-button"
              disabled={loading}
            >
              {loading ? (
                <>
                  <LoadingSpinner size="small" />
                  Signing In...
                </>
              ) : (
                <>
                  <span>🔐</span>
                  Sign In
                </>
              )}
            </button>
          </form>

          <div className="text-center mt-4">
            <span className="text-muted">Don't have an account? </span>
            <Link to="/signup" className="link-button">Create account</Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;