const fs = require('fs')
const path = require('path')
const express = require('express')
const router = express.Router()

const TIMEZONE = process.env.SAINTS_TIMEZONE || 'Europe/Zurich'
// Images are not bundled with this repo — the daily-saints project hosts
// them on GitHub Pages, and each saint's "image" field is a path, not a URL.
const IMAGE_BASE_URL = (process.env.SAINTS_IMAGE_BASE_URL || 'https://acoci86.github.io/daily-saints').replace(/\/+$/, '')
const DATA_DIR = path.join(__dirname, 'data', 'saints')

// Liquid's date filter has no timezone-conversion support, so "today" (in
// MM-DD form, matching the data files) is computed here instead.
const dateKeyFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: TIMEZONE,
  month: '2-digit',
  day: '2-digit',
})

const updatedAtFormatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: TIMEZONE,
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
})

function todayKey(now) {
  const parts = dateKeyFormatter.formatToParts(now)
  const month = parts.find((p) => p.type === 'month').value
  const day = parts.find((p) => p.type === 'day').value
  return `${month}-${day}`
}

function loadDay(dateKey) {
  const file = path.join(DATA_DIR, `${dateKey}.json`)
  if (!fs.existsSync(file)) return null
  return JSON.parse(fs.readFileSync(file, 'utf8'))
}

router.get('/today', (req, res) => {
  const dateKey = /^\d{2}-\d{2}$/.test(req.query.date || '') ? req.query.date : todayKey(new Date())
  const day = loadDay(dateKey)

  if (!day) {
    return res.status(404).json({ error: `No saints data for ${dateKey}` })
  }

  const saints = day.saints.map((saint) => ({
    ...saint,
    patronage: (saint.patronage || []).map((p) => p.trim()),
    image: saint.image ? `${IMAGE_BASE_URL}${saint.image}` : null,
  }))

  res.json({
    date: day.date,
    feastDay: day.feast_day,
    count: day.count,
    saints,
    updatedAtLabel: updatedAtFormatter.format(new Date()),
  })
})

module.exports = router
