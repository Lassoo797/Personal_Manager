export const formatCurrency = (amount: number, currency = 'EUR') => {
  return new Intl.NumberFormat('sk-SK', {
    style: 'currency',
    currency: currency,
  }).format(amount);
};

export const roundToTwoDecimals = (num: number): number => {
  return Math.round((num + Number.EPSILON) * 100) / 100;
};
