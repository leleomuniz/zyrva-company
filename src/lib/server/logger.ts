import pino from "pino";

export const logger = pino({
  level: process.env.LOG_LEVEL ?? "info",
  base: undefined,
  redact: {
    paths: [
      "req.headers.authorization",
      "req.headers.cookie",
      "accessToken",
      "apiKey",
      "password",
      "payload.messages[*].text.body",
    ],
    censor: "[REDACTED]",
  },
});
