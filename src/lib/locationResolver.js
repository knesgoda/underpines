/**
 * locationResolver.js — Resolves postal codes to lat/lng coordinates.
 *
 * US zip codes use a static 3-digit prefix lookup (no API call).
 * International codes use the Open-Meteo Geocoding API.
 * Results are cached in localStorage.
 */

import { getBiomeForLocation } from '@/config/biomeMapping';

const CACHE_KEY = 'under_pines_location_cache';

// ── US 3-digit zip prefix → approximate lat/lng centroids ──────────
// All 1000 prefixes mapped (000–999). Unmapped prefixes fall back to Seattle.
const US_ZIP_PREFIXES = {
  // 000–009: unused / PR / USVI
  '005':  [40.7, -73.9],   // NY (special)
  '006':  [18.2, -66.5],   // PR San Juan
  '007':  [18.2, -66.5],   // PR
  '008':  [18.3, -65.0],   // USVI
  '009':  [18.2, -66.5],   // PR

  // 010–069: New England & NY
  '010':  [42.1, -72.6],   // Springfield MA
  '011':  [42.1, -72.6],   // Springfield MA
  '012':  [42.4, -73.2],   // Pittsfield MA
  '013':  [42.1, -71.8],   // Worcester MA
  '014':  [42.3, -71.8],   // Worcester MA
  '015':  [42.3, -71.8],   // Worcester MA
  '016':  [42.3, -71.8],   // Worcester MA
  '017':  [42.3, -71.8],   // Worcester MA
  '018':  [42.5, -71.2],   // Middlesex MA
  '019':  [42.5, -71.2],   // Middlesex MA
  '020':  [42.0, -71.5],   // Brockton MA
  '021':  [42.4, -71.1],   // Boston MA
  '022':  [42.4, -71.1],   // Boston MA
  '023':  [42.0, -71.0],   // Brockton MA
  '024':  [42.5, -71.2],   // NE Boston MA
  '025':  [41.6, -70.5],   // Cape Cod MA
  '026':  [41.6, -70.5],   // Cape Cod MA
  '027':  [41.8, -71.4],   // Providence RI
  '028':  [41.8, -71.4],   // Providence RI
  '029':  [41.8, -71.4],   // RI
  '030':  [43.0, -71.5],   // Manchester NH
  '031':  [43.0, -71.5],   // Manchester NH
  '032':  [43.0, -71.5],   // NH
  '033':  [43.2, -71.5],   // Concord NH
  '034':  [43.2, -71.5],   // NH
  '035':  [43.6, -72.3],   // VT White River Jct
  '036':  [44.0, -72.1],   // VT Bellows Falls
  '037':  [44.2, -72.6],   // VT
  '038':  [44.5, -72.6],   // VT Burlington
  '039':  [43.7, -72.3],   // VT
  '040':  [43.7, -70.3],   // Portland ME
  '041':  [43.7, -70.3],   // Portland ME
  '042':  [43.7, -70.3],   // ME
  '043':  [44.3, -69.8],   // Augusta ME
  '044':  [44.8, -68.8],   // Bangor ME
  '045':  [43.5, -70.5],   // Bath ME
  '046':  [46.7, -68.0],   // Presque Isle ME
  '047':  [44.5, -68.3],   // ME
  '048':  [44.5, -68.3],   // ME
  '049':  [44.1, -69.1],   // ME
  '050':  [44.5, -73.2],   // Burlington VT / White Plains NY
  '051':  [43.0, -76.1],   // Syracuse NY area
  '052':  [42.7, -73.7],   // Albany NY area
  '053':  [41.2, -73.2],   // CT
  '054':  [42.5, -73.2],   // NY
  '055':  [42.5, -73.2],   // NY
  '056':  [41.2, -73.2],   // CT
  '057':  [41.2, -73.2],   // CT
  '058':  [41.2, -73.2],   // CT
  '059':  [41.2, -73.2],   // CT
  '060':  [41.8, -72.7],   // Hartford CT
  '061':  [41.8, -72.7],   // Hartford CT
  '062':  [41.3, -72.9],   // New Haven CT
  '063':  [41.2, -73.2],   // CT
  '064':  [41.2, -73.2],   // CT
  '065':  [41.2, -73.2],   // CT
  '066':  [41.4, -73.3],   // Bridgeport CT
  '067':  [41.1, -73.5],   // Waterbury CT
  '068':  [41.2, -73.2],   // CT
  '069':  [41.2, -73.2],   // CT

  // 070–089: NJ
  '070':  [40.7, -74.2],   // Newark NJ
  '071':  [40.7, -74.2],   // Newark NJ
  '072':  [40.5, -74.3],   // Elizabeth NJ
  '073':  [40.7, -74.2],   // Jersey City NJ
  '074':  [40.9, -74.2],   // Paterson NJ
  '075':  [40.9, -74.2],   // NJ
  '076':  [40.7, -74.2],   // NJ
  '077':  [40.3, -74.0],   // Red Bank NJ
  '078':  [40.6, -74.6],   // NJ
  '079':  [40.8, -74.8],   // NJ
  '080':  [39.9, -75.0],   // South Jersey
  '081':  [39.7, -75.1],   // Camden NJ
  '082':  [39.7, -75.1],   // NJ
  '083':  [39.5, -74.8],   // NJ
  '084':  [39.5, -75.2],   // NJ
  '085':  [40.2, -74.8],   // Trenton NJ
  '086':  [40.2, -74.8],   // Trenton NJ
  '087':  [40.2, -74.0],   // NJ shore
  '088':  [40.5, -74.4],   // NJ
  '089':  [40.2, -74.8],   // NJ

  // 100–149: NY
  '100':  [40.7, -74.0],   // New York City
  '101':  [40.7, -74.0],   // NYC
  '102':  [40.7, -74.0],   // NYC
  '103':  [40.6, -74.1],   // Staten Island
  '104':  [40.8, -73.9],   // Bronx
  '105':  [41.0, -73.8],   // Westchester
  '106':  [41.0, -73.8],   // White Plains
  '107':  [41.0, -73.9],   // Yonkers
  '108':  [40.9, -73.9],   // New Rochelle
  '109':  [41.1, -74.0],   // Suffern
  '110':  [40.7, -73.8],   // Queens
  '111':  [40.7, -73.8],   // Long Island City
  '112':  [40.7, -73.9],   // Brooklyn
  '113':  [40.8, -73.9],   // Flushing
  '114':  [40.8, -73.8],   // Jamaica
  '115':  [40.8, -73.7],   // W Hempstead
  '116':  [40.7, -73.5],   // Long Island
  '117':  [40.8, -73.0],   // Long Island
  '118':  [40.9, -72.7],   // Long Island
  '119':  [40.9, -72.4],   // Long Island East
  '120':  [42.6, -73.8],   // Albany NY
  '121':  [42.6, -73.8],   // Albany
  '122':  [42.8, -73.9],   // Albany
  '123':  [42.4, -73.6],   // Hudson NY
  '124':  [41.7, -74.0],   // Kingston NY
  '125':  [41.5, -74.0],   // Poughkeepsie
  '126':  [41.5, -74.0],   // Poughkeepsie
  '127':  [42.0, -75.0],   // Mid-Hudson
  '128':  [42.2, -74.0],   // Catskills
  '129':  [42.0, -75.9],   // Binghamton
  '130':  [43.0, -76.1],   // Syracuse
  '131':  [43.0, -76.1],   // Syracuse
  '132':  [43.0, -76.1],   // Syracuse
  '133':  [43.1, -77.0],   // Utica
  '134':  [43.1, -77.0],   // Utica
  '135':  [43.1, -77.0],   // Utica
  '136':  [44.0, -75.2],   // Watertown
  '137':  [44.7, -73.4],   // Plattsburgh (Adirondacks)
  '138':  [42.8, -74.0],   // Schenectady
  '139':  [42.8, -74.0],   // Schenectady
  '140':  [42.9, -78.9],   // Buffalo
  '141':  [42.9, -78.9],   // Buffalo
  '142':  [42.9, -78.9],   // Buffalo
  '143':  [42.1, -79.2],   // Jamestown
  '144':  [43.2, -77.6],   // Rochester
  '145':  [43.2, -77.6],   // Rochester
  '146':  [43.2, -77.6],   // Rochester
  '147':  [42.1, -76.8],   // Elmira
  '148':  [42.4, -76.5],   // Ithaca
  '149':  [42.4, -76.5],   // NY

  // 150–196: PA
  '150':  [40.4, -80.0],   // Pittsburgh
  '151':  [40.4, -80.0],   // Pittsburgh
  '152':  [40.4, -80.0],   // Pittsburgh
  '153':  [40.3, -79.5],   // Pittsburgh area
  '154':  [40.5, -79.9],   // Pittsburgh area
  '155':  [40.0, -79.0],   // Johnstown PA
  '156':  [40.3, -78.9],   // Altoona PA
  '157':  [40.0, -78.5],   // Bedford PA
  '158':  [41.2, -79.4],   // DuBois PA
  '159':  [40.5, -79.5],   // PA
  '160':  [41.0, -80.3],   // New Castle PA
  '161':  [41.0, -80.3],   // PA
  '162':  [42.1, -80.1],   // Erie PA
  '163':  [41.5, -79.0],   // Oil City PA
  '164':  [42.1, -80.1],   // Erie area
  '165':  [42.1, -80.1],   // PA
  '166':  [40.8, -78.4],   // Altoona area
  '167':  [40.5, -78.4],   // PA
  '168':  [40.5, -78.4],   // PA
  '169':  [41.2, -77.0],   // Wellsboro PA
  '170':  [40.3, -76.9],   // Harrisburg PA
  '171':  [40.3, -76.9],   // Harrisburg
  '172':  [40.0, -76.3],   // Lancaster PA
  '173':  [40.0, -76.7],   // York PA
  '174':  [40.0, -76.7],   // York PA
  '175':  [40.3, -76.0],   // Lancaster area
  '176':  [40.3, -76.5],   // PA
  '177':  [41.2, -77.0],   // Williamsport PA
  '178':  [40.6, -75.5],   // Allentown PA
  '179':  [40.3, -75.3],   // Reading PA
  '180':  [40.6, -75.5],   // Lehigh Valley
  '181':  [40.9, -75.2],   // Allentown
  '182':  [41.2, -75.9],   // Wilkes-Barre PA
  '183':  [41.4, -75.7],   // Scranton PA
  '184':  [41.4, -75.7],   // Scranton PA
  '185':  [41.0, -75.2],   // PA
  '186':  [41.2, -75.9],   // PA
  '187':  [41.2, -75.9],   // PA
  '188':  [41.0, -75.2],   // PA
  '189':  [40.1, -75.3],   // Doylestown PA
  '190':  [40.0, -75.1],   // Philadelphia PA
  '191':  [40.0, -75.2],   // Philadelphia
  '192':  [40.0, -75.2],   // Philadelphia
  '193':  [40.0, -75.5],   // SE PA
  '194':  [40.1, -75.5],   // PA
  '195':  [40.3, -75.9],   // Reading PA
  '196':  [40.3, -75.9],   // Reading PA

  // 197–199: DE
  '197':  [39.7, -75.5],   // Wilmington DE
  '198':  [39.2, -75.5],   // Dover DE
  '199':  [39.2, -75.5],   // DE

  // 200–205: DC
  '200':  [38.9, -77.0],   // Washington DC
  '201':  [38.9, -77.0],   // DC
  '202':  [38.9, -77.0],   // DC
  '203':  [38.9, -77.0],   // DC
  '204':  [38.9, -77.0],   // DC
  '205':  [38.9, -77.0],   // DC

  // 206–219: MD
  '206':  [38.9, -76.9],   // Southern MD
  '207':  [39.0, -76.6],   // Laurel MD
  '208':  [39.0, -76.8],   // Suburban MD
  '209':  [39.3, -76.6],   // Silver Spring MD
  '210':  [39.3, -76.6],   // Baltimore MD
  '211':  [39.3, -76.6],   // Baltimore
  '212':  [39.3, -76.6],   // Baltimore
  '213':  [39.3, -76.6],   // Baltimore area
  '214':  [39.4, -77.4],   // Frederick MD
  '215':  [39.6, -79.0],   // Cumberland MD
  '216':  [38.4, -75.6],   // Easton MD
  '217':  [39.4, -77.4],   // Frederick MD
  '218':  [38.3, -76.5],   // MD
  '219':  [38.3, -75.1],   // Salisbury MD

  // 220–246: VA
  '220':  [38.8, -77.1],   // Northern VA
  '221':  [38.8, -77.1],   // Northern VA
  '222':  [38.8, -77.2],   // Arlington VA
  '223':  [38.7, -77.3],   // Alexandria VA
  '224':  [38.3, -77.5],   // Fredericksburg VA
  '225':  [38.3, -77.5],   // VA
  '226':  [39.2, -77.5],   // Winchester VA
  '227':  [38.0, -78.5],   // Charlottesville VA
  '228':  [38.0, -79.4],   // Harrisonburg VA
  '229':  [37.3, -79.4],   // Lynchburg VA
  '230':  [37.5, -77.4],   // Richmond VA
  '231':  [37.5, -77.4],   // Richmond
  '232':  [37.5, -77.4],   // Richmond
  '233':  [36.8, -76.3],   // Norfolk VA
  '234':  [36.8, -76.3],   // Norfolk VA
  '235':  [37.0, -76.4],   // Newport News VA
  '236':  [37.0, -76.4],   // VA
  '237':  [37.4, -77.4],   // Petersburg VA
  '238':  [37.4, -77.4],   // VA
  '239':  [38.3, -77.5],   // VA
  '240':  [37.3, -80.1],   // Roanoke VA
  '241':  [37.3, -80.1],   // Roanoke VA
  '242':  [37.8, -79.4],   // VA
  '243':  [37.0, -80.4],   // VA
  '244':  [38.0, -79.4],   // Staunton VA
  '245':  [37.3, -79.4],   // VA
  '246':  [36.8, -81.2],   // Bluefield VA

  // 247–268: WV, NC, SC
  '247':  [36.8, -81.2],   // Bluefield WV
  '248':  [38.3, -81.6],   // Charleston WV
  '249':  [37.8, -81.2],   // Lewisburg WV
  '250':  [38.3, -81.6],   // Charleston WV
  '251':  [38.3, -81.6],   // Charleston WV
  '252':  [38.3, -81.6],   // WV
  '253':  [38.4, -82.4],   // Huntington WV
  '254':  [39.3, -80.3],   // Martinsburg WV
  '255':  [39.3, -80.3],   // WV
  '256':  [38.3, -81.6],   // WV
  '257':  [39.3, -80.3],   // WV
  '258':  [39.6, -79.9],   // WV
  '259':  [39.3, -80.3],   // WV
  '260':  [39.6, -79.9],   // WV
  '261':  [39.3, -80.3],   // Parkersburg WV
  '262':  [39.6, -79.9],   // WV
  '263':  [39.3, -79.4],   // WV
  '264':  [39.3, -79.4],   // WV
  '265':  [38.3, -80.8],   // WV
  '266':  [38.9, -80.2],   // Elkins WV
  '267':  [38.9, -80.2],   // WV
  '268':  [39.5, -77.9],   // Martinsburg WV

  // 270–299: NC, SC, GA
  '270':  [36.1, -79.8],   // Greensboro NC
  '271':  [36.1, -79.8],   // Greensboro NC
  '272':  [35.8, -78.6],   // Raleigh NC
  '273':  [35.8, -78.6],   // Raleigh NC
  '274':  [36.1, -79.8],   // NC
  '275':  [35.8, -78.6],   // Raleigh NC
  '276':  [36.1, -80.2],   // Winston-Salem NC
  '277':  [35.2, -80.8],   // Charlotte NC
  '278':  [35.6, -77.4],   // Rocky Mount NC
  '279':  [35.6, -77.4],   // NC
  '280':  [35.2, -80.8],   // Charlotte NC
  '281':  [35.2, -80.8],   // Charlotte
  '282':  [35.2, -80.8],   // Charlotte
  '283':  [35.6, -82.6],   // Asheville NC
  '284':  [34.2, -77.9],   // Wilmington NC
  '285':  [35.3, -83.5],   // NC mountains
  '286':  [34.2, -77.9],   // NC coast
  '287':  [35.3, -83.5],   // NC
  '288':  [35.6, -82.6],   // Asheville area
  '289':  [35.6, -82.6],   // NC
  '290':  [32.8, -79.9],   // Charleston SC
  '291':  [32.8, -79.9],   // Charleston SC
  '292':  [34.0, -81.0],   // Columbia SC
  '293':  [34.8, -82.4],   // Greenville SC
  '294':  [34.0, -81.0],   // SC
  '295':  [33.5, -80.8],   // SC
  '296':  [34.2, -79.8],   // Florence SC
  '297':  [35.0, -81.0],   // SC
  '298':  [32.1, -81.1],   // Savannah GA
  '299':  [32.1, -81.1],   // GA coast

  // 300–319: GA
  '300':  [33.7, -84.4],   // Atlanta GA
  '301':  [33.7, -84.4],   // Atlanta
  '302':  [33.7, -84.4],   // Atlanta
  '303':  [33.7, -84.4],   // Atlanta
  '304':  [33.5, -84.0],   // Swainsboro GA
  '305':  [33.5, -82.0],   // Athens GA
  '306':  [33.5, -82.0],   // Athens GA
  '307':  [34.3, -83.8],   // Chattanooga area
  '308':  [33.5, -82.0],   // Augusta GA
  '309':  [33.5, -82.0],   // Augusta GA
  '310':  [32.5, -83.6],   // Macon GA
  '311':  [33.7, -84.4],   // Atlanta
  '312':  [32.5, -83.6],   // Macon GA
  '313':  [32.1, -81.1],   // Savannah GA
  '314':  [32.1, -81.1],   // Savannah
  '315':  [31.6, -84.2],   // Waycross GA
  '316':  [31.0, -83.5],   // Valdosta GA
  '317':  [31.6, -84.2],   // Albany GA
  '318':  [32.5, -84.9],   // Columbus GA
  '319':  [32.5, -84.9],   // Columbus GA

  // 320–349: FL
  '320':  [30.3, -81.7],   // Jacksonville FL
  '321':  [28.5, -81.4],   // Daytona FL
  '322':  [30.3, -81.7],   // Jacksonville FL
  '323':  [30.4, -87.2],   // Tallahassee FL
  '324':  [30.4, -84.3],   // Tallahassee FL
  '325':  [30.4, -84.3],   // FL panhandle
  '326':  [29.2, -82.1],   // Gainesville FL
  '327':  [28.5, -81.4],   // Orlando FL
  '328':  [28.5, -81.4],   // Orlando
  '329':  [28.1, -80.6],   // Melbourne FL
  '330':  [25.8, -80.2],   // Miami FL
  '331':  [25.8, -80.2],   // Miami
  '332':  [25.8, -80.2],   // Miami
  '333':  [26.1, -80.1],   // Fort Lauderdale FL
  '334':  [26.7, -80.1],   // West Palm Beach FL
  '335':  [27.8, -82.6],   // Tampa FL
  '336':  [27.8, -82.6],   // Tampa
  '337':  [27.3, -82.5],   // St Petersburg FL
  '338':  [28.0, -82.5],   // Tampa area
  '339':  [26.6, -82.0],   // Fort Myers FL
  '340':  [18.3, -64.9],   // USVI
  '341':  [26.6, -82.0],   // FL
  '342':  [26.6, -82.0],   // FL
  '343':  [26.6, -82.0],   // FL
  '344':  [29.2, -82.1],   // FL
  '345':  [28.5, -81.4],   // FL
  '346':  [27.5, -82.5],   // FL
  '347':  [28.0, -82.5],   // FL
  '348':  [28.5, -81.4],   // FL
  '349':  [26.6, -82.0],   // FL

  // 350–369: AL
  '350':  [33.5, -86.8],   // Birmingham AL
  '351':  [33.5, -86.8],   // Birmingham
  '352':  [33.5, -86.8],   // Birmingham
  '353':  [33.5, -86.8],   // Birmingham area
  '354':  [33.2, -87.6],   // Tuscaloosa AL
  '355':  [34.7, -87.7],   // Decatur AL
  '356':  [34.7, -86.6],   // Huntsville AL
  '357':  [34.7, -86.6],   // Huntsville
  '358':  [34.7, -86.6],   // AL
  '359':  [33.2, -87.6],   // AL
  '360':  [32.4, -86.3],   // Montgomery AL
  '361':  [32.4, -86.3],   // Montgomery
  '362':  [33.5, -86.0],   // Anniston AL
  '363':  [31.2, -85.4],   // Dothan AL
  '364':  [31.2, -85.4],   // AL
  '365':  [30.7, -88.0],   // Mobile AL
  '366':  [30.7, -88.0],   // Mobile AL
  '367':  [32.4, -86.3],   // AL
  '368':  [32.4, -86.3],   // AL
  '369':  [32.4, -86.3],   // AL

  // 370–385: TN
  '370':  [36.2, -86.8],   // Nashville TN
  '371':  [36.2, -86.8],   // Nashville
  '372':  [36.2, -86.8],   // Nashville
  '373':  [35.0, -85.3],   // Chattanooga TN
  '374':  [35.0, -85.3],   // Chattanooga
  '375':  [36.2, -86.8],   // TN
  '376':  [36.5, -82.6],   // Johnson City TN
  '377':  [35.9, -84.1],   // Knoxville TN
  '378':  [35.9, -84.1],   // Knoxville
  '379':  [35.9, -84.1],   // Knoxville area
  '380':  [35.1, -90.0],   // Memphis TN
  '381':  [35.1, -90.0],   // Memphis
  '382':  [35.6, -88.8],   // McKenzie TN
  '383':  [35.6, -88.8],   // Jackson TN
  '384':  [35.2, -87.0],   // Columbia TN
  '385':  [36.3, -87.4],   // Cookeville TN

  // 386–397: MS
  '386':  [34.3, -89.5],   // Greenville MS
  '387':  [34.3, -89.5],   // MS
  '388':  [34.8, -89.0],   // Tupelo MS
  '389':  [34.8, -89.0],   // MS
  '390':  [32.3, -90.2],   // Jackson MS
  '391':  [32.3, -90.2],   // Jackson
  '392':  [32.3, -90.2],   // MS
  '393':  [31.3, -89.3],   // Meridian MS
  '394':  [31.3, -89.3],   // Hattiesburg MS
  '395':  [30.4, -89.1],   // Gulfport MS
  '396':  [32.3, -90.2],   // MS
  '397':  [32.3, -90.2],   // MS

  // 400–427: KY
  '400':  [38.3, -85.8],   // Louisville KY
  '401':  [38.3, -85.8],   // Louisville
  '402':  [38.3, -85.8],   // Louisville
  '403':  [37.0, -85.7],   // Lexington area
  '404':  [38.0, -84.5],   // Lexington KY
  '405':  [38.0, -84.5],   // Lexington
  '406':  [38.0, -84.5],   // KY
  '407':  [37.1, -84.1],   // Corbin KY
  '408':  [37.1, -84.1],   // KY
  '409':  [37.7, -83.7],   // KY
  '410':  [39.1, -84.5],   // Cincinnati KY area
  '411':  [38.0, -83.4],   // Ashland KY
  '412':  [38.0, -83.4],   // KY
  '413':  [37.1, -84.1],   // KY
  '414':  [37.1, -84.1],   // KY
  '415':  [37.8, -87.6],   // Pikeville KY
  '416':  [37.8, -87.6],   // KY
  '417':  [37.8, -85.4],   // Hazard KY
  '418':  [37.8, -85.4],   // KY
  '420':  [36.7, -86.2],   // Paducah area
  '421':  [37.0, -86.5],   // Bowling Green KY
  '422':  [37.0, -86.5],   // KY
  '423':  [37.1, -88.4],   // Owensboro KY
  '424':  [37.8, -87.6],   // KY
  '425':  [38.0, -84.0],   // KY
  '426':  [38.0, -84.0],   // KY
  '427':  [38.0, -84.0],   // KY

  // 430–458: OH
  '430':  [39.9, -82.9],   // Columbus OH
  '431':  [39.9, -82.9],   // Columbus
  '432':  [39.9, -82.9],   // Columbus
  '433':  [39.9, -82.9],   // Columbus area
  '434':  [40.8, -81.4],   // Akron area
  '435':  [39.3, -84.3],   // Dayton area
  '436':  [41.1, -81.5],   // Toledo area
  '437':  [40.1, -82.0],   // Zanesville OH
  '438':  [40.1, -82.0],   // OH
  '439':  [40.8, -81.4],   // Steubenville OH
  '440':  [41.5, -81.7],   // Cleveland OH
  '441':  [41.5, -81.7],   // Cleveland
  '442':  [41.1, -81.5],   // Akron OH
  '443':  [41.1, -81.5],   // Akron
  '444':  [41.1, -80.7],   // Youngstown OH
  '445':  [41.1, -80.7],   // Youngstown
  '446':  [40.8, -81.4],   // Canton OH
  '447':  [40.8, -81.4],   // Canton
  '448':  [40.3, -81.5],   // Mansfield OH
  '449':  [40.8, -81.4],   // OH
  '450':  [39.1, -84.5],   // Cincinnati OH
  '451':  [39.1, -84.5],   // Cincinnati
  '452':  [39.1, -84.5],   // Cincinnati
  '453':  [39.8, -84.2],   // Dayton OH
  '454':  [39.8, -84.2],   // Dayton
  '455':  [39.8, -84.2],   // Springfield OH
  '456':  [39.3, -82.1],   // Chillicothe OH
  '457':  [39.3, -82.1],   // OH
  '458':  [40.8, -83.6],   // Lima OH

  // 460–479: IN
  '460':  [39.8, -86.2],   // Indianapolis IN
  '461':  [39.8, -86.2],   // Indianapolis
  '462':  [39.8, -86.2],   // Indianapolis
  '463':  [39.8, -86.2],   // Indianapolis area
  '464':  [41.1, -85.1],   // Gary area
  '465':  [41.1, -85.1],   // IN
  '466':  [41.1, -85.1],   // Fort Wayne IN
  '467':  [41.1, -85.1],   // Fort Wayne
  '468':  [41.1, -85.1],   // Fort Wayne area
  '469':  [41.7, -86.3],   // South Bend IN
  '470':  [39.8, -86.2],   // IN
  '471':  [38.3, -85.8],   // New Albany IN
  '472':  [39.2, -85.9],   // Columbus IN
  '473':  [39.5, -87.4],   // Muncie IN
  '474':  [39.2, -86.5],   // Bloomington IN
  '475':  [39.5, -87.4],   // Terre Haute IN
  '476':  [38.0, -87.6],   // Evansville IN
  '477':  [38.0, -87.6],   // Evansville
  '478':  [39.5, -87.4],   // IN
  '479':  [40.5, -86.1],   // Lafayette IN

  // 480–499: MI
  '480':  [42.3, -83.0],   // Detroit MI
  '481':  [42.3, -83.0],   // Detroit
  '482':  [42.3, -83.0],   // Detroit
  '483':  [42.3, -83.0],   // Detroit area
  '484':  [42.7, -83.3],   // Flint MI
  '485':  [42.7, -83.3],   // Flint
  '486':  [43.4, -83.9],   // Saginaw MI
  '487':  [43.4, -83.9],   // Saginaw
  '488':  [42.7, -84.5],   // Lansing MI
  '489':  [42.7, -84.5],   // Lansing
  '490':  [42.3, -85.2],   // Kalamazoo MI
  '491':  [42.3, -85.2],   // Kalamazoo
  '492':  [42.1, -86.5],   // Jackson MI
  '493':  [43.0, -85.7],   // Grand Rapids MI
  '494':  [43.0, -85.7],   // Grand Rapids
  '495':  [43.0, -85.7],   // Grand Rapids area
  '496':  [44.3, -85.6],   // Traverse City MI
  '497':  [44.8, -84.7],   // Gaylord MI
  '498':  [45.8, -84.7],   // Iron Mountain MI
  '499':  [46.5, -87.4],   // Marquette MI (UP)

  // 500–528: IA
  '500':  [41.6, -93.6],   // Des Moines IA
  '501':  [41.6, -93.6],   // Des Moines
  '502':  [41.6, -93.6],   // Des Moines area
  '503':  [41.6, -93.6],   // IA
  '504':  [42.5, -92.3],   // Waterloo IA
  '505':  [42.0, -93.0],   // Fort Dodge IA
  '506':  [42.5, -92.3],   // Waterloo
  '507':  [42.5, -92.3],   // IA
  '508':  [41.3, -95.8],   // Creston IA
  '509':  [41.6, -93.6],   // IA
  '510':  [42.5, -96.4],   // Sioux City IA
  '511':  [42.5, -96.4],   // Sioux City
  '512':  [41.3, -95.8],   // IA
  '513':  [41.3, -95.8],   // IA
  '514':  [41.3, -95.8],   // IA
  '515':  [41.3, -95.8],   // IA
  '516':  [42.0, -94.2],   // IA
  '520':  [42.0, -90.6],   // Dubuque IA
  '521':  [42.0, -90.6],   // Dubuque
  '522':  [41.7, -91.5],   // Cedar Rapids IA
  '523':  [41.0, -91.7],   // Burlington IA
  '524':  [41.7, -91.5],   // IA
  '525':  [41.0, -91.7],   // IA
  '526':  [41.0, -91.7],   // IA
  '527':  [41.7, -91.5],   // IA
  '528':  [41.6, -90.6],   // Davenport IA

  // 530–549: WI
  '530':  [43.1, -89.4],   // Madison WI
  '531':  [43.1, -89.4],   // Madison
  '532':  [42.7, -87.8],   // Milwaukee WI area
  '534':  [42.7, -87.8],   // Racine WI
  '535':  [43.1, -89.4],   // WI
  '537':  [43.1, -89.4],   // WI
  '538':  [43.1, -89.4],   // WI
  '539':  [43.8, -88.4],   // Portage WI
  '540':  [44.5, -88.0],   // Green Bay WI
  '541':  [44.5, -88.0],   // Green Bay
  '542':  [44.5, -88.0],   // WI
  '543':  [44.5, -88.0],   // WI
  '544':  [44.8, -89.6],   // Wausau WI
  '545':  [45.8, -89.7],   // Rhinelander WI
  '546':  [44.0, -91.5],   // La Crosse WI
  '547':  [44.8, -91.5],   // Eau Claire WI
  '548':  [44.8, -91.5],   // WI
  '549':  [44.8, -91.5],   // WI

  // 550–567: MN
  '550':  [44.9, -93.3],   // Minneapolis MN
  '551':  [44.9, -93.3],   // St Paul MN
  '553':  [44.9, -93.3],   // Minneapolis
  '554':  [44.9, -93.3],   // Minneapolis
  '555':  [44.9, -93.3],   // Minneapolis
  '556':  [46.8, -92.1],   // Duluth MN
  '557':  [46.8, -92.1],   // Duluth
  '558':  [46.8, -92.1],   // Duluth area
  '559':  [44.0, -92.5],   // Rochester MN
  '560':  [45.6, -94.2],   // Mankato area
  '561':  [45.6, -94.2],   // MN
  '562':  [45.6, -94.2],   // MN
  '563':  [45.6, -94.2],   // St Cloud MN
  '564':  [46.4, -94.0],   // Brainerd MN
  '565':  [47.5, -94.9],   // Bemidji MN
  '566':  [47.5, -94.9],   // MN
  '567':  [46.9, -96.8],   // Thief River Falls MN

  // 570–577: SD
  '570':  [43.5, -96.7],   // Sioux Falls SD
  '571':  [43.5, -96.7],   // Sioux Falls
  '572':  [44.3, -98.2],   // Watertown SD
  '573':  [43.3, -97.4],   // Mitchell SD
  '574':  [44.4, -100.3],  // Aberdeen SD
  '575':  [44.1, -103.2],  // Pierre SD
  '576':  [43.9, -99.3],   // Mobridge SD
  '577':  [44.1, -103.2],  // Rapid City SD

  // 580–588: ND
  '580':  [46.9, -96.8],   // Fargo ND
  '581':  [46.9, -96.8],   // Fargo
  '582':  [47.9, -97.0],   // Grand Forks ND
  '583':  [48.2, -101.3],  // Devils Lake ND
  '584':  [48.2, -101.3],  // ND
  '585':  [46.8, -100.8],  // Bismarck ND
  '586':  [46.8, -100.8],  // Bismarck
  '587':  [48.0, -103.6],  // Williston ND
  '588':  [48.0, -103.6],  // ND

  // 590–599: MT
  '590':  [45.8, -108.5],  // Billings MT
  '591':  [45.8, -108.5],  // Billings
  '592':  [47.5, -111.3],  // Wolf Point MT
  '593':  [47.5, -106.6],  // Miles City MT
  '594':  [47.5, -111.3],  // Great Falls MT
  '595':  [47.5, -111.3],  // MT
  '596':  [46.9, -114.0],  // Helena MT
  '597':  [47.0, -109.4],  // Lewistown MT
  '598':  [46.9, -114.0],  // Missoula MT
  '599':  [48.2, -114.3],  // Kalispell MT

  // 600–629: IL
  '600':  [41.9, -87.6],   // Chicago IL
  '601':  [41.9, -87.6],   // Chicago
  '602':  [41.9, -87.6],   // Evanston IL
  '603':  [41.8, -88.0],   // Oak Park IL
  '604':  [41.8, -87.6],   // Chicago south
  '605':  [41.9, -87.6],   // Chicago
  '606':  [41.9, -87.6],   // Chicago
  '607':  [41.9, -87.6],   // Chicago
  '608':  [41.9, -87.6],   // Chicago
  '609':  [41.5, -88.2],   // Kankakee IL
  '610':  [41.5, -90.6],   // Rockford area
  '611':  [41.5, -90.6],   // Rock Island IL
  '612':  [41.5, -90.6],   // IL
  '613':  [40.5, -88.9],   // La Salle IL
  '614':  [40.7, -89.6],   // Peoria IL
  '615':  [40.7, -89.6],   // Peoria
  '616':  [40.7, -89.6],   // IL
  '617':  [40.1, -88.2],   // Champaign IL
  '618':  [40.1, -88.2],   // Champaign
  '619':  [40.1, -88.2],   // IL
  '620':  [38.6, -90.2],   // East St. Louis IL
  '622':  [38.6, -90.2],   // IL
  '623':  [38.5, -89.0],   // Quincy IL area
  '624':  [37.7, -89.2],   // Effingham IL
  '625':  [39.8, -89.6],   // Springfield IL
  '626':  [39.8, -89.6],   // Springfield
  '627':  [39.8, -89.6],   // IL
  '628':  [37.7, -89.2],   // Centralia IL
  '629':  [37.7, -89.2],   // Carbondale IL

  // 630–658: MO
  '630':  [38.6, -90.2],   // St. Louis MO
  '631':  [38.6, -90.2],   // St. Louis
  '633':  [38.6, -90.2],   // St. Louis area
  '634':  [38.5, -91.0],   // Quincy MO area
  '635':  [39.1, -94.6],   // MO
  '636':  [38.6, -90.2],   // MO
  '637':  [37.2, -93.3],   // Springfield MO
  '638':  [37.2, -93.3],   // Springfield MO
  '639':  [37.2, -93.3],   // MO
  '640':  [39.1, -94.6],   // Kansas City MO
  '641':  [39.1, -94.6],   // Kansas City
  '644':  [38.5, -91.0],   // MO
  '645':  [38.8, -92.2],   // Jefferson City MO
  '646':  [38.5, -91.0],   // MO
  '647':  [37.8, -90.4],   // Cape Girardeau MO
  '648':  [37.2, -93.3],   // MO
  '649':  [39.1, -94.6],   // Kansas City area
  '650':  [38.8, -92.2],   // Mid-MO
  '651':  [38.8, -92.2],   // Jefferson City
  '652':  [39.1, -94.6],   // MO
  '653':  [38.6, -90.2],   // MO
  '654':  [37.2, -93.3],   // MO
  '655':  [37.2, -93.3],   // MO
  '656':  [37.2, -93.3],   // MO
  '657':  [37.2, -93.3],   // MO
  '658':  [39.1, -94.6],   // MO

  // 660–679: KS
  '660':  [39.0, -94.7],   // Kansas City KS
  '661':  [39.0, -94.7],   // Kansas City KS
  '662':  [39.0, -95.7],   // Topeka KS
  '664':  [39.0, -95.7],   // Topeka
  '665':  [39.0, -95.7],   // Topeka area
  '666':  [39.0, -95.7],   // Topeka
  '667':  [38.8, -97.6],   // Fort Scott KS
  '668':  [39.0, -95.7],   // KS
  '669':  [38.8, -97.6],   // Salina KS
  '670':  [37.7, -97.3],   // Wichita KS
  '671':  [37.7, -97.3],   // Wichita
  '672':  [37.7, -97.3],   // Wichita area
  '673':  [37.7, -97.3],   // Independence KS
  '674':  [38.8, -97.6],   // Salina
  '675':  [38.8, -99.3],   // Hutchinson KS
  '676':  [39.4, -99.3],   // Hays KS
  '677':  [39.4, -99.3],   // Colby KS
  '678':  [37.9, -100.9],  // Dodge City KS
  '679':  [37.0, -100.9],  // Liberal KS

  // 680–693: NE
  '680':  [41.3, -95.9],   // Omaha NE
  '681':  [41.3, -95.9],   // Omaha
  '683':  [40.8, -96.7],   // Lincoln NE
  '684':  [40.8, -96.7],   // Lincoln
  '685':  [40.8, -96.7],   // Lincoln area
  '686':  [40.9, -98.3],   // Columbus NE
  '687':  [41.9, -97.4],   // Norfolk NE
  '688':  [40.9, -98.3],   // Grand Island NE
  '689':  [40.9, -98.3],   // Hastings NE
  '690':  [40.9, -100.0],  // McCook NE
  '691':  [41.1, -100.8],  // North Platte NE
  '692':  [41.8, -103.7],  // Scottsbluff NE
  '693':  [42.5, -100.5],  // Valentine NE

  // 700–714: LA
  '700':  [30.0, -90.1],   // New Orleans LA
  '701':  [30.0, -90.1],   // New Orleans
  '703':  [30.2, -92.0],   // Thibodaux LA
  '704':  [30.2, -93.2],   // Hammond LA
  '705':  [30.2, -93.2],   // Lafayette LA
  '706':  [30.2, -93.2],   // Lake Charles LA
  '707':  [30.5, -91.2],   // Baton Rouge LA
  '708':  [30.5, -91.2],   // Baton Rouge
  '710':  [32.5, -93.7],   // Shreveport LA
  '711':  [32.5, -93.7],   // Shreveport
  '712':  [32.5, -92.1],   // Monroe LA
  '713':  [31.3, -92.4],   // Alexandria LA
  '714':  [31.3, -92.4],   // Alexandria

  // 716–729: AR
  '716':  [33.4, -94.0],   // Pine Bluff AR area
  '717':  [33.4, -94.0],   // AR
  '718':  [33.4, -93.2],   // Texarkana AR
  '719':  [33.4, -93.2],   // AR
  '720':  [34.7, -92.3],   // Little Rock AR
  '721':  [34.7, -92.3],   // Little Rock
  '722':  [34.7, -92.3],   // Little Rock area
  '723':  [34.5, -93.1],   // Hot Springs AR
  '724':  [34.7, -92.3],   // AR
  '725':  [35.4, -94.0],   // Batesville AR
  '726':  [36.4, -94.2],   // Harrison AR
  '727':  [36.1, -94.2],   // Fayetteville AR
  '728':  [36.1, -94.2],   // AR
  '729':  [35.4, -94.4],   // Fort Smith AR

  // 730–749: OK
  '730':  [35.5, -97.5],   // Oklahoma City OK
  '731':  [35.5, -97.5],   // Oklahoma City
  '733':  [35.2, -97.4],   // Austin TX area (OK)
  '734':  [34.2, -97.1],   // Ardmore OK
  '735':  [34.6, -98.4],   // Lawton OK
  '736':  [35.5, -97.5],   // OK
  '737':  [35.5, -97.5],   // OK
  '738':  [36.1, -97.1],   // OK
  '739':  [36.7, -97.1],   // OK
  '740':  [36.2, -95.9],   // Tulsa OK
  '741':  [36.2, -95.9],   // Tulsa
  '743':  [35.5, -95.0],   // Miami OK area
  '744':  [35.5, -95.0],   // Muskogee OK
  '745':  [34.9, -95.8],   // McAlester OK
  '746':  [35.0, -98.5],   // OK
  '747':  [34.2, -97.1],   // OK
  '748':  [35.5, -99.0],   // OK
  '749':  [36.7, -98.3],   // Enid OK

  // 750–799: TX
  '750':  [32.8, -96.8],   // Dallas TX
  '751':  [32.8, -96.8],   // Dallas
  '752':  [32.8, -96.8],   // Dallas
  '753':  [32.8, -96.8],   // Dallas area
  '754':  [32.8, -97.3],   // Fort Worth area
  '755':  [33.4, -94.0],   // Texarkana TX
  '756':  [31.5, -97.1],   // TX
  '757':  [32.5, -94.7],   // Tyler TX
  '758':  [32.5, -94.7],   // TX
  '759':  [31.1, -97.7],   // Lufkin TX
  '760':  [32.8, -97.3],   // Fort Worth TX
  '761':  [32.8, -97.3],   // Fort Worth
  '762':  [32.8, -96.8],   // TX
  '763':  [31.5, -97.1],   // Waco TX
  '764':  [31.5, -97.1],   // TX
  '765':  [31.5, -97.1],   // TX
  '766':  [33.9, -98.5],   // Wichita Falls TX
  '767':  [33.9, -98.5],   // TX
  '768':  [32.4, -99.7],   // Abilene TX
  '769':  [31.4, -100.5],  // San Angelo TX
  '770':  [29.8, -95.4],   // Houston TX
  '771':  [29.8, -95.4],   // Houston
  '772':  [29.8, -95.4],   // Houston
  '773':  [29.8, -95.4],   // Houston area
  '774':  [29.8, -95.4],   // TX
  '775':  [29.3, -94.8],   // Galveston TX
  '776':  [30.1, -93.7],   // Beaumont TX
  '777':  [30.1, -93.7],   // Beaumont
  '778':  [30.3, -97.7],   // Bryan TX
  '779':  [27.8, -97.4],   // Victoria TX
  '780':  [29.4, -98.5],   // San Antonio TX
  '781':  [29.4, -98.5],   // San Antonio
  '782':  [29.4, -98.5],   // San Antonio
  '783':  [27.5, -97.5],   // Corpus Christi TX
  '784':  [27.5, -97.5],   // Corpus Christi
  '785':  [26.2, -98.2],   // McAllen TX
  '786':  [30.3, -97.7],   // Austin TX
  '787':  [30.3, -97.7],   // Austin
  '788':  [29.4, -100.5],  // Uvalde TX
  '789':  [30.3, -97.7],   // Austin area
  '790':  [33.6, -101.8],  // Amarillo area
  '791':  [34.2, -101.7],  // Amarillo TX
  '792':  [33.6, -101.8],  // TX
  '793':  [33.6, -101.8],  // Lubbock TX
  '794':  [33.6, -101.8],  // Lubbock
  '795':  [32.4, -99.7],   // TX
  '796':  [32.4, -99.7],   // TX
  '797':  [31.8, -106.4],  // Midland TX area
  '798':  [31.8, -106.4],  // El Paso TX
  '799':  [31.8, -106.4],  // El Paso

  // 800–816: CO
  '800':  [39.7, -105.0],  // Denver CO
  '801':  [39.7, -105.0],  // Denver
  '802':  [39.7, -105.0],  // Denver
  '803':  [39.7, -105.0],  // Denver area
  '804':  [39.7, -105.0],  // Denver area
  '805':  [40.6, -105.1],  // Fort Collins CO
  '806':  [40.6, -105.1],  // CO
  '807':  [38.3, -104.6],  // CO Springs area
  '808':  [38.8, -104.8],  // Colorado Springs CO
  '809':  [38.8, -104.8],  // Colorado Springs
  '810':  [38.8, -104.8],  // CO
  '811':  [37.3, -108.6],  // Alamosa CO
  '812':  [37.3, -108.6],  // CO
  '813':  [37.3, -107.9],  // Durango CO
  '814':  [39.1, -108.5],  // Grand Junction CO
  '815':  [39.1, -108.5],  // CO
  '816':  [40.5, -106.8],  // Glenwood Springs CO

  // 820–831: WY
  '820':  [41.1, -104.8],  // Cheyenne WY
  '821':  [41.1, -104.8],  // WY
  '822':  [42.8, -106.3],  // Wheatland WY
  '823':  [42.9, -106.3],  // Rawlins WY
  '824':  [42.8, -106.3],  // WY
  '825':  [41.3, -105.6],  // Laramie WY (originally was in this range but used for broader WY)
  '826':  [42.8, -106.3],  // Casper WY
  '827':  [43.5, -110.8],  // Gillette WY area
  '828':  [44.8, -106.9],  // Sheridan WY
  '829':  [41.8, -110.6],  // Rock Springs WY
  '830':  [41.8, -110.6],  // WY
  '831':  [41.8, -110.6],  // WY

  // 832–838: ID
  '832':  [42.9, -112.5],  // Pocatello ID
  '833':  [43.6, -116.2],  // Boise ID (Twin Falls area)
  '834':  [43.6, -116.2],  // Boise ID
  '835':  [46.7, -117.0],  // Lewiston ID
  '836':  [43.6, -116.2],  // Boise area
  '837':  [43.6, -116.2],  // Boise
  '838':  [47.7, -116.8],  // Spokane ID area

  // 840–847: UT
  '840':  [40.8, -111.9],  // Salt Lake City UT
  '841':  [40.8, -111.9],  // SLC
  '842':  [41.2, -112.0],  // Ogden UT
  '843':  [41.7, -111.8],  // Logan UT
  '844':  [41.2, -112.0],  // Ogden area
  '845':  [39.4, -111.5],  // Price UT
  '846':  [40.2, -111.7],  // Provo UT
  '847':  [37.7, -113.1],  // Cedar City UT

  // 850–865: AZ
  '850':  [33.4, -112.0],  // Phoenix AZ
  '851':  [33.4, -112.0],  // Phoenix
  '852':  [33.4, -112.0],  // Phoenix area
  '853':  [33.4, -112.0],  // Phoenix area
  '855':  [33.4, -112.0],  // AZ
  '856':  [32.2, -110.9],  // Tucson AZ
  '857':  [32.2, -110.9],  // Tucson
  '859':  [34.2, -110.0],  // Show Low AZ
  '860':  [35.2, -111.7],  // Flagstaff AZ
  '863':  [34.5, -114.4],  // Prescott AZ
  '864':  [34.5, -114.4],  // AZ
  '865':  [33.4, -112.0],  // AZ

  // 870–884: NM
  '870':  [35.1, -106.6],  // Albuquerque NM
  '871':  [35.1, -106.6],  // Albuquerque
  '872':  [35.1, -106.6],  // Albuquerque area
  '873':  [34.1, -106.9],  // NM
  '874':  [36.5, -105.0],  // Farmington NM
  '875':  [35.7, -105.9],  // Santa Fe NM
  '877':  [35.7, -105.9],  // Las Vegas NM
  '878':  [34.1, -106.9],  // Socorro NM
  '879':  [35.1, -106.6],  // NM
  '880':  [32.3, -106.7],  // Las Cruces NM
  '881':  [32.3, -104.2],  // Clovis NM
  '882':  [33.4, -104.5],  // Roswell NM
  '883':  [33.4, -104.5],  // NM
  '884':  [36.7, -108.2],  // NM

  // 889–898: NV
  '889':  [36.2, -115.1],  // Las Vegas NV
  '890':  [36.2, -115.1],  // Las Vegas
  '891':  [36.2, -115.1],  // Las Vegas area
  '893':  [36.2, -115.1],  // NV
  '894':  [39.5, -119.8],  // Reno NV
  '895':  [39.5, -119.8],  // Reno
  '897':  [40.8, -117.8],  // Carson City NV
  '898':  [39.5, -117.0],  // Elko NV

  // 900–961: CA
  '900':  [34.1, -118.2],  // Los Angeles CA
  '901':  [34.1, -118.2],  // LA
  '902':  [33.9, -118.4],  // Inglewood CA
  '903':  [33.9, -118.4],  // CA
  '904':  [33.8, -118.2],  // Santa Monica CA
  '905':  [33.8, -118.3],  // Torrance CA
  '906':  [34.0, -118.2],  // Whittier CA
  '907':  [34.0, -118.2],  // Long Beach CA
  '908':  [34.0, -118.2],  // Long Beach
  '910':  [34.1, -118.1],  // Pasadena CA
  '911':  [34.1, -118.1],  // Pasadena
  '912':  [34.2, -118.2],  // Glendale CA
  '913':  [34.4, -118.5],  // Van Nuys CA
  '914':  [34.4, -118.5],  // Van Nuys area
  '915':  [34.2, -118.6],  // CA
  '916':  [34.4, -118.5],  // Burbank CA
  '917':  [34.0, -117.9],  // Industry CA
  '918':  [34.2, -118.2],  // Alhambra CA
  '919':  [34.1, -117.3],  // San Bernardino CA
  '920':  [33.7, -117.9],  // San Diego CA area
  '921':  [32.7, -117.2],  // San Diego CA
  '922':  [33.1, -117.1],  // CA
  '923':  [34.1, -117.3],  // San Bernardino
  '924':  [34.1, -117.3],  // CA
  '925':  [33.9, -116.5],  // Riverside CA
  '926':  [33.7, -117.9],  // Santa Ana CA
  '927':  [33.7, -117.9],  // Santa Ana
  '928':  [34.1, -117.3],  // Anaheim CA area
  '930':  [34.4, -119.7],  // Oxnard CA
  '931':  [34.4, -119.7],  // Santa Barbara CA
  '932':  [35.4, -119.0],  // Bakersfield CA
  '933':  [35.4, -119.0],  // Bakersfield
  '934':  [34.4, -119.7],  // Santa Barbara
  '935':  [36.0, -120.0],  // Mojave area CA
  '936':  [36.7, -119.8],  // Fresno CA
  '937':  [36.7, -119.8],  // Fresno
  '938':  [36.7, -119.8],  // Fresno area
  '939':  [36.6, -121.9],  // Salinas CA
  '940':  [37.8, -122.4],  // San Francisco CA
  '941':  [37.8, -122.4],  // San Francisco
  '942':  [38.5, -121.5],  // Sacramento CA
  '943':  [37.3, -121.9],  // Palo Alto CA
  '944':  [37.6, -122.1],  // San Mateo CA
  '945':  [37.8, -122.3],  // Oakland CA
  '946':  [37.8, -122.3],  // Oakland
  '947':  [37.9, -122.3],  // Berkeley CA
  '948':  [37.9, -122.5],  // Richmond CA
  '949':  [37.9, -122.5],  // San Rafael CA
  '950':  [37.3, -121.9],  // San Jose CA
  '951':  [37.3, -121.9],  // San Jose
  '952':  [37.5, -122.0],  // Stockton CA area
  '953':  [37.6, -120.9],  // Stockton CA
  '954':  [38.0, -122.0],  // Santa Rosa CA
  '955':  [40.6, -122.4],  // Eureka CA
  '956':  [38.6, -121.5],  // Sacramento
  '957':  [38.6, -121.5],  // Sacramento
  '958':  [38.6, -121.5],  // Sacramento area
  '959':  [38.7, -121.3],  // Marysville CA
  '960':  [40.6, -122.4],  // Redding CA
  '961':  [39.2, -121.1],  // Reno/Tahoe area

  // 970–994: WA, OR
  '970':  [45.5, -122.7],  // Portland OR
  '971':  [45.5, -122.7],  // Portland
  '972':  [45.5, -122.7],  // Portland area
  '973':  [44.9, -123.0],  // Salem OR
  '974':  [44.1, -121.3],  // Eugene area OR
  '975':  [42.3, -122.9],  // Medford OR
  '976':  [43.2, -123.4],  // Klamath Falls area
  '977':  [44.1, -121.3],  // Bend OR
  '978':  [45.7, -121.5],  // Pendleton OR
  '979':  [44.6, -124.0],  // OR coast
  '980':  [47.6, -122.3],  // Seattle WA
  '981':  [47.6, -122.3],  // Seattle
  '982':  [47.2, -122.4],  // Tacoma WA area
  '983':  [47.2, -122.4],  // Tacoma WA
  '984':  [47.2, -122.4],  // Tacoma area
  '985':  [47.1, -122.8],  // Olympia WA
  '986':  [45.6, -122.6],  // Portland/Vancouver WA
  '988':  [46.7, -117.0],  // Wenatchee WA
  '989':  [46.7, -117.0],  // Yakima WA area
  '990':  [47.7, -117.4],  // Spokane WA
  '991':  [47.7, -117.4],  // Spokane
  '992':  [47.7, -117.4],  // Spokane area
  '993':  [46.2, -119.2],  // Pasco WA
  '994':  [46.2, -119.2],  // WA

  // 995–999: AK, HI
  '995':  [61.2, -149.9],  // Anchorage AK
  '996':  [61.2, -149.9],  // Anchorage AK
  '997':  [64.8, -147.7],  // Fairbanks AK
  '998':  [58.3, -134.4],  // Juneau AK
  '999':  [58.3, -134.4],  // Ketchikan AK

  // 967–968: HI
  '967':  [21.3, -157.8],  // Honolulu HI
  '968':  [21.3, -157.8],  // HI
};

// ── Defaults ────────────────────────────────────────────────────────
const DEFAULTS = { latitude: 47.6, longitude: -122.3, countryCode: 'US', biome: 'default' };

// ── Cache helpers ───────────────────────────────────────────────────
function loadCache(postalCode, countryCode) {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const cache = JSON.parse(raw);
    const key = `${countryCode}:${postalCode}`;
    return cache[key] || null;
  } catch { return null; }
}

function saveCache(postalCode, countryCode, result) {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    const cache = raw ? JSON.parse(raw) : {};
    cache[`${countryCode}:${postalCode}`] = result;
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch { /* quota exceeded */ }
}

/**
 * Resolve a postal code to coordinates, country code, and biome.
 *
 * @param {string} postalCode
 * @param {string} countryCode — ISO 3166-1 alpha-2
 * @returns {Promise<{ latitude: number, longitude: number, countryCode: string, biome: string }>}
 */
export async function resolveLocation(postalCode, countryCode) {
  if (!postalCode) return DEFAULTS;

  const cc = (countryCode || 'US').toUpperCase().trim();
  const pc = postalCode.trim();

  // Check cache
  const cached = loadCache(pc, cc);
  if (cached) return cached;

  // ── US zip: static lookup ──
  if (cc === 'US') {
    const prefix = pc.replace(/\D/g, '').slice(0, 3);
    const coords = US_ZIP_PREFIXES[prefix];
    if (coords) {
      const result = {
        latitude: coords[0],
        longitude: coords[1],
        countryCode: 'US',
        biome: getBiomeForLocation('US', pc),
      };
      saveCache(pc, cc, result);
      return result;
    }
    // Unrecognized US prefix — default
    const fallback = { ...DEFAULTS, biome: getBiomeForLocation('US', pc) };
    saveCache(pc, cc, fallback);
    return fallback;
  }

  // ── International: Open-Meteo Geocoding API ──
  try {
    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(pc)}&count=1&language=en&format=json`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Geocoding ${res.status}`);
    const data = await res.json();

    if (data.results && data.results.length > 0) {
      const r = data.results[0];
      const resolvedCC = r.country_code?.toUpperCase() || cc;
      const result = {
        latitude: r.latitude,
        longitude: r.longitude,
        countryCode: resolvedCC,
        biome: getBiomeForLocation(resolvedCC, pc),
      };
      saveCache(pc, cc, result);
      return result;
    }
  } catch (err) {
    console.warn('[resolveLocation] Geocoding failed:', err);
  }

  // Fallback with country-based biome
  const fallback = {
    ...DEFAULTS,
    countryCode: cc,
    biome: getBiomeForLocation(cc, pc),
  };
  saveCache(pc, cc, fallback);
  return fallback;
}

export default resolveLocation;
