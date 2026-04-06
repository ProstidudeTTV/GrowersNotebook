import Link from "next/link";
import type { ReactNode } from "react";

export function UserProfileLink({
  userId,
  className,
  children,
}: {
  userId: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Link href={`/u/${userId}`} className={className}>
      {children}
    </Link>
  );
}
