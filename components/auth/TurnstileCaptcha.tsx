"use client";

import { useEffect, useRef, useState } from "react";

interface TurnstileApi {
  render: (
    container: HTMLElement,
    options: {
      sitekey: string;
      action: string;
      appearance: "always";
      callback: (token: string) => void;
      "expired-callback": () => void;
      "error-callback": () => void;
    },
  ) => string;
  remove: (widgetId: string) => void;
  reset: (widgetId: string) => void;
}

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

let turnstileScriptPromise: Promise<void> | undefined;

function loadTurnstileScript(): Promise<void> {
  if (window.turnstile) return Promise.resolve();
  if (turnstileScriptPromise) return turnstileScriptPromise;

  turnstileScriptPromise = new Promise((resolve, reject) => {
    let script = document.querySelector<HTMLScriptElement>(
      'script[data-turnstile-script]',
    );
    let appendScript = false;

    if (!script) {
      script = document.createElement("script");
      script.src =
        "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
      script.async = true;
      script.defer = true;
      script.dataset.turnstileScript = "true";
      appendScript = true;
    }

    script.addEventListener("load", () => resolve(), { once: true });
    script.addEventListener(
      "error",
      () => {
        turnstileScriptPromise = undefined;
        reject(new Error("No se pudo cargar Cloudflare Turnstile"));
      },
      { once: true },
    );
    if (appendScript) document.head.appendChild(script);
  });

  return turnstileScriptPromise;
}

export function TurnstileCaptcha({
  action,
  onVerify,
}: {
  action: "login" | "register";
  onVerify: (token: string | null) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loadError, setLoadError] = useState(false);
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

  useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      onVerify("local-development-bypass");
      return;
    }

    if (!siteKey || !containerRef.current) return;

    let isMounted = true;
    let widgetId: string | undefined;
    const container = containerRef.current;

    loadTurnstileScript()
      .then(() => {
        if (!isMounted) return;
        if (!window.turnstile) {
          throw new Error("Cloudflare Turnstile no está disponible");
        }
        widgetId = window.turnstile.render(container, {
          sitekey: siteKey,
          action,
          appearance: "always",
          callback: onVerify,
          "expired-callback": () => onVerify(null),
          "error-callback": () => onVerify(null),
        });
        setLoadError(false);
      })
      .catch(() => {
        if (isMounted) setLoadError(true);
      });

    return () => {
      isMounted = false;
      if (widgetId && window.turnstile) window.turnstile.remove(widgetId);
    };
  }, [action, onVerify, siteKey]);

  return (
    <div className="flex flex-col items-center gap-2">
      {process.env.NODE_ENV === "development" ? null : siteKey ? (
        <div ref={containerRef} />
      ) : (
        <p className="text-center text-sm text-red-200">
          La verificación de seguridad no está configurada.
        </p>
      )}
      {loadError && (
        <p className="text-center text-sm text-red-200">
          No se pudo cargar la verificación. Recarga la página e inténtalo de nuevo.
        </p>
      )}
    </div>
  );
}
