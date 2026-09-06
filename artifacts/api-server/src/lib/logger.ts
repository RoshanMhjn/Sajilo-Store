type LogMethod = (...args: unknown[]) => void;

type Logger = {
  levels: { values: typeof levelOrder };
  child: (bindings?: Record<string, unknown>) => Logger;
  fatal: LogMethod;
  error: LogMethod;
  warn: LogMethod;
  info: LogMethod;
  debug: LogMethod;
  trace: LogMethod;
  silent: LogMethod;
  level: string;
  setLevel: (value: string) => void;
};

const defaultLevel = (process.env.LOG_LEVEL ?? "info").toLowerCase();
const levelOrder = {
  trace: 10,
  debug: 20,
  info: 30,
  warn: 40,
  error: 50,
  fatal: 60,
  silent: Number.POSITIVE_INFINITY,
} as const;

function formatArgs(args: unknown[]) {
  return args
    .map((value) => {
      if (typeof value === "string") return value;
      if (value instanceof Error) return `${value.name}: ${value.message}`;
      try {
        return JSON.stringify(value);
      } catch {
        return String(value);
      }
    })
    .join(" ");
}

function buildLogger(context: Record<string, unknown> = {}): Logger {
  const write = (level: keyof typeof levelOrder, ...args: unknown[]) => {
    const message = formatArgs(args);
    const prefix = Object.keys(context).length
      ? `[${level.toUpperCase()} ${JSON.stringify(context)}]`
      : `[${level.toUpperCase()}]`;

    switch (level) {
      case "fatal":
      case "error":
        console.error(prefix, message);
        break;
      case "warn":
        console.warn(prefix, message);
        break;
      case "debug":
      case "trace":
        console.debug(prefix, message);
        break;
      default:
        console.log(prefix, message);
    }
  };

  const logger: Logger = {
    levels: { values: levelOrder },
    child(bindings: Record<string, unknown> = {}) {
      return buildLogger({ ...context, ...bindings });
    },
    fatal: (...args: unknown[]) => write("fatal", ...args),
    error: (...args: unknown[]) => write("error", ...args),
    warn: (...args: unknown[]) => write("warn", ...args),
    info: (...args: unknown[]) => write("info", ...args),
    debug: (...args: unknown[]) => write("debug", ...args),
    trace: (...args: unknown[]) => write("trace", ...args),
    silent: (...args: unknown[]) => undefined,
    level: defaultLevel,
    setLevel: (value: string) => {
      logger.level = value.toLowerCase();
    },
  };

  return logger;
}

export const logger = buildLogger();
