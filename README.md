# Çalışmaç

Mobile-first AÖF question-bank web app. This repository is independent of the parser application; no parser service is required.

## Local development

Use Node.js 22.12+ (or a newer supported LTS release) and npm.

```sh
npm ci
npm run dev
```

Open the URL printed by Vite, including the `/calismac/` path.

In WebStorm, open this repository and select **Run → Edit Configurations → + → npm**. Select the root `package.json`, command `run`, and script `dev`. Run that configuration. IDE configuration files remain local and are ignored by Git.

## Checks and production build

```sh
npm run typecheck
npm run build
npm run preview
```

The build writes static files to `dist/`. Vite uses `/calismac/` as the base path for the GitHub Pages project URL `https://oxitorenk.github.io/calismac/`. Preview serves that same path locally. Deployment automation will be added in A046.

A001 provides only the application skeleton. Catalog integration, test screens, navigation and PWA support are implemented in later tasks.
