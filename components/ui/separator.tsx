import React from 'react';

export interface SeparatorProps extends React.HTMLAttributes<HTMLDivElement> {
  orientation?: 'horizontal' | 'vertical';
}

export const Separator = React.forwardRef<HTMLDivElement, SeparatorProps>(
  ({ className = '', orientation = 'horizontal', ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={`shrink-0 bg-gray-200 dark:bg-gray-800 ${
          orientation === 'horizontal' ? 'h-[1px] w-full' : 'h-full w-[1px]'
        } ${className}`}
        {...props}
      />
    );
  }
);

Separator.displayName = 'Separator';
