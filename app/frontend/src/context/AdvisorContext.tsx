import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { api, ApiError } from "../lib/api";
import type { AdvisorChatResponse } from "../types";
import { AdvisorContext, type AdvisorContextValue, type AdvisorDisplayMessage } from "./advisor";

const STORAGE_KEY = "si_advisor_conversation";
const MAX_HISTORY = 20;

function loadConversation(): AdvisorDisplayMessage[] {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed as AdvisorDisplayMessage[];
    return [];
  } catch {
    return [];
  }
}

function saveConversation(messages: AdvisorDisplayMessage[]) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
  } catch {
    // ignore storage failures
  }
}

let idCounter = 0;
function nextId(): string {
  idCounter += 1;
  return `msg-${Date.now()}-${idCounter}`;
}

export function AdvisorProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<AdvisorDisplayMessage[]>(() =>
    loadConversation(),
  );
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastFailedText, setLastFailedText] = useState<string | null>(null);

  useEffect(() => {
    saveConversation(messages);
  }, [messages]);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  const clear = useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;
      setIsOpen(true);
      setError(null);
      setLastFailedText(null);

      const userMessage: AdvisorDisplayMessage = {
        id: nextId(),
        role: "user",
        content: trimmed,
      };

      // Compute the next state and the API history from the current
      // `messages` closure value, then commit it with a plain (non-updater)
      // setState call. Side effects (the network call) run afterward, never
      // inside a setState updater - React 18 Strict Mode double-invokes
      // updater functions to catch impurities, which previously caused the
      // advisor to send duplicate requests and render duplicate replies.
      const next = [...messages, userMessage];
      setMessages(next);
      const history = next.slice(-MAX_HISTORY).map((m) => ({
        role: m.role,
        content: m.content,
      }));

      setIsSending(true);
      try {
        const response = await api.post<AdvisorChatResponse>(
          "/v1/advisor/chat",
          { messages: history },
        );
        setMessages((current) => [
          ...current,
          {
            id: nextId(),
            role: "assistant",
            content: response.reply,
            recommendations: response.recommendations,
          },
        ]);
      } catch (err) {
        const message =
          err instanceof ApiError
            ? err.message
            : "No pudimos conectar con el asesor. Intenta de nuevo.";
        setError(message);
        setLastFailedText(trimmed);
      } finally {
        setIsSending(false);
      }
    },
    [messages],
  );

  const retryLast = useCallback(() => {
    if (lastFailedText) {
      void sendMessage(lastFailedText);
    }
  }, [lastFailedText, sendMessage]);

  const value = useMemo<AdvisorContextValue>(
    () => ({
      isOpen,
      messages,
      isSending,
      error,
      open,
      close,
      sendMessage,
      retryLast,
      clear,
    }),
    [isOpen, messages, isSending, error, open, close, sendMessage, retryLast, clear],
  );

  return (
    <AdvisorContext.Provider value={value}>{children}</AdvisorContext.Provider>
  );
}
