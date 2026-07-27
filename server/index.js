const express = require('express')
const app = express()

// Vercel terminates TLS at the edge and forwards over plain HTTP, so
// req.protocol only reflects the original scheme (from X-Forwarded-Proto)
// when trust proxy is enabled.
app.set('trust proxy', true)

app.use('/api/meteosuisse', require('@trmnl-plugins/meteosuisse'))
app.use('/api/homeassistant-energy', require('@trmnl-plugins/homeassistant-energy'))
app.use('/api/daily-saints', require('@trmnl-plugins/daily-saints'))
app.use('/api/bored-api', require('@trmnl-plugins/bored-api'))
// Add future plugins here, e.g.:
// app.use('/api/<name>', require('@trmnl-plugins/<name>'))

const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`)
})
