type QuoteOptions = {
  totalCost: number;
  targetMargin: number;
  riskRate: number;
  taxRate: number;
  afterTaxQuote: number | null;
};

export function calculateQuote({
  totalCost,
  targetMargin,
  riskRate,
  taxRate,
  afterTaxQuote,
}: QuoteOptions) {
  const riskFactor = 1 + riskRate / 100;
  const taxFactor = 1 + taxRate / 100;
  const baseQuote = afterTaxQuote === null
    ? totalCost / (1 - targetMargin / 100)
    : afterTaxQuote / taxFactor / riskFactor;
  const risk = baseQuote * riskRate / 100;
  const beforeTax = baseQuote + risk;
  const tax = beforeTax * taxRate / 100;

  return {
    baseQuote,
    risk,
    beforeTax,
    tax,
    afterTax: afterTaxQuote ?? beforeTax + tax,
    profit: baseQuote - totalCost,
    margin: baseQuote > 0 ? (1 - totalCost / baseQuote) * 100 : null,
    riskAdjustedMargin: beforeTax > 0
      ? (1 - totalCost / beforeTax) * 100
      : null,
  };
}

export function convertQuoteToCny(amount: number, exchangeRate: number) {
  if (!Number.isFinite(amount) || amount < 0 ||
      !Number.isFinite(exchangeRate) || exchangeRate <= 0) return null;
  const converted = amount / exchangeRate;
  return Number.isFinite(converted) ? converted : null;
}
