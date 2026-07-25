// MeteoSwiss weatherIcon codes: 1-42 are day icons, +100 is the night variant
// of the same condition (e.g. 3 partly-cloudy day -> 103 partly-cloudy night).
const CONDITION_CODES = {
  sunny: [1, 26],
  'partly-cloudy': [2, 3, 4, 102, 103, 104],
  cloudy: [5, 35, 105, 126, 135],
  fog: [27, 28, 127, 128],
  rainy: [6, 9, 14, 17, 29, 33, 106, 109, 114, 117, 129, 132, 133],
  pouring: [20, 120],
  'snowy-rainy': [7, 10, 15, 18, 21, 31, 39, 107, 110, 115, 118, 121, 131, 139],
  snowy: [8, 11, 16, 19, 22, 30, 34, 37, 42, 108, 111, 116, 119, 122, 130, 134, 137, 142],
  lightning: [12, 36, 40, 41, 112, 136, 140, 141],
  'lightning-rainy': [13, 23, 24, 25, 32, 38, 113, 123, 124, 125, 138],
  'clear-night': [101],
}

const CODE_TO_CONDITION = {}
for (const [condition, codes] of Object.entries(CONDITION_CODES)) {
  for (const code of codes) {
    CODE_TO_CONDITION[code] = condition
  }
}

function getCondition(weatherIcon) {
  return CODE_TO_CONDITION[weatherIcon] ?? null
}

function isNightIcon(weatherIcon) {
  return weatherIcon >= 100
}

// Served from server/public/icons/<condition>.svg (see index.js static route),
// sourced from erikflowers/weather-icons (MIT licensed).
function getIconUrl(weatherIcon) {
  const condition = getCondition(weatherIcon)
  return condition ? `/icons/${condition}.svg` : null
}

module.exports = {
  CONDITION_CODES,
  getCondition,
  isNightIcon,
  getIconUrl,
}
