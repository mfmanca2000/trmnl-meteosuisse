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
| [homeassistant-energy](plugins/homeassistant-energy) | Solar/battery/grid energy snapshot, sourced from a Home Assistant instance | `/api/homeassistant-energy/status` |
| [daily-saints](plugins/daily-saints) | Saint of the day, sourced from a local copy of the [daily-saints](https://github.com/ACoci86/daily-saints) data, in `en`/`fr`/`it`/`es` | `/api/daily-saints/today` |
| [bored-api](plugins/bored-api) | Random "something to do" activity idea, sourced from the [Bored API](https://bored-api.appbrewery.com) | `/api/bored-api/activity` |

### daily-saints translations

Saint content is served in `en`, `fr`, `it`, or `es` via the `language` query
param / custom field (falls back to `en` if missing or unrecognized). Each
language is a full static copy of the data under
`plugins/daily-saints/server/data/saints/<lang>/`, translated once ahead of
time — not machine-translated per request — since Vercel's serverless
filesystem is ephemeral and can't reliably cache a live translation between
invocations. To add another language, mirror the directory structure and
translate all 366 `MM-DD.json` files from `en/`, keeping `date`, `image`, and
`wikipedia` unchanged.

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

## Environment variables

| Variable | Used by | Purpose |
| --- | --- | --- |
| `HA_BASE_URL` | homeassistant-energy | Publicly reachable Home Assistant URL (e.g. a Nabu Casa or tunnel URL), no trailing slash |
| `HA_TOKEN` | homeassistant-energy | Home Assistant long-lived access token, sent as `Authorization: Bearer` |
| `HA_TIMEZONE` | homeassistant-energy | IANA timezone used to compute "today" energy totals (default `Europe/Zurich`) |
| `SAINTS_TIMEZONE` | daily-saints | IANA timezone used to compute "today"'s date (default `Europe/Zurich`) |
| `SAINTS_IMAGE_BASE_URL` | daily-saints | Host to prefix saint image paths with (default `https://acoci86.github.io/daily-saints`) |

Set these in the Vercel project settings for production. For local testing, copy
`server/.env.example` to `server/.env` and fill in real values — `npm run dev` and
`npm start` load it automatically (via Node's `--env-file-if-exists`) if present,
and do nothing if it's missing.

```
cp server/.env.example server/.env
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
