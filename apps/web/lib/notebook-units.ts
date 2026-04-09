/** Matches `notebooks.preferred_temp_unit` */
export type TempUnit = "C" | "F";
/** Matches `notebooks.preferred_volume_unit` */
export type VolumeUnit = "L" | "gal";

const GAL_TO_L = 3.785411784;

function roundSmart(n: number, d: number): number {
  const p = 10 ** d;
  return Math.round(n * p) / p;
}

export const TEMP_UNIT_OPTIONS = [
  { value: "C" as const, label: "Celsius (°C)" },
  { value: "F" as const, label: "Fahrenheit (°F)" },
];

export const VOLUME_UNIT_OPTIONS = [
  { value: "L" as const, label: "Liters (L)" },
  { value: "gal" as const, label: "US Gallons (gal)" },
];

export const DOSAGE_UNITS = [
  "ml/L",
  "ml/gal",
  "tsp/gal",
  "tsp/L",
  "ml",
] as const;
export type DosageUnit = (typeof DOSAGE_UNITS)[number];

export function normalizeTempUnit(u: string | null | undefined): TempUnit {
  return u === "F" ? "F" : "C";
}

export function normalizeVolumeUnit(u: string | null | undefined): VolumeUnit {
  return u === "gal" ? "gal" : "L";
}

export function tempSuffix(unit: TempUnit): string {
  return unit === "C" ? "°C" : "°F";
}

export function volumeSuffix(unit: VolumeUnit): string {
  return unit === "L" ? "L" : "gal";
}

/** Show stored °C as the owner’s preferred unit. */
export function tempCToDisplay(
  unit: TempUnit,
  tempCString: string | null | undefined,
): string {
  const raw = (tempCString ?? "").trim();
  if (!raw) return "";
  const c = Number(raw.replace(",", "."));
  if (!Number.isFinite(c)) return raw;
  if (unit === "C") return String(roundSmart(c, 1));
  const f = c * (9 / 5) + 32;
  return String(roundSmart(f, 1));
}

/** Parse user input in preferred unit to °C string for the API. */
export function parseDisplayTempToC(
  unit: TempUnit,
  input: string,
): string | null {
  const t = input.trim().replace(",", ".");
  if (!t) return null;
  const n = Number(t);
  if (!Number.isFinite(n)) return null;
  if (unit === "C") return String(roundSmart(n, 2));
  const c = (n - 32) * (5 / 9);
  return String(roundSmart(c, 2));
}

export function litersToDisplayVolume(
  unit: VolumeUnit,
  litersString: string | null | undefined,
): string {
  const raw = (litersString ?? "").trim();
  if (!raw) return "";
  const L = Number(raw.replace(",", "."));
  if (!Number.isFinite(L)) return raw;
  if (unit === "L") return String(roundSmart(L, 2));
  return String(roundSmart(L / GAL_TO_L, 2));
}

export function parseDisplayVolumeToLiters(
  unit: VolumeUnit,
  input: string,
): string | null {
  const t = input.trim().replace(",", ".");
  if (!t) return null;
  const n = Number(t);
  if (!Number.isFinite(n) || n < 0) return null;
  const L = unit === "L" ? n : n * GAL_TO_L;
  return String(roundSmart(L, 3));
}

export function parseNutrientDosage(
  dosage: string | null | undefined,
): { amount: string; unit: DosageUnit } {
  const t = (dosage ?? "").trim();
  if (!t) return { amount: "", unit: "ml/L" };
  const m = t.match(/^(\d+)\s*(.*)$/);
  if (m) {
    const n = Number(m[1]);
    const rest = (m[2] ?? "").trim();
    if (n >= 1 && n <= 25) {
      const u = (DOSAGE_UNITS as readonly string[]).includes(rest)
        ? (rest as DosageUnit)
        : "ml/L";
      return { amount: String(n), unit: u };
    }
  }
  return { amount: "", unit: "ml/L" };
}

export function formatNutrientDosage(
  amount: string,
  unit: DosageUnit,
): string | null {
  const a = amount.trim();
  if (!a) return null;
  return `${a} ${unit}`;
}

export function isUuid(s: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    s.trim(),
  );
}
