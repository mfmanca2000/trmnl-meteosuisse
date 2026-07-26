const express = require('express')
const { getState, getEnergyToday } = require('./haClient')
const router = express.Router()

const PANELS = [
  { label: 'Sunology', powerEntity: 'sensor.sunology_power', energyEntity: 'sensor.sensor_sunology_energy', target: 'grid' },
  { label: 'Small panels', powerEntity: 'sensor.bluetti_dc_input', energyEntity: 'sensor.small_panels_energy', target: 'battery' },
  { label: 'PowerStream', powerEntity: 'sensor.powerstream_solar_1_watts_2', energyEntity: 'sensor.power_stream_energy', target: 'grid' },
  { label: 'MyStrom', powerEntity: 'sensor.mystrom_switch_power', energyEntity: 'sensor.sensor_mystrom_energy', target: 'grid' },
]

const BATTERY_LEVEL_ENTITY = 'sensor.bluetti_battery'
const CONSUMPTION_POWER_ENTITY = 'sensor.power_consumption'
const CONSUMPTION_ENERGY_ENTITY = 'sensor.energy_consumption_sum'
const GRID_IMPORT_ENERGY_ENTITY = 'sensor.energy_import_sum'
const GRID_EXPORT_ENERGY_ENTITY = 'sensor.energy_export_sum'

router.get('/status', async (req, res) => {
  try {
    const [panelWatts, panelKwhToday, batteryLevel, consumptionWatts, consumptionKwhToday, gridImportKwhToday, gridExportKwhToday] =
      await Promise.all([
        Promise.all(PANELS.map((panel) => getState(panel.powerEntity))),
        Promise.all(PANELS.map((panel) => getEnergyToday(panel.energyEntity))),
        getState(BATTERY_LEVEL_ENTITY),
        getState(CONSUMPTION_POWER_ENTITY),
        getEnergyToday(CONSUMPTION_ENERGY_ENTITY),
        getEnergyToday(GRID_IMPORT_ENERGY_ENTITY),
        getEnergyToday(GRID_EXPORT_ENERGY_ENTITY),
      ])

    const panels = PANELS.map((panel, i) => ({
      label: panel.label,
      target: panel.target,
      watts: panelWatts[i],
      todayKwh: panelKwhToday[i],
    }))

    const solarWattsNow = panels.reduce((sum, panel) => sum + (panel.watts ?? 0), 0)
    const solarKwhToday = panels.reduce((sum, panel) => sum + (panel.todayKwh ?? 0), 0)

    res.json({
      updatedAt: new Date().toISOString(),
      panels,
      solarWattsNow,
      consumptionWatts,
      batteryLevel,
      today: {
        solarKwh: solarKwhToday,
        consumptionKwh: consumptionKwhToday,
        gridImportKwh: gridImportKwhToday,
        gridExportKwh: gridExportKwhToday,
      },
    })
  } catch (err) {
    res.status(502).json({ error: err.message })
  }
})

module.exports = router
