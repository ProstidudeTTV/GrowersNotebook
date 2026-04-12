export type PublicSiteConfigPayload = {
  motdText: string | null;
  announcement: {
    title: string;
    body: string;
    style: "info" | "warning";
  } | null;
  maintenanceEnabled: boolean;
  maintenanceMessage: string | null;
  seoDefaultTitle: string | null;
  seoDefaultDescription: string | null;
  seoKeywords: string | null;
  ogImageUrl: string | null;
};

export const emptyPublicSiteConfig: PublicSiteConfigPayload = {
  motdText: null,
  announcement: null,
  maintenanceEnabled: false,
  maintenanceMessage: null,
  seoDefaultTitle: null,
  seoDefaultDescription: null,
  seoKeywords: null,
  ogImageUrl: null,
};
