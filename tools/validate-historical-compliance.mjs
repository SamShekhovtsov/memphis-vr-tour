import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(fileURLToPath(new URL("..", import.meta.url)));

const paths = {
  rules: path.join(rootDir, "content", "compliance", "historical-compliance.rules.json"),
  tour: path.join(rootDir, "content", "scene-data", "memphis-white-walls.tour.json"),
  evidence: path.join(rootDir, "content", "scene-data", "memphis-white-walls.evidence.json"),
  runtimeAssets: path.join(rootDir, "content", "processed", "runtime-assets.manifest.json"),
  assetKit: path.join(rootDir, "apps", "web-tour", "public", "assets", "generated", "glb", "asset-kit.manifest.json")
};

const errors = [];
const warnings = [];

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

async function readText(relativePath) {
  return readFile(path.join(rootDir, relativePath), "utf8");
}

function addError(message) {
  errors.push(message);
}

function addWarning(message) {
  warnings.push(message);
}

function compactText(value) {
  if (Array.isArray(value)) {
    return value.map(compactText).join(" ");
  }

  if (value && typeof value === "object") {
    return Object.values(value).map(compactText).join(" ");
  }

  if (value === undefined || value === null) {
    return "";
  }

  return String(value);
}

function normalize(value) {
  return compactText(value).toLowerCase();
}

function includesAny(text, terms) {
  const normalized = normalize(text);
  return terms.some((term) => normalized.includes(String(term).toLowerCase()));
}

function includesAll(text, terms) {
  const normalized = normalize(text);
  return terms.every((term) => normalized.includes(String(term).toLowerCase()));
}

function validateRuleShape(rules) {
  if (rules.tourId !== "memphis-white-walls-early-kingdom") {
    addError(`Historical rules tourId must stay memphis-white-walls-early-kingdom, got "${rules.tourId}".`);
  }

  for (const sectionName of ["architecture", "materials", "peopleAndObjects"]) {
    if (!rules[sectionName] || typeof rules[sectionName] !== "object") {
      addError(`Historical rules must include ${sectionName}.`);
    }
  }

  if (!Array.isArray(rules.sceneZones) || rules.sceneZones.length < 3) {
    addError("Historical rules must include sceneZones for Nile arrival, residential street, and Ptah precinct.");
  }
}

function validateTourScope(rules, tour, evidence) {
  if (tour.id !== rules.tourId) {
    addError(`Tour id "${tour.id}" does not match historical rule tourId "${rules.tourId}".`);
  }

  if (evidence.tourId !== rules.tourId) {
    addError(`Evidence tourId "${evidence.tourId}" does not match historical rule tourId "${rules.tourId}".`);
  }

  const periodText = normalize([tour.period, tour.summary, tour.subtitle]);
  for (const required of ["early dynastic", "old kingdom"]) {
    if (!periodText.includes(required)) {
      addError(`Tour scope must explicitly include "${required}".`);
    }
  }

  if (!includesAny([tour.summary, tour.subtitle, tour.period], ["Kom el-Fakhry", "Mit Rahina"])) {
    addError("Tour scope must keep the Kom el-Fakhry / Mit Rahina living-city anchor visible.");
  }

  if (!Array.isArray(tour.stops) || tour.stops.length === 0) {
    addError("Tour must include evidence-aware stops.");
    return;
  }

  const evidenceLevels = new Set(rules.evidenceLevels ?? []);
  for (const stop of tour.stops) {
    if (!evidenceLevels.has(stop.evidenceLevel)) {
      addError(`Tour stop "${stop.id}" has evidence level "${stop.evidenceLevel}" outside the historical rule set.`);
    }
  }
}

function validateDocs(rules) {
  for (const doc of rules.requiredDocs ?? []) {
    if (!doc.path || !Array.isArray(doc.mustContain)) {
      addError("Each required historical doc must provide path and mustContain terms.");
      continue;
    }
  }
}

async function validateDocContent(rules) {
  for (const doc of rules.requiredDocs ?? []) {
    let content = "";

    try {
      content = await readText(doc.path);
    } catch (error) {
      addError(`Required historical doc "${doc.path}" cannot be read: ${error.message}`);
      continue;
    }

    for (const phrase of doc.mustContain) {
      if (!normalize(content).includes(String(phrase).toLowerCase())) {
        addError(`Required historical doc "${doc.path}" must mention "${phrase}".`);
      }
    }
  }
}

function validateEvidenceRecords(rules, evidence) {
  const levels = new Set(rules.evidenceLevels ?? []);

  if (!Array.isArray(evidence.records)) {
    addError("Evidence file must include records.");
    return;
  }

  for (const record of evidence.records) {
    if (!levels.has(record.evidenceLevel)) {
      addError(`Evidence record "${record.stopId}" has unsupported level "${record.evidenceLevel}".`);
    }

    if (!Array.isArray(record.claims) || record.claims.length === 0) {
      addError(`Evidence record "${record.stopId}" must include at least one claim.`);
    }

    if (!Array.isArray(record.reconstructionNotes) || record.reconstructionNotes.length === 0) {
      addError(`Evidence record "${record.stopId}" must include reconstruction notes.`);
    }

    if (record.evidenceLevel === "speculative" && !includesAny(record.reconstructionNotes, ["speculative", "artistic", "unknown", "not claim"])) {
      addWarning(`Speculative evidence record "${record.stopId}" should say why the reconstruction remains speculative.`);
    }
  }
}

function validateRuntimeAssets(rules, runtimeAssets) {
  if (runtimeAssets.tourId !== rules.tourId) {
    addError(`Runtime asset tourId "${runtimeAssets.tourId}" does not match historical rule tourId "${rules.tourId}".`);
  }

  if (!Array.isArray(runtimeAssets.assets)) {
    addError("Runtime assets manifest must include assets.");
    return;
  }

  for (const asset of runtimeAssets.assets) {
    const text = normalize([asset.id, asset.label, asset.notes, asset.referenceSourceIds]);
    const residentialHint = normalize([asset.id, asset.label]);

    if (asset.runtimeAllowed !== true) {
      addError(`Runtime asset "${asset.id}" must be runtimeAllowed true.`);
    }

    if (!includesAny(asset.licenseStatus, ["project-authored", "generated", "procedural", "owned", "runtime-ok"])) {
      addError(`Runtime asset "${asset.id}" must state project-authored/generated/procedural/owned/runtime-ok license status.`);
    }

    validateForbiddenRuntimeText(rules, `runtime asset "${asset.id}"`, text);

    if (residentialHint.includes("kom-el-fakhry") || residentialHint.includes("hero-street") || residentialHint.includes("street")) {
      validateResidentialStreetText(rules, `runtime asset "${asset.id}"`, text);
    }
  }
}

function validateAssetKit(rules, assetKit) {
  if (!Array.isArray(assetKit.assets)) {
    addError("Asset kit manifest must include assets.");
    return;
  }

  const atlasText = normalize(assetKit.materialAtlasStatus);
  for (const term of ["mudbrick", "old kingdom"]) {
    if (!atlasText.includes(term)) {
      addError(`Asset kit materialAtlasStatus must mention "${term}".`);
    }
  }

  if (!includesAny(atlasText, ["plaster", "whitewash"])) {
    addError("Asset kit materialAtlasStatus must mention plaster or whitewash.");
  }

  if (!includesAny(atlasText, ["block-grid", "block grid", "regular exposed block"])) {
    addError("Asset kit materialAtlasStatus must record the no regular block-grid facade guardrail.");
  }

  for (const asset of assetKit.assets) {
    const label = `asset-kit "${asset.id}"`;
    const text = normalize([asset.id, asset.label, asset.category, asset.notes, asset.origin, asset.referenceSourceIds]);

    if (asset.runtimeAllowed !== true) {
      addError(`${label} must be runtimeAllowed true.`);
    }

    if (!includesAny(asset.licenseStatus, ["project-authored", "generated", "procedural", "owned", "runtime-ok"])) {
      addError(`${label} must state project-authored/generated/procedural/owned/runtime-ok license status.`);
    }

    validateForbiddenRuntimeText(rules, label, text);

    if (asset.category === "residential-street") {
      validateResidentialStreetText(rules, label, text);
    }

    if (String(asset.id).startsWith("hero-street-corridor")) {
      validateHeroStreetCorridor(rules, label, text);
    }
  }
}

function validateResidentialStreetText(rules, label, text) {
  const zone = (rules.sceneZones ?? []).find((item) => item.id === "residential-street");
  const periodOrPlaceSignals = zone?.periodOrPlaceSignals ?? ["Old Kingdom", "early Memphis", "Memphis", "Kom el-Fakhry", "Mit Rahina"];
  const domesticMaterialSignals = zone?.domesticMaterialSignals ?? ["mudbrick", "plaster", "dust", "linen", "pottery", "jars", "wood", "reed", "basket", "rope"];

  if (!includesAny(text, periodOrPlaceSignals)) {
    addError(`${label} must keep at least one residential-street period/place anchor: ${periodOrPlaceSignals.join(", ")}.`);
  }

  if (!includesAny(text, domesticMaterialSignals)) {
    addError(`${label} must keep at least one residential-street domestic material signal: ${domesticMaterialSignals.join(", ")}.`);
  }
}

function validateHeroStreetCorridor(rules, label, text) {
  const checks = [
    {
      label: "Kom el-Fakhry / Mit Rahina settlement anchor",
      terms: ["Kom el-Fakhry", "Mit Rahina"]
    },
    {
      label: "mudbrick domestic construction",
      terms: ["mudbrick"]
    },
    {
      label: "mud plaster or whitewash street-facing walls",
      terms: ["plaster", "whitewash"]
    },
    {
      label: "Old Kingdom visual guardrail",
      terms: ["old kingdom"]
    },
    {
      label: "non-overlapping layout",
      terms: ["no new houses", "avoids overlapping architecture", "omitted on both rows"]
    },
    {
      label: "regular block-grid avoidance",
      terms: ["block-grid", "block grid", "regular exposed block"]
    }
  ];

  for (const check of checks) {
    if (!includesAny(text, check.terms)) {
      addError(`${label} must document ${check.label}.`);
    }
  }

  const requiredArchitecture = rules.architecture?.requiredSignals ?? [];
  const coreSignals = ["compact house masses", "flat roofs", "small openings", "reed or linen shade"];
  for (const signal of coreSignals) {
    if (requiredArchitecture.includes(signal) && !includesAny(text, signal.split(" or "))) {
      addWarning(`${label} could mention "${signal}" more explicitly for future art review.`);
    }
  }
}

function validateForbiddenRuntimeText(rules, label, text) {
  for (const forbidden of rules.runtimeForbiddenTerms ?? []) {
    if (text.includes(String(forbidden).toLowerCase())) {
      addError(`${label} includes forbidden historical drift term "${forbidden}".`);
    }
  }
}

const [rules, tour, evidence, runtimeAssets, assetKit] = await Promise.all([
  readJson(paths.rules),
  readJson(paths.tour),
  readJson(paths.evidence),
  readJson(paths.runtimeAssets),
  readJson(paths.assetKit)
]);

validateRuleShape(rules);
validateDocs(rules);
await validateDocContent(rules);
validateTourScope(rules, tour, evidence);
validateEvidenceRecords(rules, evidence);
validateRuntimeAssets(rules, runtimeAssets);
validateAssetKit(rules, assetKit);

if (errors.length > 0) {
  console.error("Historical compliance validation failed:");
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exitCode = 1;
} else {
  console.log(
    `Historical compliance validation passed: ${rules.scope.period} ${rules.scope.place}; ${runtimeAssets.assets.length} runtime assets, ${assetKit.assets.length} GLB asset records, ${evidence.records.length} evidence records.`
  );

  if (warnings.length > 0) {
    console.warn("Historical compliance warnings:");
    for (const warning of warnings) {
      console.warn(`- ${warning}`);
    }
  }
}
