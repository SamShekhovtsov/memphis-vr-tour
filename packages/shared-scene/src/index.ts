export const evidenceLevels = ["confirmed", "inferred", "speculative"] as const;

export type EvidenceLevel = (typeof evidenceLevels)[number];

export const evidenceConfidenceLevels = ["high", "medium", "low"] as const;

export type EvidenceConfidence = (typeof evidenceConfidenceLevels)[number];

export const sourceUseClasses = [
  "dataset-ok",
  "rag-ok",
  "human-reference",
  "runtime-ok",
  "permission-needed"
] as const;

export type SourceUseClass = (typeof sourceUseClasses)[number];

export const sourceCategories = [
  "location-specific",
  "open-collection",
  "language",
  "geospatial",
  "aggregator",
  "restricted-reference"
] as const;

export type SourceCategory = (typeof sourceCategories)[number];

export interface TourStop {
  id: string;
  title: string;
  summary: string;
  evidenceLevel: EvidenceLevel;
  position: readonly [number, number, number];
  lookAt?: readonly [number, number, number];
  durationHintSeconds?: number;
  referenceNotes: readonly string[];
}

export interface TourManifest {
  id: string;
  title: string;
  period: string;
  location: string;
  durationSeconds: number;
  summary: string;
  stops: readonly TourStop[];
}

export interface EvidenceClaim {
  claim: string;
  sourceIds: readonly string[];
  confidence: EvidenceConfidence;
  useType: SourceUseClass;
}

export interface EvidenceRecord {
  stopId: string;
  evidenceLevel: EvidenceLevel;
  claims: readonly EvidenceClaim[];
  reconstructionNotes: readonly string[];
  reviewNotes?: readonly string[];
}

export interface EvidenceManifest {
  tourId: string;
  checkedDate: string;
  records: readonly EvidenceRecord[];
}

export interface SourceRegisterSource {
  id: string;
  title: string;
  url: string;
  category: SourceCategory;
  relevance: string;
  licenseStatus: string;
  allowedUses: readonly SourceUseClass[];
  blockedUses: readonly string[];
  reviewNotes: string;
}

export interface SourceRegister {
  checkedDate: string;
  scope: string;
  sources: readonly SourceRegisterSource[];
}

export const runtimeAssetOrigins = ["procedural", "generated", "owned", "source-derived"] as const;

export type RuntimeAssetOrigin = (typeof runtimeAssetOrigins)[number];

export const runtimeAssetTypes = ["geometry", "material", "texture", "audio", "narration", "data"] as const;

export type RuntimeAssetType = (typeof runtimeAssetTypes)[number];

export interface RuntimeAssetRecord {
  id: string;
  label: string;
  assetType: RuntimeAssetType;
  origin: RuntimeAssetOrigin;
  evidenceLevel: EvidenceLevel;
  runtimeAllowed: boolean;
  sourceIds: readonly string[];
  referenceSourceIds?: readonly string[];
  licenseStatus: string;
  notes: readonly string[];
}

export interface RuntimeAssetManifest {
  tourId: string;
  checkedDate: string;
  assets: readonly RuntimeAssetRecord[];
}

export const evidenceLabels: Record<EvidenceLevel, string> = {
  confirmed: "Confirmed",
  inferred: "Inferred",
  speculative: "Speculative"
};

export const evidenceDescriptions: Record<EvidenceLevel, string> = {
  confirmed: "Directly supported by physical, textual, or scholarly evidence.",
  inferred: "Plausible from related evidence, comparable sites, or known practice.",
  speculative: "Artistic reconstruction used to complete the immersive scene."
};

export const evidenceColors: Record<EvidenceLevel, string> = {
  confirmed: "#39c6a3",
  inferred: "#f0b84b",
  speculative: "#f06464"
};

export function isEvidenceLevel(value: string): value is EvidenceLevel {
  return evidenceLevels.includes(value as EvidenceLevel);
}
