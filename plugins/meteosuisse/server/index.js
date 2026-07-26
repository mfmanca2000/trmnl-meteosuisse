const express = require('express')
const { getHourlyForecast } = require('./meteoSwissClient')
const { getCommuneName } = require('./communeLookup')
const router = express.Router()

router.use('/icons', express.static(__dirname + '/public/icons'))

router.get('/forecast', async (req, res) => {
  try {
    const npa = req.query.NPA ?? req.query.npa
    if (!npa) {
      return res.status(400).json({ error: 'Missing required "NPA" query parameter' })
    }

    const hours = req.query.hours ? Number(req.query.hours) : undefined
    const [forecast, commune] = await Promise.all([
      getHourlyForecast(npa, { hours }),
      getCommuneName(npa),
    ])
    // TRMNL renders this template on its own servers, so image URLs must be
    // absolute rather than relative to this server.
    const baseUrl = `${req.protocol}://${req.get('host')}`
    const hourly = forecast.map((entry) => ({
      ...entry,
      iconUrl: entry.iconUrl ? `${baseUrl}${entry.iconUrl}` : null,
    }))
    res.json({ npa, commune, hourly })
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

module.exports = router
