import { Engine } from "@babylonjs/core";
import "@babylonjs/loaders";
import { createIcons, icons } from "lucide";
import type {
  EvidenceLevel,
  EvidenceManifest,
  EvidenceRecord,
  SourceRegister,
  SourceRegisterSource,
  TourManifest,
  TourStop
} from "@egyptvr/shared-scene";
import { evidenceColors, evidenceDescriptions, evidenceLabels } from "@egyptvr/shared-scene";
import evidenceData from "../../../content/scene-data/memphis-white-walls.evidence.json";
import paintoverData from "../../../content/scene-data/hero-street.paintover.json";
import tourData from "../../../content/scene-data/memphis-white-walls.tour.json";
import sourceRegisterData from "../../../content/source-references/memphis-source-register.json";
import { createMemphisWhiteWallsScene } from "./scene/MemphisWhiteWallsScene";
import "./styles.css";

const manifest = tourData as unknown as TourManifest;
const evidenceManifest = evidenceData as unknown as EvidenceManifest;
const heroShotPaintover = paintoverData as unknown as HeroShotPaintover;
const sourceRegister = sourceRegisterData as unknown as SourceRegister;
const evidenceByStopId = new Map(evidenceManifest.records.map((record) => [record.stopId, record]));
const sourcesById = new Map(sourceRegister.sources.map((source) => [source.id, source]));
const searchParams = new URLSearchParams(window.location.search);

const canvas = getElement<HTMLCanvasElement>("#renderCanvas");
const errorPanel = getElement<HTMLElement>("#errorPanel");
const stopTitle = getElement<HTMLElement>("#stopTitle");
const stopSummary = getElement<HTMLElement>("#stopSummary");
const evidencePill = getElement<HTMLElement>("#evidencePill");
const periodLabel = getElement<HTMLElement>("#periodLabel");
const playTour = document.querySelector<HTMLButtonElement>("#playTour");
const resetTour = document.querySelector<HTMLButtonElement>("#resetTour");
const toggleEvidence = document.querySelector<HTMLButtonElement>("#toggleEvidence");
const toggleNarrator = document.querySelector<HTMLButtonElement>("#toggleNarrator");
const enterVr = document.querySelector<HTMLButtonElement>("#enterVr");
const evidenceLegend = document.querySelector<HTMLElement>("#evidenceLegend");
const evidenceDetail = getElement<HTMLElement>("#evidenceDetail");
const evidenceDetailLevel = getElement<HTMLElement>("#evidenceDetailLevel");
const evidenceDetailTitle = getElement<HTMLElement>("#evidenceDetailTitle");
const evidenceDetailDescription = getElement<HTMLElement>("#evidenceDetailDescription");
const evidenceClaims = getElement<HTMLUListElement>("#evidenceClaims");
const reconstructionNotes = getElement<HTMLUListElement>("#reconstructionNotes");
const evidenceSources = getElement<HTMLUListElement>("#evidenceSources");

if (searchParams.get("chrome") === "0") {
  document.body.classList.add("qa-clean-shot");
}

if (shouldShowPaintover(searchParams)) {
  mountHeroShotPaintover(heroShotPaintover);
}

let currentStop = manifest.stops[0];
let evidenceModeVisible = false;

interface HeroShotPaintover {
  id: string;
  label: string;
  activeShotId: string;
  annotations: HeroShotPaintoverAnnotation[];
}

interface HeroShotPaintoverAnnotation {
  id: string;
  label: string;
  priority: number;
  evidenceLevel: EvidenceLevel;
  kind: "frame" | "line";
  frame?: HeroShotPaintoverFrame;
  line?: {
    from: HeroShotPaintoverPoint;
    to: HeroShotPaintoverPoint;
  };
  labelPosition: HeroShotPaintoverPoint;
  actionTarget: string;
}

interface HeroShotPaintoverFrame {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface HeroShotPaintoverPoint {
  x: number;
  y: number;
}

function getElement<TElement extends Element>(selector: string): TElement {
  const element = document.querySelector<TElement>(selector);

  if (!element) {
    throw new Error(`The web tour shell is missing ${selector}.`);
  }

  return element;
}

function shouldShowPaintover(params: URLSearchParams): boolean {
  const value = params.get("paintover");
  return value === "1" || value === "true";
}

function mountHeroShotPaintover(spec: HeroShotPaintover): void {
  const overlay = document.createElement("aside");

  document.body.classList.add("qa-paintover-shot");
  overlay.className = "paintover-overlay";
  overlay.setAttribute("aria-label", spec.label);
  overlay.innerHTML = renderPaintoverSvg(spec);
  document.body.append(overlay);
}

function renderPaintoverSvg(spec: HeroShotPaintover): string {
  const width = 1280;
  const height = 720;
  const annotations = spec.annotations.map((annotation, index) => {
    const color = evidenceColors[annotation.evidenceLevel];
    const labelPoint = toViewportPoint(annotation.labelPosition, width, height);
    const labelOffset = labelPoint.x > width * 0.72 ? -16 : 16;
    const labelAnchor = labelPoint.x > width * 0.72 ? "end" : "start";
    const label = `${index + 1}. ${annotation.label}`;
    const body =
      annotation.kind === "line" && annotation.line
        ? renderPaintoverLine(annotation, width, height, color)
        : renderPaintoverFrame(annotation, width, height, color);

    return `
      <g class="paintover-zone" data-priority="${annotation.priority}">
        <title>${escapeSvg(annotation.actionTarget)}</title>
        ${body}
        <circle cx="${labelPoint.x}" cy="${labelPoint.y}" r="11" fill="${color}" opacity="0.92" />
        <text x="${labelPoint.x + labelOffset}" y="${labelPoint.y + 5}" text-anchor="${labelAnchor}" fill="#fff7df">${escapeSvg(label)}</text>
      </g>`;
  });

  return `
    <svg viewBox="0 0 ${width} ${height}" role="img" aria-label="${escapeSvg(spec.label)}">
      <defs>
        <marker id="paintover-arrow" viewBox="0 0 12 12" refX="10" refY="6" markerWidth="9" markerHeight="9" orient="auto-start-reverse">
          <path d="M 1 1 L 11 6 L 1 11 z" fill="#fff7df" opacity="0.9"></path>
        </marker>
        <filter id="paintover-label-shadow" x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="#1a1209" flood-opacity="0.9" />
        </filter>
      </defs>
      <rect x="0" y="0" width="${width}" height="${height}" fill="rgba(20, 11, 4, 0.1)" />
      ${annotations.join("")}
    </svg>`;
}

function renderPaintoverFrame(
  annotation: HeroShotPaintoverAnnotation,
  viewportWidth: number,
  viewportHeight: number,
  color: string
): string {
  if (!annotation.frame) {
    return "";
  }

  const frame = toViewportFrame(annotation.frame, viewportWidth, viewportHeight);
  return `
    <rect
      x="${frame.x}"
      y="${frame.y}"
      width="${frame.width}"
      height="${frame.height}"
      rx="3"
      fill="${color}"
      fill-opacity="0.11"
      stroke="${color}"
      stroke-width="3"
      stroke-dasharray="${annotation.priority === 1 ? "0" : "12 9"}"
    />`;
}

function renderPaintoverLine(
  annotation: HeroShotPaintoverAnnotation,
  viewportWidth: number,
  viewportHeight: number,
  color: string
): string {
  if (!annotation.line) {
    return "";
  }

  const from = toViewportPoint(annotation.line.from, viewportWidth, viewportHeight);
  const to = toViewportPoint(annotation.line.to, viewportWidth, viewportHeight);

  return `
    <line
      x1="${from.x}"
      y1="${from.y}"
      x2="${to.x}"
      y2="${to.y}"
      stroke="${color}"
      stroke-width="${annotation.priority === 1 ? 5 : 3}"
      stroke-linecap="round"
      stroke-dasharray="${annotation.priority === 1 ? "0" : "16 10"}"
      marker-end="url(#paintover-arrow)"
    />`;
}

function toViewportFrame(frame: HeroShotPaintoverFrame, viewportWidth: number, viewportHeight: number) {
  return {
    x: Math.round(frame.x * viewportWidth),
    y: Math.round(frame.y * viewportHeight),
    width: Math.round(frame.width * viewportWidth),
    height: Math.round(frame.height * viewportHeight)
  };
}

function toViewportPoint(point: HeroShotPaintoverPoint, viewportWidth: number, viewportHeight: number) {
  return {
    x: Math.round(point.x * viewportWidth),
    y: Math.round(point.y * viewportHeight)
  };
}

function escapeSvg(value: string): string {
  return value.replace(/[&<>"']/g, (match) => {
    switch (match) {
      case "&":
        return "&amp;";
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case '"':
        return "&quot;";
      default:
        return "&#39;";
    }
  });
}

createIcons({ icons });
periodLabel.textContent = manifest.period;
evidenceDetail.hidden = true;

function showError(message: string): void {
  errorPanel.textContent = message;
  errorPanel.hidden = false;
}

function setButtonPressed(button: HTMLButtonElement | null, pressed: boolean): void {
  if (!button) {
    return;
  }

  button.setAttribute("aria-pressed", String(pressed));
  button.classList.toggle("is-active", pressed);
}

function updateStop(stop: TourStop): void {
  stopTitle.textContent = stop.title;
  stopSummary.textContent = stop.summary;
  evidencePill.textContent = evidenceLabels[stop.evidenceLevel];
  evidencePill.dataset.level = stop.evidenceLevel;
  evidencePill.style.setProperty("--evidence-color", evidenceColors[stop.evidenceLevel]);
}

function updateEvidenceDetail(stop: TourStop): void {
  const record = evidenceByStopId.get(stop.id);

  evidenceDetailTitle.textContent = stop.title;
  evidenceDetailLevel.textContent = evidenceLabels[record?.evidenceLevel ?? stop.evidenceLevel];
  evidenceDetailLevel.style.setProperty("--evidence-color", evidenceColors[record?.evidenceLevel ?? stop.evidenceLevel]);
  evidenceDetailDescription.textContent = evidenceDescriptions[record?.evidenceLevel ?? stop.evidenceLevel];

  evidenceClaims.replaceChildren();
  reconstructionNotes.replaceChildren();
  evidenceSources.replaceChildren();

  if (!record) {
    appendPlainListItem(evidenceClaims, "No evidence record is available for this stop yet.");
    appendPlainListItem(reconstructionNotes, "Treat this stop as unreconciled until content validation is updated.");
    return;
  }

  for (const claim of record.claims) {
    const item = document.createElement("li");
    const text = document.createElement("span");
    const meta = document.createElement("small");

    text.textContent = claim.claim;
    meta.textContent = `${capitalize(claim.confidence)} confidence - ${formatUseType(claim.useType)}`;
    item.append(text, meta);
    evidenceClaims.append(item);
  }

  for (const note of record.reconstructionNotes) {
    appendPlainListItem(reconstructionNotes, note);
  }

  for (const source of getClaimSources(record)) {
    const item = document.createElement("li");
    const link = document.createElement("a");
    const meta = document.createElement("small");

    link.href = source.url;
    link.target = "_blank";
    link.rel = "noreferrer";
    link.textContent = source.title;
    meta.textContent = source.licenseStatus;
    item.append(link, meta);
    evidenceSources.append(item);
  }
}

function appendPlainListItem(list: HTMLUListElement, value: string): void {
  const item = document.createElement("li");
  item.textContent = value;
  list.append(item);
}

function getClaimSources(record: EvidenceRecord): SourceRegisterSource[] {
  const sourceIds = new Set(record.claims.flatMap((claim) => claim.sourceIds));
  const sources: SourceRegisterSource[] = [];

  for (const sourceId of sourceIds) {
    const source = sourcesById.get(sourceId);
    if (source) {
      sources.push(source);
    }
  }

  return sources;
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function formatUseType(value: string): string {
  return value.replaceAll("-", " ");
}

async function boot(): Promise<void> {
  const engine = new Engine(canvas, true, {
    adaptToDeviceRatio: true,
    antialias: true,
    preserveDrawingBuffer: true,
    stencil: true
  });

  const controller = await createMemphisWhiteWallsScene(engine, canvas, manifest);

  controller.onStopChanged((stop) => {
    currentStop = stop;
    updateStop(stop);
    updateEvidenceDetail(stop);
  });

  updateStop(currentStop);
  updateEvidenceDetail(currentStop);

  playTour?.addEventListener("click", () => {
    const isPlaying = controller.toggleAutoplay();
    playTour.querySelector("span")!.textContent = isPlaying ? "Pause route" : "Play route";
    setButtonPressed(playTour, isPlaying);
  });

  resetTour?.addEventListener("click", () => {
    controller.resetTour();
    currentStop = manifest.stops[0];
    updateStop(currentStop);
    updateEvidenceDetail(currentStop);
    if (playTour) {
      playTour.querySelector("span")!.textContent = "Play route";
    }
    setButtonPressed(playTour, false);
  });

  toggleEvidence?.addEventListener("click", () => {
    const isVisible = controller.toggleEvidence();
    evidenceModeVisible = isVisible;
    setButtonPressed(toggleEvidence, isVisible);
    if (evidenceLegend) {
      evidenceLegend.hidden = !isVisible;
    }
    evidenceDetail.hidden = !evidenceModeVisible;
    updateEvidenceDetail(currentStop);
  });

  toggleNarrator?.addEventListener("click", () => {
    const narratorEnabled = controller.toggleNarrator();
    setButtonPressed(toggleNarrator, narratorEnabled);
  });

  enterVr?.addEventListener("click", async () => {
    try {
      await controller.enterVr();
    } catch (error) {
      showError(error instanceof Error ? error.message : "This browser or device cannot start WebXR.");
    }
  });

  window.addEventListener("resize", () => {
    engine.resize();
  });

  engine.runRenderLoop(() => {
    controller.scene.render();
  });
}

boot().catch((error: unknown) => {
  showError(error instanceof Error ? error.message : "The 3D tour failed to start.");
});

export type { EvidenceLevel };
