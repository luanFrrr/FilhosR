import { forwardRef, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { maskDecimalBR } from "@/lib/utils";

interface DecimalInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  value?: string;
  onChange?: (value: string) => void;
}

export const DecimalInput = forwardRef<HTMLInputElement, DecimalInputProps>(
  ({ value, onChange, className, ...props }, ref) => {
    const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
      const masked = maskDecimalBR(e.target.value);
      onChange?.(masked);
    }, [onChange]);

    return (
      <Input
        ref={ref}
        type="text"
        inputMode="decimal"
        value={value}
        onChange={handleChange}
        className={className}
        {...props}
      />
    );
  }
);

DecimalInput.displayName = "DecimalInput";
