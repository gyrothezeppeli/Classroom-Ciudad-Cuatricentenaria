interface TurnstileSiteverifyResponse {
  success?: unknown;
  action?: unknown;
}

export class TurnstileConfigurationError extends Error {
  constructor() {
    super("TURNSTILE_SECRET_KEY is not configured");
    this.name = "TurnstileConfigurationError";
  }
}

export async function verifyTurnstileToken(
  token: string,
  expectedAction: "login" | "register",
): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) throw new TurnstileConfigurationError();
  if (!token || token.length > 2048) return false;

  const body = new URLSearchParams({ secret, response: token });
  const response = await fetch(
    "https://challenges.cloudflare.com/turnstile/v0/siteverify",
    {
      method: "POST",
      body,
      signal: AbortSignal.timeout(10_000),
    },
  );

  if (!response.ok) {
    throw new Error(`Turnstile verification failed: ${response.status}`);
  }

  const result = (await response.json()) as TurnstileSiteverifyResponse;
  return result.success === true && result.action === expectedAction;
}
