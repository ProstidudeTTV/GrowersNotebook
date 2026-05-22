-- Raise post-media bucket limit for large phone photos and videos (client still compresses images).
UPDATE storage.buckets
SET
  file_size_limit = 134217728,
  allowed_mime_types = ARRAY[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'video/mp4',
    'video/webm',
    'video/quicktime'
  ]::text[]
WHERE id = 'post-media';
