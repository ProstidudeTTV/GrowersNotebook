"use client";

import { InboxOutlined } from "@ant-design/icons";
import { List } from "@refinedev/antd";
import { App, Typography, Upload } from "antd";
import { adminAxios } from "@/lib/admin-axios";

type ImportResult = {
  rowsParsed: number;
  rowsSkippedNoStrainName: number;
  rowsSkippedDuplicateStrainBreeder: number;
  uniqueBreedersInCsv: number;
  strainCandidates: number;
  breedersInserted: number;
  strainsInserted: number;
};

const { Paragraph, Text } = Typography;

export default function AdminCatalogImportPage() {
  const { message } = App.useApp();

  return (
    <List title="Catalog CSV import">
      <Paragraph type="secondary">
        Upload the same strain dataset you use with{" "}
        <Text code>pnpm db:import-strains</Text>. Requires a header row with{" "}
        <Text code>strain_name</Text> and <Text code>breeder</Text>. Duplicate
        strain + breeder rows in the file are skipped. Existing slugs are left
        unchanged (only new breeders/strains are inserted).
      </Paragraph>
      <Upload.Dragger
        name="file"
        multiple={false}
        accept=".csv,text/csv"
        maxCount={1}
        customRequest={async (options) => {
          const { file, onError, onSuccess } = options;
          const raw = file as File;
          try {
            const form = new FormData();
            form.append("file", raw);
            const { data } = await adminAxios.post<ImportResult>(
              "/catalog/import-strains-csv",
              form,
            );
            message.success(
              `Import complete: ${data.strainsInserted} new strains, ${data.breedersInserted} new breeders (${data.rowsParsed} rows parsed).`,
              8,
            );
            onSuccess?.(data, raw as unknown as XMLHttpRequest);
          } catch (e: unknown) {
            const data = (e as { response?: { data?: unknown } })?.response
              ?.data as { message?: string | string[] } | undefined;
            const raw = data?.message;
            const fromApi = Array.isArray(raw) ? raw.join(" ") : raw;
            const msg =
              fromApi ??
              (e instanceof Error ? e.message : "Import failed");
            message.error(msg);
            onError?.(e as Error);
          }
        }}
      >
        <p className="ant-upload-drag-icon">
          <InboxOutlined />
        </p>
        <p className="ant-upload-text">Click or drag a CSV file here</p>
        <p className="ant-upload-hint">Max size 35 MB. UTF-8 with headers.</p>
      </Upload.Dragger>
    </List>
  );
}
