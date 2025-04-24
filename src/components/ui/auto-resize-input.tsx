import React, { useEffect, useRef } from 'react';
import { cn } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";

interface AutoResizeInputProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  maxHeight?: number;
  onSubmit?: () => void;
}

const AutoResizeInput = React.forwardRef<HTMLTextAreaElement, AutoResizeInputProps>(
  ({ className, maxHeight = 150, onSubmit, ...props }, ref) => {
    const textareaRef = useRef<HTMLTextAreaElement | null>(null);

    useEffect(() => {
      const textarea = textareaRef.current;
      if (!textarea) return;

      const adjustHeight = () => {
        textarea.style.height = 'auto';
        const newHeight = Math.min(textarea.scrollHeight, maxHeight);
        textarea.style.height = `${newHeight}px`;
      };

      textarea.addEventListener('input', adjustHeight);
      adjustHeight();

      return () => {
        textarea.removeEventListener('input', adjustHeight);
      };
    }, [maxHeight]);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        onSubmit?.();
      }
    };

    return (
      <Textarea
        ref={(element) => {
          textareaRef.current = element;
          if (typeof ref === 'function') {
            ref(element);
          } else if (ref) {
            ref.current = element;
          }
        }}
        className={cn(
          "min-h-[40px] max-h-[150px] resize-none overflow-y-auto py-3 px-4",
          className
        )}
        rows={1}
        onKeyDown={handleKeyDown}
        {...props}
      />
    );
  }
);

AutoResizeInput.displayName = 'AutoResizeInput';

export { AutoResizeInput };