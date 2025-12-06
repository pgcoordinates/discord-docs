import { OpenAPISpec, ParsedEndpoint, Category, Schema, EndpointAvailability } from '@/types/openapi';

const OPENAPI_PREVIEW_URL = 'https://raw.githubusercontent.com/discord/discord-api-spec/refs/heads/main/specs/openapi_preview.json';
const OPENAPI_STABLE_URL = 'https://raw.githubusercontent.com/discord/discord-api-spec/refs/heads/main/specs/openapi.json';

export interface FetchedSpecs {
  preview: OpenAPISpec;
  stable: OpenAPISpec;
}

export async function fetchOpenAPISpecs(): Promise<FetchedSpecs> {
  const [previewResponse, stableResponse] = await Promise.all([
    fetch(OPENAPI_PREVIEW_URL, { cache: 'force-cache' }),
    fetch(OPENAPI_STABLE_URL, { cache: 'force-cache' }),
  ]);

  if (!previewResponse.ok || !stableResponse.ok) {
    throw new Error('Failed to fetch OpenAPI specs');
  }

  const [preview, stable] = await Promise.all([
    previewResponse.json(),
    stableResponse.json(),
  ]);

  return { preview, stable };
}

// Keep for backwards compatibility
export async function fetchOpenAPISpec(): Promise<OpenAPISpec> {
  const { preview } = await fetchOpenAPISpecs();
  return preview;
}

function getEndpointKey(path: string, method: string): string {
  return `${method.toUpperCase()}:${path}`;
}

function buildEndpointSet(spec: OpenAPISpec): Set<string> {
  const set = new Set<string>();
  const methods = ['get', 'post', 'put', 'delete', 'patch', 'options', 'head'] as const;

  for (const [path, pathItem] of Object.entries(spec.paths)) {
    for (const method of methods) {
      if (pathItem[method]) {
        set.add(getEndpointKey(path, method));
      }
    }
  }
  return set;
}

export function parseEndpointsWithAvailability(
  previewSpec: OpenAPISpec,
  stableSpec: OpenAPISpec
): ParsedEndpoint[] {
  const endpoints: ParsedEndpoint[] = [];
  const methods = ['get', 'post', 'put', 'delete', 'patch', 'options', 'head'] as const;

  const previewEndpoints = buildEndpointSet(previewSpec);
  const stableEndpoints = buildEndpointSet(stableSpec);

  // Collect all unique paths from both specs
  const allPaths = new Set([
    ...Object.keys(previewSpec.paths),
    ...Object.keys(stableSpec.paths),
  ]);

  for (const path of allPaths) {
    const previewPathItem = previewSpec.paths[path];
    const stablePathItem = stableSpec.paths[path];

    for (const method of methods) {
      const previewOp = previewPathItem?.[method];
      const stableOp = stablePathItem?.[method];
      const operation = previewOp || stableOp;

      if (!operation) continue;

      const key = getEndpointKey(path, method);
      const inPreview = previewEndpoints.has(key);
      const inStable = stableEndpoints.has(key);

      let availability: EndpointAvailability;
      if (inPreview && inStable) {
        availability = 'both';
      } else if (inPreview) {
        availability = 'preview-only';
      } else {
        availability = 'stable-only';
      }

      const category = getCategoryFromPath(path, operation.tags);
      endpoints.push({
        path,
        method: method.toUpperCase(),
        operation,
        category,
        availability,
      });
    }
  }

  return endpoints;
}

// Legacy function for backwards compatibility
export function parseEndpoints(spec: OpenAPISpec): ParsedEndpoint[] {
  return parseEndpointsWithAvailability(spec, spec);
}

function getCategoryFromPath(path: string, tags?: string[]): string {
  if (tags && tags.length > 0) {
    return tags[0];
  }

  // Parse category from path
  const segments = path.split('/').filter(Boolean);

  if (path.includes('/applications')) {
    if (path.includes('/commands')) return 'Application Commands';
    if (path.includes('/entitlements')) return 'Monetization';
    if (path.includes('/emojis')) return 'Application Emojis';
    if (path.includes('/role-connections')) return 'Role Connections';
    return 'Applications';
  }

  if (path.includes('/channels')) {
    if (path.includes('/messages')) return 'Messages';
    if (path.includes('/invites')) return 'Invites';
    if (path.includes('/pins')) return 'Pins';
    if (path.includes('/webhooks')) return 'Webhooks';
    if (path.includes('/threads')) return 'Threads';
    if (path.includes('/reactions')) return 'Reactions';
    return 'Channels';
  }

  if (path.includes('/guilds')) {
    if (path.includes('/members')) return 'Guild Members';
    if (path.includes('/roles')) return 'Roles';
    if (path.includes('/bans')) return 'Moderation';
    if (path.includes('/emojis')) return 'Emojis';
    if (path.includes('/stickers')) return 'Stickers';
    if (path.includes('/scheduled-events')) return 'Scheduled Events';
    if (path.includes('/audit-log')) return 'Audit Log';
    if (path.includes('/integrations')) return 'Integrations';
    if (path.includes('/webhooks')) return 'Webhooks';
    if (path.includes('/voice-states')) return 'Voice';
    if (path.includes('/onboarding')) return 'Onboarding';
    if (path.includes('/welcome-screen')) return 'Welcome Screen';
    return 'Guilds';
  }

  if (path.includes('/users')) return 'Users';
  if (path.includes('/voice')) return 'Voice';
  if (path.includes('/webhooks')) return 'Webhooks';
  if (path.includes('/invites')) return 'Invites';
  if (path.includes('/stickers')) return 'Stickers';
  if (path.includes('/stage-instances')) return 'Stage Instances';
  if (path.includes('/oauth2')) return 'OAuth2';
  if (path.includes('/gateway')) return 'Gateway';
  if (path.includes('/interactions')) return 'Interactions';

  return segments[0] || 'General';
}

export function groupByCategory(endpoints: ParsedEndpoint[]): Category[] {
  const categoryMap = new Map<string, ParsedEndpoint[]>();

  for (const endpoint of endpoints) {
    const existing = categoryMap.get(endpoint.category) || [];
    existing.push(endpoint);
    categoryMap.set(endpoint.category, existing);
  }

  return Array.from(categoryMap.entries())
    .map(([name, endpoints]) => ({ name, endpoints }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function resolveRef(spec: OpenAPISpec, ref: string): Schema | null {
  if (!ref.startsWith('#/')) return null;

  const parts = ref.replace('#/', '').split('/');
  let current: unknown = spec;

  for (const part of parts) {
    if (current && typeof current === 'object' && part in current) {
      current = (current as Record<string, unknown>)[part];
    } else {
      return null;
    }
  }

  return current as Schema;
}

export function getSchemaName(ref: string): string {
  const parts = ref.split('/');
  return parts[parts.length - 1];
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export function getMethodColor(method: string): string {
  const colors: Record<string, string> = {
    GET: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    POST: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    PUT: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    PATCH: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    DELETE: 'bg-red-500/20 text-red-400 border-red-500/30',
    OPTIONS: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    HEAD: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
  };
  return colors[method.toUpperCase()] || colors.GET;
}

export function getMethodBadgeColor(method: string): string {
  const colors: Record<string, string> = {
    GET: 'bg-emerald-500',
    POST: 'bg-blue-500',
    PUT: 'bg-amber-500',
    PATCH: 'bg-orange-500',
    DELETE: 'bg-red-500',
    OPTIONS: 'bg-purple-500',
    HEAD: 'bg-gray-500',
  };
  return colors[method.toUpperCase()] || colors.GET;
}
