import { cn } from '@/lib/cn';

interface Option {
  value: string;
  label: string;
}
interface Props {
  options: Option[];
  value: string;
  onChange: (v: string) => void;
  className?: string;
}

export function FilterPills({ options, value, onChange, className }: Props) {
  return (
    <div className={cn('flex flex-wrap gap-2', className)}>
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={cn(
            'rounded-full border px-3 py-1 text-sm transition-colors',
            value === opt.value
              ? 'border-[var(--color-primary)] bg-[var(--color-primary)] text-white'
              : 'border-[var(--color-border)] bg-[var(--color-bg-card)] text-[var(--color-text-muted)]',
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
