"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { apiFetch } from "@/lib/api-public";
import { createClient } from "@/lib/supabase/client";

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
  const [effectsRaw, setEffectsRaw] = useState("");
  const [effectsNotes, setEffectsNotes] = useState("");
  const [website, setWebsite] = useState("");
  const [country, setCountry] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
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

      const effects = effectsRaw
        .split(/[,;\n]+/)
        .map((s) => s.trim())
        .filter(Boolean);

      let payload: Record<string, unknown> = {};
      switch (kind) {
        case "new_strain":
          payload = {
            slug: slug.trim(),
            name: name.trim(),
            description: description.trim() || undefined,
            breederSlug: breederSlug.trim() || undefined,
            effects,
            effectsNotes: effectsNotes.trim() || undefined,
          };
          break;
        case "new_breeder":
          payload = {
            slug: slug.trim(),
            name: name.trim(),
            description: description.trim() || undefined,
            website: website.trim() || undefined,
            country: country.trim() || undefined,
          };
          break;
        case "edit_strain": {
          const patch: Record<string, unknown> = { target_slug: targetSlug.trim() };
          if (slug.trim()) patch.slug = slug.trim();
          if (name.trim()) patch.name = name.trim();
          if (description.trim()) patch.description = description.trim();
          if (breederSlug.trim()) patch.breederSlug = breederSlug.trim();
          if (effects.length) patch.effects = effects;
          if (effectsNotes.trim()) patch.effectsNotes = effectsNotes.trim();
          payload = patch;
          break;
        }
        case "edit_breeder": {
          const patch: Record<string, unknown> = { target_slug: targetSlug.trim() };
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

  return (
    <form
      onSubmit={submit}
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
            URL slug of existing entry (e.g. blue-dream)
          </label>
          <input
            value={targetSlug}
            onChange={(e) => setTargetSlug(e.target.value)}
            required
            className="mt-1 w-full rounded border border-[var(--gn-divide)] bg-[var(--gn-surface)] px-2 py-1.5 text-sm text-[var(--gn-text)]"
            placeholder="existing-slug"
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
                placeholder="my-entry-slug"
              />
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
            placeholder="breeder-slug-from-directory"
          />
        </div>
      ) : null}

      {showEffects ? (
        <>
          <div>
            <label className="block text-xs font-medium text-[var(--gn-text-muted)]">
              Tags (comma or newline separated, optional)
            </label>
            <textarea
              value={effectsRaw}
              onChange={(e) => setEffectsRaw(e.target.value)}
              rows={2}
              className="mt-1 w-full rounded border border-[var(--gn-divide)] bg-[var(--gn-surface)] px-2 py-1.5 text-sm text-[var(--gn-text)]"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--gn-text-muted)]">
              Tag notes (optional)
            </label>
            <input
              value={effectsNotes}
              onChange={(e) => setEffectsNotes(e.target.value)}
              className="mt-1 w-full rounded border border-[var(--gn-divide)] bg-[var(--gn-surface)] px-2 py-1.5 text-sm text-[var(--gn-text)]"
            />
          </div>
        </>
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
            />
          </div>
        </>
      ) : null}

      {error ? <p className="text-sm text-red-400">{error}</p> : null}

      <button
        type="submit"
        disabled={saving}
        className="rounded-lg bg-[#ff6a38] px-4 py-2 text-sm font-semibold text-white hover:bg-[#ff7d4c] disabled:opacity-50"
      >
        {saving ? "Sending…" : "Submit suggestion"}
      </button>
    </form>
  );
}
