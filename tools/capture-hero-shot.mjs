import { spawn } from "node:child_process";
import { mkdir, rm, writeFile, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const screenshotDir = path.join(rootDir, "docs", "design", "screenshots");
const chromeBin =
  process.env.CHROME_BIN ??
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const port = Number(process.env.CDP_PORT ?? 9237);
const lock = JSON.parse(await readFile(path.join(rootDir, "content/scene-data/hero-street.camera-lock.json"), "utf8"));
const viewport = lock.viewport;
const label = process.argv[2] ?? "current";
if (!/^[a-z0-9-]+$/i.test(label)) throw new Error("Use a simple capture label.");
const selectedShot = process.argv.find(arg => arg.startsWith("--shot="))?.slice(7);
if (selectedShot && !lock.shots.some(shot => shot.id === selectedShot)) throw new Error("Unknown locked shot.");
const shots = selectedShot ? [selectedShot] : process.argv.includes("--all") ? lock.shots.map(shot => shot.id) : [lock.activeShotId];
const legacy = process.argv.includes("--legacy");
const ikAudit = process.argv.includes("--ik-audit");
const benchmark = process.argv.includes("--benchmark");
const hardware = process.argv.includes("--hardware");
const quality = process.argv.find(arg=>arg.startsWith("--quality="))?.slice(10) ?? "balanced";
if (!["balanced","cinematic","performance","headset"].includes(quality)) throw new Error("Unknown quality tier");

await mkdir(screenshotDir, { recursive: true });

const profileDir = path.join(os.tmpdir(), `egyptvr-hero-shot-${process.pid}`);
await mkdir(profileDir, { recursive: true });

const chrome = spawn(
  chromeBin,
  [
    "--headless=new",
    `--remote-debugging-port=${port}`,
    "--remote-allow-origins=*",
    "--hide-scrollbars",
    "--mute-audio",
    "--no-first-run",
    "--no-default-browser-check",
    "--disable-background-networking",
    "--disable-dev-shm-usage",
    "--ignore-gpu-blocklist",
    "--enable-webgl",
    ...(hardware ? [] : ["--use-angle=swiftshader"]),
    `--user-data-dir=${profileDir}`,
    `--window-size=${viewport.width},${viewport.height}`,
    "about:blank"
  ],
  { stdio: ["ignore", "pipe", "pipe"], windowsHide: true }
);
chrome.stderr.on("data", (data) => {
  if (/DevTools listening|crash server|self-terminating/.test(String(data))) process.stderr.write(data);
});
chrome.on("error", (error) => console.error(error));

try {
  await waitForChrome();

  for (const shot of shots) {
    const output = path.join(screenshotDir, `${shot}-${label}.png`);
    await capture(`http://127.0.0.1:${lock.localDevPort}/?shot=${shot}&chrome=0&qa=1&quality=${quality}${legacy ? "&materials=legacy" : ""}${ikAudit ? "&ikAudit=1" : ""}${benchmark ? "&benchmark=1" : ""}`, output);
    console.log(`Captured ${output}`);
  }
} finally {
  chrome.kill();
  await sleep(400);
  const resolvedProfile = path.resolve(profileDir);
  if (path.dirname(resolvedProfile) === path.resolve(os.tmpdir()) && path.basename(resolvedProfile).startsWith("egyptvr-hero-shot-")) {
    await rm(resolvedProfile, { recursive: true, force: true }).catch(() => undefined);
  }
}

async function capture(url, outputPath) {
  const target = await fetchJson(`http://127.0.0.1:${port}/json/new?${encodeURIComponent(url)}`, {
    method: "PUT"
  });
  const client = await createCdpClient(target.webSocketDebuggerUrl);

  try {
    await client.send("Page.enable");
    await client.send("Runtime.enable");
    await client.send("Emulation.setDeviceMetricsOverride", {
      ...viewport,
      mobile: false
    });
    await client.send("Page.navigate", { url });
    const metrics = await waitForSceneReady(client);
    if (!metrics.heroLoaded) throw new Error("Capture refused: hero GLB chunks did not load.");
    if (metrics.textureErrors?.length) throw new Error(`Capture refused: failed textures ${metrics.textureErrors.join(", ")}`);
    if (!legacy && !metrics.bakeId) throw new Error("Capture refused: authored bake missing. Use --legacy for baseline captures.");

    const screenshot = await client.send("Page.captureScreenshot", {
      format: "png",
      captureBeyondViewport: false,
      fromSurface: true
    });
    await writeFile(outputPath, Buffer.from(screenshot.data, "base64"));
    await writeFile(outputPath.replace(/\.png$/, ".json"), JSON.stringify({ url, viewport, renderer: hardware ? "Chrome default GPU selection; inspect gpu field" : "Chrome SwiftShader; not a hardware performance benchmark", ...metrics }, null, 2) + "\n");
  } finally {
    client.close();
    await fetch(`http://127.0.0.1:${port}/json/close/${target.id}`);
  }
}

async function waitForSceneReady(client) {
  const deadline = Date.now() + (ikAudit || benchmark ? 300_000 : 120_000);

  while (Date.now() < deadline) {
    const result = await client.send("Runtime.evaluate", {
      expression: `window.memphisQA ?? null`,
      returnByValue: true
    });

    if (result.result?.value?.ready) {
      return result.result.value;
    }

    await sleep(250);
  }

  const diagnostic = await client.send("Runtime.evaluate", { expression: `({ready: document.readyState, error: document.querySelector('#errorPanel')?.textContent, html: document.documentElement.dataset.sceneReady, auditFrames: document.documentElement.dataset.ikAuditFrames})`, returnByValue: true });
  console.error(diagnostic.result?.value);
  throw new Error("Timed out waiting for the hero scene readiness signal.");
}

async function waitForChrome() {
  const deadline = Date.now() + 45_000;

  while (Date.now() < deadline) {
    try {
      await fetchJson(`http://127.0.0.1:${port}/json/version`);
      return;
    } catch {
      await sleep(160);
    }
  }

  throw new Error("Timed out waiting for Chrome DevTools.");
}

async function fetchJson(url, init) {
  const response = await fetch(url, init);

  if (!response.ok) {
    throw new Error(`${url} returned ${response.status}`);
  }

  return response.json();
}

async function createCdpClient(webSocketUrl) {
  const ws = new WebSocket(webSocketUrl);
  const pending = new Map();
  const eventWaiters = new Map();
  let nextId = 1;

  await new Promise((resolve, reject) => {
    ws.addEventListener("open", resolve, { once: true });
    ws.addEventListener("error", reject, { once: true });
  });

  ws.addEventListener("message", (event) => {
    const message = JSON.parse(event.data);
    if (message.method === "Runtime.exceptionThrown") console.error(JSON.stringify(message.params));
    if (message.method === "Runtime.consoleAPICalled" && ["error", "warning"].includes(message.params.type)) console.error(message.params.args.map(arg => arg.value ?? arg.description).join(" "));

    if (message.id && pending.has(message.id)) {
      const { resolve, reject, timer } = pending.get(message.id);
      clearTimeout(timer);
      pending.delete(message.id);
      if (message.error) {
        reject(new Error(message.error.message));
      } else {
        resolve(message.result);
      }
      return;
    }

    const waiters = eventWaiters.get(message.method);
    if (waiters?.length) {
      waiters.splice(0).forEach((resolve) => resolve(message.params));
    }
  });

  return {
    send(method, params = {}) {
      const id = nextId;
      nextId += 1;
      ws.send(JSON.stringify({ id, method, params }));
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
          pending.delete(id);
          reject(new Error(`Browser did not respond to ${method} within 45 seconds.`));
        }, 45_000);
        pending.set(id, { resolve, reject, timer });
      });
    },
    waitForEvent(method, timeoutMs) {
      return new Promise((resolve, reject) => {
        const waiters = eventWaiters.get(method) ?? [];
        waiters.push(resolve);
        eventWaiters.set(method, waiters);
        setTimeout(() => reject(new Error(`Timed out waiting for ${method}`)), timeoutMs);
      });
    },
    close() {
      ws.close();
    }
  };
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
