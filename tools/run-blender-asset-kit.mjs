import { accessSync, constants, statSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const scriptPath = path.join(rootDir, "tools", "blender", "generate_memphis_asset_kit.py");

const candidates = [
  process.env.BLENDER_BIN,
  "C:\\Program Files\\Blender Foundation\\Blender 5.1\\blender.exe",
  "C:\\Program Files\\Blender Foundation\\Blender 5.1",
  "blender",
  "C:\\Program Files\\Blender Foundation\\Blender 4.1\\blender.exe",
  "C:\\Program Files\\Blender Foundation\\Blender 4.0\\blender.exe",
  "C:\\Program Files\\Blender Foundation\\Blender 3.6\\blender.exe",
  "C:\\Program Files\\Blender Foundation\\Blender 3.6"
].filter(Boolean);

function asExecutable(candidate) {
  try {
    const stats = statSync(candidate);
    if (stats.isDirectory()) {
      return path.join(candidate, "blender.exe");
    }
  } catch {
    return candidate;
  }

  return candidate;
}

function exists(candidate) {
  if (candidate === "blender") {
    const probe = spawnSync(candidate, ["--version"], { stdio: "ignore" });
    return probe.status === 0;
  }

  const executable = asExecutable(candidate);

  try {
    accessSync(executable, constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

const blenderBin = asExecutable(candidates.find(exists) ?? "");

if (!blenderBin) {
  console.error("Blender was not found. Install Blender or set BLENDER_BIN to generate the GLB asset kit.");
  process.exit(1);
}

const result = spawnSync(blenderBin, ["--background", "--python", scriptPath], {
  cwd: rootDir,
  encoding: "utf8",
  stdio: "inherit"
});

if (result.error) {
  console.error(result.error.message);
  process.exit(1);
}

process.exit(result.status ?? 0);
