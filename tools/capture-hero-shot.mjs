import { spawn } from "node:child_process";
import { copyFile, mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const screenshotDir = path.join(rootDir, "docs", "design", "screenshots");
const chromeBin =
  process.env.CHROME_BIN ??
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const port = Number(process.env.CDP_PORT ?? 9237);
const viewport = { width: 1280, height: 720, deviceScaleFactor: 1 };
const paintoverVersion = process.argv[2] ?? "v5";

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
    "--use-angle=swiftshader",
    `--user-data-dir=${profileDir}`,
    `--window-size=${viewport.width},${viewport.height}`,
    "about:blank"
  ],
  { stdio: ["ignore", "pipe", "pipe"], windowsHide: true }
);

try {
  await waitForChrome();

  const canonicalOutput = path.join(screenshotDir, `hero-street-main-current-${paintoverVersion}.png`);
  const paintoverOutput = path.join(screenshotDir, `hero-street-paintover-${paintoverVersion}.png`);

  await capture(
    `http://127.0.0.1:5573/?shot=hero-street-main&chrome=0`,
    canonicalOutput
  );
  await capture(
    `http://127.0.0.1:5573/?shot=hero-street-main&paintover=${paintoverVersion}&chrome=0`,
    paintoverOutput
  );

  await copyFile(canonicalOutput, path.join(screenshotDir, "hero-street-main-current.png"));
  await copyFile(canonicalOutput, path.join(screenshotDir, `hero-street-main-current-${paintoverVersion}-final.png`));
  await copyFile(paintoverOutput, path.join(screenshotDir, `hero-street-paintover-${paintoverVersion}-final.png`));

  console.log(`Captured ${canonicalOutput}`);
  console.log(`Captured ${paintoverOutput}`);
} finally {
  chrome.kill();
  await sleep(400);
  await rm(profileDir, { recursive: true, force: true }).catch(() => undefined);
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
    await client.waitForEvent("Page.loadEventFired", 20_000);
    await waitForSceneReady(client);

    const screenshot = await client.send("Page.captureScreenshot", {
      format: "png",
      captureBeyondViewport: false,
      fromSurface: true
    });
    await writeFile(outputPath, Buffer.from(screenshot.data, "base64"));
  } finally {
    client.close();
    await fetch(`http://127.0.0.1:${port}/json/close/${target.id}`);
  }
}

async function waitForSceneReady(client) {
  const deadline = Date.now() + 18_000;

  while (Date.now() < deadline) {
    const result = await client.send("Runtime.evaluate", {
      expression: `(() => {
        const canvas = document.querySelector("#renderCanvas");
        const hiddenHud = document.body.classList.contains("qa-clean-shot");
        return Boolean(canvas && canvas.clientWidth >= 1200 && hiddenHud && document.readyState === "complete");
      })()`,
      returnByValue: true
    });

    if (result.result?.value === true) {
      await sleep(3500);
      return;
    }

    await sleep(250);
  }

  throw new Error("Timed out waiting for the hero scene canvas.");
}

async function waitForChrome() {
  const deadline = Date.now() + 12_000;

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

    if (message.id && pending.has(message.id)) {
      const { resolve, reject } = pending.get(message.id);
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
        pending.set(id, { resolve, reject });
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
