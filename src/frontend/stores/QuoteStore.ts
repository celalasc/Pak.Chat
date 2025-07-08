import { create } from 'zustand';

export interface Quote {
  id: string;
  text: string;
  messageId: string;
  createdAt: Date;
}

interface QuoteStore {
  currentQuote: Quote | null;
  isQuoting: boolean;
  setQuote: (quote: Quote | null) => void;
  clearQuote: () => void;
  setIsQuoting: (isQuoting: boolean) => void;
}

export const useQuoteStore = create<QuoteStore>((set) => ({
  currentQuote: null,
  isQuoting: false,
  
  setQuote: (quote) => set({ currentQuote: quote, isQuoting: !!quote }),
  
  clearQuote: () => set({ currentQuote: null, isQuoting: false }),
  
  setIsQuoting: (isQuoting) => set({ isQuoting }),
})); 