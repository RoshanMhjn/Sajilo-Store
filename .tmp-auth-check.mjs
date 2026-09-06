import { spawn } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";

const port = 5009;
const cwd = "C:/Users/rm982/OneDrive/Desktop/Smart-Store-Manager";
const env = {
  ...process.env,
  DATABASE_URL:
    "postgresql://appuser:password@localhost:5432/smart_store_manager",
  PORT: String(port),
  LOG_LEVEL: "debug",
};

const child = spawn(process.execPath, ["artifacts/api-server/dist/index.mjs"], {
  cwd,
  env,
  stdio: ["ignore", "pipe", "pipe"],
});

let log = "";
child.stdout.on("data", (chunk) => {
  const text = chunk.toString();
  log += text;
  process.stdout.write(text);
});
child.stderr.on("data", (chunk) => {
  const text = chunk.toString();
  log += text;
  process.stderr.write(text);
});

async function waitForServer() {
  for (let i = 0; i < 60; i += 1) {
    try {
      const res = await fetch(`http://localhost:${port}/api/healthz`);
      if (res.ok) return;
    } catch {}
    await delay(250);
  }
  throw new Error("Server did not start in time");
}

async function main() {
  try {
    await waitForServer();
    const res = await fetch(`http://localhost:${port}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "demo@store.com", password: "password" }),
    });
    const text = await res.text();
    console.log("\n---LOGIN STATUS---");
    console.log(res.status);
    console.log("\n---LOGIN BODY---");
    console.log(text);
    console.log("\n---SERVER LOG---");
    console.log(log);
  } finally {
    child.kill("SIGTERM");
    setTimeout(() => child.kill("SIGKILL"), 1000);
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
  child.kill("SIGTERM");
});
