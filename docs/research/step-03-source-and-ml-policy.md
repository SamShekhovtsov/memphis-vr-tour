# Step 3 Source And ML Policy

Status: first pass, checked 2026-07-07.

Scope: Ancient Memphis, focused on the early Ptah / Hwt-ka-Ptah precinct and Kom el-Fakhry / Mit Rahina settlement evidence.

## Core Rule

Do not treat "not displayed to the user" as automatic permission to use a source for machine learning. Training, fine-tuning, embedding, bulk extraction, and uploading source media into third-party tools can still copy or transform protected material. The conservative project rule is:

- Use CC0, public-domain, owned, commissioned, or explicitly ML-permitted material for datasets and fine-tuning.
- Use copyrighted or unclear-license sources only for human research notes, citations, and high-level factual guidance unless permission is obtained.
- Keep every source tied to a license status and an intended use before it enters the asset pipeline.

This is a project policy, not legal advice. Before commercial training on anything outside CC0/public-domain/owned/explicitly permitted material, get legal review or written permission.

## Recommended Use Classes

| Use class | Meaning | Allowed source types |
| --- | --- | --- |
| `dataset-ok` | Can be stored locally and used for ML experiments or fine-tuning. | CC0, public domain, owned, commissioned, or license explicitly allowing model training. |
| `rag-ok` | Can be ingested into a retrieval database with citation metadata. | Open texts/data with compatible license; short curated factual notes from restricted sources when copying is avoided. |
| `human-reference` | Can be read by the team and used to guide decisions, but not copied into training sets. | Copyrighted articles, official websites, museum pages, restricted images, unclear licenses. |
| `runtime-ok` | Can be displayed in the app if attribution and terms are followed. | CC0, public domain, owned, commissioned, or compatible Creative Commons media. |
| `permission-needed` | Do not use in datasets, runtime, or automated generation prompts until written permission is obtained. | All-rights-reserved media, commercial images/video, modern papers behind publisher terms, unclear rights. |

## Location-Specific Sources

These are the most important sources for the exact Memphis anchors, but most are not automatically safe for fine-tuning.

| Source | Relevance | Current use decision |
| --- | --- | --- |
| [UNESCO: Memphis and its Necropolis](https://whc.unesco.org/en/list/86/) | Confirms Memphis/necropolis importance and broad monument context. | `human-reference`, `rag-ok` for short factual notes with citation. |
| [British Museum: Temple of Ptah, Memphis](https://www.britishmuseum.org/collection/term/x30320) | Good identifier for Hwt-ka-Ptah / Hut-Ka-Ptah as the Great Temple of Memphis. | `human-reference`; do not train on images unless item/license allows. |
| [Egypt Ministry of Tourism and Antiquities: Temple of Ptah blocks](https://egymonuments.gov.eg/news/excavations-unveil-a-portion-of-the-temple-of-ptah/) | Official update about blocks believed to belong to the Great Temple of Ptah. | `human-reference`; MoTA media hub states all rights reserved. |
| [AERA: Memphis](https://aeraweb.org/projects/memphis/) | Mit Rahina, Kom el-Fakhry field school, Ptah Temple West Gate, project bibliography, downloadable reports. | `human-reference`; AERA page footer says all rights reserved. |
| [SFAR: Kom el-Fakhry Archaeological Project](https://www.sphinxarchaeology.org/komelfakhry) | Direct current project page for Kom el-Fakhry. | `human-reference`; no clear open media/data license found. |
| [JARCE/Lockwood: MKAP 2023 preliminary report](https://lockwoodonlinejournals.com/index.php/jarce/article/view/2855) | Recent excavation report metadata for Kom el-Fakhry. | `human-reference`; use citation/abstract only unless article license permits more. |
| [AERAgram: Memphis, A City Unseen](https://aeraweb.org/wp-content/uploads/2022/08/aeragram13_1.pdf) | Useful field context for Memphis and Kom el-Fakhry. | `human-reference`; do not train on PDF/images without permission. |
| [Petrie, Memphis I, Internet Archive](https://archive.org/details/memphisi00petr) | Early excavation publication; useful plans and context. | Candidate `dataset-ok` if item-level public-domain status is verified for the local jurisdiction. |
| [Petrie, Memphis II, Internet Archive](https://archive.org/details/palaceofapriesme00petr) | Memphis excavation publication for later palace context. | Candidate `dataset-ok` after public-domain verification. |
| [Petrie, Meydum and Memphis III, Internet Archive](https://archive.org/details/meydummemphisiii00petr) | Memphis and comparative architecture/context. | Candidate `dataset-ok` after public-domain verification. |
| [Wikimedia Commons: Temple of Ptah in Memphis](https://commons.wikimedia.org/wiki/Category:Temple_of_Ptah_in_Memphis) | Open media category around the Ptah temple remains and related artifacts. | Per-file review required; prefer CC0/public-domain for datasets. |
| [Wikimedia Commons: Mit Rahina](https://commons.wikimedia.org/wiki/Category:Mit_Rahina) | Open media category for modern Mit Rahina. | Per-file review required; prefer CC0/public-domain for datasets. |

## Safer Dataset Sources

These are not always exact Memphis sources, but they are the safest inputs for visual style, artifacts, clothing, tools, daily life, wall painting language, and material references.

| Source | License signal checked | Best use |
| --- | --- | --- |
| [The Met Open Access](https://www.metmuseum.org/hubs/open-access) | Public-domain images/data under CC0; API terms identify Open Access icon content as CC0. | `dataset-ok`, `runtime-ok`, `rag-ok`. Strong source for Egyptian artifacts, reliefs, people, clothing, tools, daily-life models. |
| [The Met: Old Kingdom cattle relief](https://www.metmuseum.org/art/collection/search/551094) | Public Domain object page. | Good reference for Old Kingdom relief style, people, clothing, animals, and paint traces. |
| [The Met: Meketre bakery/brewery model](https://www.metmuseum.org/art/collection/search/544258) | Open Access/public-domain route; Middle Kingdom, not Memphis/Old Kingdom. | Useful adjacent reference for craft/labor ambience, but label as later/comparative. |
| [Cleveland Museum of Art Open Access](https://www.clevelandart.org/open-access) | CC0 images and metadata for public-domain artworks. | `dataset-ok` for Egyptian reliefs, sculpture, objects, style references. |
| [Smithsonian Open Access](https://www.si.edu/openaccess) | CC0 2D/3D images and data where designated Open Access. | `dataset-ok`, especially for 3D/object references when Egyptian items are available. |
| [Walters Art Museum image rights](https://thewalters.org/about/policies/rights-reproductions/) | CC0 for public-domain images and metadata in Walters interfaces, with exceptions. | `dataset-ok` after item-level check. |
| [Wikimedia Commons licensing](https://commons.wikimedia.org/wiki/Commons:Licensing) | Commons accepts freely licensed/public-domain media; individual file terms still control. | Good discovery layer; use only after file-level license capture. |
| [Natural Earth terms](https://www.naturalearthdata.com/about/terms-of-use/) | Public-domain map data. | `dataset-ok` and `runtime-ok` for broad map/background data. |
| [OpenStreetMap copyright](https://www.openstreetmap.org/copyright) | ODbL data, attribution and share-alike obligations. | Good for modern coordinates/navigation context; keep separate from proprietary scene DB. |

## Egyptian Language Sources

| Source | Use decision |
| --- | --- |
| [TLA website](https://thesaurus-linguae-aegyptiae.de/) | Serious reference corpus, but use web app according to its registration/copyright terms. Do not scrape directly unless terms/API explicitly allow. |
| [TLA licenses page](https://thesaurus-linguae-aegyptiae.de/info/licenses) | Use for citation and font/license checks. |
| [TLA Earlier Egyptian dataset on Hugging Face](https://huggingface.co/datasets/thesaurus-linguae-aegyptiae/tla-Earlier_Egyptian_original-v18-premium) | `dataset-ok` for the direct uses listed in the dataset card, under CC BY-SA 4.0. Good candidate for transliteration, lemmatization, and limited language tooling. Watch share-alike obligations. |
| [Project Gutenberg: Literature of the Ancient Egyptians](https://www.gutenberg.org/files/15932/15932-h/15932-h.htm) | Public-domain historical translations in the US, but Egyptology may be outdated. Use for background only, not as truth without modern check. |
| [Wikisource: Herodotus](https://en.wikisource.org/wiki/Author:Herodotus) | Public-domain translations exist; Herodotus is later and Greek-perspective. Use only as historical reception/context, not as Old Kingdom Memphis truth. |

## Restricted Or Careful Sources

- British Museum images are often CC BY-NC-SA for non-commercial use and commercial use requires licensing. Do not put British Museum images into a commercial fine-tuning set without permission.
- Egypt Ministry / egymonuments media is marked all rights reserved in the media hub. Use facts and official citations only.
- AERA and SFAR pages are important, but their websites/media do not provide a broad ML-training license. Treat as human research unless permission is granted.
- UCL Digital Egypt is useful educationally, but UCL describes the site media as copyrighted. Use as human reference, not dataset material.
- Digital Giza is excellent for Old Kingdom comparison, but item-level rights must be checked before dataset use.
- YouTube videos, tourist videos, museum walkthroughs, scans from modern books, Google Maps/Earth imagery, commercial 360 tours, and paywalled paper PDFs are `permission-needed` for training/fine-tuning.

## Model Strategy

We do not need a dedicated large model for each domain at the MVP stage. We need a modular pipeline:

1. Knowledge and evidence layer
   Use a retrieval database with source citations, period tags, location tags, and evidence levels. This powers narrator text, tooltips, evidence view, and prompt packs.

2. Architecture layer
   Use procedural generation and authored rules, not a learned model first. Mudbrick houses, courtyards, storage bins, precinct walls, gates, axial courts, shrine interiors, and streets should be generated from tunable parameters tied to evidence notes.

3. Visual and texture layer
   Use existing image/texture generation models with curated prompt packs and CC0/public-domain reference boards. Fine-tune a small LoRA only after we have enough clean CC0/owned images for one narrow task, such as Old Kingdom relief color language or Egyptian limestone/mudbrick material surfaces.

4. Wall painting and relief layer
   Start with procedural motifs and hand-curated CC0/PD references. Later, train a narrow adapter for painted-wall style if the dataset is clean enough. Never train on museum photos or paper plates whose terms forbid or do not clearly allow this.

5. Clothing and NPC layer
   Use existing character tools, simple mesh variants, and CC0/PD reference-driven concept art. Do not train a people/clothing model until we have a clean dataset and a clear style target.

6. Egyptian language layer
   Do not let the general LLM invent Ancient Egyptian. Use TLA/Hugging Face data and reference dictionaries for transliteration experiments, then keep in-app inscriptions short, cited, and flagged for expert review. For MVP, generated language should be decorative or optional unless verified.

7. Audio and narration layer
   Use existing voice/audio tools for English narration and ambience. Ancient Egyptian spoken dialogue should be avoided or clearly stylized until reviewed by an Egyptologist.

## Fine-Tuning Trigger Points

Do not fine-tune yet. Fine-tune only when a narrow dataset exists:

- 300 to 1,000+ CC0/public-domain/owned images for one visual adapter.
- Source spreadsheet with license, URL, creator/institution, object ID, period, location, allowed use, and evidence tag.
- Dataset card explaining exclusions, cultural-sensitivity decisions, and intended use.
- Test prompts and rejection rules showing the adapter improves accuracy without overfitting to one institution or modern reconstruction.

Likely first adapter: Egyptian painted relief / wall painting texture style from CC0/public-domain museum images and public-domain excavation plates.

Do not train from scratch. Use existing models plus small adapters only where the project gains real quality.

## Immediate Next Tasks

1. Build a source ingestion script that only accepts sources from `memphis-source-register.json` with `dataset-ok` or `rag-ok`.
2. Create a local provenance spreadsheet/export for every downloaded asset.
3. Pull a small CC0 test set from The Met API for Old Kingdom reliefs, tools, clothing, animals, and domestic/craft scenes.
4. Keep AERA/SFAR/MoTA/JARCE sources as cited research notes until permission or clear license terms are available.
5. Add an in-app provenance debug view later, linking scene objects back to evidence categories and source groups.

For the browser-specific definition of done, see [Step 3 Browser Implementation Plan](step-03-browser-implementation-plan.md).
