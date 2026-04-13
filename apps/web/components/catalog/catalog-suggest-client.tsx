"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { apiFetch } from "@/lib/api-public";
import { createClient } from "@/lib/supabase/client";
import {
  buildNewBreederSuggestionPayload,
  buildNewStrainSuggestionPayload,
} from "@/lib/new-strain-suggestion-payload";
import { EffectsTagsSelect } from "@/components/catalog/effects-tags-select";

type Kind =
  | "new_strain"
  | "new_breeder"
  | "edit_strain"
  | "edit_breeder";

export function CatalogSuggestClient() {
  const router = useRouter();
  const [kind, setKind] = useState<Kind>("new_strain");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const [slug, setSlug] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [targetSlug, setTargetSlug] = useState("");
  const [breederSlug, setBreederSlug] = useState("");
  const [effects, setEffects] = useState<string[]>([]);
  const [effectsNotes, setEffectsNotes] = useState("");
  const [published, setPublished] = useState(true);
  const [breederPublished, setBreederPublished] = useState(true);
  const [website, setWebsite] = useState("");
  const [country, setCountry] = useState("");
  const [chemotype, setChemotype] = useState<
    "" | "indica" | "sativa" | "hybrid"
  >("");
  const [genetics, setGenetics] = useState("");
  const [isAutoflower, setIsAutoflower] = useState(false);
  const [reportedEffectPctsJson, setReportedEffectPctsJson] = useState("");

  async function submit() {
    setError(null);
    setSaving(true);
    try {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) {
        setError("Sign in to suggest catalog changes.");
        setSaving(false);
        return;
      }

      const jsonTrim = reportedEffectPctsJson.trim();
      if (jsonTrim) {
        try {
          const parsed = JSON.parse(jsonTrim) as unknown;
          if (
            parsed === null ||
            typeof parsed !== "object" ||
            Array.isArray(parsed)
          ) {
            setError(
              "Reported effect % must be a JSON object, e.g. {\"relaxed\":45,\"happy\":30}.",
            );
            setSaving(false);
            return;
          }
        } catch {
          setError(
            "Invalid JSON in reported effect %. Use a single object like {\"relaxed\":45,\"happy\":30} or leave it blank.",
          );
          setSaving(false);
          return;
        }
      }

      let payload: Record<string, unknown> = {};
      switch (kind) {
        case "new_strain":
          payload = buildNewStrainSuggestionPayload({
            slug,
            name,
            description,
            breederSlug,
            effects,
            effectsNotes,
            published,
            chemotype,
            genetics,
            isAutoflower,
            reportedEffectPctsJson,
          });
          break;
        case "new_breeder":
          payload = buildNewBreederSuggestionPayload({
            slug,
            name,
            description,
            website,
            country,
            published: breederPublished,
          });
          break;
        case "edit_strain": {
          const patch: Record<string, unknown> = {
            target_slug: targetSlug.trim(),
          };
          if (slug.trim()) patch.slug = slug.trim();
          if (name.trim()) patch.name = name.trim();
          if (description.trim()) patch.description = description.trim();
          if (breederSlug.trim()) patch.breederSlug = breederSlug.trim();
          if (effects.length) patch.effects = [...effects];
          if (effectsNotes.trim()) patch.effectsNotes = effectsNotes.trim();
          payload = patch;
          break;
        }
        case "edit_breeder": {
          const patch: Record<string, unknown> = {
            target_slug: targetSlug.trim(),
          };
          if (slug.trim()) patch.slug = slug.trim();
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
      setError(err instanceof Error ? err.message : "Could not send suggestion");
    } finally {
      setSaving(false);
    }
  }

  if (done) {
    return (
      <div className="rounded-lg border border-[var(--gn-divide)] bg-[var(--gn-surface-muted)] px-4 py-6 text-center text-sm text-[var(--gn-text)]">
        <p>Thanks — your suggestion was submitted for staff review.</p>
        <p className="mt-3">
          <Link href="/strains" className="text-[#ff6a38] hover:underline">
            Strains
          </Link>
          {" · "}
          <Link href="/breeders" className="text-[#ff6a38] hover:underline">
            Breeders
          </Link>
        </p>
      </div>
    );
  }

  const showTarget = kind === "edit_strain" || kind === "edit_breeder";
  const showBreeder = kind === "new_strain" || kind === "edit_strain";
  const showEffects = kind === "new_strain" || kind === "edit_strain";
  const showWebsiteCountry = kind === "new_breeder" || kind === "edit_breeder";
  const showSlugName = kind !== "edit_strain" && kind !== "edit_breeder";
  const showStrainExtras = kind === "new_strain";

  return (
    <form
      onSubmit={(e) => {
        /** Block native submit (Enter in inputs) — only the explicit button sends. */
        e.preventDefault();
      }}
      className="space-y-4 rounded-lg border border-[var(--gn-divide)] bg-[var(--gn-surface-muted)] p-4"
    >
      <div>
        <label className="block text-xs font-medium text-[var(--gn-text-muted)]">
          Type
        </label>
        <select
          value={kind}
          onChange={(e) => setKind(e.target.value as Kind)}
          className="mt-1 w-full max-w-md rounded border border-[var(--gn-divide)] bg-[var(--gn-surface)] px-2 py-2 text-sm text-[var(--gn-text)]"
        >
          <option value="new_strain">New strain</option>
          <option value="new_breeder">New breeder</option>
          <option value="edit_strain">Suggest edits — strain</option>
          <option value="edit_breeder">Suggest edits — breeder</option>
        </select>
      </div>

      {showTarget ? (
        <div>
          <label className="block text-xs font-medium text-[var(--gn-text-muted)]">
            URL slug of existing entry
          </label>
          <input
            value={targetSlug}
            onChange={(e) => setTargetSlug(e.target.value)}
            required
            className="mt-1 w-full rounded border border-[var(--gn-divide)] bg-[var(--gn-surface)] px-2 py-1.5 text-sm text-[var(--gn-text)]"
            placeholder="e.g. blue-dream"
          />
          <p className="mt-1 text-xs text-[var(--gn-text-muted)]">
            Only fill in fields you want changed; leave others blank.
          </p>
        </div>
      ) : null}

      {(showSlugName || showTarget) && (
        <>
          {(showSlugName || (showTarget && kind.startsWith("edit"))) && (
            <div>
              <label className="block text-xs font-medium text-[var(--gn-text-muted)]">
                {showTarget ? "New slug (optional)" : "URL slug"}
              </label>
              <input
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                required={!showTarget}
                className="mt-1 w-full rounded border border-[var(--gn-divide)] bg-[var(--gn-surface)] px-2 py-1.5 text-sm text-[var(--gn-text)]"
                placeholder="e.g. sour-diesel (lowercase, hyphens)"
              />
              {!showTarget ? (
                <p className="mt-1 text-xs text-[var(--gn-text-muted)]">
                  Used in the strain or breeder URL; letters, numbers, hyphens
                  only.
                </p>
              ) : null}
            </div>
          )}
          <div>
            <label className="block text-xs font-medium text-[var(--gn-text-muted)]">
              {showTarget ? "Display name (optional)" : "Display name"}
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required={!showTarget}
              className="mt-1 w-full rounded border border-[var(--gn-divide)] bg-[var(--gn-surface)] px-2 py-1.5 text-sm text-[var(--gn-text)]"
              placeholder="e.g. Sour Diesel"
            />
          </div>
        </>
      )}

      <div>
        <label className="block text-xs font-medium text-[var(--gn-text-muted)]">
          Description {showTarget ? "(optional)" : ""}
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
          className="mt-1 w-full rounded border border-[var(--gn-divide)] bg-[var(--gn-surface)] px-2 py-1.5 text-sm text-[var(--gn-text)]"
          placeholder={
            kind === "new_breeder"
              ? "e.g. Mephisto focuses on autoflowers; short paragraph for the directory."
              : "Flavor, effects, grow notes — same style as other catalog entries."
          }
        />
      </div>

      {showBreeder ? (
        <div>
          <label className="block text-xs font-medium text-[var(--gn-text-muted)]">
            Linked breeder slug (optional)
          </label>
          <input
            value={breederSlug}
            onChange={(e) => setBreederSlug(e.target.value)}
            className="mt-1 w-full rounded border border-[var(--gn-divide)] bg-[var(--gn-surface)] px-2 py-1.5 text-sm text-[var(--gn-text)]"
            placeholder="e.g. mephisto-genetics — must match a breeder in /breeders"
          />
          <p className="mt-1 text-xs text-[var(--gn-text-muted)]">
            Find the breeder on the site and copy the last part of their URL.
          </p>
        </div>
      ) : null}

      {showEffects ? (
        <>
          <div>
            <label className="block text-xs font-medium text-[var(--gn-text-muted)]">
              Tags (effects) — same as admin: type one, Enter to add
            </label>
            <div className="mt-1">
              <EffectsTagsSelect
                value={effects}
                onChange={setEffects}
                placeholder="e.g. Relaxed — press Enter, add more"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--gn-text-muted)]">
              Effects notes (<code className="text-[0.7rem]">effectsNotes</code>{" "}
              — optional)
            </label>
            <input
              value={effectsNotes}
              onChange={(e) => setEffectsNotes(e.target.value)}
              className="mt-1 w-full rounded border border-[var(--gn-divide)] bg-[var(--gn-surface)] px-2 py-1.5 text-sm text-[var(--gn-text)]"
              placeholder="e.g. Often reported: calming body high; citrus aroma."
            />
          </div>
        </>
      ) : null}

      {showStrainExtras ? (
        <div className="space-y-4 rounded border border-[var(--gn-divide)] bg-[var(--gn-surface)] p-3">
          <p className="text-xs font-medium text-[var(--gn-text-muted)]">
            Optional details (helps staff publish a complete entry)
          </p>
          <div>
            <label className="block text-xs font-medium text-[var(--gn-text-muted)]">
              Chemotype
            </label>
            <select
              value={chemotype}
              onChange={(e) =>
                setChemotype(e.target.value as typeof chemotype)
              }
              className="mt-1 w-full max-w-xs rounded border border-[var(--gn-divide)] bg-[var(--gn-surface)] px-2 py-1.5 text-sm text-[var(--gn-text)]"
            >
              <option value="">— not sure / leave blank —</option>
              <option value="indica">Indica</option>
              <option value="sativa">Sativa</option>
              <option value="hybrid">Hybrid</option>
            </select>
          </div>
          <div className="flex items-start gap-2">
            <input
              id="strain-af"
              type="checkbox"
              checked={isAutoflower}
              onChange={(e) => setIsAutoflower(e.target.checked)}
              className="mt-0.5"
            />
            <label htmlFor="strain-af" className="text-sm text-[var(--gn-text)]">
              <span className="font-medium">Autoflower</span>
              <span className="mt-0.5 block text-xs text-[var(--gn-text-muted)]">
                Check if this is an autoflowering variety (ruderalis-based).
              </span>
            </label>
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--gn-text-muted)]">
              Genetics (lineage)
            </label>
            <input
              value={genetics}
              onChange={(e) => setGenetics(e.target.value)}
              className="mt-1 w-full rounded border border-[var(--gn-divide)] bg-[var(--gn-surface)] px-2 py-1.5 text-sm text-[var(--gn-text)]"
              placeholder="e.g. Chemdawg × Super Skunk"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--gn-text-muted)]">
              Reported effect percentages (JSON, optional)
            </label>
            <textarea
              value={reportedEffectPctsJson}
              onChange={(e) => setReportedEffectPctsJson(e.target.value)}
              rows={3}
              className="mt-1 w-full font-mono text-xs rounded border border-[var(--gn-divide)] bg-[var(--gn-surface)] px-2 py-1.5 text-[var(--gn-text)]"
              placeholder={`Example:\n{"relaxed": 45, "happy": 30, "euphoric": 25}`}
            />
            <p className="mt-1 text-xs text-[var(--gn-text-muted)]">
              Rough user-reported mix of effects (keys are lowercase effect
              names; values are 0–100). Omit if you do not have this.
            </p>
          </div>
        </div>
      ) : null}

      {kind === "new_strain" ? (
        <div className="flex items-start gap-2 rounded border border-[var(--gn-divide)] bg-[var(--gn-surface)] p-3">
          <input
            id="strain-published"
            type="checkbox"
            checked={published}
            onChange={(e) => setPublished(e.target.checked)}
            className="mt-0.5"
          />
          <label htmlFor="strain-published" className="text-sm text-[var(--gn-text)]">
            <span className="font-medium">Published</span>
            <span className="mt-0.5 block text-xs text-[var(--gn-text-muted)]">
              When checked, the strain can go live in the catalog after staff
              approve. Uncheck to suggest a draft-only entry.
            </span>
          </label>
        </div>
      ) : null}

      {kind === "new_breeder" ? (
        <div className="flex items-start gap-2 rounded border border-[var(--gn-divide)] bg-[var(--gn-surface)] p-3">
          <input
            id="breeder-published"
            type="checkbox"
            checked={breederPublished}
            onChange={(e) => setBreederPublished(e.target.checked)}
            className="mt-0.5"
          />
          <label htmlFor="breeder-published" className="text-sm text-[var(--gn-text)]">
            <span className="font-medium">Published</span>
            <span className="mt-0.5 block text-xs text-[var(--gn-text-muted)]">
              When checked, the breeder listing can appear after approval.
              Uncheck if you want it held as unpublished until staff decide.
            </span>
          </label>
        </div>
      ) : null}

      {showWebsiteCountry ? (
        <>
          <div>
            <label className="block text-xs font-medium text-[var(--gn-text-muted)]">
              Website (optional)
            </label>
            <input
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              className="mt-1 w-full rounded border border-[var(--gn-divide)] bg-[var(--gn-surface)] px-2 py-1.5 text-sm text-[var(--gn-text)]"
              placeholder="https://example.com"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--gn-text-muted)]">
              Country / region (optional)
            </label>
            <input
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              className="mt-1 w-full rounded border border-[var(--gn-divide)] bg-[var(--gn-surface)] px-2 py-1.5 text-sm text-[var(--gn-text)]"
              placeholder="e.g. Spain, California, Netherlands"
            />
          </div>
        </>
      ) : null}

      {error ? <p className="text-sm text-red-400">{error}</p> : null}

      <button
        type="button"
        disabled={saving}
        onClick={() => void submit()}
        className="rounded-lg bg-[#ff6a38] px-4 py-2 text-sm font-semibold text-white hover:bg-[#ff7d4c] disabled:opacity-50"
      >
        {saving ? "Sending…" : "Submit suggestion"}
      </button>
    </form>
  );
}
