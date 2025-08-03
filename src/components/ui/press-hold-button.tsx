import React, { useEffect, useState, useCallback } from 'react';
import { cn } from '@/lib/utils';

interface PressHoldButtonProps {
  onStart: () => void;
  onEnd: () => void;
  disabled?: boolean;
  className?: string;
  children?: React.ReactNode; // Fallback content
  pressedContent?: React.ReactNode; // Content when pressed
  notPressedContent?: React.ReactNode; // Content when not pressed
  keyboardKey?: string; // Key code for keyboard support (e.g., 'Space')
  enableKeyboard?: boolean;
}

export const PressHoldButton: React.FC<PressHoldButtonProps> = ({
  onStart,
  onEnd,
  disabled = false,
  className,
  children,
  pressedContent,
  notPressedContent,
  keyboardKey = 'Space',
  enableKeyboard = true,
}) => {
  const [isPressed, setIsPressed] = useState<boolean>(false);

  // Mouse and Touch event handlers
  const handleStart = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (disabled) return;
    
    e.preventDefault();
    setIsPressed(true);
    onStart();
  }, [disabled, onStart]);

  const handleEnd = useCallback((e?: React.MouseEvent | React.TouchEvent) => {
    // if (e && 'touches' in e) {
    //   e.preventDefault(); // Prevent mouse events from firing on touch
    // }
    e?.preventDefault();
    
    if (disabled || !isPressed) return;
    
    setIsPressed(false);

    // alert("You released the button");
    onEnd();
  }, [disabled, isPressed, onEnd]);

  // Keyboard support
  useEffect(() => {
    if (!enableKeyboard || disabled) return;

    let isKeyPressed = false;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === keyboardKey && !e.repeat && !isKeyPressed) {
        e.preventDefault();
        isKeyPressed = true;
        setIsPressed(true);
        onStart();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === keyboardKey && isKeyPressed) {
        e.preventDefault();
        isKeyPressed = false;
        setIsPressed(false);
        onEnd();
      }
    };

    // Handle window blur to prevent stuck keys
    const handleBlur = () => {
      if (isKeyPressed) {
        isKeyPressed = false;
        setIsPressed(false);
        onEnd();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleBlur);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
      
      // Clean up if component unmounts while key is pressed
      if (isKeyPressed) {
        setIsPressed(false);
        onEnd();
      }
    };
  }, [enableKeyboard, disabled, keyboardKey, onStart, onEnd]);

  // Handle mouse leave to end press state
  const handleMouseLeave = useCallback(() => {
    if (isPressed) {
      handleEnd();
    }
  }, [isPressed, handleEnd]);

  // Determine content to render
  const renderContent = () => {
    if (isPressed && pressedContent) {
      return pressedContent;
    } else if (!isPressed && notPressedContent) {
      return notPressedContent;
    } else {
      return children;
    }
  };

  return (
    <div
      onMouseDown={handleStart}
      onMouseUp={handleEnd}
      // onMouseLeave={handleMouseLeave}
      onTouchStart={handleStart}
      onTouchEnd={handleEnd}
      role="button"
      aria-pressed={isPressed}
      // onTouchCancel={handleEnd}
      className={cn(
        "press-hold-button transition-colors select-none",
        isPressed && "pressed-state", // Add class for pressed state styling
        className
      )}
      data-pressed={isPressed} // Data attribute for CSS styling
    >
      {renderContent()}
    </div>
  );
}; 