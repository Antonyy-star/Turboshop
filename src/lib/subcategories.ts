export const SUBCAT_NAMES: Record<string, string> = {
  "core-assemblies-chra":           "Core assemblies (CHRA)",
  "bearing-housings":               "Bearing Housings",
  "compressor-wheels":              "Compressor Wheels",
  "compressor-plate":               "Compressor Plate",
  "compressor-housings-cold-sides": "Compressor Housings / Cold Sides",
  "shaft-wheels-rotors":            "Shaft & Wheels / Rotors",
  "shaft-nuts":                     "Shaft Nuts",
  "heat-shields":                   "Heat Shields",
  "nozzle-ring-assemblies":         "Nozzle Ring Assemblies",
  "vnt-nozzle-cages":               "VNT Nozzle Cages",
  "actuators":                      "Actuators",
  "actuator-clips":                 "Actuator Clips",
  "actuator-rods":                  "Actuator Rods",
  "electric-motors":                "Electric Motors",
  "wastegate-valves":               "Wastegate Valves",
  "repair-kits":                    "Repair Kits",
  "gaskets-gasket-kits":            "Gaskets & Gasket Kits",
  "seal-rings-piston-rings":        "Seal Rings / Piston Rings",
  "turbine-housings-hot-sides":     "Turbine Housings / Hot Sides",
  "thrust-bearings":                "Thrust Bearings",
  "bolts-nuts-screws-washers":      "Bolts, Nuts, Screws, Washers",
  "recirculation-valves":           "Recirculation Valves",
};

export function applySubcatFilter(q: any, subkat: string): any {
  switch (subkat) {
    case "core-assemblies-chra":
      return q.eq("category", "CHRA");
    case "bearing-housings":
      return q.ilike("name", "Bearing housing%");
    case "compressor-wheels":
      return q.ilike("name", "Compressor wheel%");
    case "compressor-plate":
      return q.ilike("name", "Compressor plate%");
    case "compressor-housings-cold-sides":
      return q.ilike("name", "Compressor housing%");
    case "shaft-wheels-rotors":
      return q.ilike("name", "Shaft and%");
    case "shaft-nuts":
      return q.ilike("name", "Shaft nut%");
    case "heat-shields":
      return q.ilike("name", "Heat shield%");
    case "nozzle-ring-assemblies":
      return q.ilike("name", "Nozzle ring%");
    case "vnt-nozzle-cages":
      return q.ilike("name", "VNT%");
    case "actuator-clips":
      return q.ilike("name", "Actuator clip%");
    case "actuator-rods":
      return q.ilike("name", "Actuator rod%");
    case "electric-motors":
      return q.ilike("name", "Electric actuator%");
    case "actuators":
      return q
        .ilike("name", "Actuator%")
        .not("name", "ilike", "Actuator clip%")
        .not("name", "ilike", "Actuator rod%");
    case "wastegate-valves":
      return q.ilike("name", "Wastegate valve%");
    case "repair-kits":
      return q.ilike("name", "Repair kit%");
    case "gaskets-gasket-kits":
      return q.ilike("name", "Gasket%");
    case "seal-rings-piston-rings":
      return q.ilike("name", "Piston ring%");
    case "turbine-housings-hot-sides":
      return q.ilike("name", "Turbine housing%");
    case "thrust-bearings":
      return q.ilike("name", "Thrust%");
    case "bolts-nuts-screws-washers":
      return q; // handled via ID pre-fetch in the category page
    case "recirculation-valves":
      return q.ilike("name", "Recirculation%");
    default:
      return q;
  }
}
