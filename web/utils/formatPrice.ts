/**
 * Formats a number as a price string with exactly 2 decimal places.
 * Strictly rounds to 2 decimal places as per user requirements.
 */
export const formatPrice = (price: number | string | undefined | null): string => {
  if (price === undefined || price === null) return '0.00';
  const num = typeof price === 'string' ? parseFloat(price) : price;
  if (isNaN(num)) return '0.00';
  return num.toFixed(2);
};
