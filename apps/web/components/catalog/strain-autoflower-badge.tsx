/** Small catalog badge when a strain is flagged as autoflowering. */

export function StrainAutoflowerBadge({
  className = "",
  size = "sm",
}: {
  className?: string;
  size?: "sm" | "md";
}) {
  const sz =
    size === "md"
      ? "px-2 py-0.5 text-xs"
      : "px-1.5 py-0.5 text-[10px] sm:text-xs";
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-md border border-amber-700/40 bg-amber-500/15 font-medium text-amber-900 dark:border-amber-500/35 dark:bg-amber-500/10 dark:text-amber-100 ${sz} ${className}`}
      title="Catalog indicates autoflowering genetics"
    >
      Autoflower
    </span>
  );
}
