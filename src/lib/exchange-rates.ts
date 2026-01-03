import { prisma } from "@/lib/prisma";
import { format, subDays } from "date-fns";

interface NBPResponse {
  table: string;
  currency: string;
  code: string;
  rates: {
    no: string;
    effectiveDate: string;
    mid: number;
  }[];
}

export async function getExchangeRate(
  currency: string,
  date: Date
): Promise<number> {
  if (currency === "PLN") return 1;

  // Normalize date to YYYY-MM-DD for consistency (UTC 00:00)
  const dateStr = format(date, "yyyy-MM-dd");
  // Creating a date object from YYYY-MM-DD string usually results in UTC 00:00
  const dateObj = new Date(dateStr);

  // 1. Check DB
  const cachedRate = await prisma.exchangeRate.findUnique({
    where: {
      date_currency: {
        date: dateObj,
        currency: currency,
      },
    },
  });

  if (cachedRate) {
    return cachedRate.rate;
  }

  // 2. Fetch from NBP
  // We look back up to 7 days to find a rate (handling weekends/holidays)
  let rate: number | null = null;
  let attemptDate = date;
  let attempts = 0;
  const MAX_ATTEMPTS = 7;

  while (rate === null && attempts < MAX_ATTEMPTS) {
    const attemptDateStr = format(attemptDate, "yyyy-MM-dd");
    try {
      const res = await fetch(
        `http://api.nbp.pl/api/exchangerates/rates/a/${currency}/${attemptDateStr}/?format=json`
      );

      if (res.ok) {
        const data: NBPResponse = await res.json();
        rate = data.rates[0].mid;

        // Save to DB for the ORIGINAL requested date
        // This effectively caches "on this day, use this rate"
        // We use upsert to handle race conditions
        await prisma.exchangeRate.upsert({
          where: {
            date_currency: {
              date: dateObj,
              currency: currency,
            },
          },
          update: {
            rate: rate,
          },
          create: {
            date: dateObj,
            currency: currency,
            rate: rate,
          },
        });
      } else {
        // If 404 or other error, try previous day
        attemptDate = subDays(attemptDate, 1);
        attempts++;
      }
    } catch (error) {
      console.error(
        `Failed to fetch rate for ${currency} on ${attemptDateStr}`,
        error
      );
      attemptDate = subDays(attemptDate, 1);
      attempts++;
    }
  }

  if (rate === null) {
    console.warn(
      `Could not find exchange rate for ${currency} around ${dateStr}. Using 1.0`
    );
    return 1.0; // Fallback
  }

  return rate;
}

export async function convertCurrency(
  amount: number,
  fromCurrency: string,
  toCurrency: string,
  date: Date
): Promise<number> {
  if (fromCurrency === toCurrency) return amount;

  // Get rates in parallel
  const [rateFrom, rateTo] = await Promise.all([
    getExchangeRate(fromCurrency, date),
    getExchangeRate(toCurrency, date),
  ]);

  // amount * (rateFrom / rateTo)
  // Example: 100 EUR to USD.
  // EUR->PLN = 4.5
  // USD->PLN = 4.0
  // 100 EUR = 450 PLN
  // 450 PLN = 450 / 4.0 USD = 112.5 USD

  return (amount * rateFrom) / rateTo;
}
