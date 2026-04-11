import React from 'react';
import { AlertCircle, AlertTriangle, Info, CheckCircle, X, RefreshCw } from 'lucide-react';

/**
 * ErrorMessage - Component hien thi thong bao loi hoac thong tin
 * @param {string} message - Noi dung thong bao
 * @param {string} type - Loai thong bao: 'error', 'warning', 'info', 'success'
 * @param {string} title - Tieu de thong bao (optional)
 * @param {function} onClose - Ham dong thong bao (optional)
 * @param {function} onRetry - Ham thu lai (optional)
 * @param {string} className - CSS class bo sung
 */
const ErrorMessage = ({ 
  message, 
  type = 'error', 
  title = '',
  onClose = null,
  onRetry = null,
  className = ''
}) => {
  // Config cho tung loai thong bao
  const typeConfig = {
    error: {
      bg: 'bg-red-50 dark:bg-red-900/30',
      border: 'border-red-500',
      text: 'text-red-700 dark:text-red-300',
      icon: <AlertCircle className="h-5 w-5 text-red-500" />,
      defaultTitle: 'Co loi xay ra'
    },
    warning: {
      bg: 'bg-yellow-50 dark:bg-yellow-900/30',
      border: 'border-yellow-500',
      text: 'text-yellow-700 dark:text-yellow-300',
      icon: <AlertTriangle className="h-5 w-5 text-yellow-500" />,
      defaultTitle: 'Canh bao'
    },
    info: {
      bg: 'bg-blue-50 dark:bg-blue-900/30',
      border: 'border-blue-500',
      text: 'text-blue-700 dark:text-blue-300',
      icon: <Info className="h-5 w-5 text-blue-500" />,
      defaultTitle: 'Thong tin'
    },
    success: {
      bg: 'bg-green-50 dark:bg-green-900/30',
      border: 'border-green-500',
      text: 'text-green-700 dark:text-green-300',
      icon: <CheckCircle className="h-5 w-5 text-green-500" />,
      defaultTitle: 'Thanh cong'
    }
  };

  const config = typeConfig[type] || typeConfig.error;
  const displayTitle = title || config.defaultTitle;

  return (
    <div 
      className={`
        ${config.bg} 
        border-l-4 ${config.border} 
        ${config.text} 
        p-4 mb-4 rounded-r-lg shadow-sm
        ${className}
      `}
      role="alert"
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className="flex-shrink-0 pt-0.5">
          {config.icon}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {displayTitle && (
            <h4 className="font-semibold mb-1">{displayTitle}</h4>
          )}
          <p className="text-sm">{message}</p>

          {/* Retry button */}
          {onRetry && (
            <button
              onClick={onRetry}
              className={`
                mt-3 inline-flex items-center gap-1 px-3 py-1.5 
                text-sm font-medium rounded-md
                ${type === 'error' ? 'bg-red-100 hover:bg-red-200 text-red-700' : ''}
                ${type === 'warning' ? 'bg-yellow-100 hover:bg-yellow-200 text-yellow-700' : ''}
                ${type === 'info' ? 'bg-blue-100 hover:bg-blue-200 text-blue-700' : ''}
                ${type === 'success' ? 'bg-green-100 hover:bg-green-200 text-green-700' : ''}
                transition-colors duration-200
              `}
            >
              <RefreshCw className="h-4 w-4" />
              Thu lai
            </button>
          )}
        </div>

        {/* Close button */}
        {onClose && (
          <button
            onClick={onClose}
            className="flex-shrink-0 p-1 rounded-full hover:bg-white/50 dark:hover:bg-gray-800/50 transition-colors"
            aria-label="Dong thong bao"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
};

/**
 * EmptyState - Component hien thi khi khong co du lieu
 */
export const EmptyState = ({ 
  icon = null,
  title = 'Khong co du lieu',
  message = 'Khong tim thay noi dung nao phu hop.',
  action = null,
  actionText = 'Tao moi'
}) => {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      {icon && (
        <div className="mb-4 text-gray-300 dark:text-gray-600">
          {icon}
        </div>
      )}
      <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">
        {title}
      </h3>
      <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-md">
        {message}
      </p>
      {action && (
        <button
          onClick={action}
          className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-medium transition-colors shadow-md"
        >
          {actionText}
        </button>
      )}
    </div>
  );
};

/**
 * PageError - Component hien thi loi trang lon
 */
export const PageError = ({ 
  title = 'Co loi xay ra',
  message = 'Khong the tai trang nay. Vui long thu lai sau.',
  onRetry = null
}) => {
  return (
    <div className="min-h-64 flex flex-col items-center justify-center py-12 px-4">
      <div className="w-16 h-16 mb-4 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
        <AlertCircle className="h-8 w-8 text-red-500" />
      </div>
      <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200 mb-2">
        {title}
      </h2>
      <p className="text-gray-600 dark:text-gray-400 text-center mb-6 max-w-md">
        {message}
      </p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="inline-flex items-center gap-2 px-6 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-medium transition-colors shadow-md"
        >
          <RefreshCw className="h-4 w-4" />
          Thu lai
        </button>
      )}
    </div>
  );
};

export default ErrorMessage;
