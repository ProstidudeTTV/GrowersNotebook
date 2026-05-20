"use client";

import {
  App,
  Button,
  Select,
  Space,
  Table,
  Typography,
} from "antd";
import { useCallback, useEffect, useState } from "react";
import { adminAxios } from "@/lib/admin-axios";

type ModeratorRow = {
  communityId: string;
  moderatorId: string;
  assignedAt: string;
  displayName: string | null;
};

type ProfileOption = {
  id: string;
  displayName: string | null;
};

export function CommunityModeratorsPanel({
  communityId,
}: {
  communityId: string;
}) {
  const { message } = App.useApp();
  const [rows, setRows] = useState<ModeratorRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [pickerId, setPickerId] = useState<string | null>(null);
  const [profileOptions, setProfileOptions] = useState<ProfileOption[]>([]);
  const [searching, setSearching] = useState(false);
  const [adding, setAdding] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminAxios.get<ModeratorRow[]>(
        `/communities/${communityId}/moderators`,
      );
      setRows(Array.isArray(res.data) ? res.data : []);
    } catch {
      message.error("Could not load community moderators.");
    } finally {
      setLoading(false);
    }
  }, [communityId, message]);

  useEffect(() => {
    void load();
  }, [load]);

  const searchProfiles = async (q: string) => {
    if (q.trim().length < 2) {
      setProfileOptions([]);
      return;
    }
    setSearching(true);
    try {
      const res = await adminAxios.get<ProfileOption[]>(
        `/profiles?_start=0&_end=20&q_like=${encodeURIComponent(q.trim())}`,
      );
      setProfileOptions(Array.isArray(res.data) ? res.data : []);
    } catch {
      setProfileOptions([]);
    } finally {
      setSearching(false);
    }
  };

  const addModerator = async () => {
    if (!pickerId) return;
    setAdding(true);
    try {
      await adminAxios.post(`/communities/${communityId}/moderators`, {
        moderatorId: pickerId,
      });
      message.success("Moderator assigned.");
      setPickerId(null);
      setProfileOptions([]);
      await load();
    } catch (e) {
      message.error(
        e instanceof Error ? e.message : "Could not assign moderator.",
      );
    } finally {
      setAdding(false);
    }
  };

  const removeModerator = async (moderatorId: string) => {
    try {
      await adminAxios.delete(
        `/communities/${communityId}/moderators/${moderatorId}`,
      );
      message.success("Moderator removed.");
      await load();
    } catch {
      message.error("Could not remove moderator.");
    }
  };

  return (
    <div className="mt-10 space-y-4 border-t border-neutral-700 pt-8">
      <Typography.Title level={5}>Community moderators</Typography.Title>
      <Typography.Paragraph type="secondary" className="!mb-4 text-sm">
        Scoped mods can moderate this community&apos;s content (future
        community mod console). Assign trusted growers by profile ID or search
        by display name.
      </Typography.Paragraph>

      <Space wrap className="mb-4 w-full">
        <Select
          showSearch
          allowClear
          placeholder="Search member by name…"
          className="min-w-[16rem]"
          filterOption={false}
          loading={searching}
          value={pickerId}
          onSearch={(v) => void searchProfiles(v)}
          onChange={(v) => setPickerId(v ?? null)}
          options={profileOptions.map((p) => ({
            value: p.id,
            label: `${p.displayName?.trim() || "Grower"} (${p.id.slice(0, 8)}…)`,
          }))}
        />
        <Button
          type="primary"
          disabled={!pickerId || adding}
          loading={adding}
          onClick={() => void addModerator()}
        >
          Add moderator
        </Button>
      </Space>

      <Table
        size="small"
        rowKey="moderatorId"
        loading={loading}
        dataSource={rows}
        pagination={false}
        columns={[
          {
            title: "Moderator",
            dataIndex: "displayName",
            render: (name: string | null, row: ModeratorRow) => (
              <a
                href={`/admin/profiles/edit/${row.moderatorId}`}
                className="text-[var(--gn-accent,#4ade80)] hover:underline"
              >
                {name?.trim() || "Grower"}
              </a>
            ),
          },
          {
            title: "Assigned",
            dataIndex: "assignedAt",
            render: (v: string) => new Date(v).toLocaleString(),
          },
          {
            title: "",
            render: (_: unknown, row: ModeratorRow) => (
              <Button
                size="small"
                danger
                onClick={() => void removeModerator(row.moderatorId)}
              >
                Remove
              </Button>
            ),
          },
        ]}
      />
    </div>
  );
}
