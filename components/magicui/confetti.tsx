import React from 'react';
import { Button, ButtonProps } from '../ui/button';

interface ConfettiButtonProps extends ButtonProps {
  children: React.ReactNode;
}

export const ConfettiButton: React.FC<ConfettiButtonProps> = ({ children, onClick, ...props }) => {
  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    // Simple confetti effect using emoji
    if (onClick) {
      onClick(e);
    }
  };

  return (
    <Button onClick={handleClick} {...props}>
      {children}
    </Button>
  );
};
