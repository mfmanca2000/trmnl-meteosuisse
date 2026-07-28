const express = require('express')
const router = express.Router()

const BASE_URL = 'https://tennis-api-atp-wta-itf.p.rapidapi.com/tennis/v2'
const RAPIDAPI_HOST = 'tennis-api-atp-wta-itf.p.rapidapi.com'
const TIMEZONE = process.env.TENNIS_TIMEZONE || 'Europe/Zurich'
const TOURS = ['atp', 'wta', 'itf']
const DEFAULT_TOUR = 'atp'
// Fixtures can span many tournaments on a busy day (main tour + challengers);
// resolving every tournamentId to a name/country is one extra request each,
// so cap it.
const MAX_TOURNAMENT_LOOKUPS = 30
const FLAG_BASE_URL = 'https://flagcdn.com/w80'

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

// Tournament host country comes back as a 3-letter (mostly IOC-style) code
// (e.g. "USA", "SUI", "GBR"), but flagcdn.com keys images by ISO 3166-1
// alpha-2 ("us", "ch", "gb"). This maps the common tennis-tour host
// countries; anything missing just renders without a flag rather than a
// broken image.
const IOC_TO_ISO2 = {
  ALG: 'dz', ARG: 'ar', ARM: 'am', AUS: 'au', AUT: 'at', AZE: 'az',
  BAH: 'bs', BAR: 'bb', BEL: 'be', BIH: 'ba', BLR: 'by', BOL: 'bo',
  BRA: 'br', BUL: 'bg',
  CAN: 'ca', CHI: 'cl', CHN: 'cn', COL: 'co', CRC: 'cr', CRO: 'hr',
  CYP: 'cy', CZE: 'cz',
  DEN: 'dk', DOM: 'do',
  ECU: 'ec', EGY: 'eg', ESA: 'sv', ESP: 'es', EST: 'ee',
  FIN: 'fi', FRA: 'fr',
  GBR: 'gb', GEO: 'ge', GER: 'de', GRE: 'gr', GUA: 'gt',
  HKG: 'hk', HON: 'hn', HUN: 'hu',
  INA: 'id', IND: 'in', IRI: 'ir', IRL: 'ie', ISL: 'is', ISR: 'il', ITA: 'it',
  JOR: 'jo', JPN: 'jp',
  KAZ: 'kz', KOR: 'kr', KOS: 'xk', KSA: 'sa', KUW: 'kw',
  LAT: 'lv', LBN: 'lb', LIE: 'li', LTU: 'lt', LUX: 'lu',
  MAR: 'ma', MAS: 'my', MDA: 'md', MEX: 'mx', MKD: 'mk', MLT: 'mt',
  MNE: 'me', MON: 'mc',
  NED: 'nl', NGR: 'ng', NOR: 'no', NZL: 'nz',
  PAN: 'pa', PAR: 'py', PER: 'pe', PHI: 'ph', POL: 'pl', POR: 'pt', PUR: 'pr',
  QAT: 'qa',
  ROU: 'ro', RSA: 'za', RUS: 'ru',
  SGP: 'sg', SLO: 'si', SRB: 'rs', SUI: 'ch', SVK: 'sk', SWE: 'se',
  THA: 'th', TPE: 'tw', TUN: 'tn', TUR: 'tr',
  UAE: 'ae', UKR: 'ua', URU: 'uy', USA: 'us', UZB: 'uz',
  VEN: 've', VIE: 'vn',
  ZIM: 'zw',
}

function flagUrlFor(countryAcr) {
  if (!countryAcr) return null
  const iso2 = IOC_TO_ISO2[String(countryAcr).toUpperCase()]
  return iso2 ? `${FLAG_BASE_URL}/${iso2}.png` : null
}

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

// The fixtures endpoint only returns tournamentId/roundId (no names or
// country), so each unique tournament needs a separate lookup to get a
// display name and host country. A lookup failure just falls back to a
// numbered placeholder rather than failing the whole request.
async function fetchTournamentInfo(tour, tournamentId) {
  try {
    const res = await fetch(`${BASE_URL}/${tour}/tournament/info/${tournamentId}`, { headers: rapidApiHeaders() })
    if (!res.ok) return null
    const body = await res.json()
    if (!body.data) return null
    return {
      name: body.data.name || null,
      countryAcr: (body.data.country && body.data.country.acronym) || null,
    }
  } catch (err) {
    return null
  }
}

async function buildTournamentInfoMap(tour, fixtures) {
  const uniqueIds = [...new Set(fixtures.map((f) => f.tournamentId).filter((id) => id != null))].slice(
    0,
    MAX_TOURNAMENT_LOOKUPS
  )
  const infos = await Promise.all(uniqueIds.map((id) => fetchTournamentInfo(tour, id)))
  const map = new Map()
  uniqueIds.forEach((id, i) => map.set(id, infos[i]))
  return map
}

function formatMatch(fixture, tournamentInfoMap) {
  const player1 = fixture.player1 || {}
  const player2 = fixture.player2 || {}
  const tournamentInfo = tournamentInfoMap.get(fixture.tournamentId)

  let timeLabel = null
  if (fixture.timeGame) {
    const parsed = new Date(fixture.timeGame)
    if (!Number.isNaN(parsed.getTime())) timeLabel = timeFormatter.format(parsed)
  }

  return {
    id: fixture.id,
    tournamentId: fixture.tournamentId,
    tournamentName: (tournamentInfo && tournamentInfo.name) || `Tournament #${fixture.tournamentId}`,
    tournamentFlagUrl: flagUrlFor(tournamentInfo && tournamentInfo.countryAcr),
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
    const tournamentInfoMap = await buildTournamentInfoMap(tour, fixtures)

    const matches = fixtures
      .map((fixture) => formatMatch(fixture, tournamentInfoMap))
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
