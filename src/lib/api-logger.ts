type LogLevel = "info" | "warn" | "error";

interface LogPayload {
  route: string;
  message: string;
  level?: LogLevel;
  userId?: string;
  envelopeId?: string;
  documentId?: string;
  error?: string;
  meta?: Record<string, unknown>;
}

/** Structured JSON logs for API routes (Cloud Logging friendly). */
export function logApi(payload: LogPayload): void {
  const entry = {
    ts: new Date().toISOString(),
    service: "signtoseal-api",
    level: payload.level ?? "info",
    route: payload.route,
    message: payload.message,
    userId: payload.userId,
    envelopeId: payload.envelopeId,
    documentId: payload.documentId,
    error: payload.error,
    ...payload.meta,
  };
  const line = JSON.stringify(entry);
  if (payload.level === "error") console.error(line);
  else if (payload.level === "warn") console.warn(line);
  else console.log(line);
}
