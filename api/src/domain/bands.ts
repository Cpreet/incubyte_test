export type BandPlacement = "below" | "within" | "above";

export function classifyBand(amount: number, minAmount: number, maxAmount: number): BandPlacement {
  if (amount < minAmount) {
    return "below";
  }

  if (amount > maxAmount) {
    return "above";
  }

  return "within";
}
