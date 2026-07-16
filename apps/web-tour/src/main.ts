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
import tourData from "../../../content/scene-data/memphis-white-walls.tour.json";
import sourceRegisterData from "../../../content/source-references/memphis-source-register.json";
import { createMemphisWhiteWallsScene } from "./scene/MemphisWhiteWallsScene";
import "./styles.css";

const manifest = tourData as unknown as TourManifest;
const evidenceManifest = evidenceData as unknown as EvidenceManifest;
const sourceRegister = sourceRegisterData as unknown as SourceRegister;
const evidenceByStopId = new Map(evidenceManifest.records.map((record) => [record.stopId, record]));
const sourcesById = new Map(sourceRegister.sources.map((source) => [source.id, source]));

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

if (new URLSearchParams(window.location.search).get("chrome") === "0") {
  document.body.classList.add("qa-clean-shot");
}

let currentStop = manifest.stops[0];
let evidenceModeVisible = false;

function getElement<TElement extends Element>(selector: string): TElement {
  const element = document.querySelector<TElement>(selector);

  if (!element) {
    throw new Error(`The web tour shell is missing ${selector}.`);
  }

  return element;
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
