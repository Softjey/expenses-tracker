"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface DateInputProps {
  value?: Date;
  onChange?: (date: Date | undefined) => void;
  className?: string;
  placeholder?: string;
  disabled?: boolean;
  min?: Date;
  max?: Date;
}

export function DateInput({
  value,
  onChange,
  className,
  placeholder = "DD/MM/YYYY",
  disabled,
  min,
  max,
}: DateInputProps) {
  const [inputValue, setInputValue] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);

  // Format date to DD/MM/YYYY
  const formatDate = (date: Date): string => {
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  // Parse DD/MM/YYYY to Date
  const parseDate = (dateStr: string): Date | null => {
    const cleaned = dateStr.replace(/\s/g, "");

    // Support multiple separators
    const parts = cleaned.split(/[\/\.\-]/);

    if (parts.length !== 3) return null;

    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10);
    const year = parseInt(parts[2], 10);

    // Validate ranges
    if (
      isNaN(day) ||
      isNaN(month) ||
      isNaN(year) ||
      day < 1 ||
      day > 31 ||
      month < 1 ||
      month > 12 ||
      year < 1900 ||
      year > 2100
    ) {
      return null;
    }

    const date = new Date(year, month - 1, day);

    // Check if date is valid (handles invalid dates like 31/02/2024)
    if (
      date.getDate() !== day ||
      date.getMonth() !== month - 1 ||
      date.getFullYear() !== year
    ) {
      return null;
    }

    return date;
  };

  // Update input when value prop changes
  React.useEffect(() => {
    if (value) {
      setInputValue(formatDate(value));
      setError(null);
    } else {
      setInputValue("");
      setError(null);
    }
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);

    if (!newValue.trim()) {
      setError(null);
      onChange?.(undefined);
      return;
    }

    const parsedDate = parseDate(newValue);

    if (!parsedDate) {
      setError("Invalid date format. Use DD/MM/YYYY");
      return;
    }

    // Check min/max constraints
    if (min && parsedDate < min) {
      setError(`Date must be after ${formatDate(min)}`);
      return;
    }

    if (max && parsedDate > max) {
      setError(`Date must be before ${formatDate(max)}`);
      return;
    }

    setError(null);
    onChange?.(parsedDate);
  };

  const handleBlur = () => {
    // On blur, if there's a valid date, format it nicely
    if (inputValue && !error) {
      const parsedDate = parseDate(inputValue);
      if (parsedDate) {
        setInputValue(formatDate(parsedDate));
      }
    }
  };

  return (
    <div className="space-y-1">
      <Input
        type="text"
        value={inputValue}
        onChange={handleChange}
        onBlur={handleBlur}
        placeholder={placeholder}
        disabled={disabled}
        className={cn(error && "border-red-500", className)}
      />
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
