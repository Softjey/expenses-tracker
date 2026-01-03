import { getExchangeRate, convertCurrency } from "../src/lib/exchange-rates";
import { z } from "zod";

async function main() {
  console.log("Testing exchange rates...");
  const schema = z.string();
  console.log("Zod schema created");
  try {
    const rate = await getExchangeRate("EUR", new Date());
    console.log("EUR rate:", rate);

    const converted = await convertCurrency(100, "EUR", "PLN", new Date());
    console.log("100 EUR in PLN:", converted);
  } catch (e) {
    console.error("Error:", e);
  }
}

main();
