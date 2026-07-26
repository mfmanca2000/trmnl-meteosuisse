# TRMNL Plugins

A monorepo of [TRMNL](https://usetrmnl.com) private plugins, all served from a single
Vercel deployment. Each plugin exposes its API under its own path prefix
(`/api/<plugin-name>/...`) on that one deployment.

## Structure

```
server/                  # the single deployed app — mounts every plugin's router
plugins/
  <plugin-name>/
    server/              # plugin's Express router + business logic (npm workspace)
    src/                 # TRMNL plugin definition: *.liquid layouts + settings.yml
    .trmnlp.yml          # local trmnlp CLI preview config for this plugin
```

## Plugins

| Plugin | Purpose | API path |
| --- | --- | --- |
| [meteosuisse](plugins/meteosuisse) | Hourly weather forecast for a Swiss NPA/PLZ, sourced from the MeteoSwiss API | `/api/meteosuisse/forecast` |

## Setup

```
npm install        # installs all workspaces (server + every plugin) from the repo root
npm run dev         # starts the unified server (all plugins mounted) on $PORT (default 3000)
```

To preview a specific plugin's Liquid layouts with [`trmnlp`](https://github.com/usetrmnl/trmnlp),
run it from inside that plugin's folder, e.g.:

```
cd plugins/meteosuisse
trmnlp serve
```

## Deployment

The repo deploys as a single Vercel project with **Root Directory set to `server`**.
Vercel detects the npm workspaces and installs from the repo root, so each plugin's
package resolves as a workspace dependency of `server`.

## Adding a new plugin

1. Create `plugins/<name>/` with `server/` (an Express Router package named
   `@trmnl-plugins/<name>`), `src/` (Liquid layouts + `settings.yml`), and `.trmnlp.yml`.
2. Add one line to `server/index.js`: `app.use('/api/<name>', require('@trmnl-plugins/<name>'))`.
3. Add `"@trmnl-plugins/<name>": "*"` to `server/package.json` dependencies.
4. Register the plugin in the TRMNL dashboard with `polling_url` pointing at
   `https://<this-deployment-domain>/api/<name>/<route>`.
