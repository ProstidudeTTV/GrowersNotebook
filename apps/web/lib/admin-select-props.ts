/** Ant Design Select dropdowns inside Refine forms — avoid clipping under overflow parents. */
export function adminSelectPopupProps() {
  return {
    getPopupContainer: () =>
      typeof document !== "undefined"
        ? document.body
        : (null as unknown as HTMLElement),
  };
}
