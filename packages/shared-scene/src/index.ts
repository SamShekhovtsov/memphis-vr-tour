export const evidenceLevels = ["confirmed", "inferred", "speculative"] as const;

export type EvidenceLevel = (typeof evidenceLevels)[number];

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
