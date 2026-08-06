import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const paths = {
  budget: path.join(rootDir, "content", "optimization", "browser-runtime-budget.json"),
  assetKit: path.join(rootDir, "apps", "web-tour", "public", "assets", "generated", "glb", "asset-kit.manifest.json"),
  glbDir: path.join(rootDir, "apps", "web-tour", "public", "assets", "generated", "glb"),
  textureDir: path.join(rootDir, "apps", "web-tour", "public", "assets", "generated", "textures"),
  sceneSource: path.join(rootDir, "apps", "web-tour", "src", "scene", "MemphisWhiteWallsScene.ts"),
  assetPipeline: path.join(rootDir, "docs", "asset-pipeline.md")
};

const errors = [];

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

function addError(message) {
  errors.push(message);
}

function requireString(value, label) {
  if (typeof value !== "string" || value.trim().length === 0) {
    addError(`${label} must be a non-empty string.`);
  }
}

function requireArray(value, label) {
  if (!Array.isArray(value) || value.length === 0) {
    addError(`${label} must be a non-empty array.`);
    return false;
  }

  return true;
}

function requireNumber(value, label) {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    addError(`${label} must be a positive number.`);
  }
}

function normalize(value) {
  return String(value ?? "").toLowerCase();
}

async function fileSize(filePath) {
  return (await stat(filePath)).size;
}

async function directoryFileSize(dirPath, predicate) {
  const fileNames = await readdir(dirPath);
  let total = 0;

  for (const fileName of fileNames) {
    if (!predicate(fileName)) {
      continue;
    }

    total += await fileSize(path.join(dirPath, fileName));
  }

  return total;
}

function validateBudgetShape(budget) {
  requireString(budget.id, "budget.id");
  requireString(budget.tourId, "budget.tourId");
  requireArray(budget.runtimePolicy?.criticalAssetIds, "budget.runtimePolicy.criticalAssetIds");
  requireArray(budget.runtimePolicy?.deferredAssetIds, "budget.runtimePolicy.deferredAssetIds");
  requireArray(budget.runtimePolicy?.forbiddenInitialRuntimeAssetIds, "budget.runtimePolicy.forbiddenInitialRuntimeAssetIds");
  requireNumber(budget.budgets?.activeGlbBytes, "budget.budgets.activeGlbBytes");
  requireNumber(budget.budgets?.textureBytes, "budget.budgets.textureBytes");
  requireNumber(budget.budgets?.fallbackGlbBytes, "budget.budgets.fallbackGlbBytes");

  for (const profile of ["balanced", "performance", "cinematic"]) {
    if (!budget.qualityProfiles?.[profile]) {
      addError(`budget.qualityProfiles must include "${profile}".`);
    }
  }
}

async function validateAssetBudgets(budget, assetKit) {
  const assetsById = new Map((assetKit.assets ?? []).map((asset) => [asset.id, asset]));
  const perAssetBudgets = budget.budgets?.perAssetGlbBytes ?? {};
  let activeBytes = 0;

  for (const assetId of budget.runtimePolicy.criticalAssetIds) {
    activeBytes += await validateAssetSize(assetId, assetsById, perAssetBudgets[assetId]);
  }

  for (const assetId of budget.runtimePolicy.deferredAssetIds) {
    activeBytes += await validateAssetSize(assetId, assetsById, perAssetBudgets[assetId]);
  }

  if (activeBytes > budget.budgets.activeGlbBytes) {
    addError(`Active unique runtime GLB size ${activeBytes} exceeds budget ${budget.budgets.activeGlbBytes}.`);
  }

  const fallbackId = budget.runtimePolicy.fallbackAsset;
  const fallbackBytes = await validateAssetSize(fallbackId, assetsById, budget.budgets.fallbackGlbBytes);

  if (fallbackBytes > budget.budgets.fallbackGlbBytes) {
    addError(`Fallback GLB "${fallbackId}" size ${fallbackBytes} exceeds budget ${budget.budgets.fallbackGlbBytes}.`);
  }

  return { activeBytes, fallbackBytes };
}

async function validateAssetSize(assetId, assetsById, byteBudget) {
  const asset = assetsById.get(assetId);

  if (!asset) {
    addError(`Asset kit is missing optimization asset "${assetId}".`);
    return 0;
  }

  const size = await fileSize(path.join(paths.glbDir, asset.fileName));

  if (byteBudget && size > byteBudget) {
    addError(`GLB asset "${assetId}" size ${size} exceeds budget ${byteBudget}.`);
  }

  return size;
}

async function validateTextureBudget(budget) {
  const textureBytes = await directoryFileSize(paths.textureDir, (fileName) => /\.(jpg|jpeg|png|webp|ktx2)$/i.test(fileName));

  if (textureBytes > budget.budgets.textureBytes) {
    addError(`Generated texture size ${textureBytes} exceeds budget ${budget.budgets.textureBytes}.`);
  }

  return textureBytes;
}

async function validateRuntimeWiring(budget, assetKit) {
  const sceneSource = await readFile(paths.sceneSource, "utf8");
  const materialAtlasText = normalize(JSON.stringify(assetKit.materialAtlasStatus ?? {}));

  for (const assetId of budget.runtimePolicy.criticalAssetIds) {
    if (!sceneSource.includes(`assetId: "${assetId}"`)) {
      addError(`Runtime scene must place critical optimized asset "${assetId}".`);
    }
  }

  for (const assetId of budget.runtimePolicy.forbiddenInitialRuntimeAssetIds) {
    const forbiddenPlacementPattern = new RegExp(`assetId:\\s*["']${assetId}["']`);
    if (forbiddenPlacementPattern.test(sceneSource)) {
      addError(`Runtime scene must not place fallback/full asset "${assetId}" in initial optimized path.`);
    }
  }

  if (!sceneSource.includes("quality=performance") && !sceneSource.includes("RuntimeQualityProfile")) {
    addError("Runtime scene should expose runtime quality profiles.");
  }

  for (const phrase of ["near/mid/far", "fallback"]) {
    if (!materialAtlasText.includes(phrase)) {
      addError(`Asset-kit optimization notes must mention "${phrase}".`);
    }
  }
}

async function validateDocs() {
  const assetPipeline = await readFile(paths.assetPipeline, "utf8");
  const text = normalize(assetPipeline);

  for (const phrase of ["near/mid/far", "validate:optimization", "quality=performance", "draco", "ktx2"]) {
    if (!text.includes(phrase)) {
      addError(`docs/asset-pipeline.md must mention "${phrase}".`);
    }
  }
}

const [budget, assetKit] = await Promise.all([
  readJson(paths.budget),
  readJson(paths.assetKit)
]);

validateBudgetShape(budget);
const { activeBytes, fallbackBytes } = await validateAssetBudgets(budget, assetKit);
const textureBytes = await validateTextureBudget(budget);
await validateRuntimeWiring(budget, assetKit);
await validateDocs();

if (errors.length > 0) {
  console.error("Browser optimization validation failed:");
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exitCode = 1;
} else {
  console.log(
    `Browser optimization validation passed: active unique GLBs ${activeBytes} bytes, fallback GLB ${fallbackBytes} bytes, generated textures ${textureBytes} bytes.`
  );
}
