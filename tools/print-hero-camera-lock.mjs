import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const cameraLockPath = path.join(rootDir, "content", "scene-data", "hero-street.camera-lock.json");
const cameraLock = JSON.parse(await readFile(cameraLockPath, "utf8"));
const activeShot = cameraLock.shots.find((shot) => shot.id === cameraLock.activeShotId);

if (!activeShot) {
  console.error(`Active camera shot "${cameraLock.activeShotId}" is missing from ${cameraLockPath}.`);
  process.exitCode = 1;
} else {
  console.log("Hero Street Camera Lock");
  console.log(`- Active shot: ${activeShot.id} (${activeShot.label})`);
  console.log(`- Role: ${activeShot.role}`);
  console.log(`- URL: ${cameraLock.canonicalUrl}`);
  console.log(`- Alias URL: http://127.0.0.1:${cameraLock.localDevPort}/?shot=canonical&chrome=0`);
  console.log(`- Viewport: ${cameraLock.viewport.width}x${cameraLock.viewport.height} @ ${cameraLock.viewport.deviceScaleFactor}x`);
  console.log(`- Position: [${activeShot.position.join(", ")}]`);
  console.log(`- Look at: [${activeShot.lookAt.join(", ")}]`);
  console.log(`- Canonical output: ${cameraLock.canonicalOutput}`);
  console.log(`- Scope: ${cameraLock.historicalScope}`);
}
