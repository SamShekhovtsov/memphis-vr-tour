# Step 3 Browser Implementation Plan

Status: second pass, scoped to the current browser MVP only.

Goal: make Step 3 real inside the existing web application without starting VR-specific work, large ML training, or real-world media capture.

## Definition Of Done

Step 3 is done for the browser MVP when:

1. Every tour stop has structured evidence metadata.
2. Every evidence claim points to source IDs from `content/source-references/memphis-source-register.json`.
3. The browser app can show the user why a stop is `confirmed`, `inferred`, or `speculative`.
4. The app displays source titles/links and short project-written notes, not copied protected images/text.
5. A build-time validation script fails if a tour stop references a missing source ID or an unsafe source use.
6. No copyrighted or unclear-license media is downloaded, bundled, fine-tuned on, or displayed unless that item has a compatible license or permission.

## What We Need Right Now

### 1. Evidence Data Layer

Add a small structured evidence layer. A full database server is not needed yet.

Use JSON files under `content/scene-data` and `content/source-references`:

- `memphis-source-register.json`: already created; stores source-level license/use policy.
- `memphis-white-walls.tour.json`: should gain source IDs per stop.
- `memphis-white-walls.evidence.json`: new file recommended for richer notes, because source notes will grow faster than route data.

Recommended evidence shape:

```json
{
  "stopId": "kom-el-fakhry-street",
  "evidenceLevel": "inferred",
  "claims": [
    {
      "claim": "The stop uses a compact mudbrick residential lane inspired by Kom el-Fakhry / Mit Rahina settlement evidence.",
      "sourceIds": ["aera-memphis", "sfar-kom-el-fakhry"],
      "confidence": "medium",
      "useType": "human-reference"
    }
  ],
  "reconstructionNotes": [
    "The exact street alignment and house layout are artistic reconstruction."
  ]
}
```

This gives the app enough structure for an evidence panel without needing embeddings or a vector database.

### 2. Source Validation

Add a Node script that checks:

- each `sourceId` exists in `memphis-source-register.json`
- source use is compatible with the claim use
- no runtime asset references a source marked only `human-reference` or `permission-needed`
- all tour stops have evidence metadata

Suggested script path:

- `tools/validate-content.mjs`

Suggested npm script:

- `npm run validate:content`

The normal `npm run build` should eventually run content validation before compiling the app.

### 3. Browser UI Integration

Update the existing Evidence button so it does more than show colored markers.

Minimum browser MVP behavior:

- Evidence mode still shows colored scene markers.
- The HUD shows the current stop's evidence level.
- When evidence mode is on, a compact panel appears with:
  - current stop title
  - evidence level
  - 2 to 4 short project-written claims
  - source titles as outbound links
  - "confirmed / inferred / speculative" explanation
  - reconstruction note for what is artistic

Do not show museum images, paper scans, PDFs, videos, or copied article text in this UI. The panel should use source titles, links, and our own short summaries.

### 4. Minimal Research Notes

Create short internal notes for the current six route stops:

- Nile Arrival
- White Walls Threshold
- Kom el-Fakhry Street
- Craftsmen Area
- Early Ptah Precinct
- Painted Ptah Shrine

Each note should separate:

- what is supported by source evidence
- what is inferred from related evidence
- what is cinematic reconstruction
- what should be reviewed by an Egyptologist later

These notes can be in JSON for app use and in Markdown for humans.

### 5. Asset Provenance Placeholder

Add an asset manifest even before real assets exist.

Suggested file:

- `content/processed/runtime-assets.manifest.json`

For now it can list procedural assets:

- `procedural-mudbrick-house`
- `procedural-white-wall-threshold`
- `procedural-ptah-precinct-wall`
- `procedural-painted-shrine-texture`

Each entry should include:

- generated/procedural/owned/source-derived
- source IDs, if any
- license status
- evidence level
- whether it is allowed in runtime

This matters because later generated textures and meshes should not appear in the app without provenance.

## What We Do Not Need Right Now

### No Dedicated ML Models Yet

Do not train custom models yet.

For Step 3 browser integration, we only need:

- source register
- evidence metadata
- validation
- evidence UI
- maybe a small CC0 reference set for future texture/concept experiments

Fine-tuning comes later, after a clean dataset exists.

### No Vector Database Yet

Do not add Pinecone, Weaviate, pgvector, Chroma, or a hosted RAG service yet.

The current source count is small. JSON is enough for the browser MVP. A vector database becomes useful when we have hundreds/thousands of notes, transcripts, object records, and citations.

### No Real Media Capture Yet

Do not capture real-world site video, drone footage, photogrammetry, or museum object scans for Step 3.

Real capture work should wait until we define:

- permits
- location access
- museum/site photography terms
- commercial use terms
- photographer ownership agreement
- privacy/release handling for any identifiable people

For now, use procedural geometry and license-safe public-domain/CC0 references.

### No Protected Media In The App

Do not download and bundle:

- MoTA media hub images/videos/3D/360 assets
- British Museum images unless item-level terms allow this project use
- AERA/SFAR photos or PDFs as app assets
- Digital Egypt/UCL media
- YouTube frames
- Google Maps/Earth imagery
- images from modern books or papers

These can remain human research references only unless permission is obtained.

## Immediate Work Items

Recommended order:

1. Add `memphis-white-walls.evidence.json`.
2. Extend `TourStop` or add a shared `EvidenceRecord` type in `packages/shared-scene`.
3. Add `tools/validate-content.mjs`.
4. Wire `npm run validate:content`.
5. Update the web app to load evidence records and source register data.
6. Upgrade the Evidence panel UI to show claims, reconstruction notes, and source links.
7. Add a small runtime asset manifest for procedural assets.
8. Re-run `npm run validate:content`, `npm run typecheck`, and `npm run build`.

## What Step 3 Applied To The App Looks Like

When a user enters Evidence mode at `Kom el-Fakhry Street`, they should see something like:

- Evidence: Inferred
- Supported by:
  - Kom el-Fakhry / Mit Rahina is a key settlement area in the Memphis archaeological zone.
  - Excavation and field-school references support residential/cemetery context and settlement archaeology.
- Reconstruction:
  - The exact house layout, street width, awnings, jars, and well placement are composed for the guided route.
- Sources:
  - AERA: Memphis
  - SFAR: Kom el-Fakhry Archaeological Project

This is enough to make uncertainty useful instead of hidden.

## Later, Not Now

Move these to a later round:

- Unreal/VR source integration
- headset UI for evidence mode
- photogrammetry pipeline
- custom LoRA/fine-tuning
- vector search/RAG service
- Ancient Egyptian speech generation
- production-quality CC0 texture generation
- expert review workflow UI
