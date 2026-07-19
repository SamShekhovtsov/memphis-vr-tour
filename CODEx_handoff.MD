# CODEx Handoff: EgyptVRTour

This file is the project compass for future Codex runs. At the start of every run, respect these baseline decisions before making edits, planning new work, or suggesting changes.

## 1. Core Idea

Project title / experience framing:

Ancient Memphis: A Walk Through the White Walls

The product is a historically plausible living-history walkthrough of ancient Memphis, not a modern ruins tour. The visitor should feel like they are walking through a compact district of Memphis during the Early Dynastic / Old Kingdom scope: Nile arrival, settlement edge, residential street, craft/market life, and a temple endpoint.

The target feeling is: "I was there." The experience should be beautiful, calm, immersive, and credible. It should feel like a cinematic first-person walkthrough rather than a combat game, quest game, or educational slideshow.

Current selected scope:

- Temple endpoint: early Ptah / Hwt-ka-Ptah precinct.
- Living-city district: Kom el-Fakhry / Mit Rahina settlement evidence.
- Historical scope: ancient Memphis around the Early Dynastic / Old Kingdom period.
- MVP route: Nile-side arrival point, entrance/gate transition, compact mudbrick residential street, craft/market atmosphere, and eventual temple exterior/interior reconstruction.

## 2. Technology Direction

This is one shared project with two presentation targets, not two isolated projects.

- Browser version: TypeScript + Babylon.js / WebGL-WebGPU direction, optimized for laptop browsers and broad access.
- Full VR version: Unreal or Unity later, for high-end VR headset experience.
- Shared base: scene data, route definitions, evidence records, asset provenance, reference database, and generation/validation tools should remain common where possible.

Current implementation focus is the browser app. Keep the local development port at `5573` unless the user explicitly changes it.

## 3. Historical Evidence And Source Rules

Use official, scholarly, public-domain, open-access, or clearly licensed references whenever possible. The project can use artistic reconstruction, but it must remain historically restrained and evidence-aware.

Core rule:

- Confirmed evidence should stay distinct from inferred reconstruction and speculative/artistic reconstruction.
- Use the evidence toggle / evidence records to preserve trust.
- Do not copy or display copyrighted/protected source media directly unless the license allows it.
- Do not scrape arbitrary copyrighted media as training input.
- Prefer CC0, public-domain, CC-BY/open museum resources, owned materials, or paid/licensed datasets with provenance.
- Restricted or copyrighted visual references may guide high-level composition/evidence notes only when legally appropriate; runtime art must be project-authored or license-safe.

Egyptian language rule:

- Use a corpus/reference layer rather than pretending a model simply "knows" ancient Egyptian.
- A serious source to evaluate is the Thesaurus Linguae Aegyptiae, but check its terms before any bulk use, model training, or redistribution.

Historical design rule:

Whenever changing houses, humans, clothing, tools, boats, gates, temples, wall paintings, inscriptions, craft objects, plants, or architecture, check the design against what is known or plausible for ancient Memphis scoped around the Early Dynastic / Old Kingdom. Fill gaps with restrained artistic reconstruction, not fantasy.

## 4. Locked District Plan

Do not randomly move the district, street, houses, road, gate, or temple elements.

The current district layout should remain stable:

- Visitor arrives from the Nile/beach side.
- Visitor passes through the arrival/threshold gate area.
- The main residential hero street is offset from the direct gate line, so it is not accessible as a perfectly straight path from the entrance gates.
- The street sits closer to the Nile/beach than before, but slightly shifted right from the beach edge so it feels naturally embedded in the district.
- The two rows of houses face inward toward the street.
- The yellow/sandy packed street surface belongs inside the street between the two rows of houses.
- The `Play Route` path is a dedicated `guidedRoute` in `content/scene-data/memphis-white-walls.tour.json`; do not collapse it back to straight lines between story stops.

Only adjust these positions when the user explicitly asks for layout changes. Otherwise, preserve this district plan and work on visual quality.

## 4a. Locked Hero Camera

The current visual-quality benchmark is locked in:

- `content/scene-data/hero-street.camera-lock.json`
- `docs/design/hero-street-camera-lock.md`

Canonical benchmark:

- Shot id: `hero-street-main`
- URL: `http://127.0.0.1:5573/?shot=hero-street-main&chrome=0`
- Alias URL: `http://127.0.0.1:5573/?shot=canonical&chrome=0`
- Viewport: `1280x720`
- Position: `[-6.6, 1.65, -18]`
- Look at: `[-6, 1.48, 8]`

Use this camera for every texture, material, lighting, haze, and color-grading quality comparison. Do not change the canonical camera unless the user explicitly approves a new benchmark shot.

## 5. Current Goal

Current goal: improve visual quality, especially texture and material realism, toward cinematic quality.

Target: a browser-rendered scene that feels as close as possible to a real cinematic reconstruction. The reference quality is the user's cinematic screenshots and the Kom Ombo inspiration video: warm sun, credible haze, realistic materials, believable shadows, tactile dust/plaster/mudbrick/linen/pottery, and a strong first-person hero-street composition.

Current focus is not adding more objects. The scene already has enough elements for this phase. Work on making existing elements look better:

- Ground surface: remove procedural tiling/banding, improve packed dust realism.
- Mudbrick: more natural color, chipped/worn edges, surface variation, cracks, roughness.
- Plaster: less clean/white, more dusty chalk, stains, cracks, patch variation.
- Contact shadows: baked-looking darkness under walls, props, doorways, awnings, and people.
- Color balance: warm sun, cooler shadows, darker dirt, pale linen, clay pottery.
- Lighting: reduce over-bright haze, improve contrast, preserve warm atmospheric depth.
- Materials: albedo, normal, roughness, AO, height/decal layers where feasible.

Near-term quality direction:

- Build a proper authored ground/lightmap atlas instead of relying only on procedural color bands.
- Improve close-up wall/plaster material atlases.
- Add baked-looking AO/lightmap support for the hero street.
- Use fewer but better animated human figures rather than many placeholders.
- Keep the scene historically restrained for early Memphis / Old Kingdom.

## 6. After Every Run

At the end of every task, Codex should:

- Summarize what changed.
- Mention verification commands that passed or could not be run.
- If the task changed visuals, capture or reference a QA screenshot when feasible.
- Suggest the next practical steps for improving quality toward the cinematic target.
- Avoid expanding the district unless the user explicitly asks; prioritize quality of the hero street.

Next-step suggestions should be concrete and strategic, for example:

- Replace procedural ground with an authored baked ground atlas.
- Build close-up plaster/mudbrick atlases with normal/AO/roughness maps.
- Add baked lightmap support for doorway darkness and awning shadows.
- Improve character silhouettes and movement.
- Tune color grading and haze against side-by-side cinematic references.
- Optimize only after quality direction is visually working.

## 7. Current Technical Context

Important files and systems:

- Browser scene: `apps/web-tour/src/scene/MemphisWhiteWallsScene.ts`
- Runtime asset generator: `tools/generate-runtime-assets.mjs`
- Blender GLB generator: `tools/blender/generate_memphis_asset_kit.py`
- Generated textures: `apps/web-tour/public/assets/generated/textures/`
- Generated GLBs: `apps/web-tour/public/assets/generated/glb/`
- QA/design screenshots: `docs/design/screenshots/`
- Art direction notes: `docs/design/hero-street-art-direction-v1.md`
- Camera lock: `content/scene-data/hero-street.camera-lock.json`
- Camera lock docs: `docs/design/hero-street-camera-lock.md`

Recent quality-pass direction:

- Exposure and haze were reduced.
- Palette was moved toward darker dirt, sun-baked mudbrick, dusty plaster, pale linen, and clay pottery.
- The old Babylon hero street scaffold is hidden when the authored GLB hero street loads.
- The remaining quality gap is mostly material realism: ground banding, procedural texture feel, lack of true baked lightmaps, and not enough close-up material breakup.

## 8. Product Tone

The product phrase should be "historically plausible reconstruction." The user accepts that uncertainty exists and wants beautiful AI-assisted reconstruction, but the experience should be grounded in evidence, architecture, literature, surviving artifacts, historical writing, and license-safe references.

The cinematic goal should not erase honesty. The scene can be beautiful, but the evidence system must keep confirmed, inferred, and speculative elements visible when requested.
