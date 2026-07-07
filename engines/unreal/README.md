# Unreal Target

This is the primary full VR target. It should import shared scene manifests from `content/scene-data` and runtime assets from `content/processed`.

## Early Setup

1. Open `EgyptVRTour.uproject` with an installed Unreal version.
2. Keep authored Unreal-only content inside this folder.
3. Keep historically meaningful scene data in `content/scene-data`.
4. Keep source provenance in `content/source-references`.

## Planned Import Bridge

Later tooling should convert shared tour manifests into Unreal data assets or level-sequence markers:

- route stops
- evidence levels
- narration beats
- comfort boundaries
- asset placement manifests

The Unreal scene should become a high-fidelity interpretation of the shared data, not a separate canon.
