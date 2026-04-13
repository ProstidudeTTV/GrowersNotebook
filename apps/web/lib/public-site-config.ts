export type PublicSiteConfigPayload = {
  motdText: string | null;
  announcement: {
    title: string;
    body: string;
    style: "info" | "warning";
  } | null;
  maintenanceEnabled: boolean;
  maintenanceMessage: string | null;
  /** True after bulk email issues (e.g. SMTP); site may nudge users to opt in. */
  mailingListNudgeRecommended: boolean;
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
  mailingListNudgeRecommended: false,
  seoDefaultTitle: null,
  seoDefaultDescription: null,
  seoKeywords: null,
  ogImageUrl: null,
};
