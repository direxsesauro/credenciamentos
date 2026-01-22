import React, { useState } from 'react';

interface AlertDialogContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
}

const AlertDialogContext = React.createContext<AlertDialogContextValue | undefined>(undefined);

interface AlertDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}

export const AlertDialog: React.FC<AlertDialogProps> = ({ open, onOpenChange, children }) => {
  return (
    <AlertDialogContext.Provider value={{ open, setOpen: onOpenChange }}>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/50" onClick={() => onOpenChange(false)} />
          {children}
        </div>
      )}
    </AlertDialogContext.Provider>
  );
};

export const AlertDialogContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className = '', children, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={`fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border border-gray-200 bg-white p-6 shadow-lg duration-200 dark:border-gray-800 dark:bg-gray-950 sm:rounded-lg ${className}`}
      {...props}
    >
      {children}
    </div>
  );
});

AlertDialogContent.displayName = 'AlertDialogContent';

export const AlertDialogHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className = '', ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={`flex flex-col space-y-2 text-center sm:text-left ${className}`}
      {...props}
    />
  );
});

AlertDialogHeader.displayName = 'AlertDialogHeader';

export const AlertDialogTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className = '', ...props }, ref) => {
  return (
    <h2
      ref={ref}
      className={`text-lg font-semibold ${className}`}
      {...props}
    />
  );
});

AlertDialogTitle.displayName = 'AlertDialogTitle';

export const AlertDialogDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className = '', ...props }, ref) => {
  return (
    <p
      ref={ref}
      className={`text-sm text-gray-500 dark:text-gray-400 ${className}`}
      {...props}
    />
  );
});

AlertDialogDescription.displayName = 'AlertDialogDescription';

export const AlertDialogFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className = '', ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={`flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 ${className}`}
      {...props}
    />
  );
});

AlertDialogFooter.displayName = 'AlertDialogFooter';

export const AlertDialogCancel = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ className = '', children, ...props }, ref) => {
  return (
    <button
      ref={ref}
      type="button"
      className={`mt-2 inline-flex h-10 items-center justify-center rounded-md border border-gray-200 bg-white px-4 py-2 text-sm font-semibold ring-offset-white transition-colors hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 dark:border-gray-800 dark:bg-gray-950 dark:ring-offset-gray-950 dark:hover:bg-gray-800 sm:mt-0 ${className}`}
      {...props}
    >
      {children}
    </button>
  );
});

AlertDialogCancel.displayName = 'AlertDialogCancel';

export const AlertDialogAction = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ className = '', children, ...props }, ref) => {
  return (
    <button
      ref={ref}
      type="button"
      className={`inline-flex h-10 items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white ring-offset-white transition-colors hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 dark:ring-offset-gray-950 ${className}`}
      {...props}
    >
      {children}
    </button>
  );
});

AlertDialogAction.displayName = 'AlertDialogAction';
