/**
 * Accessible button component with proper ARIA attributes
 */
'use client';

import React, { forwardRef, ButtonHTMLAttributes } from 'react';
import { useFocusVisible } from '@/hooks/useAccessibility';

interface AccessibleButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  ariaLabel?: string;
  ariaPressed?: boolean;
  ariaExpanded?: boolean;
}

export const AccessibleButton = forwardRef<HTMLButtonElement, AccessibleButtonProps>(
  (
    {
      children,
      variant = 'primary',
      size = 'md',
      loading = false,
      icon,
      iconPosition = 'left',
      disabled,
      className = '',
      ariaLabel,
      ariaPressed,
      ariaExpanded,
      onClick,
      ...props
    },
    ref
  ) => {
    const { ref: focusRef, isFocusVisible } = useFocusVisible();

    // Combine refs
    const setRef = (element: HTMLButtonElement | null) => {
      if (typeof ref === 'function') {
        ref(element);
      } else if (ref) {
        ref.current = element;
      }
      if (focusRef.current !== element) {
        (focusRef as React.MutableRefObject<HTMLButtonElement | null>).current = element;
      }
    };

    const baseClasses = 'relative inline-flex items-center justify-center font-medium transition-all duration-200 focus:outline-none disabled:cursor-not-allowed';
    
    const variantClasses = {
      primary: 'bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-600 disabled:text-gray-400',
      secondary: 'bg-gray-700 text-white hover:bg-gray-600 disabled:bg-gray-800 disabled:text-gray-500',
      danger: 'bg-red-600 text-white hover:bg-red-700 disabled:bg-gray-600 disabled:text-gray-400',
      ghost: 'bg-transparent text-gray-300 hover:bg-gray-800 disabled:text-gray-600'
    };

    const sizeClasses = {
      sm: 'px-3 py-1.5 text-sm rounded-md gap-1.5',
      md: 'px-4 py-2 text-base rounded-lg gap-2',
      lg: 'px-6 py-3 text-lg rounded-lg gap-2.5'
    };

    const focusClasses = isFocusVisible
      ? 'ring-2 ring-blue-500 ring-offset-2 ring-offset-gray-900'
      : '';

    const combinedClasses = `${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${focusClasses} ${className}`;

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      if (!loading && onClick) {
        onClick(e);
      }
    };

    return (
      <button
        ref={setRef}
        className={combinedClasses}
        disabled={disabled || loading}
        onClick={handleClick}
        aria-label={ariaLabel}
        aria-pressed={ariaPressed}
        aria-expanded={ariaExpanded}
        aria-busy={loading}
        {...props}
      >
        {loading && (
          <span className="absolute inset-0 flex items-center justify-center">
            <svg
              className="animate-spin h-5 w-5"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            <span className="sr-only">読み込み中...</span>
          </span>
        )}
        
        <span className={`flex items-center gap-2 ${loading ? 'opacity-0' : ''}`}>
          {icon && iconPosition === 'left' && (
            <span aria-hidden="true">{icon}</span>
          )}
          {children}
          {icon && iconPosition === 'right' && (
            <span aria-hidden="true">{icon}</span>
          )}
        </span>
      </button>
    );
  }
);

AccessibleButton.displayName = 'AccessibleButton';