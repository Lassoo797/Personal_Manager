export const formatCurrency = (amount: number, currency = 'EUR') => {
  return new Intl.NumberFormat('sk-SK', {
    style: 'currency',
    currency: currency,
  }).format(amount);
};
