"use client";

import * as React from "react";
import { DateRange } from "react-day-picker";
import { cn } from "@/lib/utils";
import { DateInput } from "@/components/ui/date-input";

export function DatePickerWithRange({
  className,
  date,
  setDate,
}: {
  className?: string;
  date: DateRange | undefined;
  setDate: (date: DateRange | undefined) => void;
}) {
  return (
    <div className={cn("grid grid-cols-2 gap-2", className)}>
      <div>
        <label className="text-sm font-medium mb-1 block">From</label>
        <DateInput
          value={date?.from}
          onChange={(newDate) => {
            setDate({
              from: newDate,
              to: date?.to,
            });
          }}
          max={date?.to}
          placeholder="DD/MM/YYYY"
        />
      </div>
      <div>
        <label className="text-sm font-medium mb-1 block">To</label>
        <DateInput
          value={date?.to}
          onChange={(newDate) => {
            setDate({
              from: date?.from,
              to: newDate,
            });
          }}
          min={date?.from}
          placeholder="DD/MM/YYYY"
        />
      </div>
    </div>
  );
}
