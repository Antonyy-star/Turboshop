export const SUBCAT_NAMES: Record<string, string> = {
  // Level-3 categories from turbocentras.com API
  "core-assemblies-chra":           "Core assemblies (CHRA)",
  "repair-kits":                    "Repair Kits",
  "gaskets-gasket-kits":            "Gaskets & Gasket Kits",
  "nozzle-ring-assemblies":         "Nozzle Ring Assemblies",
  "shaft-wheels-rotors":            "Shaft & Wheels / Rotors",
  "compressor-wheels":              "Compressor Wheels",
  "bearing-housings":               "Bearing Housings",
  "heat-shields":                   "Heat Shields",
  "turbine-housings-hot-sides":     "Turbine Housings / Hot Sides",
  "compressor-housings-cold-sides": "Compressor Housings / Cold Sides",
  "bolts-nuts-screws-washers":      "Bolts, Nuts, Screws, Washers",
  "vnt-gaskets":                    "VNT Gaskets & Centring Rings",
  "other-parts":                    "Other Parts",
  "actuators":                      "Actuators",
  "back-plates":                    "Back Plates",
  "oil-supply-systems":             "Oil Supply Systems",
  "egr-gaskets":                    "EGR Gaskets",
  // Level-4 sub-filters
  "vnt-nozzle-cages":               "VNT Nozzle Cages",
  "wastegate-valves":               "Wastegate Valves",
  "actuator-clips":                 "Actuator Clips",
  "actuator-rods":                  "Actuator Rods",
  "electric-motors":                "Electric Motors",
  "shaft-nuts":                     "Shaft Nuts",
  "seal-rings-piston-rings":        "Seal Rings / Piston Rings",
  "recirculation-valves":           "Recirculation Valves",
  "thrust-bearings":                "Thrust Bearings",
  "compressor-plate":               "Compressor Plate",
};

export function applySubcatFilter(q: any, subkat: string): any {
  switch (subkat) {
    // --- Category-based (direct DB category field match) ---
    case "core-assemblies-chra":
      return (q as any).in("category", ["CHRA", "Core assemblies (CHRA)"]);
    case "repair-kits":
      return (q as any).in("category", ["Repair kits"]);
    case "gaskets-gasket-kits":
      return (q as any).in("category", ["Gaskets & Gasket Kits"]);
    case "nozzle-ring-assemblies":
      return (q as any).in("category", ["Nozzle ring assemblies", "VNT nozzle cages", "Unison rings (VNT VGT)", "Nozzle ring retaining sleeves", "Location pins (VNT VGT)", "VNT VGT Nozzle rings"]);
    case "turbine-housings-hot-sides":
      return (q as any).in("category", ["Turbine housings / Hot sides", "Wastegate valves", "Clamp plates (turbine)", "Band clamps (turbine)", "Wastegate sleeves"]);
    case "compressor-housings-cold-sides":
      return (q as any).in("category", ["Compressor housings / Cold sides", "Clamp plates (compressor)", "Band clamps (compressor)"]);
    case "actuators":
      return (q as any).in("category", ["Actuators", "Actuator sensors", "Reversing valves", "Recirculation valves", "Actuator holders", "Actuator heat shields", "Dust protectors", "Actuator rods", "Actuator clips", "Actuator gearboxes", "El. Actuator gears", "Electric motors", "El. actuator plugs", "El. actuator bearings", "El. actuator covers", "Actuator membranes", "El. actuator shafts"]);
    case "back-plates":
      return (q as any).in("category", ["Back plates"]);
    case "oil-supply-systems":
      return (q as any).in("category", ["Oil supply systems", "Oil feed adaptors", "Oil pipes"]);
    case "vnt-gaskets":
      return (q as any).in("category", ["VNT gaskets & Centring rings"]);
    case "egr-gaskets":
      return (q as any).in("category", ["EGR gaskets"]);
    case "other-parts":
      return (q as any).in("category", ["Other parts"]);
    case "bolts-nuts-screws-washers":
      return (q as any).in("category", ["Bolts, nuts, screws, washers", "Retaining rings", "Lock plates", "Anti-rotation pins", "Oil deflectors", "Thrust spacers", "Thrust kits", "Thrust flingers", "Thrust collars", "Thrust washers", "Shaft nuts", "Retaining screws", "Shaft nuts"]);

    // --- Name-based (for categories not in DB as distinct values) ---
    case "bearing-housings":
      return q.ilike("name", "Bearing housing%");
    case "shaft-wheels-rotors":
      return (q as any).in("category", ["Shaft & wheels / Rotors"]);
    case "compressor-wheels":
      return (q as any).in("category", ["Compressor wheels"]);
    case "heat-shields":
      return (q as any).in("category", ["Heat shields"]);
    case "vnt-nozzle-cages":
      return (q as any).in("category", ["VNT nozzle cages"]);
    case "wastegate-valves":
      return (q as any).in("category", ["Wastegate valves", "Wastegate sleeves"]);
    case "seal-rings-piston-rings":
      return (q as any).in("category", ["Seal rings / Piston rings"]);
    case "shaft-nuts":
      return (q as any).in("category", ["Shaft nuts"]);
    case "actuator-clips":
      return (q as any).in("category", ["Actuator clips"]);
    case "actuator-rods":
      return (q as any).in("category", ["Actuator rods"]);
    case "electric-motors":
      return (q as any).in("category", ["Electric motors"]);
    case "recirculation-valves":
      return (q as any).in("category", ["Recirculation valves"]);
    case "thrust-bearings":
      return (q as any).in("category", ["Thrust collars", "Thrust washers", "Thrust spacers", "Thrust kits", "Thrust flingers"]);
    case "compressor-plate":
      return q.ilike("name", "Compressor plate%");
    default:
      return q;
  }
}
