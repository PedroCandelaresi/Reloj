'use client';

import { useEffect, useState } from 'react';
import {
  displayDateToIso,
  displayDateTimeToIso,
  isoToDisplayDate,
  isoToDisplayDateTime,
  maskDateInput,
  maskDateTimeInput,
} from '@/lib/input-masks';

const inputStyle = {
  background: 'var(--input-bg)',
  border: '1px solid var(--input-border)',
  color: 'var(--text-primary)',
};

type BaseProps = {
  name?: string;
  className?: string;
  required?: boolean;
  placeholder?: string;
};

export function MaskedDateInput({
  name,
  defaultValue,
  value,
  onChange,
  className = 'rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500',
  required = false,
  placeholder = 'DD/MM/AAAA',
}: BaseProps & {
  defaultValue?: string;
  value?: string;
  onChange?: (isoValue: string) => void;
}) {
  const [displayValue, setDisplayValue] = useState(isoToDisplayDate(value ?? defaultValue));
  const [isFocused, setIsFocused] = useState(false);
  useEffect(() => {
    if (value !== undefined && !isFocused) setDisplayValue(isoToDisplayDate(value));
  }, [isFocused, value]);
  const hiddenValue = displayDateToIso(displayValue);

  return (
    <>
      {name && <input type="hidden" name={name} value={hiddenValue} />}
      <input
        type="text"
        inputMode="numeric"
        value={displayValue}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        onChange={(event) => {
          const masked = maskDateInput(event.target.value);
          setDisplayValue(masked);
          onChange?.(displayDateToIso(masked));
        }}
        required={required}
        placeholder={placeholder}
        className={className}
        style={inputStyle}
      />
    </>
  );
}

export function MaskedDateTimeInput({
  name,
  value,
  onChange,
  className = 'rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500',
  required = false,
}: BaseProps & {
  value: string;
  onChange: (isoValue: string) => void;
}) {
  const [displayValue, setDisplayValue] = useState(isoToDisplayDateTime(value));
  const [isFocused, setIsFocused] = useState(false);
  useEffect(() => {
    if (!isFocused) setDisplayValue(isoToDisplayDateTime(value));
  }, [isFocused, value]);
  const hiddenValue = displayDateTimeToIso(displayValue);

  return (
    <>
      {name && <input type="hidden" name={name} value={hiddenValue} />}
      <input
        type="text"
        inputMode="numeric"
        value={displayValue}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        onChange={(event) => {
          const masked = maskDateTimeInput(event.target.value);
          setDisplayValue(masked);
          onChange(displayDateTimeToIso(masked));
        }}
        required={required}
        placeholder="DD/MM/AAAA HH:MM"
        className={className}
        style={inputStyle}
      />
    </>
  );
}
