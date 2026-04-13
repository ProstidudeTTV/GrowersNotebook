"use client";

import { Checkbox, Input, Select, Switch, Typography } from "antd";
import { EffectsTagsSelect } from "@/components/catalog/effects-tags-select";

const { Text } = Typography;

function effectsAsTags(draft: Record<string, unknown>): string[] {
  const e = draft.effects;
  if (Array.isArray(e)) {
    return (e as unknown[]).map((x) => String(x).trim()).filter(Boolean);
  }
  if (typeof e === "string" && e.trim()) {
    return e
      .split(/[,;\n]+/)
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [];
}

export function CatalogSuggestionPayloadEditor({
  kind,
  draft,
  onChange,
}: {
  kind: string;
  draft: Record<string, unknown>;
  onChange: (next: Record<string, unknown>) => void;
}) {
  const set = (patch: Record<string, unknown>) => {
    onChange({ ...draft, ...patch });
  };

  const str = (k: string) =>
    draft[k] == null ? "" : String(draft[k]);
  const bool = (k: string) => draft[k] === true || draft[k] === "true";

  if (kind === "new_breeder") {
    return (
      <div className="space-y-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-zinc-500">
            Slug <Text type="danger">*</Text>
          </label>
          <Input
            value={str("slug")}
            onChange={(e) => set({ slug: e.target.value })}
            placeholder="e.g. mephisto-genetics"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-zinc-500">
            Name <Text type="danger">*</Text>
          </label>
          <Input
            value={str("name")}
            onChange={(e) => set({ name: e.target.value })}
            placeholder="e.g. Mephisto Genetics"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-zinc-500">
            Description
          </label>
          <Input.TextArea
            rows={4}
            value={str("description")}
            onChange={(e) => set({ description: e.target.value || null })}
            placeholder="Short catalog description for the breeder page."
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-zinc-500">
            Website
          </label>
          <Input
            value={str("website")}
            onChange={(e) => set({ website: e.target.value || null })}
            placeholder="https://example.com"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-zinc-500">
            Country / region
          </label>
          <Input
            value={str("country")}
            onChange={(e) => set({ country: e.target.value || null })}
            placeholder="e.g. Spain"
          />
        </div>
        <div className="flex items-center gap-2">
          <Switch
            checked={draft.published !== false}
            onChange={(checked) => set({ published: checked })}
          />
          <span className="text-sm text-zinc-700 dark:text-zinc-200">
            Published when approved
          </span>
        </div>
      </div>
    );
  }

  if (kind === "new_strain") {
    return (
      <div className="space-y-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-zinc-500">
            Slug <Text type="danger">*</Text>
          </label>
          <Input
            value={str("slug")}
            onChange={(e) => set({ slug: e.target.value })}
            placeholder="e.g. sour-diesel — lowercase, hyphens"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-zinc-500">
            Name <Text type="danger">*</Text>
          </label>
          <Input
            value={str("name")}
            onChange={(e) => set({ name: e.target.value })}
            placeholder="e.g. Sour Diesel"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-zinc-500">
            Description
          </label>
          <Input.TextArea
            rows={5}
            value={str("description")}
            onChange={(e) => set({ description: e.target.value || null })}
            placeholder="Flavor, effects, grow notes — same as public catalog text."
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-zinc-500">
            Breeder slug (directory)
          </label>
          <Input
            value={str("breederSlug")}
            onChange={(e) =>
              set({ breederSlug: e.target.value.trim() || null, breederId: null })
            }
            placeholder="e.g. mephisto-genetics — must exist unless you set breeder UUID below"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-zinc-500">
            Breeder UUID (optional, overrides slug)
          </label>
          <Input
            value={str("breederId")}
            onChange={(e) => set({ breederId: e.target.value.trim() || null })}
            placeholder="00000000-0000-0000-0000-000000000000"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-zinc-500">
            Tags (effects)
          </label>
          <EffectsTagsSelect
            value={effectsAsTags(draft)}
            onChange={(effects) => set({ effects })}
            placeholder="Type a tag, press Enter — same as admin strain form"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-zinc-500">
            Effects notes (lab / import notes)
          </label>
          <Input.TextArea
            rows={3}
            value={str("effectsNotes")}
            onChange={(e) => set({ effectsNotes: e.target.value || null })}
            placeholder="Optional structured notes (Type:, THC:, …)."
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-500">
              Chemotype
            </label>
            <Select
              className="w-full"
              allowClear
              placeholder="indica / sativa / hybrid"
              value={
                ["indica", "sativa", "hybrid"].includes(
                  str("chemotype").toLowerCase(),
                )
                  ? str("chemotype").toLowerCase()
                  : undefined
              }
              onChange={(v) => set({ chemotype: v ?? null })}
              options={[
                { value: "indica", label: "Indica" },
                { value: "sativa", label: "Sativa" },
                { value: "hybrid", label: "Hybrid" },
              ]}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-500">
              Autoflower
            </label>
            <div className="flex h-8 items-center">
              <Checkbox
                checked={bool("isAutoflower")}
                onChange={(e) => set({ isAutoflower: e.target.checked })}
              >
                Flag as autoflowering
              </Checkbox>
            </div>
          </div>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-zinc-500">
            Genetics (short lineage)
          </label>
          <Input
            value={str("genetics")}
            onChange={(e) => set({ genetics: e.target.value.trim() || null })}
            placeholder="e.g. Chemdawg × Super Skunk"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-zinc-500">
            Reported effect % (JSON, optional)
          </label>
          <Input.TextArea
            rows={3}
            value={str("reportedEffectPctsJson")}
            onChange={(e) =>
              set({ reportedEffectPctsJson: e.target.value || null })
            }
            placeholder={`e.g. {"relaxed":45,"happy":30}`}
          />
        </div>
        <div className="flex items-center gap-2">
          <Switch
            checked={draft.published !== false}
            onChange={(checked) => set({ published: checked })}
          />
          <span className="text-sm text-zinc-700 dark:text-zinc-200">
            Published when approved
          </span>
        </div>
      </div>
    );
  }

  return (
    <Text type="secondary">
      No structured editor for <code>{kind}</code> — use JSON below.
    </Text>
  );
}
