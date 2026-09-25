import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Send, Sparkles, X } from "lucide-react";
import { useAdvisor } from "../context/advisor";
import { renderAdvisorMarkdown } from "../lib/markdown";
import { formatPrice } from "../lib/format";
import { useSetCartItem } from "../lib/cart";
import { DISCLAIMER_TEXT } from "./Disclaimer";
import { AvailabilityPill } from "./AvailabilityPill";
import type { AdvisorRecommendation } from "../types";

function RecommendationCard({ recommendation }: { recommendation: AdvisorRecommendation }) {
  const setCartItem = useSetCartItem();
  const [added, setAdded] = useState(false);
  const soldOut = recommendation.availability === "out";

  return (
    <div className="flex gap-3 rounded-card border border-line bg-white p-3">
      <img
        src={recommendation.image_url}
        alt={recommendation.name}
        width={64}
        height={64}
        loading="lazy"
        className="h-16 w-16 shrink-0 rounded-control bg-white object-contain"
      />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <p className="line-clamp-2 text-body font-semibold text-ink">
          {recommendation.name}
        </p>
        {recommendation.reason && (
          <p className="line-clamp-2 text-meta text-muted">{recommendation.reason}</p>
        )}
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-body font-medium text-ink">{formatPrice(recommendation.price)}</p>
          {recommendation.availability && <AvailabilityPill status={recommendation.availability} />}
        </div>
        <div className="mt-1 flex items-center gap-3">
          <Link
            to={`/producto/${recommendation.slug}`}
            className="text-meta font-medium text-leaf underline-offset-2 hover:underline"
          >
            Ver producto
          </Link>
          <button
            type="button"
            disabled={soldOut || setCartItem.isPending}
            onClick={() =>
              setCartItem.mutate(
                { ref: recommendation.ref, quantity: 1, source: "advisor" },
                { onSuccess: () => setAdded(true) },
              )
            }
            className={
              added
                ? "rounded-pill border border-forest bg-forest px-3 py-1 text-meta font-medium text-white"
                : "rounded-pill border border-forest px-3 py-1 text-meta font-medium text-forest transition-colors hover:bg-forest hover:text-white disabled:cursor-not-allowed disabled:border-line disabled:text-muted disabled:hover:bg-transparent"
            }
          >
            {soldOut ? "Agotado" : added ? "Agregado al carrito ✓" : "Agregar al carrito"}
          </button>
        </div>
      </div>
    </div>
  );
}

const STARTERS = [
  "Me cuesta dormir",
  "Quiero más energía",
  "Dolor en las articulaciones",
  "Mejorar mi digestión",
  "Piel, cabello y uñas",
];

function TypingIndicator() {
  return (
    <div className="flex w-fit items-center gap-1 rounded-card border border-line bg-white px-4 py-3">
      <span className="h-2 w-2 animate-bounce rounded-full bg-muted [animation-delay:-0.3s]" />
      <span className="h-2 w-2 animate-bounce rounded-full bg-muted [animation-delay:-0.15s]" />
      <span className="h-2 w-2 animate-bounce rounded-full bg-muted" />
    </div>
  );
}

export function AdvisorDrawer() {
  const { isOpen, close, messages, isSending, error, sendMessage, retryLast } =
    useAdvisor();
  const [draft, setDraft] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isSending, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") close();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [isOpen, close]);

  useEffect(() => {
    if (!isOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!draft.trim() || isSending) return;
    void sendMessage(draft);
    setDraft("");
  }

  return (
    <div className="fixed inset-0 z-[2147483647]" role="dialog" aria-modal="true" aria-label="Asesor IA">
      <div
        className="advisor-backdrop absolute inset-0 bg-ink/40 backdrop-blur-[2px]"
        onClick={close}
        aria-hidden="true"
      />
      {/* Centered popup: full screen on phones, most of the screen on larger displays. */}
      <div className="advisor-modal absolute inset-0 m-auto flex h-full w-full flex-col overflow-hidden bg-paper shadow-2xl sm:h-[min(88vh,820px)] sm:w-[min(92vw,960px)] sm:rounded-[20px]">
        <div className="flex items-start justify-between border-b border-line px-5 py-4 sm:px-8">
          <div className="flex items-center gap-3">
            <img
              src="/media/site/logo-mark.webp"
              alt=""
              width={40}
              height={40}
              className="h-10 w-10 object-contain"
            />
            <div>
              <h2 className="flex items-center gap-2 text-h4 font-display font-bold text-forest">
                Asesor IA
                <Sparkles size={18} strokeWidth={1.75} className="text-leaf" />
              </h2>
              <p className="text-meta text-muted">
                Recomendaciones del catálogo, sin diagnósticos
              </p>
            </div>
          </div>
          <button
            type="button"
            aria-label="Cerrar asesor"
            onClick={close}
            className="rounded-control p-2 text-muted hover:bg-sage"
          >
            <X size={20} strokeWidth={1.75} />
          </button>
        </div>

        <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto px-5 py-4 sm:px-8">
          {messages.length === 0 && !isSending && (
            <div className="mx-auto flex max-w-xl flex-col items-center py-8 text-center sm:py-14">
              <img src="/media/site/logo-mark.webp" alt="" width={72} height={58} className="h-[58px] w-auto opacity-90" />
              <p className="mt-4 font-display text-h4 font-bold text-forest">¿Qué te gustaría mejorar?</p>
              <p className="mt-2 text-body text-muted">
                Cuéntame qué sientes o qué necesitas y te recomiendo productos del catálogo.
              </p>
              <div className="mt-6 flex flex-wrap justify-center gap-2">
                {STARTERS.map((starter) => (
                  <button
                    key={starter}
                    type="button"
                    onClick={() => void sendMessage(starter)}
                    className="rounded-pill border border-line bg-white px-4 py-2 text-body text-ink hover:border-forest"
                  >
                    {starter}
                  </button>
                ))}
              </div>
            </div>
          )}
          {messages.map((message) => (
            <div key={message.id} className="space-y-2">
              <div
                className={
                  message.role === "user"
                    ? "ml-auto w-fit max-w-[85%] rounded-card bg-forest px-4 py-2 text-body text-white"
                    : "w-fit max-w-[85%] rounded-card border border-line bg-white px-4 py-2 text-body text-ink"
                }
              >
                {message.role === "assistant"
                  ? renderAdvisorMarkdown(message.content)
                  : message.content}
              </div>
              {message.recommendations && message.recommendations.length > 0 && (
                <div className="grid gap-2 sm:grid-cols-2">
                  {message.recommendations.map((rec) => (
                    <RecommendationCard key={rec.ref} recommendation={rec} />
                  ))}
                </div>
              )}
            </div>
          ))}
          {isSending && <TypingIndicator />}
          {error && (
            <div className="rounded-card border border-danger/30 bg-danger/5 px-4 py-3 text-body text-danger">
              <p>{error}</p>
              <button
                type="button"
                onClick={retryLast}
                className="mt-2 font-medium underline underline-offset-2"
              >
                Reintentar
              </button>
            </div>
          )}
        </div>

        <div className="border-t border-line px-5 py-4 sm:px-8">
          <p className="mb-3 text-meta text-muted">{DISCLAIMER_TEXT}</p>
          <form onSubmit={handleSubmit} className="flex items-center gap-2">
            <label htmlFor="advisor-input" className="sr-only">
              Escribe tu mensaje para el asesor
            </label>
            <input
              id="advisor-input"
              type="text"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Escribe tu mensaje..."
              className="flex-1 rounded-pill border border-line bg-white px-4 py-2 text-body text-ink outline-none focus-visible:border-leaf"
            />
            <button
              type="submit"
              aria-label="Enviar mensaje"
              disabled={isSending || !draft.trim()}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-forest text-white disabled:opacity-50"
            >
              <Send size={18} strokeWidth={1.75} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
