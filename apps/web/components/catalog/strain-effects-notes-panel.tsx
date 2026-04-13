"use client";

/**
 * Renders multi-line catalog `effects_notes` as labeled blocks (Type, THC, terpenes, …).
 */

function parseLabeledLines(raw: string): Array<{ label: string; value: string }> {
  const lines = raw.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const out: Array<{ label: string; value: string }> = [];
  for (const line of lines) {
    const m = line.match(/^([^:]{1,48}):\s*(.*)$/);
    if (m && m[1] && !m[1].includes("\n")) {
      out.push({ label: m[1].trim(), value: (m[2] ?? "").trim() });
    } else if (out.length > 0) {
      out[out.length - 1]!.value = `${out[out.length - 1]!.value}\n${line}`;
    } else {
      out.push({ label: "Notes", value: line });
    }
  }
  return out;
}

export function StrainEffectsNotesPanel({ text }: { text: string }) {
  const trimmed = text.trim();
  if (!trimmed) return null;
  const rows = parseLabeledLines(trimmed);
  if (rows.length === 0) return null;
  return (
    <div className="space-y-4">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-[var(--gn-text-muted)]">
        Lab notes
      </h2>
      <dl className="space-y-3">
        {rows.map((r, i) => (
          <div
            key={`${r.label}-${i}`}
            className="rounded-lg border border-[var(--gn-divide)] bg-[var(--gn-surface-elevated)] px-3 py-2.5"
          >
            <dt className="text-xs font-semibold text-[var(--gn-text-muted)]">
              {r.label}
            </dt>
            <dd className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-[var(--gn-text)]">
              {r.value}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
