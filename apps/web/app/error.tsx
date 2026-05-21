"use client";

import { useEffect } from "react";
import { SnagErrorView } from "@/components/snag-error-view";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return <SnagErrorView onTryAgain={() => reset()} />;
}
