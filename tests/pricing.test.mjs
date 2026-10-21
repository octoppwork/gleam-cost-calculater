import assert from "node:assert/strict";
import test from "node:test";
import { calculateQuote, convertQuoteToCny } from "../lib/pricing.ts";

const defaults = { totalCost: 1000, targetMargin: 50, riskRate: 15, taxRate: 6, afterTaxQuote: null };
const closeTo = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-8, `${actual} != ${expected}`);

test("target margin adds risk before tax", () => {
  const quote = calculateQuote(defaults);
  closeTo(quote.baseQuote, 2000);
  closeTo(quote.afterTax, 2438);
  closeTo(quote.margin, 50);
});

test("manual CNY quote remains exact and reverses tax and risk", () => {
  const quote = calculateQuote({ ...defaults, afterTaxQuote: 3657.25 });
  assert.equal(quote.afterTax, 3657.25);
  closeTo(quote.baseQuote, 3657.25 / 1.06 / 1.15);
  closeTo(quote.margin, (1 - 1000 / quote.baseQuote) * 100);
  closeTo(quote.baseQuote + quote.risk + quote.tax, quote.afterTax);
});

test("foreign quote converts to CNY before reversing margin", () => {
  const quote = calculateQuote({ ...defaults, afterTaxQuote: convertQuoteToCny(365.7, 0.15) });
  closeTo(quote.afterTax, 2438);
  closeTo(quote.margin, 50);
  closeTo(quote.afterTax * 0.15, 365.7);
});

test("manual quotes are not clamped to the slider's margin range", () => {
  closeTo(calculateQuote({ ...defaults, afterTaxQuote: 609.5 }).margin, -100);
  closeTo(calculateQuote({ ...defaults, afterTaxQuote: 24380 }).margin, 95);
});

test("zero quote has no calculable margin, zero cost does not reset a manual quote", () => {
  const zero = calculateQuote({ ...defaults, afterTaxQuote: 0 });
  assert.equal(zero.afterTax, 0);
  assert.equal(zero.margin, null);
  assert.equal(zero.riskAdjustedMargin, null);
  assert.equal(zero.profit, -1000);
  const noCost = calculateQuote({ ...defaults, totalCost: 0, afterTaxQuote: 100 });
  assert.equal(noCost.afterTax, 100);
  assert.equal(noCost.margin, 100);
});

test("changing costs preserves manual price and updates margin", () => {
  const quote = calculateQuote({ ...defaults, totalCost: 1500, afterTaxQuote: 2438 });
  closeTo(quote.afterTax, 2438);
  closeTo(quote.margin, 25);
});

test("foreign reversal requires a valid positive exchange rate", () => {
  for (const rate of [0, -1, NaN, Infinity]) assert.equal(convertQuoteToCny(100, rate), null);
  for (const amount of [-1, NaN, Infinity]) assert.equal(convertQuoteToCny(amount, 0.15), null);
  assert.equal(convertQuoteToCny(0, 0.15), 0);
});
