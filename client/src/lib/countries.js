// ISO 3166-1 alpha-2 code → international dialling code. Names come from Intl.DisplayNames.
const DIAL = `AF93 AX358 AL355 DZ213 AS1684 AD376 AO244 AI1264 AG1268 AR54 AM374 AW297 AU61 AT43 AZ994 BS1242 BH973 BD880
BB1246 BY375 BE32 BZ501 BJ229 BM1441 BT975 BO591 BA387 BW267 BR55 IO246 VG1284 BN673 BG359 BF226 BI257 KH855 CM237
CA1 CV238 KY1345 CF236 TD235 CL56 CN86 CX61 CC61 CO57 KM269 CG242 CD243 CK682 CR506 CI225 HR385 CU53 CW599 CY357 CZ420
DK45 DJ253 DM1767 DO1809 EC593 EG20 SV503 GQ240 ER291 EE372 SZ268 ET251 FK500 FO298 FJ679 FI358 FR33 GF594 PF689 GA241
GM220 GE995 DE49 GH233 GI350 GR30 GL299 GD1473 GP590 GU1671 GT502 GG44 GN224 GW245 GY592 HT509 HN504 HK852 HU36 IS354
IN91 ID62 IR98 IQ964 IE353 IM44 IL972 IT39 JM1876 JP81 JE44 JO962 KZ7 KE254 KI686 XK383 KW965 KG996 LA856 LV371 LB961
LS266 LR231 LY218 LI423 LT370 LU352 MO853 MG261 MW265 MY60 MV960 ML223 MT356 MH692 MQ596 MR222 MU230 YT262 MX52 FM691
MD373 MC377 MN976 ME382 MS1664 MA212 MZ258 MM95 NA264 NR674 NP977 NL31 NC687 NZ64 NI505 NE227 NG234 NU683 NF672 KP850
MK389 MP1670 NO47 OM968 PK92 PW680 PS970 PA507 PG675 PY595 PE51 PH63 PL48 PT351 PR1787 QA974 RE262 RO40 RU7 RW250
BL590 SH290 KN1869 LC1758 MF590 PM508 VC1784 WS685 SM378 ST239 SA966 SN221 RS381 SC248 SL232 SG65 SX1721 SK421 SI386
SB677 SO252 ZA27 KR82 SS211 ES34 LK94 SD249 SR597 SE46 CH41 SY963 TW886 TJ992 TZ255 TH66 TL670 TG228 TK690 TO676 TT1868
TN216 TR90 TM993 TC1649 VI1340 UG256 UA380 AE971 GB44 US1 UY598 UZ998 VU678 VA39 VE58 VN84 WF681 YE967 ZM260 ZW263`;

const names = typeof Intl !== 'undefined' && Intl.DisplayNames ? new Intl.DisplayNames(['en'], { type: 'region' }) : null;

const flag = (code) => String.fromCodePoint(...[...code].map((c) => 0x1f1a5 + c.charCodeAt(0)));

export const COUNTRIES = DIAL.split(/\s+/)
  .filter(Boolean)
  .map((entry) => {
    const code = entry.slice(0, 2);
    return { code, dial: `+${entry.slice(2)}`, name: names?.of(code) || code, flag: flag(code) };
  })
  .sort((a, b) => a.name.localeCompare(b.name));

// Shown first in pickers: the store's main markets.
export const PRIORITY = ['IN', 'AE', 'SA', 'QA', 'BH', 'KW', 'OM', 'GB', 'US'];

export const countryByCode = (code) => COUNTRIES.find((c) => c.code === String(code || '').toUpperCase());
export const countryName = (code) => countryByCode(code)?.name || code || '';

// Unique dial codes for the phone selector (several countries share +1, +7, +44…).
export const DIAL_CODES = (() => {
  const seen = new Map();
  for (const c of COUNTRIES) {
    if (!seen.has(c.dial)) seen.set(c.dial, c);
  }
  const preferred = { '+1': 'US', '+7': 'RU', '+44': 'GB', '+61': 'AU', '+39': 'IT', '+358': 'FI', '+590': 'GP', '+262': 'RE', '+47': 'NO' };
  for (const [dial, code] of Object.entries(preferred)) seen.set(dial, countryByCode(code));
  return [...seen.values()].sort((a, b) => a.name.localeCompare(b.name));
})();

export function sortedForPicker(list = COUNTRIES) {
  const top = PRIORITY.map((c) => list.find((x) => x.code === c)).filter(Boolean);
  return [...top, ...list.filter((c) => !PRIORITY.includes(c.code))];
}
