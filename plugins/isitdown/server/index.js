const express = require('express')
const router = express.Router()

const BASE_URL = 'https://isitdownstatus.com/api/v1'
const ICON_BASE_URL = 'https://cdn.jsdelivr.net/npm/lucide-static@1.27.0/icons'
// TRMNL's grid--cols-N framework classes only go up to 12, and past that
// point cells on an e-ink screen are too small to read anyway.
const MAX_SLUGS = 12
const TIMEZONE = process.env.SERVICE_STATUS_TIMEZONE || 'Europe/Zurich'

const timeFormatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: TIMEZONE,
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
})

// Combined signal from the API: "operational" | "degraded" | "down". Any
// other value (or a lookup failure) falls back to STATUS_META.unknown.
const STATUS_META = {
  operational: { icon: 'check-circle-2', text: 'Operational', labelClass: 'label--success' },
  degraded: { icon: 'alert-triangle', text: 'Degraded', labelClass: 'label--warning' },
  down: { icon: 'x-circle', text: 'Down', labelClass: 'label--error' },
  unknown: { icon: 'alert-triangle', text: 'Unknown', labelClass: 'label--gray' },
}

function titleCase(slug) {
  return slug
    .split(/[-_]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

async function fetchServiceStatus(slug) {
  try {
    const response = await fetch(`${BASE_URL}/status/${encodeURIComponent(slug)}`)
    const body = response.ok ? await response.json() : null

    if (!body || !body.ok || !body.data) {
      return { slug, name: titleCase(slug), status: 'unknown' }
    }

    return {
      slug: body.data.slug,
      name: body.data.name,
      status: body.data.status,
      logoUrl: body.data.logo_url || null,
      updatedAtLabel: body.data.updated_at ? timeFormatter.format(new Date(body.data.updated_at)) : null,
    }
  } catch (err) {
    return { slug, name: titleCase(slug), status: 'unknown' }
  }
}

router.get('/status', async (req, res) => {
  const slugs = String(req.query.slugs || '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
    .slice(0, MAX_SLUGS)

  try {
    const rawServices = await Promise.all(slugs.map(fetchServiceStatus))

    const services = rawServices.map((service) => {
      const meta = STATUS_META[service.status] || STATUS_META.unknown
      return {
        ...service,
        statusText: meta.text,
        statusLabelClass: meta.labelClass,
        iconUrl: `${ICON_BASE_URL}/${meta.icon}.svg`,
      }
    })

    res.json({
      services,
      count: services.length,
      updatedAtLabel: timeFormatter.format(new Date()),
    })
  } catch (err) {
    res.status(502).json({ error: err.message })
  }
})

module.exports = router
