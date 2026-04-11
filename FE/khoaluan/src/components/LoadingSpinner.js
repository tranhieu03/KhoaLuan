import React from 'react';

/**
 * LoadingSpinner - Component hien thi trang thai loading
 * @param {string} size - Kich thuoc spinner: 'sm', 'md', 'lg', 'xl'
 * @param {string} text - Text hien thi ben duoi spinner
 * @param {boolean} fullScreen - Hien thi full screen hay khong
 * @param {string} color - Mau cua spinner: 'orange', 'blue', 'green', 'gray'
 */
const LoadingSpinner = ({ 
  size = 'md', 
  text = '', 
  fullScreen = false,
  color = 'orange'
}) => {
  // Map size to actual dimensions
  const sizeClasses = {
    sm: 'h-6 w-6 border-2',
    md: 'h-10 w-10 border-2',
    lg: 'h-14 w-14 border-3',
    xl: 'h-20 w-20 border-4'
  };

  // Map color to border colors
  const colorClasses = {
    orange: 'border-orange-500',
    blue: 'border-blue-500',
    green: 'border-green-500',
    gray: 'border-gray-500'
  };

  // Text size based on spinner size
  const textSizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
    xl: 'text-xl'
  };

  const spinnerElement = (
    <div className="flex flex-col items-center justify-center gap-3">
      {/* Spinner with custom animation */}
      <div className="relative">
        <div 
          className={`
            animate-spin rounded-full 
            ${sizeClasses[size]} 
            border-t-transparent 
            ${colorClasses[color]}
          `}
        />
        {/* Inner pulse effect for larger sizes */}
        {(size === 'lg' || size === 'xl') && (
          <div 
            className={`
              absolute inset-0 rounded-full 
              ${colorClasses[color]} 
              opacity-20 animate-ping
            `}
          />
        )}
      </div>
      
      {/* Loading text */}
      {text && (
        <p className={`text-gray-600 dark:text-gray-300 ${textSizeClasses[size]} animate-pulse`}>
          {text}
        </p>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm flex items-center justify-center z-50">
        {spinnerElement}
      </div>
    );
  }

  return (
    <div className="flex justify-center items-center py-8">
      {spinnerElement}
    </div>
  );
};

/**
 * LoadingOverlay - Overlay loading tren mot component
 */
export const LoadingOverlay = ({ children, isLoading, text = 'Dang tai...' }) => {
  return (
    <div className="relative">
      {children}
      {isLoading && (
        <div className="absolute inset-0 bg-white/70 dark:bg-gray-900/70 backdrop-blur-sm flex items-center justify-center rounded-lg z-10">
          <LoadingSpinner size="md" text={text} color="orange" />
        </div>
      )}
    </div>
  );
};

/**
 * SkeletonLoader - Placeholder loading giong voi noi dung
 */
export const SkeletonLoader = ({ type = 'card', count = 1 }) => {
  const skeletons = Array.from({ length: count }, (_, i) => i);

  const cardSkeleton = (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 animate-pulse">
      <div className="w-full h-48 bg-gray-200 dark:bg-gray-700 rounded-lg mb-4" />
      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2" />
      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-4" />
      <div className="flex justify-between items-center">
        <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/4" />
        <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
      </div>
    </div>
  );

  const listSkeleton = (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 animate-pulse flex items-center gap-4">
      <div className="w-16 h-16 bg-gray-200 dark:bg-gray-700 rounded-lg flex-shrink-0" />
      <div className="flex-1">
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2" />
        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
      </div>
      <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-20" />
    </div>
  );

  const textSkeleton = (
    <div className="animate-pulse">
      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full mb-2" />
      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-5/6 mb-2" />
      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-4/6" />
    </div>
  );

  const getSkeleton = () => {
    switch (type) {
      case 'card':
        return cardSkeleton;
      case 'list':
        return listSkeleton;
      case 'text':
        return textSkeleton;
      default:
        return cardSkeleton;
    }
  };

  return (
    <div className="space-y-4">
      {skeletons.map((_, index) => (
        <div key={index}>{getSkeleton()}</div>
      ))}
    </div>
  );
};

export default LoadingSpinner;
