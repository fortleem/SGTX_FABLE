// SGTX Platform v6.3 — Reference Data API
// Provides countries, ports, commodity types, HS codes, pallet sizes, container types
// Used by trade request forms (importer + exporter)

import { Hono } from 'hono';

type Bindings = { DB: D1Database };
const refData = new Hono<{ Bindings: Bindings }>();

// ═══════════════════════════════════════════════════════════════════
// COUNTRIES — Full ISO 3166-1 list (trade-relevant subset)
// ═══════════════════════════════════════════════════════════════════
const COUNTRIES = [
  { code: 'AF', name: 'Afghanistan' }, { code: 'AL', name: 'Albania' }, { code: 'DZ', name: 'Algeria' },
  { code: 'AO', name: 'Angola' }, { code: 'AR', name: 'Argentina' }, { code: 'AM', name: 'Armenia' },
  { code: 'AU', name: 'Australia' }, { code: 'AT', name: 'Austria' }, { code: 'AZ', name: 'Azerbaijan' },
  { code: 'BH', name: 'Bahrain' }, { code: 'BD', name: 'Bangladesh' }, { code: 'BY', name: 'Belarus' },
  { code: 'BE', name: 'Belgium' }, { code: 'BJ', name: 'Benin' }, { code: 'BO', name: 'Bolivia' },
  { code: 'BA', name: 'Bosnia and Herzegovina' }, { code: 'BW', name: 'Botswana' }, { code: 'BR', name: 'Brazil' },
  { code: 'BN', name: 'Brunei' }, { code: 'BG', name: 'Bulgaria' }, { code: 'BF', name: 'Burkina Faso' },
  { code: 'KH', name: 'Cambodia' }, { code: 'CM', name: 'Cameroon' }, { code: 'CA', name: 'Canada' },
  { code: 'CL', name: 'Chile' }, { code: 'CN', name: 'China' }, { code: 'CO', name: 'Colombia' },
  { code: 'CD', name: 'Congo (DRC)' }, { code: 'CR', name: 'Costa Rica' }, { code: 'CI', name: "Cote d'Ivoire" },
  { code: 'HR', name: 'Croatia' }, { code: 'CU', name: 'Cuba' }, { code: 'CY', name: 'Cyprus' },
  { code: 'CZ', name: 'Czech Republic' }, { code: 'DK', name: 'Denmark' }, { code: 'DJ', name: 'Djibouti' },
  { code: 'DO', name: 'Dominican Republic' }, { code: 'EC', name: 'Ecuador' }, { code: 'EG', name: 'Egypt' },
  { code: 'SV', name: 'El Salvador' }, { code: 'GQ', name: 'Equatorial Guinea' }, { code: 'ER', name: 'Eritrea' },
  { code: 'EE', name: 'Estonia' }, { code: 'SZ', name: 'Eswatini' }, { code: 'ET', name: 'Ethiopia' },
  { code: 'FI', name: 'Finland' }, { code: 'FR', name: 'France' }, { code: 'GA', name: 'Gabon' },
  { code: 'GM', name: 'Gambia' }, { code: 'GE', name: 'Georgia' }, { code: 'DE', name: 'Germany' },
  { code: 'GH', name: 'Ghana' }, { code: 'GR', name: 'Greece' }, { code: 'GT', name: 'Guatemala' },
  { code: 'GN', name: 'Guinea' }, { code: 'HN', name: 'Honduras' }, { code: 'HK', name: 'Hong Kong' },
  { code: 'HU', name: 'Hungary' }, { code: 'IS', name: 'Iceland' }, { code: 'IN', name: 'India' },
  { code: 'ID', name: 'Indonesia' }, { code: 'IR', name: 'Iran' }, { code: 'IQ', name: 'Iraq' },
  { code: 'IE', name: 'Ireland' }, { code: 'IL', name: 'Israel' }, { code: 'IT', name: 'Italy' },
  { code: 'JM', name: 'Jamaica' }, { code: 'JP', name: 'Japan' }, { code: 'JO', name: 'Jordan' },
  { code: 'KZ', name: 'Kazakhstan' }, { code: 'KE', name: 'Kenya' }, { code: 'KW', name: 'Kuwait' },
  { code: 'KG', name: 'Kyrgyzstan' }, { code: 'LA', name: 'Laos' }, { code: 'LV', name: 'Latvia' },
  { code: 'LB', name: 'Lebanon' }, { code: 'LY', name: 'Libya' }, { code: 'LT', name: 'Lithuania' },
  { code: 'LU', name: 'Luxembourg' }, { code: 'MG', name: 'Madagascar' }, { code: 'MW', name: 'Malawi' },
  { code: 'MY', name: 'Malaysia' }, { code: 'ML', name: 'Mali' }, { code: 'MT', name: 'Malta' },
  { code: 'MR', name: 'Mauritania' }, { code: 'MU', name: 'Mauritius' }, { code: 'MX', name: 'Mexico' },
  { code: 'MD', name: 'Moldova' }, { code: 'MN', name: 'Mongolia' }, { code: 'ME', name: 'Montenegro' },
  { code: 'MA', name: 'Morocco' }, { code: 'MZ', name: 'Mozambique' }, { code: 'MM', name: 'Myanmar' },
  { code: 'NA', name: 'Namibia' }, { code: 'NP', name: 'Nepal' }, { code: 'NL', name: 'Netherlands' },
  { code: 'NZ', name: 'New Zealand' }, { code: 'NI', name: 'Nicaragua' }, { code: 'NE', name: 'Niger' },
  { code: 'NG', name: 'Nigeria' }, { code: 'KP', name: 'North Korea' }, { code: 'MK', name: 'North Macedonia' },
  { code: 'NO', name: 'Norway' }, { code: 'OM', name: 'Oman' }, { code: 'PK', name: 'Pakistan' },
  { code: 'PA', name: 'Panama' }, { code: 'PY', name: 'Paraguay' }, { code: 'PE', name: 'Peru' },
  { code: 'PH', name: 'Philippines' }, { code: 'PL', name: 'Poland' }, { code: 'PT', name: 'Portugal' },
  { code: 'QA', name: 'Qatar' }, { code: 'RO', name: 'Romania' }, { code: 'RU', name: 'Russia' },
  { code: 'RW', name: 'Rwanda' }, { code: 'SA', name: 'Saudi Arabia' }, { code: 'SN', name: 'Senegal' },
  { code: 'RS', name: 'Serbia' }, { code: 'SG', name: 'Singapore' }, { code: 'SK', name: 'Slovakia' },
  { code: 'SI', name: 'Slovenia' }, { code: 'SO', name: 'Somalia' }, { code: 'ZA', name: 'South Africa' },
  { code: 'KR', name: 'South Korea' }, { code: 'SS', name: 'South Sudan' }, { code: 'ES', name: 'Spain' },
  { code: 'LK', name: 'Sri Lanka' }, { code: 'SD', name: 'Sudan' }, { code: 'SE', name: 'Sweden' },
  { code: 'CH', name: 'Switzerland' }, { code: 'SY', name: 'Syria' }, { code: 'TW', name: 'Taiwan' },
  { code: 'TZ', name: 'Tanzania' }, { code: 'TH', name: 'Thailand' }, { code: 'TG', name: 'Togo' },
  { code: 'TN', name: 'Tunisia' }, { code: 'TR', name: 'Turkey' }, { code: 'TM', name: 'Turkmenistan' },
  { code: 'UG', name: 'Uganda' }, { code: 'UA', name: 'Ukraine' }, { code: 'AE', name: 'United Arab Emirates' },
  { code: 'GB', name: 'United Kingdom' }, { code: 'US', name: 'United States' }, { code: 'UY', name: 'Uruguay' },
  { code: 'UZ', name: 'Uzbekistan' }, { code: 'VE', name: 'Venezuela' }, { code: 'VN', name: 'Vietnam' },
  { code: 'YE', name: 'Yemen' }, { code: 'ZM', name: 'Zambia' }, { code: 'ZW', name: 'Zimbabwe' },
];

// ═══════════════════════════════════════════════════════════════════
// PORTS — Major global ports grouped by country
// ═══════════════════════════════════════════════════════════════════
const PORTS: Record<string, { code: string; name: string; type: string }[]> = {
  EG: [
    { code: 'EGALY', name: 'Alexandria', type: 'SEA' }, { code: 'EGDAM', name: 'Damietta', type: 'SEA' },
    { code: 'EGPSD', name: 'Port Said', type: 'SEA' }, { code: 'EGSUZ', name: 'Suez', type: 'SEA' },
    { code: 'EGSOKHNA', name: 'Ain Sokhna', type: 'SEA' }, { code: 'EGADABIYA', name: 'El Adabiya', type: 'SEA' },
    { code: 'EGSCN', name: 'Suez Canal Container Terminal', type: 'SEA' },
  ],
  AE: [
    { code: 'AEJEA', name: 'Jebel Ali (Dubai)', type: 'SEA' }, { code: 'AESHJ', name: 'Sharjah (Khor Fakkan)', type: 'SEA' },
    { code: 'AEAUH', name: 'Abu Dhabi (Khalifa Port)', type: 'SEA' }, { code: 'AEAJM', name: 'Ajman', type: 'SEA' },
    { code: 'AEFUJ', name: 'Fujairah', type: 'SEA' }, { code: 'AERAK', name: 'Ras Al Khaimah', type: 'SEA' },
  ],
  SA: [
    { code: 'SAJED', name: 'Jeddah Islamic Port', type: 'SEA' }, { code: 'SAKAC', name: 'King Abdullah Port', type: 'SEA' },
    { code: 'SADMM', name: 'Dammam (King Abdulaziz Port)', type: 'SEA' }, { code: 'SAJUB', name: 'Jubail', type: 'SEA' },
    { code: 'SAYNB', name: 'Yanbu', type: 'SEA' },
  ],
  CN: [
    { code: 'CNSHA', name: 'Shanghai', type: 'SEA' }, { code: 'CNSHE', name: 'Shenzhen (Yantian)', type: 'SEA' },
    { code: 'CNNGB', name: 'Ningbo-Zhoushan', type: 'SEA' }, { code: 'CNQIN', name: 'Qingdao', type: 'SEA' },
    { code: 'CNTXG', name: 'Tianjin', type: 'SEA' }, { code: 'CNXMN', name: 'Xiamen', type: 'SEA' },
    { code: 'CNGUA', name: 'Guangzhou (Nansha)', type: 'SEA' }, { code: 'CNDAL', name: 'Dalian', type: 'SEA' },
  ],
  VN: [
    { code: 'VNSGN', name: 'Ho Chi Minh City (Cat Lai)', type: 'SEA' }, { code: 'VNHPH', name: 'Hai Phong', type: 'SEA' },
    { code: 'VNVUT', name: 'Vung Tau', type: 'SEA' }, { code: 'VNDAN', name: 'Da Nang', type: 'SEA' },
    { code: 'VNQNH', name: 'Quy Nhon', type: 'SEA' },
  ],
  IN: [
    { code: 'INNSA', name: 'Nhava Sheva (JNPT)', type: 'SEA' }, { code: 'INMUN', name: 'Mumbai', type: 'SEA' },
    { code: 'INMAA', name: 'Chennai', type: 'SEA' }, { code: 'INTUT', name: 'Tuticorin', type: 'SEA' },
    { code: 'INHAL', name: 'Haldia', type: 'SEA' }, { code: 'INVIZ', name: 'Visakhapatnam', type: 'SEA' },
    { code: 'INMRG', name: 'Mundra', type: 'SEA' }, { code: 'INCOK', name: 'Cochin', type: 'SEA' },
  ],
  US: [
    { code: 'USNYC', name: 'New York / New Jersey', type: 'SEA' }, { code: 'USLAX', name: 'Los Angeles', type: 'SEA' },
    { code: 'USLGB', name: 'Long Beach', type: 'SEA' }, { code: 'USSAV', name: 'Savannah', type: 'SEA' },
    { code: 'USHOU', name: 'Houston', type: 'SEA' }, { code: 'USSEA', name: 'Seattle-Tacoma', type: 'SEA' },
    { code: 'USORF', name: 'Norfolk', type: 'SEA' }, { code: 'USCHS', name: 'Charleston', type: 'SEA' },
    { code: 'USMIA', name: 'Miami', type: 'SEA' }, { code: 'USBAL', name: 'Baltimore', type: 'SEA' },
  ],
  GB: [
    { code: 'GBFXT', name: 'Felixstowe', type: 'SEA' }, { code: 'GBSOU', name: 'Southampton', type: 'SEA' },
    { code: 'GBLGP', name: 'London Gateway', type: 'SEA' }, { code: 'GBTHP', name: 'Tilbury', type: 'SEA' },
    { code: 'GBLIV', name: 'Liverpool', type: 'SEA' },
  ],
  DE: [
    { code: 'DEHAM', name: 'Hamburg', type: 'SEA' }, { code: 'DEBRV', name: 'Bremerhaven', type: 'SEA' },
    { code: 'DEWVN', name: 'Wilhelmshaven (JadeWeserPort)', type: 'SEA' },
  ],
  NL: [
    { code: 'NLRTM', name: 'Rotterdam', type: 'SEA' }, { code: 'NLAMS', name: 'Amsterdam', type: 'SEA' },
  ],
  BE: [
    { code: 'BEANR', name: 'Antwerp', type: 'SEA' }, { code: 'BEZEE', name: 'Zeebrugge', type: 'SEA' },
  ],
  FR: [
    { code: 'FRLEH', name: 'Le Havre', type: 'SEA' }, { code: 'FRFOS', name: 'Fos-sur-Mer (Marseille)', type: 'SEA' },
    { code: 'FRDKK', name: 'Dunkirk', type: 'SEA' },
  ],
  ES: [
    { code: 'ESVLC', name: 'Valencia', type: 'SEA' }, { code: 'ESBCN', name: 'Barcelona', type: 'SEA' },
    { code: 'ESALG', name: 'Algeciras', type: 'SEA' }, { code: 'ESBIO', name: 'Bilbao', type: 'SEA' },
  ],
  IT: [
    { code: 'ITGOA', name: 'Genoa', type: 'SEA' }, { code: 'ITGIT', name: 'Gioia Tauro', type: 'SEA' },
    { code: 'ITLIV', name: 'Livorno', type: 'SEA' }, { code: 'ITNAP', name: 'Naples', type: 'SEA' },
  ],
  TR: [
    { code: 'TRIST', name: 'Istanbul (Ambarli)', type: 'SEA' }, { code: 'TRMER', name: 'Mersin', type: 'SEA' },
    { code: 'TRIZM', name: 'Izmir (Alsancak)', type: 'SEA' }, { code: 'TRGEM', name: 'Gemlik', type: 'SEA' },
  ],
  BR: [
    { code: 'BRSSZ', name: 'Santos', type: 'SEA' }, { code: 'BRPNG', name: 'Paranagua', type: 'SEA' },
    { code: 'BRRIG', name: 'Rio Grande', type: 'SEA' }, { code: 'BRITJ', name: 'Itajai', type: 'SEA' },
  ],
  JP: [
    { code: 'JPTYO', name: 'Tokyo', type: 'SEA' }, { code: 'JPYOK', name: 'Yokohama', type: 'SEA' },
    { code: 'JPKOB', name: 'Kobe', type: 'SEA' }, { code: 'JPOSA', name: 'Osaka', type: 'SEA' },
    { code: 'JPNGO', name: 'Nagoya', type: 'SEA' },
  ],
  KR: [
    { code: 'KRPUS', name: 'Busan', type: 'SEA' }, { code: 'KRINC', name: 'Incheon', type: 'SEA' },
    { code: 'KRKAN', name: 'Gwangyang', type: 'SEA' },
  ],
  SG: [{ code: 'SGSIN', name: 'Singapore', type: 'SEA' }],
  MY: [
    { code: 'MYPKG', name: 'Port Klang', type: 'SEA' }, { code: 'MYTPP', name: 'Tanjung Pelepas', type: 'SEA' },
    { code: 'MYPEN', name: 'Penang', type: 'SEA' },
  ],
  TH: [
    { code: 'THBKK', name: 'Bangkok (Laem Chabang)', type: 'SEA' }, { code: 'THLCH', name: 'Laem Chabang', type: 'SEA' },
  ],
  ID: [
    { code: 'IDJKT', name: 'Jakarta (Tanjung Priok)', type: 'SEA' }, { code: 'IDSUB', name: 'Surabaya (Tanjung Perak)', type: 'SEA' },
    { code: 'IDBLW', name: 'Belawan', type: 'SEA' },
  ],
  PH: [
    { code: 'PHMNL', name: 'Manila', type: 'SEA' }, { code: 'PHCEB', name: 'Cebu', type: 'SEA' },
  ],
  AU: [
    { code: 'AUMEL', name: 'Melbourne', type: 'SEA' }, { code: 'AUSYD', name: 'Sydney', type: 'SEA' },
    { code: 'AUBNE', name: 'Brisbane', type: 'SEA' }, { code: 'AUFRE', name: 'Fremantle', type: 'SEA' },
  ],
  NZ: [
    { code: 'NZAKL', name: 'Auckland', type: 'SEA' }, { code: 'NZTRG', name: 'Tauranga', type: 'SEA' },
  ],
  ZA: [
    { code: 'ZADUR', name: 'Durban', type: 'SEA' }, { code: 'ZACPT', name: 'Cape Town', type: 'SEA' },
  ],
  KE: [
    { code: 'KEMBA', name: 'Mombasa', type: 'SEA' },
  ],
  NG: [
    { code: 'NGAPP', name: 'Apapa (Lagos)', type: 'SEA' }, { code: 'NGTIN', name: 'Tin Can Island (Lagos)', type: 'SEA' },
    { code: 'NGPHC', name: 'Port Harcourt', type: 'SEA' },
  ],
  GH: [
    { code: 'GHTEM', name: 'Tema', type: 'SEA' }, { code: 'GHTKD', name: 'Takoradi', type: 'SEA' },
  ],
  TZ: [
    { code: 'TZDAR', name: 'Dar es Salaam', type: 'SEA' },
  ],
  MA: [
    { code: 'MAPTM', name: 'Tanger Med', type: 'SEA' }, { code: 'MACAS', name: 'Casablanca', type: 'SEA' },
  ],
  TN: [
    { code: 'TNTUN', name: 'Rades (Tunis)', type: 'SEA' }, { code: 'TNSFX', name: 'Sfax', type: 'SEA' },
  ],
  DZ: [
    { code: 'DZALG', name: 'Algiers', type: 'SEA' }, { code: 'DZORN', name: 'Oran', type: 'SEA' },
  ],
  LB: [
    { code: 'LBBEY', name: 'Beirut', type: 'SEA' }, { code: 'LBTRI', name: 'Tripoli', type: 'SEA' },
  ],
  JO: [
    { code: 'JOAQJ', name: 'Aqaba', type: 'SEA' },
  ],
  IQ: [
    { code: 'IQBSR', name: 'Umm Qasr (Basra)', type: 'SEA' },
  ],
  PK: [
    { code: 'PKKHI', name: 'Karachi', type: 'SEA' }, { code: 'PKQAS', name: 'Port Qasim', type: 'SEA' },
    { code: 'PKGWD', name: 'Gwadar', type: 'SEA' },
  ],
  BD: [
    { code: 'BDCGP', name: 'Chittagong', type: 'SEA' }, { code: 'BDMON', name: 'Mongla', type: 'SEA' },
  ],
  LK: [
    { code: 'LKCMB', name: 'Colombo', type: 'SEA' },
  ],
  CL: [
    { code: 'CLSAI', name: 'San Antonio', type: 'SEA' }, { code: 'CLVAP', name: 'Valparaiso', type: 'SEA' },
  ],
  PE: [
    { code: 'PECLL', name: 'Callao', type: 'SEA' },
  ],
  CO: [
    { code: 'COCTG', name: 'Cartagena', type: 'SEA' }, { code: 'COBUN', name: 'Buenaventura', type: 'SEA' },
  ],
  EC: [
    { code: 'ECGYE', name: 'Guayaquil', type: 'SEA' },
  ],
  MX: [
    { code: 'MXMAN', name: 'Manzanillo', type: 'SEA' }, { code: 'MXLZC', name: 'Lazaro Cardenas', type: 'SEA' },
    { code: 'MXVER', name: 'Veracruz', type: 'SEA' }, { code: 'MXATM', name: 'Altamira', type: 'SEA' },
  ],
  CA: [
    { code: 'CAVAN', name: 'Vancouver', type: 'SEA' }, { code: 'CAMTR', name: 'Montreal', type: 'SEA' },
    { code: 'CAHAL', name: 'Halifax', type: 'SEA' },
  ],
  PA: [
    { code: 'PABLB', name: 'Balboa', type: 'SEA' }, { code: 'PAMIT', name: 'Manzanillo (Colon)', type: 'SEA' },
  ],
  OM: [
    { code: 'OMSLL', name: 'Salalah', type: 'SEA' }, { code: 'OMSOH', name: 'Sohar', type: 'SEA' },
  ],
  BH: [
    { code: 'BHKBS', name: 'Khalifa Bin Salman Port', type: 'SEA' },
  ],
  KW: [
    { code: 'KWSWK', name: 'Shuwaikh', type: 'SEA' }, { code: 'KWSAA', name: 'Shuaiba', type: 'SEA' },
  ],
  QA: [
    { code: 'QAHAM', name: 'Hamad Port (Doha)', type: 'SEA' },
  ],
  GR: [
    { code: 'GRPIR', name: 'Piraeus', type: 'SEA' }, { code: 'GRTHV', name: 'Thessaloniki', type: 'SEA' },
  ],
  HR: [
    { code: 'HRRJK', name: 'Rijeka', type: 'SEA' },
  ],
  SI: [
    { code: 'SIKOP', name: 'Koper', type: 'SEA' },
  ],
  PL: [
    { code: 'PLGDN', name: 'Gdansk', type: 'SEA' }, { code: 'PLGDY', name: 'Gdynia', type: 'SEA' },
  ],
  SE: [
    { code: 'SEGOT', name: 'Gothenburg', type: 'SEA' },
  ],
  FI: [
    { code: 'FIHEL', name: 'Helsinki (Vuosaari)', type: 'SEA' },
  ],
  DK: [
    { code: 'DKAAR', name: 'Aarhus', type: 'SEA' },
  ],
  NO: [
    { code: 'NOOSL', name: 'Oslo', type: 'SEA' },
  ],
  PT: [
    { code: 'PTLIS', name: 'Lisbon', type: 'SEA' }, { code: 'PTSIN', name: 'Sines', type: 'SEA' },
  ],
  IL: [
    { code: 'ILHFA', name: 'Haifa', type: 'SEA' }, { code: 'ILASH', name: 'Ashdod', type: 'SEA' },
  ],
  IR: [
    { code: 'IRBND', name: 'Bandar Abbas', type: 'SEA' },
  ],
  RU: [
    { code: 'RULED', name: 'St. Petersburg', type: 'SEA' }, { code: 'RUVVO', name: 'Vladivostok', type: 'SEA' },
    { code: 'RUNVS', name: 'Novorossiysk', type: 'SEA' },
  ],
  UA: [
    { code: 'UAODS', name: 'Odessa', type: 'SEA' },
  ],
  RO: [
    { code: 'ROCND', name: 'Constanta', type: 'SEA' },
  ],
  BG: [
    { code: 'BGVAR', name: 'Varna', type: 'SEA' }, { code: 'BGBOJ', name: 'Burgas', type: 'SEA' },
  ],
  CI: [
    { code: 'CIABJ', name: 'Abidjan', type: 'SEA' },
  ],
  SN: [
    { code: 'SNDKR', name: 'Dakar', type: 'SEA' },
  ],
  ET: [
    { code: 'ETADD', name: 'Addis Ababa (Dry Port)', type: 'DRY' },
  ],
  DJ: [
    { code: 'DJJIB', name: 'Djibouti', type: 'SEA' },
  ],
  SD: [
    { code: 'SDPZU', name: 'Port Sudan', type: 'SEA' },
  ],
  LY: [
    { code: 'LYKHM', name: 'Khoms (Al-Khums)', type: 'SEA' }, { code: 'LYMIS', name: 'Misrata', type: 'SEA' },
  ],
  MU: [
    { code: 'MUPLU', name: 'Port Louis', type: 'SEA' },
  ],
  MG: [
    { code: 'MGTMM', name: 'Toamasina', type: 'SEA' },
  ],
  MM: [
    { code: 'MMRGN', name: 'Yangon', type: 'SEA' },
  ],
  KH: [
    { code: 'KHPNH', name: 'Sihanoukville', type: 'SEA' },
  ],
  TW: [
    { code: 'TWKHH', name: 'Kaohsiung', type: 'SEA' }, { code: 'TWKEL', name: 'Keelung', type: 'SEA' },
    { code: 'TWTXG', name: 'Taichung', type: 'SEA' },
  ],
  HK: [
    { code: 'HKHKG', name: 'Hong Kong', type: 'SEA' },
  ],
  BN: [
    { code: 'BNMUA', name: 'Muara', type: 'SEA' },
  ],
};

// ═══════════════════════════════════════════════════════════════════
// COMMODITY TYPES & PRODUCTS with HS Codes
// ═══════════════════════════════════════════════════════════════════
const COMMODITY_TYPES: { type: string; label: string; products: { name: string; hs_code: string }[] }[] = [
  { type: 'FRESH_FRUITS', label: 'Fresh Fruits', products: [
    { name: 'Oranges', hs_code: '0805.10' }, { name: 'Lemons & Limes', hs_code: '0805.50' },
    { name: 'Grapefruits', hs_code: '0805.40' }, { name: 'Mandarins / Tangerines', hs_code: '0805.21' },
    { name: 'Bananas', hs_code: '0803.10' }, { name: 'Apples', hs_code: '0808.10' },
    { name: 'Pears', hs_code: '0808.30' }, { name: 'Grapes', hs_code: '0806.10' },
    { name: 'Strawberries', hs_code: '0810.10' }, { name: 'Mangoes', hs_code: '0804.50' },
    { name: 'Pineapples', hs_code: '0804.30' }, { name: 'Avocados', hs_code: '0804.40' },
    { name: 'Guavas', hs_code: '0804.50' }, { name: 'Figs', hs_code: '0804.20' },
    { name: 'Dates', hs_code: '0804.10' }, { name: 'Pomegranates', hs_code: '0810.90' },
    { name: 'Watermelons', hs_code: '0807.11' }, { name: 'Melons', hs_code: '0807.19' },
    { name: 'Kiwi Fruit', hs_code: '0810.50' }, { name: 'Papayas', hs_code: '0807.20' },
    { name: 'Peaches', hs_code: '0809.30' }, { name: 'Plums', hs_code: '0809.40' },
    { name: 'Cherries', hs_code: '0809.21' }, { name: 'Apricots', hs_code: '0809.10' },
    { name: 'Coconuts', hs_code: '0801.11' }, { name: 'Other Fresh Fruits', hs_code: '0810.90' },
  ]},
  { type: 'FRESH_VEGETABLES', label: 'Fresh Vegetables', products: [
    { name: 'Potatoes', hs_code: '0701.90' }, { name: 'Tomatoes', hs_code: '0702.00' },
    { name: 'Onions', hs_code: '0703.10' }, { name: 'Garlic', hs_code: '0703.20' },
    { name: 'Cabbage', hs_code: '0704.10' }, { name: 'Cauliflower & Broccoli', hs_code: '0704.10' },
    { name: 'Lettuce', hs_code: '0705.11' }, { name: 'Carrots & Turnips', hs_code: '0706.10' },
    { name: 'Cucumbers & Gherkins', hs_code: '0707.00' }, { name: 'Peppers (Bell / Chilli)', hs_code: '0709.60' },
    { name: 'Eggplant (Aubergine)', hs_code: '0709.30' }, { name: 'Beans (Green/String)', hs_code: '0708.20' },
    { name: 'Peas', hs_code: '0708.10' }, { name: 'Sweet Potatoes', hs_code: '0714.20' },
    { name: 'Ginger', hs_code: '0910.11' }, { name: 'Mushrooms', hs_code: '0709.51' },
    { name: 'Celery', hs_code: '0709.40' }, { name: 'Asparagus', hs_code: '0709.20' },
    { name: 'Artichokes', hs_code: '0709.91' }, { name: 'Spinach', hs_code: '0709.70' },
    { name: 'Okra', hs_code: '0709.99' }, { name: 'Zucchini', hs_code: '0709.93' },
    { name: 'Other Fresh Vegetables', hs_code: '0709.99' },
  ]},
  { type: 'FROZEN_FRUITS', label: 'Frozen Fruits', products: [
    { name: 'Frozen Strawberries', hs_code: '0811.10' }, { name: 'Frozen Raspberries', hs_code: '0811.20' },
    { name: 'Frozen Blueberries', hs_code: '0811.90' }, { name: 'Frozen Mangoes', hs_code: '0811.90' },
    { name: 'Frozen Mixed Fruits', hs_code: '0811.90' }, { name: 'Other Frozen Fruits', hs_code: '0811.90' },
  ]},
  { type: 'FROZEN_VEGETABLES', label: 'Frozen Vegetables', products: [
    { name: 'Frozen Peas', hs_code: '0710.21' }, { name: 'Frozen Beans', hs_code: '0710.22' },
    { name: 'Frozen Corn / Sweet Corn', hs_code: '0710.40' }, { name: 'Frozen Spinach', hs_code: '0710.30' },
    { name: 'Frozen Broccoli', hs_code: '0710.80' }, { name: 'Frozen Cauliflower', hs_code: '0710.80' },
    { name: 'Frozen Mixed Vegetables', hs_code: '0710.90' }, { name: 'Frozen French Fries', hs_code: '2004.10' },
    { name: 'Other Frozen Vegetables', hs_code: '0710.80' },
  ]},
  { type: 'GRAINS_CEREALS', label: 'Grains & Cereals', products: [
    { name: 'Wheat', hs_code: '1001.99' }, { name: 'Rice (Milled)', hs_code: '1006.30' },
    { name: 'Rice (Paddy / Brown)', hs_code: '1006.20' }, { name: 'Corn / Maize', hs_code: '1005.90' },
    { name: 'Barley', hs_code: '1003.90' }, { name: 'Oats', hs_code: '1004.90' },
    { name: 'Sorghum', hs_code: '1007.90' }, { name: 'Millet', hs_code: '1008.29' },
    { name: 'Flour (Wheat)', hs_code: '1101.00' }, { name: 'Other Grains', hs_code: '1008.90' },
  ]},
  { type: 'PULSES_LEGUMES', label: 'Pulses & Legumes', products: [
    { name: 'Lentils', hs_code: '0713.40' }, { name: 'Chickpeas', hs_code: '0713.20' },
    { name: 'Kidney Beans', hs_code: '0713.33' }, { name: 'Soybeans', hs_code: '1201.90' },
    { name: 'Peanuts / Groundnuts', hs_code: '1202.42' }, { name: 'Other Legumes', hs_code: '0713.90' },
  ]},
  { type: 'SPICES', label: 'Spices', products: [
    { name: 'Black Pepper', hs_code: '0904.11' }, { name: 'Cinnamon', hs_code: '0906.11' },
    { name: 'Cloves', hs_code: '0907.10' }, { name: 'Turmeric', hs_code: '0910.30' },
    { name: 'Cumin', hs_code: '0909.31' }, { name: 'Coriander', hs_code: '0909.21' },
    { name: 'Cardamom', hs_code: '0908.31' }, { name: 'Saffron', hs_code: '0910.20' },
    { name: 'Vanilla', hs_code: '0905.10' }, { name: 'Chilli Flakes / Powder', hs_code: '0904.22' },
    { name: 'Other Spices', hs_code: '0910.99' },
  ]},
  { type: 'COFFEE_TEA_COCOA', label: 'Coffee, Tea & Cocoa', products: [
    { name: 'Arabica Coffee (Green)', hs_code: '0901.11' }, { name: 'Robusta Coffee (Green)', hs_code: '0901.11' },
    { name: 'Roasted Coffee', hs_code: '0901.21' }, { name: 'Green Tea', hs_code: '0902.10' },
    { name: 'Black Tea', hs_code: '0902.30' }, { name: 'Cocoa Beans', hs_code: '1801.00' },
    { name: 'Cocoa Powder', hs_code: '1805.00' }, { name: 'Other Beverages', hs_code: '0901.90' },
  ]},
  { type: 'OILS_FATS', label: 'Oils & Fats', products: [
    { name: 'Olive Oil', hs_code: '1509.10' }, { name: 'Sunflower Oil', hs_code: '1512.11' },
    { name: 'Palm Oil', hs_code: '1511.10' }, { name: 'Soybean Oil', hs_code: '1507.10' },
    { name: 'Coconut Oil', hs_code: '1513.11' }, { name: 'Rapeseed / Canola Oil', hs_code: '1514.11' },
    { name: 'Sesame Oil', hs_code: '1515.50' }, { name: 'Other Oils', hs_code: '1515.90' },
  ]},
  { type: 'SUGAR_CONFECTIONERY', label: 'Sugar & Confectionery', products: [
    { name: 'Raw Cane Sugar', hs_code: '1701.14' }, { name: 'Refined Sugar (White)', hs_code: '1701.99' },
    { name: 'Chocolate', hs_code: '1806.32' }, { name: 'Honey', hs_code: '0409.00' },
    { name: 'Confectionery', hs_code: '1704.90' }, { name: 'Other', hs_code: '1704.10' },
  ]},
  { type: 'MEAT_POULTRY', label: 'Meat & Poultry', products: [
    { name: 'Frozen Chicken (Whole)', hs_code: '0207.12' }, { name: 'Frozen Chicken (Parts)', hs_code: '0207.14' },
    { name: 'Frozen Beef', hs_code: '0202.30' }, { name: 'Frozen Lamb / Mutton', hs_code: '0204.42' },
    { name: 'Chilled Beef', hs_code: '0201.30' }, { name: 'Processed Meat', hs_code: '1602.50' },
    { name: 'Other Meat', hs_code: '0210.99' },
  ]},
  { type: 'SEAFOOD', label: 'Seafood', products: [
    { name: 'Frozen Shrimp / Prawns', hs_code: '0306.17' }, { name: 'Frozen Fish (Whole)', hs_code: '0303.89' },
    { name: 'Frozen Fish Fillets', hs_code: '0304.89' }, { name: 'Canned Tuna', hs_code: '1604.14' },
    { name: 'Canned Sardines', hs_code: '1604.13' }, { name: 'Squid / Cuttlefish', hs_code: '0307.42' },
    { name: 'Other Seafood', hs_code: '0307.99' },
  ]},
  { type: 'DAIRY', label: 'Dairy Products', products: [
    { name: 'Milk Powder', hs_code: '0402.10' }, { name: 'Butter', hs_code: '0405.10' },
    { name: 'Cheese', hs_code: '0406.90' }, { name: 'Yogurt', hs_code: '0403.10' },
    { name: 'Cream', hs_code: '0401.40' }, { name: 'Ghee', hs_code: '0405.90' },
    { name: 'Other Dairy', hs_code: '0404.90' },
  ]},
  { type: 'TEXTILES', label: 'Textiles & Fabrics', products: [
    { name: 'Cotton Yarn', hs_code: '5205.12' }, { name: 'Cotton Fabric', hs_code: '5208.11' },
    { name: 'Polyester Fabric', hs_code: '5407.61' }, { name: 'Silk', hs_code: '5002.00' },
    { name: 'Wool', hs_code: '5101.11' }, { name: 'Garments / Apparel', hs_code: '6204.62' },
    { name: 'Other Textiles', hs_code: '5516.11' },
  ]},
  { type: 'CHEMICALS', label: 'Chemicals & Fertilizers', products: [
    { name: 'Urea (Fertilizer)', hs_code: '3102.10' }, { name: 'DAP (Fertilizer)', hs_code: '3105.30' },
    { name: 'NPK (Fertilizer)', hs_code: '3105.20' }, { name: 'Pesticides', hs_code: '3808.91' },
    { name: 'Industrial Chemicals', hs_code: '2902.20' }, { name: 'Pharmaceuticals', hs_code: '3004.90' },
    { name: 'Other Chemicals', hs_code: '3824.99' },
  ]},
  { type: 'MINERALS_METALS', label: 'Minerals & Metals', products: [
    { name: 'Iron Ore', hs_code: '2601.12' }, { name: 'Steel (Flat Rolled)', hs_code: '7208.37' },
    { name: 'Aluminum', hs_code: '7601.10' }, { name: 'Copper', hs_code: '7403.11' },
    { name: 'Coal', hs_code: '2701.12' }, { name: 'Cement', hs_code: '2523.29' },
    { name: 'Other Metals / Minerals', hs_code: '2617.90' },
  ]},
  { type: 'MACHINERY', label: 'Machinery & Equipment', products: [
    { name: 'Agricultural Machinery', hs_code: '8432.29' }, { name: 'Construction Equipment', hs_code: '8429.52' },
    { name: 'Industrial Machinery', hs_code: '8479.89' }, { name: 'Electrical Equipment', hs_code: '8504.40' },
    { name: 'Generators', hs_code: '8502.39' }, { name: 'Other Machinery', hs_code: '8479.90' },
  ]},
  { type: 'WOOD_PAPER', label: 'Wood & Paper Products', products: [
    { name: 'Timber / Logs', hs_code: '4403.99' }, { name: 'Plywood', hs_code: '4412.31' },
    { name: 'Paper (Printing)', hs_code: '4802.55' }, { name: 'Cardboard / Packaging', hs_code: '4819.10' },
    { name: 'Furniture', hs_code: '9403.60' }, { name: 'Other Wood Products', hs_code: '4421.99' },
  ]},
  { type: 'ELECTRONICS', label: 'Electronics', products: [
    { name: 'Mobile Phones / Smartphones', hs_code: '8517.13' }, { name: 'Computers / Laptops', hs_code: '8471.30' },
    { name: 'Televisions', hs_code: '8528.72' }, { name: 'Solar Panels', hs_code: '8541.40' },
    { name: 'Batteries / Cells', hs_code: '8507.60' }, { name: 'Other Electronics', hs_code: '8543.70' },
  ]},
  { type: 'PROCESSED_FOODS', label: 'Processed Foods & Beverages', products: [
    { name: 'Canned Fruits', hs_code: '2008.99' }, { name: 'Canned Vegetables', hs_code: '2005.99' },
    { name: 'Fruit Juice', hs_code: '2009.90' }, { name: 'Tomato Paste', hs_code: '2002.90' },
    { name: 'Pasta / Noodles', hs_code: '1902.19' }, { name: 'Biscuits / Cookies', hs_code: '1905.31' },
    { name: 'Snack Foods', hs_code: '1905.90' }, { name: 'Frozen Meals (Ready)', hs_code: '1602.49' },
    { name: 'Bottled Water', hs_code: '2201.10' }, { name: 'Soft Drinks', hs_code: '2202.10' },
    { name: 'Baby Food', hs_code: '2104.20' }, { name: 'Other Processed Foods', hs_code: '2106.90' },
  ]},
  { type: 'PETROLEUM_ENERGY', label: 'Petroleum & Energy Products', products: [
    { name: 'Crude Oil', hs_code: '2709.00' }, { name: 'Refined Petroleum', hs_code: '2710.12' },
    { name: 'Diesel', hs_code: '2710.19' }, { name: 'Liquefied Natural Gas (LNG)', hs_code: '2711.11' },
    { name: 'Liquefied Petroleum Gas (LPG)', hs_code: '2711.12' }, { name: 'Bitumen / Asphalt', hs_code: '2713.20' },
    { name: 'Lubricating Oils', hs_code: '2710.19' }, { name: 'Other Petroleum Products', hs_code: '2710.99' },
  ]},
  { type: 'AUTOMOTIVE', label: 'Automotive & Parts', products: [
    { name: 'Passenger Cars', hs_code: '8703.23' }, { name: 'Trucks & Commercial Vehicles', hs_code: '8704.22' },
    { name: 'Auto Parts (Engine)', hs_code: '8409.91' }, { name: 'Auto Parts (Body)', hs_code: '8708.29' },
    { name: 'Tires', hs_code: '4011.10' }, { name: 'Batteries (Automotive)', hs_code: '8507.10' },
    { name: 'Other Automotive', hs_code: '8708.99' },
  ]},
  { type: 'CERAMICS_GLASS', label: 'Ceramics, Tiles & Glass', products: [
    { name: 'Ceramic Floor Tiles', hs_code: '6908.90' }, { name: 'Ceramic Wall Tiles', hs_code: '6908.10' },
    { name: 'Porcelain Tiles', hs_code: '6907.21' }, { name: 'Sanitary Ware (Ceramic)', hs_code: '6910.10' },
    { name: 'Glass Sheets', hs_code: '7005.10' }, { name: 'Glassware', hs_code: '7013.49' },
    { name: 'Other Ceramics / Glass', hs_code: '6914.90' },
  ]},
  { type: 'LIVESTOCK', label: 'Live Animals & Livestock', products: [
    { name: 'Live Cattle', hs_code: '0102.29' }, { name: 'Live Sheep / Goats', hs_code: '0104.10' },
    { name: 'Live Poultry (Chickens)', hs_code: '0105.11' }, { name: 'Live Horses', hs_code: '0101.29' },
    { name: 'Live Fish (Aquaculture)', hs_code: '0301.99' }, { name: 'Hatching Eggs', hs_code: '0407.11' },
    { name: 'Other Live Animals', hs_code: '0106.19' },
  ]},
  { type: 'BUILDING_MATERIALS', label: 'Building & Construction Materials', products: [
    { name: 'Portland Cement', hs_code: '2523.29' }, { name: 'Marble & Granite', hs_code: '6802.23' },
    { name: 'Steel Rebar', hs_code: '7214.20' }, { name: 'Structural Steel', hs_code: '7216.33' },
    { name: 'PVC Pipes', hs_code: '3917.23' }, { name: 'Bricks', hs_code: '6904.10' },
    { name: 'Roofing Materials', hs_code: '6811.40' }, { name: 'Other Building Materials', hs_code: '6810.99' },
  ]},
  { type: 'OTHER', label: 'Other', products: [
    { name: 'Other (specify in notes)', hs_code: '' },
  ]},
];

// ═══════════════════════════════════════════════════════════════════
// PACKAGING TYPES
// ═══════════════════════════════════════════════════════════════════
const PACKAGING_TYPES = [
  { id: 'boxes', label: 'Boxes (Carton)' },
  { id: 'mesh_bags', label: 'Mesh Bags (Net Bags)' },
  { id: 'plastic_bags', label: 'Plastic Bags' },
  { id: 'wooden_crates', label: 'Wooden Crates' },
  { id: 'bulk_bags', label: 'Bulk Bags (FIBC / Jumbo Bags)' },
  { id: 'drums', label: 'Drums (Steel / Plastic)' },
  { id: 'ibc', label: 'IBC Containers' },
  { id: 'bales', label: 'Bales' },
  { id: 'sacks', label: 'Sacks (Jute / Poly)' },
  { id: 'pallets_wrapped', label: 'Pallet Wrapped (Shrink Wrap)' },
  { id: 'loose', label: 'Loose / Unpackaged' },
  { id: 'other', label: 'Other (specify)' },
];

// ═══════════════════════════════════════════════════════════════════
// PALLET SIZES (International Standard)
// ═══════════════════════════════════════════════════════════════════
const PALLET_SIZES = [
  { id: '120x100', label: '1200 x 1000 mm (EUR2 / ISO1 — Most Common Global)', standard: 'ISO/EUR' },
  { id: '120x80', label: '1200 x 800 mm (EUR / EPAL — European Standard)', standard: 'EUR/EPAL' },
  { id: '114x114', label: '1140 x 1140 mm (Australian Standard)', standard: 'AUS' },
  { id: '110x110', label: '1100 x 1100 mm (Asian Standard — Japan/Korea)', standard: 'ASIA' },
  { id: '107x107', label: '1067 x 1067 mm (North American Standard — 42"x42")', standard: 'NAM' },
  { id: '122x102', label: '1219 x 1016 mm (US GMA Standard — 48"x40")', standard: 'US/GMA' },
  { id: '80x60', label: '800 x 600 mm (Half-Pallet / Display)', standard: 'EUR/HALF' },
  { id: '60x40', label: '600 x 400 mm (Quarter-Pallet / Retail)', standard: 'EUR/QTR' },
];

// ═══════════════════════════════════════════════════════════════════
// CONTAINER TYPES
// ═══════════════════════════════════════════════════════════════════
const CONTAINER_TYPES = [
  { id: '20ft', label: "20' Standard (TEU)", capacity_cbm: 33.2, max_payload_kg: 25000 },
  { id: '40ft', label: "40' Standard", capacity_cbm: 67.7, max_payload_kg: 27600 },
  { id: '40ft_HC', label: "40' High Cube (Most Common)", capacity_cbm: 76.3, max_payload_kg: 26580 },
  { id: '20ft_RF', label: "20' Reefer (Refrigerated)", capacity_cbm: 28.3, max_payload_kg: 21000 },
  { id: '40ft_RF', label: "40' Reefer (Refrigerated)", capacity_cbm: 59.3, max_payload_kg: 26000 },
  { id: '40ft_HC_RF', label: "40' High Cube Reefer", capacity_cbm: 67.5, max_payload_kg: 25400 },
  { id: '20ft_OT', label: "20' Open Top", capacity_cbm: 32.5, max_payload_kg: 21750 },
  { id: '40ft_OT', label: "40' Open Top", capacity_cbm: 65.9, max_payload_kg: 26630 },
  { id: '20ft_FR', label: "20' Flat Rack", capacity_cbm: 0, max_payload_kg: 25000 },
  { id: '40ft_FR', label: "40' Flat Rack", capacity_cbm: 0, max_payload_kg: 40000 },
  { id: '20ft_Tank', label: "20' Tank Container", capacity_cbm: 26, max_payload_kg: 24000 },
];

const INCOTERMS = [
  { code: 'EXW', label: 'Ex Works', group: 'E', payer: 'BUYER' },
  { code: 'FCA', label: 'Free Carrier', group: 'F', payer: 'BUYER' },
  { code: 'FAS', label: 'Free Alongside Ship', group: 'F', payer: 'BUYER' },
  { code: 'FOB', label: 'Free On Board', group: 'F', payer: 'BUYER' },
  { code: 'CFR', label: 'Cost and Freight', group: 'C', payer: 'SELLER' },
  { code: 'CIF', label: 'Cost, Insurance & Freight', group: 'C', payer: 'SELLER' },
  { code: 'CPT', label: 'Carriage Paid To', group: 'C', payer: 'SELLER' },
  { code: 'CIP', label: 'Carriage & Insurance Paid To', group: 'C', payer: 'SELLER' },
  { code: 'DAP', label: 'Delivered At Place', group: 'D', payer: 'SELLER' },
  { code: 'DPU', label: 'Delivered at Place Unloaded', group: 'D', payer: 'SELLER' },
  { code: 'DDP', label: 'Delivered Duty Paid', group: 'D', payer: 'SELLER' },
];

// ═══════════════════════════════════════════════════════════════════
// API ENDPOINTS
// ═══════════════════════════════════════════════════════════════════

// GET /ref/countries — all countries
refData.get('/ref/countries', (c) => c.json({ data: COUNTRIES }));

// GET /ref/ports?country=EG — ports for a country
refData.get('/ref/ports', (c) => {
  const country = c.req.query('country')?.toUpperCase();
  if (country) {
    return c.json({ data: PORTS[country] || [] });
  }
  return c.json({ data: PORTS });
});

// GET /ref/commodity-types — all types with products
refData.get('/ref/commodity-types', (c) => c.json({ data: COMMODITY_TYPES }));

// GET /ref/products?type=FRESH_FRUITS — products for a type
refData.get('/ref/products', (c) => {
  const type = c.req.query('type');
  if (type) {
    const found = COMMODITY_TYPES.find(ct => ct.type === type);
    return c.json({ data: found?.products || [] });
  }
  // Flatten all products
  const all = COMMODITY_TYPES.flatMap(ct => ct.products.map(p => ({ ...p, commodity_type: ct.type, commodity_label: ct.label })));
  return c.json({ data: all });
});

// GET /ref/hs-search?q=0805 — search by HS code or product name
refData.get('/ref/hs-search', (c) => {
  const q = (c.req.query('q') || '').toLowerCase();
  if (q.length < 2) return c.json({ data: [] });
  const results: any[] = [];
  for (const ct of COMMODITY_TYPES) {
    for (const p of ct.products) {
      if (p.hs_code.includes(q) || p.name.toLowerCase().includes(q)) {
        results.push({ ...p, commodity_type: ct.type, commodity_label: ct.label });
      }
    }
  }
  return c.json({ data: results.slice(0, 20) });
});

// GET /ref/packaging — packaging types
refData.get('/ref/packaging', (c) => c.json({ data: PACKAGING_TYPES }));

// GET /ref/pallet-sizes — standard pallet sizes
refData.get('/ref/pallet-sizes', (c) => c.json({ data: PALLET_SIZES }));

// GET /ref/container-types — container types with specs
refData.get('/ref/container-types', (c) => c.json({ data: CONTAINER_TYPES }));

// GET /ref/incoterms — all incoterms
refData.get('/ref/incoterms', (c) => c.json({ data: INCOTERMS }));

export default refData;
