const express = require('express')
const router = express.Router()

const BASE_URL = 'https://bored-api.appbrewery.com'
const TIMEZONE = process.env.BORED_TIMEZONE || 'Europe/Zurich'

const updatedAtFormatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: TIMEZONE,
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
})

// Bored API has no way to fetch one random activity that also matches a
// filter, so a type/participants request goes through /filter (an array)
// and a match is picked here; an unfiltered request goes straight through
// /random. /filter answers 404 (not an empty array) when nothing matches.
router.get('/activity', async (req, res) => {
  const type = String(req.query.type || '').trim().toLowerCase()
  const participants = String(req.query.participants || '').trim()

  try {
    let activities

    if (type || participants) {
      const params = new URLSearchParams()
      if (type) params.set('type', type)
      if (participants) params.set('participants', participants)

      const filterRes = await fetch(`${BASE_URL}/filter?${params}`)
      if (filterRes.status === 404) {
        activities = []
      } else if (!filterRes.ok) {
        throw new Error(`Bored API filter request failed with status ${filterRes.status}`)
      } else {
        activities = await filterRes.json()
      }
    } else {
      const randomRes = await fetch(`${BASE_URL}/random`)
      if (!randomRes.ok) {
        throw new Error(`Bored API random request failed with status ${randomRes.status}`)
      }
      activities = [await randomRes.json()]
    }

    const activity = activities.length > 0 ? activities[Math.floor(Math.random() * activities.length)] : null

    res.json({
      activity,
      count: activities.length,
      updatedAtLabel: updatedAtFormatter.format(new Date()),
    })
  } catch (err) {
    res.status(502).json({ error: err.message })
  }
})

module.exports = router
