/**
 * Every ISO 3166-1 alpha-2 country code (249), for the country picker shown before a payment.
 * Must stay identical to mylinnnk_api/utils/countries.js (an API test compares the two lists).
 * Which countries can pay is decided by the API alone; this file never says.
 */
export const COUNTRY_CODES = Object.freeze(
  `AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ
   BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BV BW BY BZ
   CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ
   DE DJ DK DM DO DZ
   EC EE EG EH ER ES ET
   FI FJ FK FM FO FR
   GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY
   HK HM HN HR HT HU
   ID IE IL IM IN IO IQ IR IS IT
   JE JM JO JP
   KE KG KH KI KM KN KP KR KW KY KZ
   LA LB LC LI LK LR LS LT LU LV LY
   MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT MU MV MW MX MY MZ
   NA NC NE NF NG NI NL NO NP NR NU NZ
   OM
   PA PE PF PG PH PK PL PM PN PR PS PT PW PY
   QA
   RE RO RS RU RW
   SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ
   TC TD TF TG TH TJ TK TL TM TN TO TR TT TV TW TZ
   UA UG UM US UY UZ
   VA VC VE VG VI VN VU
   WF WS
   YE YT
   ZA ZM ZW`.split(/\s+/),
)

/** Other names people type for a few countries. */
const ALSO_KNOWN_AS = {
  AE: 'UAE Emirates Dubai',
  CD: 'DRC DR Congo Kinshasa',
  CG: 'Congo Brazzaville',
  CI: 'Ivory Coast',
  CZ: 'Czech Republic',
  GB: 'UK United Kingdom Britain England Scotland Wales',
  KP: 'North Korea',
  KR: 'South Korea',
  MM: 'Burma',
  NL: 'Holland',
  SZ: 'Swaziland',
  TR: 'Turkey Turkiye',
  US: 'USA United States America',
}

/** Lower case without accents, so "cote" finds "Côte d’Ivoire". */
export const foldText = (text) =>
  text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[’']/g, "'")
    .toLowerCase()
    .trim()

/** [{ code, name, search }] sorted by name, with names in `locale` (English by default). */
export function countryOptions(locale = 'en') {
  let names = null
  try {
    names = new Intl.DisplayNames([locale, 'en'], { type: 'region', fallback: 'code' })
  } catch {
    names = null
  }
  return COUNTRY_CODES.map((code) => {
    const name = names?.of(code) ?? code
    return { code, name, search: foldText(`${name} ${code} ${ALSO_KNOWN_AS[code] ?? ''}`) }
  }).sort((a, b) => a.name.localeCompare(b.name, locale))
}

/** Options whose name, code or other names contain every word of `query`. */
export function filterCountries(options, query) {
  const words = foldText(query).split(/\s+/).filter(Boolean)
  if (!words.length) return options
  return options.filter((o) => words.every((w) => o.search.includes(w)))
}
