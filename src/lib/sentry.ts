/** Lightweight Sentry hook — loads @sentry/nextjs only when DSN is configured. */
export async function captureException(error: unknown, context?: Record<string, unknown>): Promise<void> {
  const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN ?? process.env.SENTRY_DSN;
  if (!dsn) {
    console.error("[error]", error, context);
    return;
  }
  try {
    const Sentry = await import("@sentry/nextjs");
    Sentry.captureException(error, { extra: context });
  } catch {
    console.error("[error]", error, context);
  }
}
