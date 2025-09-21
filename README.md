# Book a Driver — Static Web App

This repository contains a small single-page web app (HTML/CSS/JS) for booking a driver. It uses ES modules and client-side logic. The app supports an optional Mapbox integration (token stored in localStorage).

## Local testing

- Serve the files over HTTP (browsers require this for ES modules). From the project root:

```bash
python3 -m http.server 8000
# then open http://localhost:8000/index.html
```

Or use any static server (for example `npx serve .`).

## GitHub Pages deployment

This project can be hosted on GitHub Pages. A workflow is included that will publish the repository contents to Pages whenever you push to `main`.

Notes and recommendations:
- The app uses relative imports (`js/app.js`, `style.css`) so it works on Pages without build steps.
- ES modules load over HTTP — GitHub Pages serves static files, so modules will load normally.
- If you use Mapbox, do NOT commit a production token to a public repo. Use the token only in your browser localStorage for testing.

## Troubleshooting
- If the page fails to load modules, ensure you're viewing over `http://` or `https://` (not `file://`).
- Open the browser console for errors (network, CORS, or syntax). Mapbox API errors will appear there if the token is invalid.

## Deploy workflow
- The included GitHub Action automates deployment to Pages on push to `main`. See `.github/workflows/deploy.yml`.

