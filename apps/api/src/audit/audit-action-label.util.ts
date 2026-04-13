/**
 * Turn raw interceptor actions (`METHOD /path`) into short staff-facing labels.
 */
export function humanizeAuditAction(action: string): string {
  const t = action.trim();
  const m = t.match(/^(GET|POST|PATCH|PUT|DELETE)\s+(\S+)/i);
  if (!m) return t;
  const method = m[1].toUpperCase();
  const rawPath = m[2].split('?')[0] || '/';
  const path = rawPath.replace(
    /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi,
    ':id',
  );

  const key = `${method} ${path}`;

  const exact: Record<string, string> = {
    'GET /admin/audit-events': 'Opened the audit log',
    'GET /admin/profiles': 'Listed profiles (admin)',
    'GET /admin/posts': 'Listed posts (admin)',
    'GET /admin/communities': 'Listed communities (admin)',
    'GET /admin/comments': 'Listed comments (admin)',
    'GET /admin/catalog-suggestions': 'Listed catalog suggestions',
    'GET /admin/strains': 'Listed strains (admin)',
    'GET /admin/breeders': 'Listed breeders (admin)',
    'GET /admin/strain-reviews': 'Listed strain reviews (moderation)',
    'GET /admin/breeder-reviews': 'Listed breeder reviews (moderation)',
    'GET /admin/profile-reports': 'Listed profile reports',
    'GET /admin/site-settings': 'Opened site settings',
    'GET /admin/name-blocklist': 'Opened name blocklist',
  };

  if (exact[key]) return exact[key];

  const patterns: { re: RegExp; label: string }[] = [
    {
      re: /^GET \/admin\/profiles\/:id$/,
      label: 'Viewed a profile (admin)',
    },
    {
      re: /^PATCH \/admin\/profiles\/:id$/,
      label: 'Updated a profile (admin)',
    },
    {
      re: /^GET \/admin\/catalog-suggestions\/:id$/,
      label: 'Opened a catalog suggestion',
    },
    {
      re: /^PATCH \/admin\/catalog-suggestions\/:id$/,
      label: 'Moderated a catalog suggestion',
    },
    {
      re: /^GET \/admin\/posts\//,
      label: 'Viewed or listed posts (admin)',
    },
    {
      re: /^PATCH \/admin\/posts\//,
      label: 'Updated a post (admin)',
    },
    {
      re: /^GET \/admin\/strains\/:id$/,
      label: 'Viewed a strain (admin)',
    },
    {
      re: /^PATCH \/admin\/strains\/:id$/,
      label: 'Updated a strain (admin)',
    },
    {
      re: /^GET \/admin\/breeders\/:id$/,
      label: 'Viewed a breeder (admin)',
    },
    {
      re: /^PATCH \/admin\/breeders\/:id$/,
      label: 'Updated a breeder (admin)',
    },
    {
      re: /^POST \/admin\/strain-reviews\//,
      label: 'Moderated a strain review',
    },
    {
      re: /^POST \/admin\/breeder-reviews\//,
      label: 'Moderated a breeder review',
    },
    {
      re: /^PATCH \/admin\/site-settings$/,
      label: 'Updated site settings',
    },
    {
      re: /^POST \/admin\/name-blocklist/,
      label: 'Changed name blocklist',
    },
  ];

  for (const { re, label } of patterns) {
    if (re.test(key)) return label;
  }

  return `${method} ${path}`;
}

export function humanizeAuditEntityType(entityType: string | null | undefined): string {
  if (!entityType) return '—';
  const map: Record<string, string> = {
    http_request: 'HTTP request',
    profile: 'Profile',
    post: 'Post',
    comment: 'Comment',
    community: 'Community',
  };
  return map[entityType] ?? entityType;
}
