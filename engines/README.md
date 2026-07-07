# Engine Runtimes

Runtime folders should import from shared content and data rather than owning their own isolated world definitions.

- `unreal`: primary high-fidelity VR target.
- `unity`: optional future adapter.

The browser target lives under `apps/web-tour` because it is a web app, not an engine project.
