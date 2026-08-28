"use client";

import { useMemo, useState } from "react";

type CurrencyInputProps = {
  name?: string;
  value?: string;
  defaultValue?: string | null;
  onValueChange?: (value: string) => void;
  required?: boolean;
  readOnly?: boolean;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  min?: string;
  max?: string;
};

function normalizeCurrencyValue(value: string | null | undefined, emptyValue = "0") {
  const rawValue = String(value ?? "").trim();
  const integerValue = /^\d+[.,]\d{1,2}$/.test(rawValue)
    ? rawValue.split(/[.,]/)[0]
    : rawValue;
  const digits = integerValue.replace(/\D/g, "");
  if (!digits) return emptyValue;
  const normalized = digits.replace(/^0+(?=\d)/, "");
  return normalized || emptyValue;
}

export function formatRupiahInput(value: string | null | undefined) {
  const normalized = normalizeCurrencyValue(value);
  const grouped = normalized.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `Rp ${grouped}`;
}

export function CurrencyInput({
  name,
  value,
  defaultValue,
  onValueChange,
  required,
  readOnly,
  disabled,
  placeholder = "Rp 0",
  className,
  min,
  max,
}: CurrencyInputProps) {
  const controlled = value !== undefined;
  const emptyValue = required ? "0" : "";
  const [internalValue, setInternalValue] = useState(() =>
    normalizeCurrencyValue(defaultValue, emptyValue),
  );
  const numericValue = controlled ? normalizeCurrencyValue(value, emptyValue) : internalValue;
  const displayValue = useMemo(
    () => (numericValue ? formatRupiahInput(numericValue) : ""),
    [numericValue],
  );

  function update(nextDisplayValue: string) {
    const nextValue = normalizeCurrencyValue(nextDisplayValue, emptyValue);
    if (!controlled) setInternalValue(nextValue);
    onValueChange?.(nextValue);
  }

  return (
    <>
      {name && (
        <input
          type="hidden"
          name={name}
          value={numericValue}
          required={required}
          min={min}
          max={max}
        />
      )}
      <input
        type="text"
        inputMode="numeric"
        value={displayValue}
        onChange={(event) => update(event.target.value)}
        readOnly={readOnly}
        disabled={disabled}
        placeholder={placeholder}
        className={className}
      />
    </>
  );
}
