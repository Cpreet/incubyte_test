import { describe, expect, test } from "bun:test";
import { classifyBand } from "./bands";
import { annualize, convertToUsd } from "./money";
import { distribution, mean, median, percentile } from "./stats";

describe("money", () => {
  test("annualizes monthly components", () => {
    expect(annualize(100_000, "monthly")).toBe(1_200_000);
    expect(annualize(120_000, "annual")).toBe(120_000);
  });

  test("convertToUsd applies rates and identity", () => {
    const rates = { EUR: 1.1, USD: 1 };
    expect(convertToUsd(1000, "USD", rates)).toBe(1000);
    expect(convertToUsd(1000, "EUR", rates)).toBe(1100);
  });

  test("convertToUsd raises on missing rate", () => {
    expect(() => convertToUsd(1000, "JPY", { USD: 1 })).toThrow(/Missing FX rate/);
  });
});

describe("stats", () => {
  test("mean and median on even and odd sets", () => {
    expect(mean([100, 200, 300, 400])).toBe(250);
    expect(median([100, 200, 300, 400])).toBe(250);
    expect(median([100, 200, 300])).toBe(200);
  });

  test("percentiles on fixture", () => {
    const values = [100, 200, 300, 400, 500];
    expect(percentile(values, 0.25)).toBe(200);
    expect(percentile(values, 0.5)).toBe(300);
    expect(percentile(values, 0.75)).toBe(400);
    expect(distribution(values)).toEqual({ min: 100, p25: 200, median: 300, p75: 400, max: 500 });
  });
});

describe("bands", () => {
  test("classifies inclusive boundaries", () => {
    expect(classifyBand(90, 100, 200)).toBe("below");
    expect(classifyBand(100, 100, 200)).toBe("within");
    expect(classifyBand(150, 100, 200)).toBe("within");
    expect(classifyBand(200, 100, 200)).toBe("within");
    expect(classifyBand(210, 100, 200)).toBe("above");
  });
});
