export type PublicSiteConfigPayload = {
  motdText: string | null;
  announcement: {
    title: string;
    body: string;
    style: "info" | "warning";
  } | null;
  maintenanceEnabled: boolean;
  maintenanceMessage: string | null;
};

export const emptyPublicSiteConfig: PublicSiteConfigPayload = {
  motdText: null,
  announcement: null,
  maintenanceEnabled: false,
  maintenanceMessage: null,
};
