/** Stable deep sort for comparing JSON-like payloads (order-insensitive keys). */
export function deepSortClone(val: unknown): unknown {
  if (val === null || typeof val !== "object") return val;
  if (Array.isArray(val)) return val.map(deepSortClone);
  const o = val as Record<string, unknown>;
  const keys = Object.keys(o).sort();
  const out: Record<string, unknown> = {};
  for (const k of keys) out[k] = deepSortClone(o[k]);
  return out;
}

export function deepJsonEqual(a: unknown, b: unknown): boolean {
  return (
    JSON.stringify(deepSortClone(a)) === JSON.stringify(deepSortClone(b))
  );
}
