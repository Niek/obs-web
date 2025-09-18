# Repository Guidelines

## Project Structure & Module Organization
The client app is a SvelteKit SPA under `src/routes/+page.svelte`, with browser-only behaviour enforced via `src/routes/+layout.js` (`ssr = false`, `prerender = false`). Reusable UI flows (scene/source switchers, profile selectors, etc.) stay alongside `obs.js` in `src/`. Global Bulma overrides live in `src/style.scss`, imported once from the root layout. Source assets meant for publishing live in `static/`; running `npm run build` outputs the production bundle (single JS/CSS files plus `index.html`) into `public/` ready for deployment. Tooling is configured through `svelte.config.js`, which also exports the shared Vite configuration.

## Build, Test, and Development Commands
Run `npm install` to sync dependencies. Use `npm run dev` for the Vite-powered dev server (port 8080 by default). Ship builds with `npm run build`; it produces a fully purged, minified SPA in `public/` (single JS + CSS bundle). Serve that bundle locally with `npm run start` (`vite preview`). Keep linting clean via `npm run lint`, which runs StandardJS on JS/Svelte sources.

## Coding Style & Naming Conventions
Follow StandardJS defaults: two-space indentation, semicolon-free modules, and single quotes. Svelte components should remain PascalCase (`ProgramPreview.svelte`), while helper modules (e.g., `obs.js`) stay lowercase. Prefer descriptive store and prop names that mirror OBS concepts. Centralize OBS connection constants in `obs.js` so UI components stay presentation-focused.

## Testing Guidelines
Automated tests are not yet set up; validate changes through targeted manual QA. Exercise scene switching, profile loading, and OBS connection flows in the app after each change. When adding test infrastructure, colocate files beside components (`Component.spec.js`) and gate merges on the suite by adding an npm script.

## Commit & Pull Request Guidelines
Keep commits focused and prefix messages with a conventional scope when possible (e.g., `chore(deps-dev): bump rollup`). Reference issues inline (`Fix #123`) when closing them. Pull requests should outline the user-visible impact, describe manual validation steps, and attach screenshots or screen recordings for UI changes, especially when touching scene/source switching flows.

## OBS Configuration Tips
Document new OBS websocket requirements inside `README.md` and surface any default host/port changes in `obs.js`. When introducing settings, ensure defaults persist via local storage so returning operators are not blocked.
