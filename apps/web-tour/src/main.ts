import { Engine } from "@babylonjs/core";
import "@babylonjs/loaders";
import { createIcons, icons } from "lucide";
import type { EvidenceLevel, TourManifest, TourStop } from "@egyptvr/shared-scene";
import { evidenceColors, evidenceLabels } from "@egyptvr/shared-scene";
import tourData from "../../../content/scene-data/memphis-white-walls.tour.json";
import { createMemphisWhiteWallsScene } from "./scene/MemphisWhiteWallsScene";
import "./styles.css";

const manifest = tourData as unknown as TourManifest;

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

function getElement<TElement extends Element>(selector: string): TElement {
  const element = document.querySelector<TElement>(selector);

  if (!element) {
    throw new Error(`The web tour shell is missing ${selector}.`);
  }

  return element;
}

createIcons({ icons });
periodLabel.textContent = manifest.period;

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

async function boot(): Promise<void> {
  const engine = new Engine(canvas, true, {
    adaptToDeviceRatio: true,
    antialias: true,
    preserveDrawingBuffer: true,
    stencil: true
  });

  const controller = await createMemphisWhiteWallsScene(engine, canvas, manifest);

  controller.onStopChanged((stop) => {
    updateStop(stop);
  });

  updateStop(manifest.stops[0]);

  playTour?.addEventListener("click", () => {
    const isPlaying = controller.toggleAutoplay();
    playTour.querySelector("span")!.textContent = isPlaying ? "Pause route" : "Play route";
    setButtonPressed(playTour, isPlaying);
  });

  resetTour?.addEventListener("click", () => {
    controller.resetTour();
    if (playTour) {
      playTour.querySelector("span")!.textContent = "Play route";
    }
    setButtonPressed(playTour, false);
  });

  toggleEvidence?.addEventListener("click", () => {
    const isVisible = controller.toggleEvidence();
    setButtonPressed(toggleEvidence, isVisible);
    if (evidenceLegend) {
      evidenceLegend.hidden = !isVisible;
    }
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
