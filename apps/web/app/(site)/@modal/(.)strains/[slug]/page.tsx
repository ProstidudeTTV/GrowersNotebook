import { CatalogDetailModal } from "@/components/catalog/catalog-detail-modal";
import { StrainDetailBody } from "@/components/catalog/strain-detail-body";

export default async function StrainModalPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ reviewsPage?: string }>;
}) {
  const { slug } = await params;
  const sp = await searchParams;
  const reviewsPage = Number(sp.reviewsPage ?? 1) || 1;
  const safe = slug?.trim() ?? "";
  const strainPath = `/strains/${encodeURIComponent(safe)}`;

  return (
    <CatalogDetailModal fullPageHref={strainPath}>
      <StrainDetailBody
        slug={safe}
        reviewsPage={reviewsPage}
        variant="modal"
      />
    </CatalogDetailModal>
  );
}
