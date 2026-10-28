export type AppMode = "demo" | "production" | "test";

export class ConfigurationError extends Error {
  readonly code = "CONFIGURATION_ERROR";

  constructor(public readonly variable: string) {
    super(`Configuração obrigatória ausente ou inválida: ${variable}.`);
    this.name = "ConfigurationError";
  }
}

export function appMode(): AppMode {
  const value = process.env.APP_MODE ?? (process.env.NODE_ENV === "test" ? "test" : "demo");
  if (value === "demo" || value === "production" || value === "test") return value;
  throw new ConfigurationError("APP_MODE");
}

export function optionalEnv(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value ? value : undefined;
}

export function requiredEnv(name: string, minimumLength = 1): string {
  const value = optionalEnv(name);
  if (!value || value.length < minimumLength) throw new ConfigurationError(name);
  return value;
}

export function integrationAvailability() {
  const production = appMode() === "production";
  return {
    database: Boolean(optionalEnv("DATABASE_URL")),
    redis: Boolean(optionalEnv("REDIS_URL")),
    openai:
      production &&
      Boolean(optionalEnv("OPENAI_API_KEY")) &&
      Boolean(optionalEnv("OPENAI_MODEL_RUNTIME")) &&
      Boolean(optionalEnv("OPENAI_MODEL_BUILDER")),
    meta:
      production &&
      Boolean(optionalEnv("META_APP_SECRET")) &&
      Boolean(optionalEnv("META_WEBHOOK_VERIFY_TOKEN")) &&
      Boolean(optionalEnv("META_ACCESS_TOKEN")) &&
      Boolean(optionalEnv("META_PHONE_NUMBER_ID")) &&
      Boolean(optionalEnv("META_GRAPH_API_VERSION")),
  };
}
