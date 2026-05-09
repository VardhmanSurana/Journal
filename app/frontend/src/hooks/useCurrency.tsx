import { createContext, useContext, useState } from 'react'
import type { ReactNode } from 'react'

type Currency = 'USD' | 'INR';

interface CurrencyContextType {
  currency: Currency;
  setCurrency: (currency: Currency) => void;
  rate: number;
  format: (value: number) => string;
  convert: (usdValue: number) => number;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

export const CurrencyProvider = ({ children }: { children: ReactNode }) => {
  const [currency, setCurrency] = useState<Currency>('USD');
  const rate = 85;

  const convert = (usdValue: number) => {
    return currency === 'INR' ? usdValue * rate : usdValue;
  };

  const format = (value: number) => {
    const converted = convert(value);
    if (currency === 'INR') {
      return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(converted);
    }
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 4,
    }).format(converted);
  };

  return (
    <CurrencyContext.Provider value={{ currency, setCurrency, rate, format, convert }}>
      {children}
    </CurrencyContext.Provider>
  );
};

export const useCurrency = () => {
  const context = useContext(CurrencyContext);
  if (!context) {
    throw new Error('useCurrency must be used within a CurrencyProvider');
  }
  return context;
};
