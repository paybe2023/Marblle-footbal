import { getFlag } from './flag-resolver.js';

export const CONFEDERATIONS=Object.freeze(['CAF','AFC','UEFA','CONMEBOL','CONCACAF','OFC']);

const data={
CAF:`algeria|Algeria|ALG|DZ
angola|Angola|ANG|AO
benin|Benin|BEN|BJ
botswana|Botswana|BOT|BW
burkina-faso|Burkina Faso|BFA|BF
burundi|Burundi|BDI|BI
cameroon|Cameroon|CMR|CM
cape-verde|Cape Verde|CPV|CV
central-african-republic|Central African Republic|CTA|CF
chad|Chad|CHA|TD
comoros|Comoros|COM|KM
congo|Congo|CGO|CG
dr-congo|DR Congo|COD|CD
djibouti|Djibouti|DJI|DJ
egypt|Egypt|EGY|EG
equatorial-guinea|Equatorial Guinea|EQG|GQ
eritrea|Eritrea|ERI|ER
eswatini|Eswatini|SWZ|SZ
ethiopia|Ethiopia|ETH|ET
gabon|Gabon|GAB|GA
gambia|Gambia|GAM|GM
ghana|Ghana|GHA|GH
guinea|Guinea|GUI|GN
guinea-bissau|Guinea-Bissau|GNB|GW
ivory-coast|Ivory Coast|CIV|CI
kenya|Kenya|KEN|KE
lesotho|Lesotho|LES|LS
liberia|Liberia|LBR|LR
libya|Libya|LBY|LY
madagascar|Madagascar|MAD|MG
malawi|Malawi|MWI|MW
mali|Mali|MLI|ML
mauritania|Mauritania|MTN|MR
mauritius|Mauritius|MRI|MU
morocco|Morocco|MAR|MA
mozambique|Mozambique|MOZ|MZ
namibia|Namibia|NAM|NA
niger|Niger|NIG|NE
nigeria|Nigeria|NGA|NG
rwanda|Rwanda|RWA|RW
sao-tome-and-principe|São Tomé and Príncipe|STP|ST
senegal|Senegal|SEN|SN
seychelles|Seychelles|SEY|SC
sierra-leone|Sierra Leone|SLE|SL
somalia|Somalia|SOM|SO
south-africa|South Africa|RSA|ZA
south-sudan|South Sudan|SSD|SS
sudan|Sudan|SDN|SD
tanzania|Tanzania|TAN|TZ
togo|Togo|TOG|TG
tunisia|Tunisia|TUN|TN
uganda|Uganda|UGA|UG
zambia|Zambia|ZAM|ZM
zimbabwe|Zimbabwe|ZIM|ZW`,
AFC:`afghanistan|Afghanistan|AFG|AF
australia|Australia|AUS|AU
bahrain|Bahrain|BHR|BH
bangladesh|Bangladesh|BAN|BD
bhutan|Bhutan|BHU|BT
brunei|Brunei|BRU|BN
cambodia|Cambodia|CAM|KH
china|China PR|CHN|CN
chinese-taipei|Chinese Taipei|TPE|TW
guam|Guam|GUM|GU
hong-kong|Hong Kong|HKG|HK
india|India|IND|IN
indonesia|Indonesia|IDN|ID
iran|Iran|IRN|IR
iraq|Iraq|IRQ|IQ
japan|Japan|JPN|JP
jordan|Jordan|JOR|JO
kuwait|Kuwait|KUW|KW
kyrgyzstan|Kyrgyzstan|KGZ|KG
laos|Laos|LAO|LA
lebanon|Lebanon|LBN|LB
macau|Macau|MAC|MO
malaysia|Malaysia|MAS|MY
maldives|Maldives|MDV|MV
mongolia|Mongolia|MNG|MN
myanmar|Myanmar|MYA|MM
nepal|Nepal|NEP|NP
north-korea|North Korea|PRK|KP
oman|Oman|OMA|OM
pakistan|Pakistan|PAK|PK
palestine|Palestine|PLE|PS
philippines|Philippines|PHI|PH
qatar|Qatar|QAT|QA
saudi-arabia|Saudi Arabia|KSA|SA
singapore|Singapore|SGP|SG
south-korea|South Korea|KOR|KR
sri-lanka|Sri Lanka|SRI|LK
syria|Syria|SYR|SY
tajikistan|Tajikistan|TJK|TJ
thailand|Thailand|THA|TH
timor-leste|Timor-Leste|TLS|TL
turkmenistan|Turkmenistan|TKM|TM
uae|United Arab Emirates|UAE|AE
uzbekistan|Uzbekistan|UZB|UZ
vietnam|Vietnam|VIE|VN
yemen|Yemen|YEM|YE`,
UEFA:`albania|Albania|ALB|AL
andorra|Andorra|AND|AD
armenia|Armenia|ARM|AM
austria|Austria|AUT|AT
azerbaijan|Azerbaijan|AZE|AZ
belarus|Belarus|BLR|BY
belgium|Belgium|BEL|BE
bosnia-and-herzegovina|Bosnia and Herzegovina|BIH|BA
bulgaria|Bulgaria|BUL|BG
croatia|Croatia|CRO|HR
cyprus|Cyprus|CYP|CY
czechia|Czechia|CZE|CZ
denmark|Denmark|DEN|DK
england|England|ENG|GB-ENG
estonia|Estonia|EST|EE
faroe-islands|Faroe Islands|FRO|FO
finland|Finland|FIN|FI
france|France|FRA|FR
georgia|Georgia|GEO|GE
germany|Germany|GER|DE
gibraltar|Gibraltar|GIB|GI
greece|Greece|GRE|GR
hungary|Hungary|HUN|HU
iceland|Iceland|ISL|IS
israel|Israel|ISR|IL
italy|Italy|ITA|IT
kazakhstan|Kazakhstan|KAZ|KZ
kosovo|Kosovo|KVX|XK
latvia|Latvia|LVA|LV
liechtenstein|Liechtenstein|LIE|LI
lithuania|Lithuania|LTU|LT
luxembourg|Luxembourg|LUX|LU
malta|Malta|MLT|MT
moldova|Moldova|MDA|MD
montenegro|Montenegro|MNE|ME
netherlands|Netherlands|NED|NL
north-macedonia|North Macedonia|MKD|MK
northern-ireland|Northern Ireland|NIR|GB-NIR
norway|Norway|NOR|NO
poland|Poland|POL|PL
portugal|Portugal|POR|PT
republic-of-ireland|Republic of Ireland|IRL|IE
romania|Romania|ROU|RO
russia|Russia|RUS|RU
san-marino|San Marino|SMR|SM
scotland|Scotland|SCO|GB-SCT
serbia|Serbia|SRB|RS
slovakia|Slovakia|SVK|SK
slovenia|Slovenia|SVN|SI
spain|Spain|ESP|ES
sweden|Sweden|SWE|SE
switzerland|Switzerland|SUI|CH
turkiye|Türkiye|TUR|TR
ukraine|Ukraine|UKR|UA
wales|Wales|WAL|GB-WLS`,
CONMEBOL:`argentina|Argentina|ARG|AR
bolivia|Bolivia|BOL|BO
brazil|Brazil|BRA|BR
chile|Chile|CHI|CL
colombia|Colombia|COL|CO
ecuador|Ecuador|ECU|EC
paraguay|Paraguay|PAR|PY
peru|Peru|PER|PE
uruguay|Uruguay|URU|UY
venezuela|Venezuela|VEN|VE`,
CONCACAF:`anguilla|Anguilla|AIA|AI
antigua-and-barbuda|Antigua and Barbuda|ATG|AG
aruba|Aruba|ARU|AW
bahamas|Bahamas|BAH|BS
barbados|Barbados|BRB|BB
belize|Belize|BLZ|BZ
bermuda|Bermuda|BER|BM
british-virgin-islands|British Virgin Islands|VGB|VG
canada|Canada|CAN|CA
cayman-islands|Cayman Islands|CAY|KY
costa-rica|Costa Rica|CRC|CR
cuba|Cuba|CUB|CU
curacao|Curaçao|CUW|CW
dominica|Dominica|DMA|DM
dominican-republic|Dominican Republic|DOM|DO
el-salvador|El Salvador|SLV|SV
grenada|Grenada|GRN|GD
guatemala|Guatemala|GUA|GT
guyana|Guyana|GUY|GY
haiti|Haiti|HAI|HT
honduras|Honduras|HON|HN
jamaica|Jamaica|JAM|JM
mexico|Mexico|MEX|MX
montserrat|Montserrat|MSR|MS
nicaragua|Nicaragua|NCA|NI
panama|Panama|PAN|PA
puerto-rico|Puerto Rico|PUR|PR
saint-kitts-and-nevis|Saint Kitts and Nevis|SKN|KN
saint-lucia|Saint Lucia|LCA|LC
saint-vincent-and-the-grenadines|Saint Vincent and the Grenadines|VIN|VC
suriname|Suriname|SUR|SR
trinidad-and-tobago|Trinidad and Tobago|TRI|TT
turks-and-caicos-islands|Turks and Caicos Islands|TCA|TC
us-virgin-islands|US Virgin Islands|VIR|VI
united-states|United States|USA|US`,
OFC:`american-samoa|American Samoa|ASA|AS
cook-islands|Cook Islands|COK|CK
fiji|Fiji|FIJ|FJ
new-caledonia|New Caledonia|NCL|NC
new-zealand|New Zealand|NZL|NZ
papua-new-guinea|Papua New Guinea|PNG|PG
samoa|Samoa|SAM|WS
solomon-islands|Solomon Islands|SOL|SB
tahiti|Tahiti|TAH|PF
tonga|Tonga|TGA|TO
vanuatu|Vanuatu|VAN|VU`
};

const CONFED_COLORS={CAF:['#11a55b','#f5c542'],AFC:['#e63946','#f4f4f4'],UEFA:['#1769cc','#f4f4f4'],CONMEBOL:['#39a9db','#ffd447'],CONCACAF:['#ef3340','#1678ff'],OFC:['#13a89e','#ffd447']};
const rows=Object.entries(data).flatMap(([confederation,text])=>text.trim().split('\n').map(row=>[...row.split('|'),confederation]));

export const TEAMS=Object.freeze(rows.map(([id,name,shortName,countryCode,confederation])=>Object.freeze({id,name,shortName,countryCode,confederation,flag:getFlag(countryCode),colors:CONFED_COLORS[confederation]})).sort((a,b)=>a.name.localeCompare(b.name)));
export const TEAM_BY_ID=Object.freeze(Object.fromEntries(TEAMS.map(team=>[team.id,team])));
export const TEAMS_BY_CONFEDERATION=Object.freeze(Object.fromEntries(CONFEDERATIONS.map(confederation=>[confederation,Object.freeze(TEAMS.filter(team=>team.confederation===confederation))])));
