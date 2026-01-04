/**
 * Converts a Date object to ISO string format (YYYY-MM-DD) without timezone conversion.
 * This ensures the date remains the same regardless of timezone.
 *
 * @param date - The date to convert
 * @returns ISO date string in format YYYY-MM-DD
 */
export function toISODateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Parses a date string (YYYY-MM-DD or ISO datetime) and returns a Date object
 * set to midnight local time, avoiding timezone shifts.
 *
 * @param dateStr - The date string to parse
 * @returns Date object at midnight local time
 */
export function parseISODateString(dateStr: string): Date {
  // Extract just the date part if it's a full ISO datetime
  const datePart = dateStr.split("T")[0];
  const [year, month, day] = datePart.split("-").map(Number);

  // Create date at midnight local time
  return new Date(year, month - 1, day);
}

/**
 * Converts a Date to ISO datetime string while preserving the date part.
 * Sets time to noon UTC to avoid date shifts across timezones.
 *
 * @param date - The date to convert
 * @returns ISO datetime string
 */
export function toISODateTimeString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}T12:00:00.000Z`;
}

/**
 * Parses an ISO datetime string from client and returns a Date object
 * that preserves the date part regardless of timezone.
 * Used on the server to parse dates from client.
 *
 * @param dateStr - ISO datetime string
 * @returns Date object at noon UTC for the same date
 */
export function parseISODateTimeString(dateStr: string): Date {
  // Extract date part
  const datePart = dateStr.split("T")[0];
  const [year, month, day] = datePart.split("-").map(Number);

  // Return date at noon UTC to avoid timezone issues
  return new Date(Date.UTC(year, month - 1, day, 12, 0, 0, 0));
}
