import { Search } from 'lucide-react';
import { useEffect, useRef } from 'react';

interface Props {
  placeholder?: string;
  value: string;
  onChange: (v: string) => void;
  className?: string;
}

export function SearchInput({ placeholder = 'Buscar...', value, onChange, className }: Props) {
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (ref.current && ref.current.value !== value) ref.current.value = value;
  }, [value]);

  return (
    <div className={`relative ${className ?? ''}`}>
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--color-text-muted)]" />
      <input
        ref={ref}
        type="text"
        autoComplete="off"
        defaultValue={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-bg-card)] py-2 pl-9 pr-3 text-sm outline-none focus:border-[var(--color-primary)]"
      />
    </div>
  );
}
