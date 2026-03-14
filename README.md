# Nightshift 029 ShowTracker

Responsive dark-mode TV tracking app built with Vite, React, and TypeScript against the TVMaze API.

Live URL: https://obrera.github.io/nightshift-029-showtracker/

## Features

- Search TVMaze and refine results with text, genre, watch-status, and sort controls.
- Open a detail panel with show metadata, cast credits, and episode statistics.
- Persist a local watchlist with status, personal rating, and notes.
- Surface upcoming episodes from tracked shows.
- Export and import watchlist data as JSON.
- Handle loading, error, and empty states across key views.

## Development

```bash
npm install
npm run build
npm run dev
```

## Deployment

The app is configured for GitHub Pages with Vite `base` set to `/nightshift-029-showtracker/`.

The workflow at `.github/workflows/deploy.yml` builds and deploys on pushes to `main`.

## License

MIT. See [LICENSE](/home/obrera/projects/nightshift-029-showtracker/LICENSE).
