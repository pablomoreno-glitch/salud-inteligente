import { createContext, useContext } from "react";
import type { AdvisorRecommendation } from "../types";

// Context object and hook live apart from the provider component so Vite fast
// refresh keeps working (a module that exports components should export only components).

export interface AdvisorDisplayMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  recommendations?: AdvisorRecommendation[];
}

export interface AdvisorContextValue {
  isOpen: boolean;
  messages: AdvisorDisplayMessage[];
  isSending: boolean;
  error: string | null;
  open: () => void;
  close: () => void;
  sendMessage: (text: string) => Promise<void>;
  retryLast: () => void;
  clear: () => void;
}

export const AdvisorContext = createContext<AdvisorContextValue | null>(null);

export function useAdvisor(): AdvisorContextValue {
  const ctx = useContext(AdvisorContext);
  if (!ctx) {
    throw new Error("useAdvisor must be used within AdvisorProvider");
  }
  return ctx;
}
