import React, { useState, useRef, useEffect } from 'react';

interface DropdownMenuContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
}

const DropdownMenuContext = React.createContext<DropdownMenuContextValue | undefined>(undefined);

interface DropdownMenuProps {
  children: React.ReactNode;
}

export const DropdownMenu: React.FC<DropdownMenuProps> = ({ children }) => {
  const [open, setOpen] = useState(false);

  return (
    <DropdownMenuContext.Provider value={{ open, setOpen }}>
      <div className="relative inline-block text-left">
        {children}
      </div>
    </DropdownMenuContext.Provider>
  );
};

interface DropdownMenuTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean;
  children: React.ReactNode;
}

export const DropdownMenuTrigger = React.forwardRef<HTMLButtonElement, DropdownMenuTriggerProps>(
  ({ children, ...props }, ref) => {
    const context = React.useContext(DropdownMenuContext);
    
    return (
      <button
        ref={ref}
        onClick={() => context?.setOpen(!context.open)}
        {...props}
      >
        {children}
      </button>
    );
  }
);

DropdownMenuTrigger.displayName = 'DropdownMenuTrigger';

interface DropdownMenuContentProps extends React.HTMLAttributes<HTMLDivElement> {
  align?: 'start' | 'end' | 'center';
  children: React.ReactNode;
}

export const DropdownMenuContent = React.forwardRef<HTMLDivElement, DropdownMenuContentProps>(
  ({ className = '', align = 'start', children, ...props }, ref) => {
    const context = React.useContext(DropdownMenuContext);
    const contentRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (contentRef.current && !contentRef.current.contains(event.target as Node)) {
          context?.setOpen(false);
        }
      };

      if (context?.open) {
        document.addEventListener('mousedown', handleClickOutside);
      }

      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }, [context?.open]);

    if (!context?.open) return null;

    const alignClasses = {
      start: 'left-0',
      end: 'right-0',
      center: 'left-1/2 -translate-x-1/2'
    };

    return (
      <div
        ref={contentRef}
        className={`absolute z-50 min-w-[8rem] overflow-hidden rounded-md border border-gray-200 bg-white p-1 text-gray-950 shadow-md dark:border-gray-800 dark:bg-gray-950 dark:text-gray-50 ${alignClasses[align]} ${className}`}
        {...props}
      >
        {children}
      </div>
    );
  }
);

DropdownMenuContent.displayName = 'DropdownMenuContent';

interface DropdownMenuItemProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export const DropdownMenuItem = React.forwardRef<HTMLDivElement, DropdownMenuItemProps>(
  ({ className = '', children, ...props }, ref) => {
    const context = React.useContext(DropdownMenuContext);

    return (
      <div
        ref={ref}
        onClick={() => context?.setOpen(false)}
        className={`relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-gray-100 focus:bg-gray-100 dark:hover:bg-gray-800 dark:focus:bg-gray-800 ${className}`}
        {...props}
      >
        {children}
      </div>
    );
  }
);

DropdownMenuItem.displayName = 'DropdownMenuItem';
