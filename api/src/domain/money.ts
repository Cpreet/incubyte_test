export type Frequency = "annual" | "monthly" | "one_time";

export function annualize(amount: number, frequency: string): number {
  if (frequency === "monthly") {
    return amount * 12;
  }

  return amount;
}

export function annualizeComponent(component: { amount: number; frequency: string }): number {
  return annualize(component.amount, component.frequency);
}

export function convertToUsd(amount: number, currency: string, rates: Record<string, number>): number {
  if (currency === "USD") {
    return amount;
  }

  const rate = rates[currency];
  if (rate === undefined) {
    throw new Error(`Missing FX rate for currency: ${currency}`);
  }

  return Math.round(amount * rate);
}
