const express = require('express')
const router = express.Router()

const BASE_URL = 'https://tennis-api-atp-wta-itf.p.rapidapi.com/tennis/v2'
const RAPIDAPI_HOST = 'tennis-api-atp-wta-itf.p.rapidapi.com'
const TIMEZONE = process.env.TENNIS_TIMEZONE || 'Europe/Zurich'
const TOURS = ['atp', 'wta', 'itf']
const DEFAULT_TOUR = 'atp'
// Fixtures can span many tournaments on a busy day (main tour + challengers);
// resolving every tournamentId to a name is one extra request each, so cap it.
const MAX_TOURNAMENT_LOOKUPS = 30

const updatedAtFormatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: TIMEZONE,
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
})

const timeFormatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: TIMEZONE,
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
})

function rapidApiHeaders() {
  return {
    'x-rapidapi-host': RAPIDAPI_HOST,
    'x-rapidapi-key': process.env.TENNIS_RAPIDAPI_KEY || '',
  }
}

async function fetchFixtures(tour) {
  const res = await fetch(`${BASE_URL}/${tour}/fixtures`, { headers: rapidApiHeaders() })
  if (!res.ok) {
    throw new Error(`Fixtures request failed with status ${res.status}`)
  }
  const body = await res.json()
  return Array.isArray(body.data) ? body.data : []
}

// The fixtures endpoint only returns tournamentId/roundId (no names), so
// each unique tournament needs a separate lookup to get a display name.
// A lookup failure just falls back to a numbered placeholder rather than
// failing the whole request.
async function fetchTournamentName(tour, tournamentId) {
  try {
    const res = await fetch(`${BASE_URL}/${tour}/tournament/info/${tournamentId}`, { headers: rapidApiHeaders() })
    if (!res.ok) return null
    const body = await res.json()
    return (body.data && body.data.name) || null
  } catch (err) {
    return null
  }
}

async function buildTournamentNameMap(tour, fixtures) {
  const uniqueIds = [...new Set(fixtures.map((f) => f.tournamentId).filter((id) => id != null))].slice(
    0,
    MAX_TOURNAMENT_LOOKUPS
  )
  const names = await Promise.all(uniqueIds.map((id) => fetchTournamentName(tour, id)))
  const map = new Map()
  uniqueIds.forEach((id, i) => map.set(id, names[i]))
  return map
}

function formatMatch(fixture, tournamentNameMap) {
  const player1 = fixture.player1 || {}
  const player2 = fixture.player2 || {}

  let timeLabel = null
  if (fixture.timeGame) {
    const parsed = new Date(fixture.timeGame)
    if (!Number.isNaN(parsed.getTime())) timeLabel = timeFormatter.format(parsed)
  }

  return {
    id: fixture.id,
    tournamentId: fixture.tournamentId,
    tournamentName: tournamentNameMap.get(fixture.tournamentId) || `Tournament #${fixture.tournamentId}`,
    roundLabel: fixture.roundId != null ? `Round ${fixture.roundId}` : null,
    isLive: Boolean(fixture.live),
    timeLabel,
    player1: {
      name: player1.name || 'TBD',
      country: player1.countryAcr && player1.countryAcr !== 'N/A' ? player1.countryAcr : null,
    },
    player2: {
      name: player2.name || 'TBD',
      country: player2.countryAcr && player2.countryAcr !== 'N/A' ? player2.countryAcr : null,
    },
  }
}

router.get('/matches', async (req, res) => {
  const requestedTour = String(req.query.tour || '').trim().toLowerCase()
  const tour = TOURS.includes(requestedTour) ? requestedTour : DEFAULT_TOUR

  try {
    const fixtures = await fetchFixtures(tour)
    const tournamentNameMap = await buildTournamentNameMap(tour, fixtures)

    const matches = fixtures
      .map((fixture) => formatMatch(fixture, tournamentNameMap))
      .sort((a, b) => (a.tournamentId || 0) - (b.tournamentId || 0))

    res.json({
      tour,
      matches,
      count: matches.length,
      updatedAtLabel: updatedAtFormatter.format(new Date()),
    })
  } catch (err) {
    res.status(502).json({ error: err.message })
  }
})

module.exports = router
