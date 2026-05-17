import * as React from 'react';

import { cn } from '@/lib/cn';

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<'input'>>(
  ({ className, type, onClick, ...props }, ref) => {
    // Para date/time/month/week: clicar em qualquer parte do campo abre o picker nativo.
    // Sem isso, alguns browsers só abrem ao clicar no ícone à direita.
    const handleClick = (e: React.MouseEvent<HTMLInputElement>) => {
      if (type && ['date', 'time', 'datetime-local', 'month', 'week'].includes(type)) {
        (e.currentTarget as HTMLInputElement & { showPicker?: () => void }).showPicker?.();
      }
      onClick?.(e);
    };
    return (
      <input
        type={type}
        onClick={handleClick}
        className={cn(
          'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm',
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Input.displayName = 'Input';

export { Input };
