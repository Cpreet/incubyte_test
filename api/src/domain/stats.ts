export function mean(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function median(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }

  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);

  if (sorted.length % 2 === 0) {
    return (sorted[middle - 1]! + sorted[middle]!) / 2;
  }

  return sorted[middle]!;
}

export function percentile(values: number[], p: number): number {
  if (values.length === 0) {
    return 0;
  }

  if (values.length === 1) {
    return values[0]!;
  }

  const sorted = [...values].sort((a, b) => a - b);
  const index = p * (sorted.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);

  if (lower === upper) {
    return sorted[lower]!;
  }

  const weight = index - lower;
  return sorted[lower]! * (1 - weight) + sorted[upper]! * weight;
}

export function distribution(values: number[]) {
  if (values.length === 0) {
    return { min: 0, p25: 0, median: 0, p75: 0, max: 0 };
  }

  const sorted = [...values].sort((a, b) => a - b);
  return {
    min: sorted[0]!,
    p25: percentile(sorted, 0.25),
    median: median(sorted),
    p75: percentile(sorted, 0.75),
    max: sorted[sorted.length - 1]!,
  };
}
