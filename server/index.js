const express = require('express')
const { getHourlyForecast } = require('./meteoSwissClient')
const { getCommuneName } = require('./communeLookup')
const app = express()

// Vercel terminates TLS at the edge and forwards over plain HTTP, so
// req.protocol only reflects the original scheme (from X-Forwarded-Proto)
// when trust proxy is enabled.
app.set('trust proxy', true)

app.use('/icons', express.static(__dirname + '/public/icons'))

app.get('/api/forecast/:npa', async (req, res) => {
  try {
    const hours = req.query.hours ? Number(req.query.hours) : undefined
    const [forecast, commune] = await Promise.all([
      getHourlyForecast(req.params.npa, { hours }),
      getCommuneName(req.params.npa),
    ])
    // TRMNL renders this template on its own servers, so image URLs must be
    // absolute rather than relative to this server.
    const baseUrl = `${req.protocol}://${req.get('host')}`
    const hourly = forecast.map((entry) => ({
      ...entry,
      iconUrl: entry.iconUrl ? `${baseUrl}${entry.iconUrl}` : null,
    }))
    res.json({ npa: req.params.npa, commune, hourly })
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`)
})