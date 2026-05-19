"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { apiFetch } from "@/lib/api-public";
import { createClient } from "@/lib/supabase/client";
import {
  buildNewBreederSuggestionPayload,
  buildNewStrainSuggestionPayload,
} from "@/lib/new-strain-suggestion-payload";
import { EffectsTagsSelect } from "@/components/catalog/effects-tags-select";

type Kind = "new_strain" | "new_breeder" | "edit_strain" | "edit_breeder";

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80);
}

const inputClass =
  "w-full rounded-xl border border-[var(--gn-divide)] bg-[var(--gn-surface)] px-4 py-3 text-sm text-[var(--gn-text)] placeholder:text-[var(--gn-text-muted)] focus:border-[var(--gn-accent)]/60 focus:outline-none focus:ring-1 focus:ring-[var(--gn-accent)]/40 transition";

const labelClass =
  "block text-sm font-semibold text-[var(--gn-text)] mb-1";

const helpClass = "mt-1.5 text-xs text-[var(--gn-text-muted)] leading-relaxed";

const KIND_LABELS: Record<Kind, string> = {
  new_strain: "Add a new strain",
  new_breeder: "Add a new breeder",
  edit_strain: "Fix / update a strain",
  edit_breeder: "Fix / update a breeder",
};

const KIND_DESCRIPTIONS: Record<Kind, string> = {
  new_strain: "Found a strain missing from the catalog? Tell us about it.",
  new_breeder: "A seed company or breeder that should be listed.",
  edit_strain: "See wrong info on an existing strain? Suggest a correction.",
  edit_breeder: "Wrong details on a breeder page? We'll look into it.",
};

export function CatalogSuggestClient() {
  const router = useRouter();
  const [kind, setKind] = useState<Kind>("new_strain");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const [name, setName] = useState("");
  const [autoSlug, setAutoSlug] = useState("");
  const [description, setDescription] = useState("");
  const [targetSlug, setTargetSlug] = useState("");
  const [breederName, setBreederName] = useState("");
  const [effects, setEffects] = useState<string[]>([]);
  const [effectsNotes, setEffectsNotes] = useState("");
  const [website, setWebsite] = useState("");
  const [country, setCountry] = useState("");
  const [chemotype, setChemotype] = useState<"" | "indica" | "sativa" | "hybrid">("");
  const [genetics, setGenetics] = useState("");
  const [isAutoflower, setIsAutoflower] = useState(false);

  useEffect(() => {
    if (name) setAutoSlug(slugify(name));
  }, [name]);

  async function submit() {
    setError(null);
    setSaving(true);
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) {
        setError("You need to be signed in to submit a suggestion.");
        setSaving(false);
        return;
      }

      const slug = autoSlug || slugify(name);

      let payload: Record<string, unknown> = {};
      switch (kind) {
        case "new_strain":
          payload = buildNewStrainSuggestionPayload({
            slug,
            name,
            description,
            breederSlug: slugify(breederName),
            effects,
            effectsNotes,
            published: true,
            chemotype,
            genetics,
            isAutoflower,
            reportedEffectPctsJson: "",
          });
          break;
        case "new_breeder":
          payload = buildNewBreederSuggestionPayload({
            slug,
            name,
            description,
            website,
            country,
            published: true,
          });
          break;
        case "edit_strain": {
          const patch: Record<string, unknown> = { target_slug: targetSlug.trim() };
          if (name.trim()) patch.name = name.trim();
          if (description.trim()) patch.description = description.trim();
          if (breederName.trim()) patch.breederSlug = slugify(breederName);
          if (effects.length) patch.effects = [...effects];
          if (effectsNotes.trim()) patch.effectsNotes = effectsNotes.trim();
          payload = patch;
          break;
        }
        case "edit_breeder": {
          const patch: Record<string, unknown> = { target_slug: targetSlug.trim() };
          if (name.trim()) patch.name = name.trim();
          if (description.trim()) patch.description = description.trim();
          if (website.trim()) patch.website = website.trim();
          if (country.trim()) patch.country = country.trim();
          payload = patch;
          break;
        }
      }

      await apiFetch("/catalog/suggestions", {
        method: "POST",
        body: JSON.stringify({ kind, payload }),
        token,
      });
      setDone(true);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send suggestion. Try again.");
    } finally {
      setSaving(false);
    }
  }

  if (done) {
    return (
      <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/10 px-6 py-10 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/20 text-3xl">
          ✅
        </div>
        <h2 className="text-xl font-bold text-[var(--gn-text)]">Suggestion submitted!</h2>
        <p className="mt-2 text-sm text-[var(--gn-text-muted)]">
          Our team will review it and add it to the catalog. Thanks for helping build the community resource.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link
            href="/strains"
            className="rounded-full bg-[var(--gn-accent)] px-5 py-2.5 text-sm font-bold text-black transition hover:brightness-110"
          >
            Browse Strains
          </Link>
          <button
            onClick={() => { setDone(false); setName(""); setDescription(""); setBreederName(""); setEffects([]); setEffectsNotes(""); }}
            className="rounded-full border border-[var(--gn-divide)] px-5 py-2.5 text-sm font-medium text-[var(--gn-text)] transition hover:bg-[var(--gn-surface-hover)]"
          >
            Submit Another
          </button>
        </div>
      </div>
    );
  }

  const isEdit = kind === "edit_strain" || kind === "edit_breeder";
  const isBreeder = kind === "new_breeder" || kind === "edit_breeder";
  const isStrain = kind === "new_strain" || kind === "edit_strain";
  const isNew = kind === "new_strain" || kind === "new_breeder";

  return (
    <div className="space-y-6">
      {/* Type selector — card buttons */}
      <div>
        <p className={labelClass}>What are you suggesting?</p>
        <div className="grid grid-cols-2 gap-3">
          {(Object.entries(KIND_LABELS) as [Kind, string][]).map(([k, label]) => (
            <button
              key={k}
              type="button"
              onClick={() => setKind(k)}
              className={`rounded-2xl border p-4 text-left transition ${
                kind === k
                  ? "border-[var(--gn-accent)] bg-[var(--gn-accent)]/10 ring-1 ring-[var(--gn-accent)]/40"
                  : "border-[var(--gn-divide)] bg-[var(--gn-surface-raised)] hover:border-[var(--gn-accent)]/40"
              }`}
            >
              <p className={`text-sm font-semibold ${kind === k ? "text-[var(--gn-accent)]" : "text-[var(--gn-text)]"}`}>
                {label}
              </p>
              <p className="mt-0.5 text-xs text-[var(--gn-text-muted)] leading-snug">
                {KIND_DESCRIPTIONS[k]}
              </p>
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-5 rounded-2xl border border-[var(--gn-divide)] bg-[var(--gn-surface-raised)] p-5 sm:p-6">

        {/* Editing: which entry */}
        {isEdit && (
          <div>
            <label className={labelClass}>
              Which {isBreeder ? "breeder" : "strain"} needs fixing?
            </label>
            <input
              value={targetSlug}
              onChange={(e) => setTargetSlug(e.target.value)}
              required
              className={inputClass}
              placeholder={isBreeder ? "e.g. mephisto-genetics" : "e.g. sour-diesel"}
            />
            <p className={helpClass}>
              Find the page on the site and copy the last part of the URL &mdash; that&apos;s the slug.
            </p>
          </div>
        )}

        {/* Name */}
        <div>
          <label className={labelClass}>
            {isEdit
              ? `New name (leave blank to keep current)`
              : isBreeder
              ? "Breeder / company name"
              : "Strain name"}
          </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            required={isNew}
            className={inputClass}
            placeholder={
              isBreeder
                ? "e.g. Mephisto Genetics"
                : "e.g. Sour Diesel"
            }
          />
          {isNew && autoSlug && (
            <p className={helpClass}>
              Will appear at: <span className="font-mono text-[var(--gn-text)]">/{isBreeder ? "breeders" : "strains"}/{autoSlug}</span>
            </p>
          )}
        </div>

        {/* Description */}
        <div>
          <label className={labelClass}>
            Description {isEdit ? "(optional — only what you want changed)" : ""}
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            className={inputClass}
            placeholder={
              isBreeder
                ? "Tell us about this breeder — where they're from, what they're known for, why growers love their genetics..."
                : "Describe the strain — flavors, effects, grow style, what to expect. Write like you're telling a fellow grower about it."
            }
          />
        </div>

        {/* Breeder (for strains) */}
        {isStrain && (
          <div>
            <label className={labelClass}>Who made this strain? (optional)</label>
            <input
              value={breederName}
              onChange={(e) => setBreederName(e.target.value)}
              className={inputClass}
              placeholder="e.g. Mephisto Genetics"
            />
            <p className={helpClass}>The seed company or breeder behind this strain.</p>
          </div>
        )}

        {/* Effects (strains only) */}
        {isStrain && (
          <>
            <div>
              <label className={labelClass}>What are the effects? (optional)</label>
              <EffectsTagsSelect
                value={effects}
                onChange={setEffects}
                placeholder="e.g. Relaxed — press Enter to add more"
              />
              <p className={helpClass}>Type an effect and press Enter. Add as many as you like.</p>
            </div>
            <div>
              <label className={labelClass}>Anything else about the effects? (optional)</label>
              <input
                value={effectsNotes}
                onChange={(e) => setEffectsNotes(e.target.value)}
                className={inputClass}
                placeholder="e.g. Very calming, great for sleep, strong body high..."
              />
            </div>
          </>
        )}

        {/* Strain extras */}
        {kind === "new_strain" && (
          <div className="space-y-4 rounded-xl border border-[var(--gn-divide)] bg-[var(--gn-surface-muted)] p-4">
            <p className="text-sm font-semibold text-[var(--gn-text)]">
              Extra details <span className="font-normal text-[var(--gn-text-muted)]">(optional — helps us publish faster)</span>
            </p>

            <div>
              <label className={labelClass}>Type of strain</label>
              <div className="mt-1 flex flex-wrap gap-2">
                {["", "indica", "sativa", "hybrid"].map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setChemotype(c as typeof chemotype)}
                    className={`rounded-full border px-4 py-1.5 text-xs font-semibold transition ${
                      chemotype === c
                        ? "border-[var(--gn-accent)] bg-[var(--gn-accent)]/15 text-[var(--gn-accent)]"
                        : "border-[var(--gn-divide)] bg-[var(--gn-surface)] text-[var(--gn-text-muted)] hover:border-[var(--gn-accent)]/40"
                    }`}
                  >
                    {c === "" ? "Not sure" : c.charAt(0).toUpperCase() + c.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-[var(--gn-divide)] bg-[var(--gn-surface)] p-3 transition hover:border-[var(--gn-accent)]/40">
              <input
                type="checkbox"
                checked={isAutoflower}
                onChange={(e) => setIsAutoflower(e.target.checked)}
                className="h-4 w-4 rounded accent-emerald-500"
              />
              <div>
                <p className="text-sm font-medium text-[var(--gn-text)]">Autoflower</p>
                <p className="text-xs text-[var(--gn-text-muted)]">Flowers on its own schedule, not based on light cycle</p>
              </div>
            </label>

            <div>
              <label className={labelClass}>Parent strains / lineage (optional)</label>
              <input
                value={genetics}
                onChange={(e) => setGenetics(e.target.value)}
                className={inputClass}
                placeholder="e.g. Chemdawg × Super Skunk"
              />
            </div>
          </div>
        )}

        {/* Breeder extras */}
        {kind === "new_breeder" && (
          <div className="space-y-4">
            <div>
              <label className={labelClass}>Website (optional)</label>
              <input
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                className={inputClass}
                placeholder="https://theirwebsite.com"
              />
            </div>
            <div>
              <label className={labelClass}>Where are they based? (optional)</label>
              <input
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className={inputClass}
                placeholder="e.g. Spain, Amsterdam, California"
              />
            </div>
          </div>
        )}

        {error && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}

        <button
          type="button"
          disabled={saving || (isNew && !name.trim())}
          onClick={() => void submit()}
          className="w-full rounded-full bg-[var(--gn-accent)] py-3 text-sm font-bold text-black shadow-sm transition hover:brightness-110 disabled:opacity-50"
        >
          {saving ? "Submitting…" : "Submit Suggestion →"}
        </button>
      </div>
    </div>
  );
}
