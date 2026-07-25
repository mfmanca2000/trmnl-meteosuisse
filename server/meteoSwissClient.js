const { getCondition, getIconUrl } = require('./weatherIcons')

const BASE_URL = 'https://app-prod-ws.meteoswiss-app.ch/v1/plzDetail'

const WEATHER_ICON_INTERVAL_HOURS = 3
const HOUR_MS = 60 * 60 * 1000
const DISPLAY_TIMEZONE = 'Europe/Zurich'

const hourFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: DISPLAY_TIMEZONE,
  hour: '2-digit',
  hour12: false,
})

// Formats an hour as "14h" in the Bern/Zurich local time, regardless of the
// server's own timezone. Some ICU builds render midnight as "24" rather
// than "00", so that case is normalized explicitly.
function formatHourLabel(date) {
  const hour = hourFormatter.formatToParts(date).find((part) => part.type === 'hour').value
  return `${hour === '24' ? '00' : hour}h`
}

function normalizeNpa(npa) {
  const value = String(npa).trim()
  if (!/^\d{4}$/.test(value)) {
    throw new Error(`Invalid NPA code "${npa}": expected 4 digits (e.g. "8001")`)
  }
  return value
}

async function fetchPlzDetail(npa) {
  const plz = normalizeNpa(npa)
  const url = `${BASE_URL}?plz=${plz}00`

  const res = await fetch(url, {
    headers: { Accept: 'application/json' },
  })

  if (!res.ok) {
    throw new Error(`MeteoSwiss API request failed with status ${res.status}`)
  }

  return res.json()
}

// The API returns 1h-resolution arrays (temperature, precipitation, wind, sunshine)
// alongside 3h-resolution arrays (weather icon, wind direction, precipitation probability),
// both starting at graph.start rather than the current time. This flattens both into one
// array of hourly entries starting from the current hour, reusing each 3h value for the
// hours it covers.
function buildHourlyForecast(graph, hours, fromMs) {
  const startMs = graph.start
  const arrayLength = graph.temperatureMean1h.length
  const startIndex = Math.min(arrayLength, Math.max(0, Math.round((fromMs - startMs) / HOUR_MS)))
  const endIndex = Math.min(arrayLength, startIndex + hours)

  const entries = []
  for (let i = startIndex; i < endIndex; i++) {
    const bucket3h = Math.floor(i / WEATHER_ICON_INTERVAL_HOURS)
    const date = new Date(startMs + i * HOUR_MS)

    entries.push({
      time: date.toISOString(),
      hourLabel: formatHourLabel(date),
      temperature: graph.temperatureMean1h[i],
      temperatureMin: graph.temperatureMin1h[i],
      temperatureMax: graph.temperatureMax1h[i],
      precipitation: graph.precipitation1h[i],
      precipitationProbability: graph.precipitationProbability3h[bucket3h],
      weatherIcon: graph.weatherIcon3h[bucket3h],
      condition: getCondition(graph.weatherIcon3h[bucket3h]),
      iconUrl: getIconUrl(graph.weatherIcon3h[bucket3h]),
      windSpeed: graph.windSpeed1h[i],
      windDirection: graph.windDirection3h[bucket3h],
      gustSpeed: graph.gustSpeed1h[i],
      sunshine: graph.sunshine1h[i],
    })
  }

  return entries
}

async function getHourlyForecast(npa, { hours = 48, from = new Date() } = {}) {
  const data = await fetchPlzDetail(npa)
  return buildHourlyForecast(data.graph, hours, from.getTime())
}

module.exports = {
  fetchPlzDetail,
  getHourlyForecast,
}
