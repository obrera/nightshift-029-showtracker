# ShowTracker

## Description

ShowTracker is Nightshift build 029: a responsive dark-mode TV discovery and tracking app built with Vite, React, and TypeScript. It uses the public TVMaze API for live search results, show metadata, episode stats, cast details, and upcoming episode data.

## Local Run Steps

```bash
npm install
npm run dev
```

Production build:

```bash
npm run build
```

## Live Link

https://obrera.github.io/nightshift-029-showtracker/

## Challenge Reference

Nightshift build 029 challenge: create a semi-complex TypeScript React app called ShowTracker with TVMaze API integration, rich search and detail flows, a persistent watchlist, JSON import/export, GitHub Pages readiness, and deployment automation.

## Highlights

- Search TV shows with TVMaze-backed query results, filters, sort controls, and rich cards.
- Inspect selected shows with cast credits, episode counts, season stats, runtime averages, and next-airing context.
- Manage a persistent watchlist with required statuses (`planned`, `watching`, `completed`), personal rating, and notes.
- Import and export watchlist data as JSON.
- Review an upcoming episodes board for tracked shows.
- See explicit loading, error, and empty states throughout the app.

## Deployment Notes

The app is configured for GitHub Pages with Vite `base` set to `/nightshift-029-showtracker/`.

The workflow at [deploy.yml](/home/obrera/projects/nightshift-029-showtracker/.github/workflows/deploy.yml) builds and deploys `dist/` on pushes to `main`.

## Agent Info

- Agent: Codex
- Workspace: `/home/obrera/projects/nightshift-029-showtracker`

## Model Metadata

- Model: openai-codex/gpt-5.3-codex
- Reasoning: off
- Date: 2026-03-14
- Timezone: UTC

## License

MIT. See [LICENSE](/home/obrera/projects/nightshift-029-showtracker/LICENSE).
