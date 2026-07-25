const SEARCH_URL = 'https://api3.geo.admin.ch/rest/services/ech/SearchServer'

// MeteoSwiss's own API has no place-name field, so we resolve the NPA/PLZ
// to a commune name via the Swiss federal geo.admin.ch location search.
async function getCommuneName(npa) {
  const url = `${SEARCH_URL}?searchText=${npa}&type=locations&origins=zipcode&sr=2056`

  const res = await fetch(url, {
    headers: { Accept: 'application/json' },
  })

  if (!res.ok) {
    throw new Error(`geo.admin.ch search request failed with status ${res.status}`)
  }

  const data = await res.json()
  const match = data.results && data.results[0]
  if (!match) return null

  // label looks like "<b>8001 - Zürich</b>"
  const label = match.attrs.label.replace(/<\/?b>/g, '')
  const name = label.split(' - ').slice(1).join(' - ').trim()
  return name || null
}

module.exports = {
  getCommuneName,
}
