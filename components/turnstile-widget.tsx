"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Script from "next/script";

type TurnstileOptions = {
  sitekey: string;
  callback?: (token: string) => void;
  "error-callback"?: () => void;
  "expired-callback"?: () => void;
};

type TurnstileInstance = {
  render: (el: HTMLElement, options: TurnstileOptions) => string;
  reset: (widgetId?: string) => void;
  remove?: (widgetId: string) => void;
};

declare global {
  interface Window {
    turnstile?: TurnstileInstance;
  }
}

type TurnstileWidgetProps = {
  siteKey: string;
  onTokenChange: (token: string) => void;
  onResetReady?: (reset: () => void) => void;
};

export default function TurnstileWidget({
  siteKey,
  onTokenChange,
  onResetReady,
}: TurnstileWidgetProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const widgetIdRef = useRef<string | null>(null);
  const [scriptReady, setScriptReady] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined" && window.turnstile) {
      setScriptReady(true);
    }
  }, []);

  const reset = useCallback(() => {
    if (typeof window === "undefined") return;
    if (!window.turnstile || !widgetIdRef.current) return;
    window.turnstile.reset(widgetIdRef.current);
    onTokenChange("");
  }, [onTokenChange]);

  useEffect(() => {
    if (!onResetReady) return;
    onResetReady(reset);
  }, [onResetReady, reset]);

  useEffect(() => {
    if (!scriptReady || !siteKey) return;
    if (!containerRef.current || widgetIdRef.current) return;
    if (typeof window === "undefined" || !window.turnstile) return;
    if (typeof window.turnstile.render !== "function") return;

    try {
      const widgetId = window.turnstile.render(containerRef.current, {
        sitekey: siteKey,
        callback: (token: string) => onTokenChange(token),
        "error-callback": () => onTokenChange(""),
        "expired-callback": () => onTokenChange(""),
      });
      widgetIdRef.current = widgetId;
    } catch (err) {
      // Avoid crashing the page if Turnstile fails to render.
      console.error("Turnstile render failed", err);
      onTokenChange("");
    }

    return () => {
      if (!window.turnstile || !widgetIdRef.current) return;
      if (typeof window.turnstile.remove === "function") {
        window.turnstile.remove(widgetIdRef.current);
      } else {
        window.turnstile.reset(widgetIdRef.current);
      }
      widgetIdRef.current = null;
      onTokenChange("");
    };
  }, [scriptReady, siteKey, onTokenChange]);

  return (
    <>
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
        strategy="afterInteractive"
        onLoad={() => setScriptReady(true)}
      />
      <div ref={containerRef} />
    </>
  );
}
