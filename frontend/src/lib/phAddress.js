// Philippine address data: 17 regions -> provinces. Cities / municipalities are listed for Metro
// Manila and Rizal (the cafe's delivery area); everywhere else customers type their city.
export const REGIONS = [
  { name: "NCR – National Capital Region", provinces: ["Metro Manila"] },
  { name: "CAR – Cordillera Administrative Region", provinces: ["Abra", "Apayao", "Benguet", "Ifugao", "Kalinga", "Mountain Province"] },
  { name: "Region I – Ilocos Region", provinces: ["Ilocos Norte", "Ilocos Sur", "La Union", "Pangasinan"] },
  { name: "Region II – Cagayan Valley", provinces: ["Batanes", "Cagayan", "Isabela", "Nueva Vizcaya", "Quirino"] },
  { name: "Region III – Central Luzon", provinces: ["Aurora", "Bataan", "Bulacan", "Nueva Ecija", "Pampanga", "Tarlac", "Zambales"] },
  { name: "Region IV-A – CALABARZON", provinces: ["Batangas", "Cavite", "Laguna", "Quezon", "Rizal"] },
  { name: "MIMAROPA – Region IV-B", provinces: ["Marinduque", "Occidental Mindoro", "Oriental Mindoro", "Palawan", "Romblon"] },
  { name: "Region V – Bicol Region", provinces: ["Albay", "Camarines Norte", "Camarines Sur", "Catanduanes", "Masbate", "Sorsogon"] },
  { name: "Region VI – Western Visayas", provinces: ["Aklan", "Antique", "Capiz", "Guimaras", "Iloilo", "Negros Occidental"] },
  { name: "Region VII – Central Visayas", provinces: ["Bohol", "Cebu", "Negros Oriental", "Siquijor"] },
  { name: "Region VIII – Eastern Visayas", provinces: ["Biliran", "Eastern Samar", "Leyte", "Northern Samar", "Samar", "Southern Leyte"] },
  { name: "Region IX – Zamboanga Peninsula", provinces: ["Zamboanga del Norte", "Zamboanga del Sur", "Zamboanga Sibugay"] },
  { name: "Region X – Northern Mindanao", provinces: ["Bukidnon", "Camiguin", "Lanao del Norte", "Misamis Occidental", "Misamis Oriental"] },
  { name: "Region XI – Davao Region", provinces: ["Davao de Oro", "Davao del Norte", "Davao del Sur", "Davao Occidental", "Davao Oriental"] },
  { name: "Region XII – SOCCSKSARGEN", provinces: ["Cotabato", "Sarangani", "South Cotabato", "Sultan Kudarat"] },
  { name: "Region XIII – Caraga", provinces: ["Agusan del Norte", "Agusan del Sur", "Dinagat Islands", "Surigao del Norte", "Surigao del Sur"] },
  { name: "BARMM – Bangsamoro", provinces: ["Basilan", "Lanao del Sur", "Maguindanao del Norte", "Maguindanao del Sur", "Sulu", "Tawi-Tawi"] },
]

export const CITIES = {
  "Metro Manila": [
    "Caloocan", "Las Piñas", "Makati", "Malabon", "Mandaluyong", "Manila", "Marikina", "Muntinlupa",
    "Navotas", "Parañaque", "Pasay", "Pasig", "Pateros", "Quezon City", "San Juan", "Taguig", "Valenzuela",
  ],
  Bulacan: [
    "Angat", "Balagtas", "Baliuag", "Bocaue", "Bulakan", "Bustos", "Calumpit", "Doña Remedios Trinidad",
    "Guiguinto", "Hagonoy", "Malolos", "Marilao", "Meycauayan", "Norzagaray", "Obando", "Pandi",
    "Paombong", "Plaridel", "Pulilan", "San Ildefonso", "San Jose del Monte", "San Miguel",
    "San Rafael", "Santa Maria",
  ],
  Cavite: [
    "Alfonso", "Amadeo", "Bacoor", "Carmona", "Cavite City", "Dasmariñas", "General Emilio Aguinaldo",
    "General Mariano Alvarez", "General Trias", "Imus", "Indang", "Kawit", "Magallanes", "Maragondon",
    "Mendez", "Naic", "Noveleta", "Rosario", "Silang", "Tagaytay", "Tanza", "Ternate", "Trece Martires",
  ],
  Laguna: [
    "Alaminos", "Bay", "Biñan", "Cabuyao", "Calamba", "Calauan", "Cavinti", "Famy", "Kalayaan", "Liliw",
    "Los Baños", "Luisiana", "Lumban", "Mabitac", "Magdalena", "Majayjay", "Nagcarlan", "Paete",
    "Pagsanjan", "Pakil", "Pangil", "Pila", "Rizal", "San Pablo", "San Pedro", "Santa Cruz",
    "Santa Maria", "Santa Rosa", "Siniloan", "Victoria",
  ],
  Pampanga: [
    "Angeles", "Apalit", "Arayat", "Bacolor", "Candaba", "Floridablanca", "Guagua", "Lubao", "Mabalacat",
    "Macabebe", "Magalang", "Masantol", "Mexico", "Minalin", "Porac", "San Fernando", "San Luis",
    "San Simon", "Santa Ana", "Santa Rita", "Santo Tomas", "Sasmuan",
  ],
  Rizal: [
    "Angono", "Antipolo", "Baras", "Binangonan", "Cainta", "Cardona", "Jala-Jala", "Morong", "Pililla",
    "Rodriguez (Montalban)", "San Mateo", "Tanay", "Taytay", "Teresa",
  ],
}

// Barangays of Teresa, Rizal (the cafe's home town) — shown as a dropdown for exact addresses.
export const TERESA_BARANGAYS = [
  "Bagumbayan", "Calumpang Santo Cristo", "Dalig", "Dulumbayan", "May-Iba",
  "Poblacion", "Prinza", "San Gabriel", "San Roque",
]
export const TERESA_ZIP = "1880"

export const DEFAULT_REGION = "Region IV-A – CALABARZON"
export const DEFAULT_PROVINCE = "Rizal"

/** Teresa, Rizal is the cafe's own delivery area. */
export const isTeresa = (province, city) => province === "Rizal" && /^teresa$/i.test(String(city || "").trim())

/** Anywhere outside Teresa needs a Lalamove rider (and other charges may apply). */
export const needsLalamove = (province, city) =>
  !!province && !!String(city || "").trim() && !isTeresa(province, city)

export const formatAddress = ({ street, subdivision, barangay, city, province, region, zip, landmark }) =>
  [
    street.trim(),
    subdivision?.trim() || "",
    `Brgy. ${barangay.trim().replace(/^(brgy\.?|barangay)\s+/i, "")}`,
    city.trim(),
    province === "Metro Manila" ? "Metro Manila" : `${province}`,
    zip ? zip.trim() : "",
    region.split(" – ")[0],
    "Philippines",
    landmark?.trim() ? `(Landmark: ${landmark.trim()})` : "",
  ]
    .filter(Boolean)
    .join(", ")
    .replace(", (Landmark", " (Landmark")
