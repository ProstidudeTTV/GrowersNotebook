import { BreederDetailBody } from "@/components/catalog/breeder-detail-body";
import { CatalogInterceptBreederModal } from "@/components/catalog/catalog-intercept-breeder-modal";

export default async function BreederModalPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ reviewsPage?: string; strainReviewsPage?: string }>;
}) {
  const { slug } = await params;
  const sp = await searchParams;
  const reviewsPage = Number(sp.reviewsPage ?? 1) || 1;
  const strainReviewsPage = Number(sp.strainReviewsPage ?? 1) || 1;
  const safe = slug?.trim() ?? "";
  const breederPath = `/breeders/${encodeURIComponent(safe)}`;

  return (
    <CatalogInterceptBreederModal
      fullPageHref={breederPath}
      breederSlug={safe}
    >
      <BreederDetailBody
        slug={safe}
        reviewsPage={reviewsPage}
        strainReviewsPage={strainReviewsPage}
        variant="modal"
      />
    </CatalogInterceptBreederModal>
  );
}
