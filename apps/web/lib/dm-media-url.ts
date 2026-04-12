/** Public post-media / attachment URL is a video (by path). */
export function isDmVideoUrl(url: string): boolean {
  return /\.(mp4|webm|mov)(\?|#|$)/i.test(url.trim());
}
