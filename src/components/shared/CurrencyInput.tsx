// src/components/shared/CurrencyInput.tsx

interface CurrencyInputProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  unit?: string;
  step?: number;
  min?: number;
  max?: number;
  disabled?: boolean;
  className?: string;
}

export default function CurrencyInput({
  label, value, onChange, unit, step = 1, min, max, disabled, className = '',
}: CurrencyInputProps) {
  return (
    <div className={className}>
      <label className="mb-1 block text-sm text-[#6692A8]">{label}</label>
      <div className="relative">
        <input
          type="number"
          value={value || ''}
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
          step={step}
          min={min}
          max={max}
          disabled={disabled}
          className="w-full rounded-lg border border-[#6692A8] bg-[#1A2332] px-3 py-2 pr-16 text-white placeholder-[#6692A8]/50 focus:border-[#2F927B] focus:outline-none disabled:opacity-50"
        />
        {unit && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#6692A8]">
            {unit}
          </span>
        )}
      </div>
    </div>
  );
}
