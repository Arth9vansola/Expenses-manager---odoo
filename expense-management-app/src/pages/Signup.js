import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FormInput, FormSelect, LoadingSpinner, PasswordStrength } from '../components/FormComponents';
import { fetchCountries, getCountryCurrency } from '../api/countries';
import { 
  validateEmail, 
  validatePassword, 
  validateRequired, 
  validatePasswordMatch,
  getPasswordStrength 
} from '../api/validation';
import './Signup.css';

const Signup = ({ onLogin }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    country: '',
    companyName: '',
    role: 'admin' // Default to admin for company creation
  });

  const [countries, setCountries] = useState([]);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [countriesLoading, setCountriesLoading] = useState(true);
  const [passwordStrength, setPasswordStrength] = useState({ strength: 0, message: '' });
  
  const navigate = useNavigate();

  useEffect(() => {
    loadCountries();
  }, []);

  useEffect(() => {
    setPasswordStrength(getPasswordStrength(formData.password));
  }, [formData.password]);

  const loadCountries = async () => {
    try {
      setCountriesLoading(true);
      const countriesData = await fetchCountries();
      setCountries(countriesData);
    } catch (error) {
      setErrors({ countries: 'Failed to load countries. Please refresh the page.' });
    } finally {
      setCountriesLoading(false);
    }
  };

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

    // Name validation
    if (!validateRequired(formData.name)) {
      newErrors.name = 'Full name is required';
    }

    // Email validation
    if (!validateRequired(formData.email)) {
      newErrors.email = 'Email is required';
    } else if (!validateEmail(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    // Password validation
    if (!validateRequired(formData.password)) {
      newErrors.password = 'Password is required';
    } else if (!validatePassword(formData.password)) {
      newErrors.password = 'Password must be at least 8 characters with uppercase, lowercase, and number';
    }

    // Confirm password validation
    if (!validateRequired(formData.confirmPassword)) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (!validatePasswordMatch(formData.password, formData.confirmPassword)) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    // Country validation
    if (!validateRequired(formData.country)) {
      newErrors.country = 'Country is required';
    }

    // Company name validation (for admin role)
    if (formData.role === 'admin' && !validateRequired(formData.companyName)) {
      newErrors.companyName = 'Company name is required for admin users';
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
      // Get country currency
      const currency = getCountryCurrency(countries, formData.country);
      const selectedCountry = countries.find(c => c.code === formData.country);

      // Create company object
      const companyData = {
        name: formData.companyName,
        country: {
          code: formData.country,
          name: selectedCountry?.name
        },
        currency: currency
      };

      // Create user data
      const userData = {
        name: formData.name,
        email: formData.email,
        password: formData.password,
        role: formData.role,
        company: companyData
      };

      console.log('Signup form submitted:', userData);
      
      // Mock successful signup
      const mockUser = {
        id: Date.now(),
        name: formData.name,
        email: formData.email,
        role: formData.role,
        company: companyData
      };

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));

      // On successful signup, login the user
      onLogin(mockUser);
      navigate('/dashboard');

    } catch (error) {
      setErrors({ submit: 'Signup failed. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const countryOptions = countries.map(country => ({
    value: country.code,
    label: country.name
  }));

  if (countriesLoading) {
    return (
      <div className="container mt-2">
        <div className="card" style={{ maxWidth: '500px', margin: '0 auto' }}>
          <div className="text-center p-2">
            <LoadingSpinner size="large" />
            <p className="mt-1">Loading countries...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="login-container">
        <div className="login-card">
          <div className="login-header">
            <h1 className="login-title">Create Account</h1>
            <p className="login-subtitle">Join us to start managing your expenses efficiently</p>
          </div>
        
          {errors.countries && (
            <div className="alert alert-danger">
              <span className="notification-icon">⚠️</span>
              <div className="notification-content">{errors.countries}</div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="login-form">
          <FormInput
            label="Full Name"
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            error={errors.name}
            required
            disabled={loading}
            placeholder="Enter your full name"
          />

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
            placeholder="Create a strong password"
          />

          <PasswordStrength 
            password={formData.password}
            strength={passwordStrength.strength}
            message={passwordStrength.message}
          />

          <FormInput
            label="Confirm Password"
            type="password"
            name="confirmPassword"
            value={formData.confirmPassword}
            onChange={handleChange}
            error={errors.confirmPassword}
            required
            disabled={loading}
            placeholder="Confirm your password"
          />

          <FormSelect
            label="Country"
            name="country"
            value={formData.country}
            onChange={handleChange}
            error={errors.country}
            options={countryOptions}
            required
            disabled={loading}
          />

          <FormInput
            label="Company Name"
            type="text"
            name="companyName"
            value={formData.companyName}
            onChange={handleChange}
            error={errors.companyName}
            required
            disabled={loading}
            placeholder="Enter your company name"
          />

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
                Creating Account...
              </>
            ) : (
              <>
                <span>🚀</span>
                Create Account
              </>
            )}
          </button>
        </form>

        <div className="text-center mt-4">
          <span className="text-muted">Already have an account? </span>
          <Link to="/login" className="link-button">Login here</Link>
        </div>
        </div>
      </div>
    </div>
  );
};

export default Signup;