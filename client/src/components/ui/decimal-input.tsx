import { forwardRef, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { maskDecimalBR } from "@/lib/utils";

interface DecimalInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  value?: string;
  onChange?: (value: string) => void;
  decimalPlaces?: number;
}

export const DecimalInput = forwardRef<HTMLInputElement, DecimalInputProps>(
  ({ value, onChange, className, decimalPlaces = 2, ...props }, ref) => {
    const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
      const masked = maskDecimalBR(e.target.value, decimalPlaces);
      onChange?.(masked);
    }, [onChange, decimalPlaces]);

    return (
      <Input
        ref={ref}
        type="text"
        inputMode="numeric"
        value={value}
        onChange={handleChange}
        className={className}
        {...props}
      />
    );
  }
);

DecimalInput.displayName = "DecimalInput";
