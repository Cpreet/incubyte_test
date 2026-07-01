export function formatMoney(minorUnits: number, currency = "USD") {
  const major = minorUnits / 100;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(major);
}

export function formatFrequency(frequency: string) {
  switch (frequency) {
    case "monthly":
      return "Monthly";
    case "one_time":
      return "One-time";
    default:
      return "Annual";
  }
}
