export async function computeTotal(
  prices: readonly number[],
  taxRate: number
) {
  return prices.reduce((a, b) => a + b, 0) * (1 + taxRate);
}
