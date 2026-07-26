const HA_BASE_URL = (process.env.HA_BASE_URL || '').replace(/\/+$/, '')
const HA_TOKEN = process.env.HA_TOKEN
const HA_TIMEZONE = process.env.HA_TIMEZONE || 'Europe/Zurich'

function assertConfigured() {
  if (!HA_BASE_URL || !HA_TOKEN) {
    throw new Error('HA_BASE_URL and HA_TOKEN environment variables must be set')
  }
}

async function haFetch(path) {
  assertConfigured()
  const res = await fetch(`${HA_BASE_URL}${path}`, {
    headers: {
      Authorization: `Bearer ${HA_TOKEN}`,
      Accept: 'application/json',
    },
  })

  if (!res.ok) {
    throw new Error(`Home Assistant request to ${path} failed with status ${res.status}`)
  }

  return res.json()
}

function parseNumericState(state) {
  const value = Number(state)
  return Number.isFinite(value) ? value : null
}

async function getState(entityId) {
  const data = await haFetch(`/api/states/${entityId}`)
  return parseNumericState(data.state)
}

// Home Assistant's history API takes a UTC instant, but "today" needs to mean
// midnight in HA_TIMEZONE, not midnight UTC. Intl.DateTimeFormat gives the
// calendar date and UTC offset for that zone without pulling in a date library.
function utcOffsetMinutes(date, timeZone) {
  const offsetPart = new Intl.DateTimeFormat('en-US', { timeZone, timeZoneName: 'shortOffset' })
    .formatToParts(date)
    .find((part) => part.type === 'timeZoneName').value

  const match = offsetPart.match(/GMT([+-]\d+)(?::(\d+))?/)
  if (!match) return 0
  const hours = Number(match[1])
  const minutes = Number(match[2] || 0)
  return hours * 60 + (hours < 0 ? -minutes : minutes)
}

function startOfLocalDay(now, timeZone) {
  const [year, month, day] = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
    .format(now)
    .split('-')
    .map(Number)

  const utcMidnightGuess = Date.UTC(year, month - 1, day)
  return new Date(utcMidnightGuess - utcOffsetMinutes(now, timeZone) * 60_000)
}

// Returns how much `entityId` has accumulated since local midnight. Works
// whether the sensor resets to 0 daily (delta ~= latest reading) or
// accumulates forever (delta = latest - baseline), and falls back to the
// latest reading if a meter reset happened partway through the day.
async function getEnergyToday(entityId) {
  const now = new Date()
  const since = startOfLocalDay(now, HA_TIMEZONE)
  const path = `/api/history/period/${since.toISOString()}?filter_entity_id=${entityId}&minimal_response=true&no_attributes=true`
  const [history] = await haFetch(path)

  const states = (history || []).map((entry) => parseNumericState(entry.state)).filter((value) => value !== null)

  if (states.length === 0) {
    return (await getState(entityId)) ?? 0
  }

  const delta = states[states.length - 1] - states[0]
  return delta < 0 ? states[states.length - 1] : delta
}

module.exports = {
  getState,
  getEnergyToday,
}
