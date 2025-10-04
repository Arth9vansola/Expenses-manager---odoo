import React from 'react';
import '../styles/states.css';

/**
 * Reusable Loader Component with multiple variants
 * Supports different sizes, colors, and loading text
 */
const Loader = ({
  size = 'medium',
  color = 'primary',
  text = '',
  overlay = false,
  fullScreen = false,
  className = '',
  ...props
}) => {
  // Build CSS classes
  const loaderClasses = [
    'loader',
    `loader-${size}`,
    `loader-${color}`,
    className
  ].filter(Boolean).join(' ');

  const containerClasses = [
    'loader-container',
    overlay && 'loader-overlay',
    fullScreen && 'loader-fullscreen'
  ].filter(Boolean).join(' ');

  const LoaderContent = () => (
    <div className={loaderClasses} {...props}>
      <div className="loader-spinner">
        <div className="spinner-ring">
          <div></div>
          <div></div>
          <div></div>
          <div></div>
        </div>
      </div>
      {text && <div className="loader-text">{text}</div>}
    </div>
  );

  if (overlay || fullScreen) {
    return (
      <div className={containerClasses}>
        <LoaderContent />
      </div>
    );
  }

  return <LoaderContent />;
};

// Spinner variants
export const Spinner = ({ size = 16, color = '#2196f3', className = '' }) => (
  <div 
    className={`loading-spinner ${className}`}
    style={{
      width: size,
      height: size,
      borderColor: `${color}33`,
      borderTopColor: color
    }}
  />
);

// Skeleton Loader Component
export const SkeletonLoader = ({
  type = 'text',
  width = '100%',
  height = 16,
  count = 1,
  className = ''
}) => {
  const skeletons = Array.from({ length: count }, (_, index) => (
    <div
      key={index}
      className={`loading-skeleton loading-skeleton-${type} ${className}`}
      style={{ width, height: type === 'text' ? height : undefined }}
    />
  ));

  return <div className="skeleton-container">{skeletons}</div>;
};

// Progress Bar Component
export const ProgressBar = ({
  progress = 0,
  color = '#2196f3',
  backgroundColor = '#e0e0e0',
  height = 8,
  showPercentage = false,
  className = ''
}) => (
  <div className={`progress-bar ${className}`}>
    <div 
      className="progress-bar-track"
      style={{ backgroundColor, height }}
    >
      <div
        className="progress-bar-fill"
        style={{
          backgroundColor: color,
          width: `${Math.min(100, Math.max(0, progress))}%`,
          height: '100%',
          transition: 'width 0.3s ease'
        }}
      />
    </div>
    {showPercentage && (
      <span className="progress-percentage">
        {Math.round(progress)}%
      </span>
    )}
  </div>
);

// Loading Dots Component
export const LoadingDots = ({ size = 8, color = '#2196f3', className = '' }) => (
  <div className={`loading-dots ${className}`}>
    {[1, 2, 3].map(dot => (
      <div
        key={dot}
        className="loading-dot"
        style={{
          width: size,
          height: size,
          backgroundColor: color,
          animationDelay: `${(dot - 1) * 0.2}s`
        }}
      />
    ))}
  </div>
);

// Pulse Loader Component
export const PulseLoader = ({ size = 40, color = '#2196f3', className = '' }) => (
  <div className={`pulse-loader ${className}`}>
    <div
      className="pulse-ring"
      style={{
        width: size,
        height: size,
        borderColor: color
      }}
    />
  </div>
);

// Size constants
Loader.sizes = {
  small: 'small',
  medium: 'medium',
  large: 'large',
  xlarge: 'xlarge'
};

// Color constants
Loader.colors = {
  primary: 'primary',
  secondary: 'secondary',
  success: 'success',
  danger: 'danger',
  warning: 'warning',
  info: 'info',
  light: 'light',
  dark: 'dark'
};

export default Loader;