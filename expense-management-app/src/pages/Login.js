import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FormInput, LoadingSpinner } from '../components/FormComponents';
import { validateEmail, validateRequired } from '../api/validation';
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

    try {
      console.log('Login form submitted:', formData);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Simple login validation - in production, this would be an API call
      if (formData.email && formData.password) {
        // Determine role based on email domain or other logic
        let role = 'employee';
        if (formData.email.includes('admin')) {
          role = 'admin';
        } else if (formData.email.includes('manager')) {
          role = 'manager';
        }

        const mockUser = {
          id: Date.now(),
          name: formData.email.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
          email: formData.email,
          role: role,
          company: { 
            name: 'Your Company', 
            country: { name: 'United States' } 
          }
        };
        onLogin(mockUser);
        navigate('/dashboard');
      } else {
        setErrors({ submit: 'Invalid email or password. Please try again.' });
      }

    } catch (error) {
      setErrors({ submit: 'Login failed. Please try again.' });
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
    
    try {
      // Simulate forgot password API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      setForgotPasswordSent(true);
      setErrors({ forgot: '' });
    } catch (error) {
      setErrors({ forgot: 'Failed to send reset email. Please try again.' });
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