import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(fileURLToPath(new URL("..", import.meta.url)));

const paths = {
  cameraLock: path.join(rootDir, "content", "scene-data", "hero-street.camera-lock.json"),
  evidence: path.join(rootDir, "content", "scene-data", "memphis-white-walls.evidence.json"),
  assetKit: path.join(rootDir, "apps", "web-tour", "public", "assets", "generated", "glb", "asset-kit.manifest.json"),
  referencePack: path.join(rootDir, "content", "reference-datasets", "memphis-beauty-pass-reference-pack.json"),
  runtimeAssets: path.join(rootDir, "content", "processed", "runtime-assets.manifest.json"),
  sourceRegister: path.join(rootDir, "content", "source-references", "memphis-source-register.json"),
  tour: path.join(rootDir, "content", "scene-data", "memphis-white-walls.tour.json")
};

const evidenceLevels = new Set(["confirmed", "inferred", "speculative"]);
const confidenceLevels = new Set(["high", "medium", "low"]);
const sourceUseClasses = new Set([
  "dataset-ok",
  "rag-ok",
  "human-reference",
  "runtime-ok",
  "permission-needed"
]);
const runtimeAssetOrigins = new Set(["procedural", "generated", "owned", "source-derived"]);
const runtimeAssetTypes = new Set(["geometry", "material", "texture", "audio", "narration", "data"]);

const errors = [];

async function readJson(filePath) {
  const raw = await readFile(filePath, "utf8");
  return JSON.parse(raw);
}

function addError(message) {
  errors.push(message);
}

function requireString(value, label) {
  if (typeof value !== "string" || value.trim().length === 0) {
    addError(`${label} must be a non-empty string.`);
    return false;
  }

  return true;
}

function requireArray(value, label) {
  if (!Array.isArray(value)) {
    addError(`${label} must be an array.`);
    return false;
  }

  return true;
}

function requireNumber(value, label) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    addError(`${label} must be a finite number.`);
    return false;
  }

  return true;
}

function requireVector3(value, label) {
  if (!requireArray(value, label)) {
    return false;
  }

  if (value.length !== 3) {
    addError(`${label} must have exactly 3 numbers.`);
    return false;
  }

  value.forEach((component, index) => requireNumber(component, `${label}[${index}]`));
  return true;
}

function buildSourceMap(sourceRegister) {
  const sourcesById = new Map();

  if (!requireArray(sourceRegister.sources, "sourceRegister.sources")) {
    return sourcesById;
  }

  for (const source of sourceRegister.sources) {
    if (!requireString(source.id, "source.id")) {
      continue;
    }

    if (sourcesById.has(source.id)) {
      addError(`Duplicate source id "${source.id}".`);
      continue;
    }

    sourcesById.set(source.id, source);
    requireString(source.title, `source "${source.id}" title`);
    requireString(source.url, `source "${source.id}" url`);

    if (!requireArray(source.allowedUses, `source "${source.id}" allowedUses`)) {
      continue;
    }

    for (const allowedUse of source.allowedUses) {
      if (!sourceUseClasses.has(allowedUse)) {
        addError(`Source "${source.id}" has unknown allowed use "${allowedUse}".`);
      }
    }
  }

  return sourcesById;
}

function validateCameraLock(cameraLock, tour) {
  requireString(cameraLock.id, "cameraLock.id");

  if (cameraLock.tourId !== tour.id) {
    addError(`Camera lock tourId "${cameraLock.tourId}" does not match tour id "${tour.id}".`);
  }

  requireString(cameraLock.activeShotId, "cameraLock.activeShotId");
  requireString(cameraLock.canonicalUrl, "cameraLock.canonicalUrl");
  requireString(cameraLock.canonicalOutput, "cameraLock.canonicalOutput");

  if (cameraLock.localDevPort !== 5573) {
    addError(`Camera lock localDevPort must remain 5573 unless the project port changes intentionally.`);
  }

  if (typeof cameraLock.viewport !== "object" || cameraLock.viewport === null) {
    addError("cameraLock.viewport must be an object.");
  } else {
    requireNumber(cameraLock.viewport.width, "cameraLock.viewport.width");
    requireNumber(cameraLock.viewport.height, "cameraLock.viewport.height");
    requireNumber(cameraLock.viewport.deviceScaleFactor, "cameraLock.viewport.deviceScaleFactor");
  }

  if (!requireArray(cameraLock.shots, "cameraLock.shots")) {
    return;
  }

  const shotsById = new Map();

  for (const shot of cameraLock.shots) {
    if (!requireString(shot.id, "cameraLock shot id")) {
      continue;
    }

    if (shotsById.has(shot.id)) {
      addError(`Duplicate camera lock shot id "${shot.id}".`);
      continue;
    }

    shotsById.set(shot.id, shot);
    requireString(shot.label, `cameraLock shot "${shot.id}" label`);
    requireString(shot.role, `cameraLock shot "${shot.id}" role`);
    requireVector3(shot.position, `cameraLock shot "${shot.id}" position`);
    requireVector3(shot.lookAt, `cameraLock shot "${shot.id}" lookAt`);

    if (typeof shot.locked !== "boolean") {
      addError(`cameraLock shot "${shot.id}" locked must be a boolean.`);
    }

    requireArray(shot.notes, `cameraLock shot "${shot.id}" notes`);
  }

  const activeShot = shotsById.get(cameraLock.activeShotId);

  if (!activeShot) {
    addError(`Camera lock activeShotId "${cameraLock.activeShotId}" does not exist in cameraLock.shots.`);
  } else if (activeShot.locked !== true) {
    addError(`Camera lock active shot "${cameraLock.activeShotId}" must be locked.`);
  }

  if (!shotsById.has("hero-street-main")) {
    addError('Camera lock must include the canonical "hero-street-main" shot.');
  }
}

function validateGuidedRoute(tour) {
  if (tour.guidedRoute === undefined) {
    return;
  }

  const route = tour.guidedRoute;
  requireString(route.id, "tour.guidedRoute.id");
  requireString(route.label, "tour.guidedRoute.label");
  requireArray(route.notes, "tour.guidedRoute.notes");

  if (!requireArray(route.waypoints, "tour.guidedRoute.waypoints")) {
    return;
  }

  if (route.waypoints.length < 2) {
    addError("tour.guidedRoute.waypoints must include at least two waypoints.");
  }

  const routeIds = new Set();
  const stopIds = new Set(
    Array.isArray(tour.stops)
      ? tour.stops.filter((stop) => typeof stop.id === "string").map((stop) => stop.id)
      : []
  );

  for (const waypoint of route.waypoints) {
    if (!requireString(waypoint.id, "tour.guidedRoute waypoint id")) {
      continue;
    }

    if (routeIds.has(waypoint.id)) {
      addError(`Duplicate guided route waypoint id "${waypoint.id}".`);
      continue;
    }

    routeIds.add(waypoint.id);
    requireVector3(waypoint.position, `guided route waypoint "${waypoint.id}" position`);

    if (waypoint.lookAt !== undefined) {
      requireVector3(waypoint.lookAt, `guided route waypoint "${waypoint.id}" lookAt`);
    }

    if (waypoint.stopId !== undefined) {
      requireString(waypoint.stopId, `guided route waypoint "${waypoint.id}" stopId`);

      if (!stopIds.has(waypoint.stopId)) {
        addError(`Guided route waypoint "${waypoint.id}" references missing stop "${waypoint.stopId}".`);
      }
    }
  }
}

function validateEvidence(tour, evidence, sourcesById) {
  if (evidence.tourId !== tour.id) {
    addError(`Evidence tourId "${evidence.tourId}" does not match tour id "${tour.id}".`);
  }

  if (!requireArray(tour.stops, "tour.stops") || !requireArray(evidence.records, "evidence.records")) {
    return;
  }

  const stopsById = new Map();
  const recordsByStopId = new Map();

  for (const stop of tour.stops) {
    if (!requireString(stop.id, "tour stop id")) {
      continue;
    }

    if (stopsById.has(stop.id)) {
      addError(`Duplicate tour stop id "${stop.id}".`);
    }

    stopsById.set(stop.id, stop);

    if (!evidenceLevels.has(stop.evidenceLevel)) {
      addError(`Tour stop "${stop.id}" has unknown evidence level "${stop.evidenceLevel}".`);
    }
  }

  for (const record of evidence.records) {
    if (!requireString(record.stopId, "evidence record stopId")) {
      continue;
    }

    if (recordsByStopId.has(record.stopId)) {
      addError(`Duplicate evidence record for stop "${record.stopId}".`);
      continue;
    }

    recordsByStopId.set(record.stopId, record);

    const stop = stopsById.get(record.stopId);
    if (!stop) {
      addError(`Evidence record references missing stop "${record.stopId}".`);
      continue;
    }

    if (record.evidenceLevel !== stop.evidenceLevel) {
      addError(
        `Evidence level mismatch for "${record.stopId}": tour is "${stop.evidenceLevel}", evidence is "${record.evidenceLevel}".`
      );
    }

    validateEvidenceRecord(record, sourcesById);
  }

  for (const stop of tour.stops) {
    if (!recordsByStopId.has(stop.id)) {
      addError(`Tour stop "${stop.id}" is missing an evidence record.`);
    }
  }
}

function validateEvidenceRecord(record, sourcesById) {
  if (!evidenceLevels.has(record.evidenceLevel)) {
    addError(`Evidence record "${record.stopId}" has unknown evidence level "${record.evidenceLevel}".`);
  }

  if (!requireArray(record.claims, `evidence "${record.stopId}" claims`)) {
    return;
  }

  if (record.claims.length === 0) {
    addError(`Evidence record "${record.stopId}" must have at least one claim.`);
  }

  if (!requireArray(record.reconstructionNotes, `evidence "${record.stopId}" reconstructionNotes`)) {
    return;
  }

  if (record.reconstructionNotes.length === 0) {
    addError(`Evidence record "${record.stopId}" must have at least one reconstruction note.`);
  }

  for (const [claimIndex, claim] of record.claims.entries()) {
    const label = `evidence "${record.stopId}" claim ${claimIndex + 1}`;
    requireString(claim.claim, `${label} text`);

    if (!confidenceLevels.has(claim.confidence)) {
      addError(`${label} has unknown confidence "${claim.confidence}".`);
    }

    if (!sourceUseClasses.has(claim.useType)) {
      addError(`${label} has unknown useType "${claim.useType}".`);
    }

    if (!requireArray(claim.sourceIds, `${label} sourceIds`)) {
      continue;
    }

    if (claim.sourceIds.length === 0) {
      addError(`${label} must reference at least one source.`);
    }

    for (const sourceId of claim.sourceIds) {
      const source = sourcesById.get(sourceId);

      if (!source) {
        addError(`${label} references missing source "${sourceId}".`);
        continue;
      }

      if (!source.allowedUses.includes(claim.useType)) {
        addError(
          `${label} uses "${claim.useType}" but source "${sourceId}" only allows ${source.allowedUses.join(", ")}.`
        );
      }
    }
  }
}

function validateRuntimeAssets(runtimeAssets, tour, sourcesById) {
  if (runtimeAssets.tourId !== tour.id) {
    addError(`Runtime asset tourId "${runtimeAssets.tourId}" does not match tour id "${tour.id}".`);
  }

  if (!requireArray(runtimeAssets.assets, "runtimeAssets.assets")) {
    return;
  }

  const assetIds = new Set();

  for (const asset of runtimeAssets.assets) {
    if (!requireString(asset.id, "runtime asset id")) {
      continue;
    }

    if (assetIds.has(asset.id)) {
      addError(`Duplicate runtime asset id "${asset.id}".`);
      continue;
    }

    assetIds.add(asset.id);
    requireString(asset.label, `runtime asset "${asset.id}" label`);
    requireString(asset.licenseStatus, `runtime asset "${asset.id}" licenseStatus`);

    if (!runtimeAssetTypes.has(asset.assetType)) {
      addError(`Runtime asset "${asset.id}" has unknown assetType "${asset.assetType}".`);
    }

    if (!runtimeAssetOrigins.has(asset.origin)) {
      addError(`Runtime asset "${asset.id}" has unknown origin "${asset.origin}".`);
    }

    if (!evidenceLevels.has(asset.evidenceLevel)) {
      addError(`Runtime asset "${asset.id}" has unknown evidenceLevel "${asset.evidenceLevel}".`);
    }

    if (typeof asset.runtimeAllowed !== "boolean") {
      addError(`Runtime asset "${asset.id}" runtimeAllowed must be a boolean.`);
    }

    if (!requireArray(asset.sourceIds, `runtime asset "${asset.id}" sourceIds`)) {
      continue;
    }

    if (asset.origin === "source-derived" && asset.sourceIds.length === 0) {
      addError(`Source-derived runtime asset "${asset.id}" must list direct sourceIds.`);
    }

    validateDirectRuntimeSources(asset, sourcesById);
    validateReferenceSources(asset, sourcesById);
  }
}

function validateReferencePack(referencePack, sourcesById) {
  requireString(referencePack.id, "referencePack.id");
  requireString(referencePack.scope, "referencePack.scope");

  if (!requireArray(referencePack.approvedReferenceSources, "referencePack.approvedReferenceSources")) {
    return;
  }

  const seen = new Set();

  for (const reference of referencePack.approvedReferenceSources) {
    if (!requireString(reference.sourceId, "reference sourceId")) {
      continue;
    }

    if (seen.has(reference.sourceId)) {
      addError(`Duplicate reference-pack source "${reference.sourceId}".`);
      continue;
    }

    seen.add(reference.sourceId);
    requireString(reference.role, `reference-pack source "${reference.sourceId}" role`);

    if (!sourceUseClasses.has(reference.useType)) {
      addError(`Reference-pack source "${reference.sourceId}" has unknown useType "${reference.useType}".`);
    }

    const source = sourcesById.get(reference.sourceId);
    if (!source) {
      addError(`Reference-pack source "${reference.sourceId}" is missing from source register.`);
      continue;
    }

    if (!source.allowedUses.includes(reference.useType)) {
      addError(
        `Reference-pack source "${reference.sourceId}" uses "${reference.useType}" but source only allows ${source.allowedUses.join(", ")}.`
      );
    }
  }
}

async function validateAssetKit(assetKit, runtimeAssets, sourcesById) {
  requireString(assetKit.id, "assetKit.id");
  requireString(assetKit.generatedBy, "assetKit.generatedBy");
  requireString(assetKit.licenseStatus, "assetKit.licenseStatus");

  if (!requireArray(assetKit.assets, "assetKit.assets")) {
    return;
  }

  const runtimeAssetIds = new Set(runtimeAssets.assets?.map((asset) => asset.id) ?? []);
  const seen = new Set();

  for (const asset of assetKit.assets) {
    if (!requireString(asset.id, "assetKit asset id")) {
      continue;
    }

    if (seen.has(asset.id)) {
      addError(`Duplicate asset-kit id "${asset.id}".`);
      continue;
    }

    seen.add(asset.id);
    requireString(asset.fileName, `asset-kit "${asset.id}" fileName`);
    requireString(asset.runtimeUrl, `asset-kit "${asset.id}" runtimeUrl`);
    requireString(asset.licenseStatus, `asset-kit "${asset.id}" licenseStatus`);

    if (!evidenceLevels.has(asset.evidenceLevel)) {
      addError(`Asset-kit "${asset.id}" has unknown evidenceLevel "${asset.evidenceLevel}".`);
    }

    if (asset.runtimeAllowed !== true) {
      addError(`Asset-kit "${asset.id}" must be runtimeAllowed true.`);
    }

    if (asset.runtimeAssetId && !runtimeAssetIds.has(asset.runtimeAssetId)) {
      addError(`Asset-kit "${asset.id}" references missing runtime asset "${asset.runtimeAssetId}".`);
    }

    if (!requireArray(asset.referenceSourceIds, `asset-kit "${asset.id}" referenceSourceIds`)) {
      continue;
    }

    for (const sourceId of asset.referenceSourceIds) {
      if (!sourcesById.has(sourceId)) {
        addError(`Asset-kit "${asset.id}" references missing source "${sourceId}".`);
      }
    }

    await validateLocalRuntimeUrl(asset.runtimeUrl, `asset-kit "${asset.id}" runtimeUrl`);
  }
}

async function validateLocalRuntimeUrl(runtimeUrl, label) {
  if (typeof runtimeUrl !== "string" || !runtimeUrl.startsWith("/assets/")) {
    return;
  }

  const localPath = path.join(rootDir, "apps", "web-tour", "public", runtimeUrl.slice(1));

  try {
    await access(localPath);
  } catch {
    addError(`${label} "${runtimeUrl}" does not exist at ${localPath}.`);
  }
}

function validateDirectRuntimeSources(asset, sourcesById) {
  for (const sourceId of asset.sourceIds) {
    const source = sourcesById.get(sourceId);

    if (!source) {
      addError(`Runtime asset "${asset.id}" references missing direct source "${sourceId}".`);
      continue;
    }

    const canUseInRuntime = source.allowedUses.includes("runtime-ok") || source.allowedUses.includes("dataset-ok");

    if (asset.runtimeAllowed && !canUseInRuntime) {
      addError(
        `Runtime asset "${asset.id}" directly uses source "${sourceId}", but the source is not runtime-ok or dataset-ok.`
      );
    }
  }
}

function validateReferenceSources(asset, sourcesById) {
  if (asset.referenceSourceIds === undefined) {
    return;
  }

  if (!requireArray(asset.referenceSourceIds, `runtime asset "${asset.id}" referenceSourceIds`)) {
    return;
  }

  for (const sourceId of asset.referenceSourceIds) {
    const source = sourcesById.get(sourceId);

    if (!source) {
      addError(`Runtime asset "${asset.id}" references missing research source "${sourceId}".`);
    }
  }
}

const [sourceRegister, tour, evidence, runtimeAssets, referencePack, assetKit, cameraLock] = await Promise.all([
  readJson(paths.sourceRegister),
  readJson(paths.tour),
  readJson(paths.evidence),
  readJson(paths.runtimeAssets),
  readJson(paths.referencePack),
  readJson(paths.assetKit),
  readJson(paths.cameraLock)
]);

const sourcesById = buildSourceMap(sourceRegister);
validateCameraLock(cameraLock, tour);
validateGuidedRoute(tour);
validateReferencePack(referencePack, sourcesById);
validateEvidence(tour, evidence, sourcesById);
validateRuntimeAssets(runtimeAssets, tour, sourcesById);
await validateAssetKit(assetKit, runtimeAssets, sourcesById);

if (errors.length > 0) {
  console.error("Content validation failed:");
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exitCode = 1;
} else {
  console.log(
    `Content validation passed: ${tour.stops.length} tour stops, ${evidence.records.length} evidence records, ${runtimeAssets.assets.length} runtime asset records, ${assetKit.assets.length} GLB asset-kit records, ${cameraLock.shots.length} locked camera shots, ${referencePack.approvedReferenceSources.length} reference-pack sources, ${sourcesById.size} sources.`
  );
}
