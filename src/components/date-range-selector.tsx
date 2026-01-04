"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  startOfMonth,
  endOfMonth,
  subMonths,
  startOfYear,
  endOfYear,
  subYears,
} from "date-fns";

export type DateRangeType =
  | "all"
  | "current_month"
  | "last_month"
  | "current_year"
  | "last_year"
  | "custom";

interface DateRangeSelectorProps {
  value: DateRangeType;
  onChange: (value: DateRangeType, range: { from?: Date; to?: Date }) => void;
}

export function DateRangeSelector({ value, onChange }: DateRangeSelectorProps) {
  const handleValueChange = (newValue: DateRangeType) => {
    if (newValue === "custom") return;

    const now = new Date();
    let range: { from?: Date; to?: Date } = {};

    switch (newValue) {
      case "current_month":
        range = {
          from: startOfMonth(now),
          to: endOfMonth(now),
        };
        break;
      case "last_month":
        const lastMonth = subMonths(now, 1);
        range = {
          from: startOfMonth(lastMonth),
          to: endOfMonth(lastMonth),
        };
        break;
      case "current_year":
        range = {
          from: startOfYear(now),
          to: endOfYear(now),
        };
        break;
      case "last_year":
        const lastYear = subYears(now, 1);
        range = {
          from: startOfYear(lastYear),
          to: endOfYear(lastYear),
        };
        break;
      case "all":
        range = { from: undefined, to: undefined };
        break;
    }

    onChange(newValue, range);
  };

  return (
    <Select
      value={value}
      onValueChange={(v) => handleValueChange(v as DateRangeType)}
    >
      <SelectTrigger className="w-45">
        <SelectValue placeholder="Select range" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="current_month">Current Month</SelectItem>
        <SelectItem value="last_month">Last Month</SelectItem>
        <SelectItem value="current_year">Current Year</SelectItem>
        <SelectItem value="last_year">Last Year</SelectItem>
        <SelectItem value="all">All Time</SelectItem>
        {value === "custom" && (
          <SelectItem value="custom">Custom Range</SelectItem>
        )}
      </SelectContent>
    </Select>
  );
}
