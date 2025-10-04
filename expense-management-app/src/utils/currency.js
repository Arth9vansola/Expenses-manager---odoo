// Currency utility functions
export const formatCurrency = (amount, currencyCode = 'USD') => {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: currencyCode === 'JPY' ? 0 : 2,
      maximumFractionDigits: currencyCode === 'JPY' ? 0 : 2
    }).format(amount);
  } catch (error) {
    // Fallback formatting
    const symbols = {
      'USD': '$',
      'EUR': '€',
      'GBP': '£',
      'JPY': '¥',
      'CAD': 'C$',
      'AUD': 'A$',
      'INR': '₹',
      'CNY': '¥',
      'BRL': 'R$',
      'CHF': 'CHF'
    };
    
    const symbol = symbols[currencyCode] || currencyCode;
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    const decimals = currencyCode === 'JPY' ? 0 : 2;
    
    return `${symbol}${numAmount.toFixed(decimals)}`;
  }
};

export default { formatCurrency };