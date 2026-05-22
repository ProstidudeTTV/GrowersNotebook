"use client";

import Image from "next/image";
import type { ReactNode } from "react";
import type { PostMediaItem } from "@/lib/feed-post";

type Props = {
  items: PostMediaItem[];
  title: string;
  onOpenPost: () => void;
  /** Community badge overlay (design system). */
  communityOverlay?: ReactNode;
};

/**
 * GrowDiaries-style multi-image hero for feed cards (GN-009).
 */
export function FeedPostMediaHero({
  items,
  title,
  onOpenPost,
  communityOverlay,
}: Props) {
  const images = items.filter((m) => m.type === "image" && m.url?.trim());
  if (images.length === 0) return null;

  const alt = title.trim() || "Post image";
  const wrapClick = (child: ReactNode, className: string) => (
    <div
      className={`cursor-pointer ${className}`}
      onClick={(e) => {
        const t = e.target as HTMLElement;
        if (t.closest("[data-interactive]")) return;
        onOpenPost();
      }}
    >
      {child}
    </div>
  );

  if (images.length === 1) {
    return wrapClick(
      <div className="relative h-56 w-full sm:h-72 md:h-80">
        <Image
          src={images[0]!.url}
          alt={alt}
          fill
          className="object-cover"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 70vw, 1100px"
        />
        {communityOverlay ? (
          <div className="absolute left-3 top-3 z-[1]" data-interactive>
            {communityOverlay}
          </div>
        ) : null}
      </div>,
      "",
    );
  }

  if (images.length === 2) {
    return wrapClick(
      <div className="relative grid h-56 grid-cols-2 gap-0.5 sm:h-72 md:h-80">
        {images.map((img, i) => (
          <div key={i} className="relative min-h-0">
            <Image
              src={img.url}
              alt={`${alt} (${i + 1})`}
              fill
              className="object-cover"
              sizes="50vw"
            />
          </div>
        ))}
        {communityOverlay ? (
          <div className="absolute left-3 top-3 z-[1]" data-interactive>
            {communityOverlay}
          </div>
        ) : null}
      </div>,
      "",
    );
  }

  if (images.length === 3) {
    return wrapClick(
      <div className="relative grid h-56 grid-cols-2 grid-rows-2 gap-0.5 sm:h-72 md:h-80">
        <div className="relative row-span-2 min-h-0">
          <Image
            src={images[0]!.url}
            alt={`${alt} (1)`}
            fill
            className="object-cover"
            sizes="40vw"
          />
        </div>
        <div className="relative min-h-0">
          <Image
            src={images[1]!.url}
            alt={`${alt} (2)`}
            fill
            className="object-cover"
            sizes="30vw"
          />
        </div>
        <div className="relative min-h-0">
          <Image
            src={images[2]!.url}
            alt={`${alt} (3)`}
            fill
            className="object-cover"
            sizes="30vw"
          />
        </div>
        {communityOverlay ? (
          <div className="absolute left-3 top-3 z-[1]" data-interactive>
            {communityOverlay}
          </div>
        ) : null}
      </div>,
      "",
    );
  }

  const extra = images.length - 4;
  return wrapClick(
    <div className="relative grid h-56 grid-cols-2 grid-rows-2 gap-0.5 sm:h-72 md:h-80">
      {images.slice(0, 4).map((img, i) => (
        <div key={i} className="relative min-h-0">
          <Image
            src={img.url}
            alt={`${alt} (${i + 1})`}
            fill
            className="object-cover"
            sizes="35vw"
          />
          {i === 3 && extra > 0 ? (
            <span className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/50 text-lg font-bold text-white">
              +{extra}
            </span>
          ) : null}
        </div>
      ))}
      {communityOverlay ? (
        <div className="absolute left-3 top-3 z-[1]" data-interactive>
          {communityOverlay}
        </div>
      ) : null}
    </div>,
    "",
  );
}
