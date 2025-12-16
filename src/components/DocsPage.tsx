'use client';

import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { OpenAPISpec, ParsedEndpoint, Category, Schema, EndpointAvailability } from '@/types/openapi';
import { slugify, resolveRef, getSchemaName } from '@/lib/openapi';

interface DocsPageProps {
  categories: Category[];
  spec: OpenAPISpec;
}

const METHOD_STYLES: Record<string, string> = {
  GET: 'method-get',
  POST: 'method-post',
  PUT: 'method-put',
  PATCH: 'method-patch',
  DELETE: 'method-delete',
};

const DISCORD_API_BASE = 'https://discord.com/api/v10';

export default function DocsPage({ categories, spec }: DocsPageProps) {
  const [search, setSearch] = useState('');
  const [selectedMethods, setSelectedMethods] = useState<Set<string>>(new Set());
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedAvailability, setSelectedAvailability] = useState<EndpointAvailability | null>(null);
  const [expandedEndpoint, setExpandedEndpoint] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Track scroll for navbar effect
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const allMethods = useMemo(() => {
    const methods = new Set<string>();
    categories.forEach(cat => cat.endpoints.forEach(ep => methods.add(ep.method)));
    return Array.from(methods).sort((a, b) => {
      const order = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];
      return order.indexOf(a) - order.indexOf(b);
    });
  }, [categories]);

  const filteredCategories = useMemo(() => {
    return categories
      .filter(cat => !selectedCategory || cat.name === selectedCategory)
      .map(cat => ({
        ...cat,
        endpoints: cat.endpoints.filter(ep => {
          const matchesSearch = !search ||
            ep.path.toLowerCase().includes(search.toLowerCase()) ||
            ep.operation.summary?.toLowerCase().includes(search.toLowerCase()) ||
            ep.operation.operationId?.toLowerCase().includes(search.toLowerCase());
          const matchesMethod = selectedMethods.size === 0 || selectedMethods.has(ep.method);
          const matchesAvailability = !selectedAvailability || ep.availability === selectedAvailability;
          return matchesSearch && matchesMethod && matchesAvailability;
        })
      }))
      .filter(cat => cat.endpoints.length > 0);
  }, [categories, search, selectedMethods, selectedCategory, selectedAvailability]);

  const totalEndpoints = useMemo(() =>
    filteredCategories.reduce((sum, cat) => sum + cat.endpoints.length, 0),
  [filteredCategories]);

  const totalAll = useMemo(() =>
    categories.reduce((sum, cat) => sum + cat.endpoints.length, 0),
  [categories]);

  const toggleMethod = useCallback((method: string) => {
    setSelectedMethods(prev => {
      const next = new Set(prev);
      if (next.has(method)) next.delete(method);
      else next.add(method);
      return next;
    });
  }, []);

  const clearFilters = useCallback(() => {
    setSearch('');
    setSelectedMethods(new Set());
    setSelectedCategory(null);
    setSelectedAvailability(null);
  }, []);

  const hasFilters = search || selectedMethods.size > 0 || selectedCategory || selectedAvailability;

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-primary)' }}>
      {/* Glass Navbar */}
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled ? 'glass-strong shadow-lg' : 'bg-transparent'
        }`}
        style={{ borderBottom: scrolled ? '1px solid var(--border-subtle)' : 'none' }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-gradient-to-br from-[#5865F2] to-[#7289da]">
                  <DiscordIcon className="w-5 h-5 text-white" />
                </div>
                <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-[var(--accent-primary)] flex items-center justify-center">
                  <span className="text-[8px] font-bold text-black">API</span>
                </div>
              </div>
              <div className="hidden sm:block">
                <h1 className="text-lg font-bold gradient-text" style={{ fontFamily: 'var(--font-heading)' }}>
                  Discord API
                </h1>
                <p className="text-[11px] text-[var(--text-muted)] -mt-0.5">Interactive Explorer</p>
              </div>
            </div>

            {/* Desktop Search */}
            <div className="hidden md:flex flex-1 max-w-xl mx-8">
              <div className="relative w-full group">
                <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)] group-focus-within:text-[var(--accent-primary)] transition-colors" />
                <input
                  type="text"
                  placeholder="Search endpoints, paths, operations..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-11 pr-4 py-2.5 rounded-xl text-sm bg-[var(--bg-tertiary)] border border-[var(--border-default)] focus:border-[var(--accent-primary)] focus:ring-2 focus:ring-[var(--accent-glow)] placeholder:text-[var(--text-muted)]"
                />
                {search && (
                  <button
                    onClick={() => setSearch('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-md hover:bg-[var(--bg-hover)]"
                  >
                    <XIcon className="w-4 h-4 text-[var(--text-muted)]" />
                  </button>
                )}
              </div>
            </div>

            {/* Desktop Actions */}
            <div className="hidden md:flex items-center gap-3">
              <span className="text-sm text-[var(--text-muted)]">
                <span className="text-[var(--accent-primary)] font-semibold">{totalAll}</span> endpoints
              </span>
              <div className="w-px h-5 bg-[var(--border-default)]" />
              <a
                href="https://discord.com/developers/docs"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-secondary text-sm !py-2 !px-4 flex items-center gap-2"
              >
                Official Docs
                <ExternalLinkIcon className="w-3.5 h-3.5" />
              </a>
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-lg hover:bg-[var(--bg-hover)]"
            >
              {mobileMenuOpen ? (
                <XIcon className="w-6 h-6 text-[var(--text-primary)]" />
              ) : (
                <MenuIcon className="w-6 h-6 text-[var(--text-primary)]" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden glass-strong border-t border-[var(--border-subtle)] mobile-menu-enter">
            <div className="px-4 py-4 space-y-4">
              {/* Mobile Search */}
              <div className="relative">
                <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                <input
                  type="text"
                  placeholder="Search endpoints..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 rounded-xl text-sm"
                />
              </div>

              {/* Mobile Category Select */}
              <select
                value={selectedCategory || ''}
                onChange={(e) => setSelectedCategory(e.target.value || null)}
                className="w-full py-3 rounded-xl text-sm"
              >
                <option value="">All Categories</option>
                {categories.map(cat => (
                  <option key={cat.name} value={cat.name}>{cat.name} ({cat.endpoints.length})</option>
                ))}
              </select>

              {/* Mobile Method Filters */}
              <div className="flex flex-wrap gap-2">
                {allMethods.map(method => (
                  <button
                    key={method}
                    onClick={() => toggleMethod(method)}
                    className={`px-3 py-2 rounded-lg text-xs font-mono font-semibold border transition-all ${
                      selectedMethods.has(method) ? METHOD_STYLES[method] : 'bg-[var(--bg-tertiary)] border-[var(--border-default)] text-[var(--text-muted)]'
                    }`}
                  >
                    {method}
                  </button>
                ))}
              </div>

              {/* Mobile Links */}
              <a
                href="https://discord.com/developers/docs"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-[var(--bg-tertiary)] text-[var(--text-secondary)] text-sm"
              >
                Official Docs
                <ExternalLinkIcon className="w-4 h-4" />
              </a>
            </div>
          </div>
        )}
      </header>

      {/* Hero Section */}
      <section className="pt-28 pb-16 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
        {/* Background Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-gradient-to-b from-[var(--accent-primary)] to-transparent opacity-[0.07] blur-[100px] pointer-events-none" />
        <div className="absolute top-20 right-1/4 w-[400px] h-[300px] bg-gradient-to-b from-[var(--accent-secondary)] to-transparent opacity-[0.05] blur-[80px] pointer-events-none" />

        <div className="max-w-7xl mx-auto text-center relative">
          <div className="animate-fade-in-up">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[var(--bg-secondary)] border border-[var(--border-default)] mb-6">
              <span className="w-2 h-2 rounded-full bg-[var(--accent-primary)] animate-pulse" />
              <span className="text-sm text-[var(--text-secondary)]">v{spec.info.version}</span>
              <span className="text-[var(--text-muted)]">|</span>
              <span className="text-sm text-[var(--text-muted)]">{totalAll} endpoints</span>
            </div>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6 animate-fade-in-up" style={{ fontFamily: 'var(--font-heading)', animationDelay: '0.1s' }}>
            <span className="text-[var(--text-primary)]">Discord API</span>{' '}
            <span className="gradient-text">Explorer</span>
          </h1>

          <p className="text-lg sm:text-xl text-[var(--text-secondary)] max-w-2xl mx-auto mb-10 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
            Interactive documentation with live request testing.
            Explore, test, and integrate the Discord API with ease.
          </p>

          {/* Quick Stats */}
          <div className="flex flex-wrap justify-center gap-4 sm:gap-8 animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
            {[
              { label: 'Categories', value: categories.length, color: 'var(--accent-primary)' },
              { label: 'Endpoints', value: totalAll, color: 'var(--accent-secondary)' },
              { label: 'Methods', value: allMethods.length, color: 'var(--method-get)' },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-3xl sm:text-4xl font-bold" style={{ color: stat.color, fontFamily: 'var(--font-heading)' }}>
                  {stat.value}
                </div>
                <div className="text-sm text-[var(--text-muted)]">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Filters Bar */}
      <section className="sticky top-16 z-40 glass-strong border-y border-[var(--border-subtle)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-wrap items-center gap-3">
            {/* Method Filters - Desktop */}
            <div className="hidden sm:flex items-center gap-2">
              <span className="text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">Method</span>
              <div className="flex gap-1">
                {allMethods.map(method => (
                  <button
                    key={method}
                    onClick={() => toggleMethod(method)}
                    className={`px-3 py-1.5 rounded-md text-xs font-mono font-semibold border transition-all ${
                      selectedMethods.has(method)
                        ? METHOD_STYLES[method]
                        : 'bg-[var(--bg-tertiary)] border-[var(--border-default)] text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                    }`}
                  >
                    {method}
                  </button>
                ))}
              </div>
            </div>

            <div className="hidden sm:block w-px h-6 bg-[var(--border-default)]" />

            {/* Category Filter */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium uppercase tracking-wider text-[var(--text-muted)] hidden sm:inline">Category</span>
              <select
                value={selectedCategory || ''}
                onChange={(e) => setSelectedCategory(e.target.value || null)}
                className="!py-1.5 !px-3 text-sm rounded-md !bg-[var(--bg-tertiary)] !border-[var(--border-default)]"
              >
                <option value="">All Categories</option>
                {categories.map(cat => (
                  <option key={cat.name} value={cat.name}>{cat.name} ({cat.endpoints.length})</option>
                ))}
              </select>
            </div>

            <div className="w-px h-6 bg-[var(--border-default)]" />

            {/* Availability Filter */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium uppercase tracking-wider text-[var(--text-muted)] hidden sm:inline">Status</span>
              <div className="flex gap-1">
                <button
                  onClick={() => setSelectedAvailability(selectedAvailability === 'preview-only' ? null : 'preview-only')}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-all ${
                    selectedAvailability === 'preview-only'
                      ? 'bg-[var(--accent-secondary)]/10 text-[var(--accent-secondary)] border-[var(--accent-secondary)]/20'
                      : 'bg-[var(--bg-tertiary)] border-[var(--border-default)] text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                  }`}
                >
                  Preview
                </button>
                <button
                  onClick={() => setSelectedAvailability(selectedAvailability === 'stable-only' ? null : 'stable-only')}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-all ${
                    selectedAvailability === 'stable-only'
                      ? 'bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] border-[var(--accent-primary)]/20'
                      : 'bg-[var(--bg-tertiary)] border-[var(--border-default)] text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                  }`}
                >
                  Stable Only
                </button>
              </div>
            </div>

            {/* Clear & Count */}
            {hasFilters && (
              <>
                <div className="w-px h-6 bg-[var(--border-default)]" />
                <button
                  onClick={clearFilters}
                  className="text-xs text-[var(--method-delete)] hover:text-red-300 flex items-center gap-1"
                >
                  <XIcon className="w-3 h-3" />
                  Clear
                </button>
              </>
            )}

            <div className="ml-auto text-sm text-[var(--text-muted)]">
              <span className="text-[var(--text-primary)] font-semibold">{totalEndpoints}</span>
              {hasFilters && <span className="text-[var(--text-dim)]"> / {totalAll}</span>}
              <span className="ml-1">endpoint{totalEndpoints !== 1 ? 's' : ''}</span>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="space-y-16">
          {filteredCategories.map((category, catIndex) => (
            <section key={category.name} className="animate-fade-in-up" style={{ animationDelay: `${catIndex * 0.05}s` }}>
              <div className="flex items-center gap-4 mb-6">
                <h2 className="text-2xl font-bold text-[var(--text-primary)]" style={{ fontFamily: 'var(--font-heading)' }}>
                  {category.name}
                </h2>
                <span className="px-3 py-1 rounded-full text-xs font-medium bg-[var(--bg-tertiary)] text-[var(--text-muted)] border border-[var(--border-default)]">
                  {category.endpoints.length}
                </span>
                <div className="flex-1 h-px bg-gradient-to-r from-[var(--border-default)] to-transparent" />
              </div>

              <div className="space-y-3">
                {category.endpoints.map((endpoint, epIndex) => (
                  <EndpointCard
                    key={`${endpoint.method}-${endpoint.path}`}
                    endpoint={endpoint}
                    spec={spec}
                    isExpanded={expandedEndpoint === `${endpoint.method}-${slugify(endpoint.path)}`}
                    onToggle={() => {
                      const id = `${endpoint.method}-${slugify(endpoint.path)}`;
                      setExpandedEndpoint(prev => prev === id ? null : id);
                    }}
                    style={{ animationDelay: `${(catIndex * 0.05) + (epIndex * 0.02)}s` }}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>

        {/* Empty State */}
        {filteredCategories.length === 0 && (
          <div className="text-center py-24 animate-fade-in">
            <div className="w-20 h-20 rounded-2xl mx-auto mb-6 flex items-center justify-center bg-[var(--bg-secondary)] border border-[var(--border-default)]">
              <SearchIcon className="w-8 h-8 text-[var(--text-muted)]" />
            </div>
            <h3 className="text-xl font-semibold mb-3 text-[var(--text-primary)]" style={{ fontFamily: 'var(--font-heading)' }}>
              No endpoints found
            </h3>
            <p className="text-[var(--text-muted)] mb-6 max-w-md mx-auto">
              Try adjusting your search terms or filters to find what you&apos;re looking for.
            </p>
            <button onClick={clearFilters} className="btn-primary">
              Clear all filters
            </button>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-[var(--border-subtle)] mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-gradient-to-br from-[#5865F2] to-[#7289da]">
                <DiscordIcon className="w-4 h-4 text-white" />
              </div>
              <span className="text-sm text-[var(--text-muted)]">
                Generated from the{' '}
                <a
                  href="https://github.com/discord/discord-api-spec"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[var(--accent-primary)] hover:underline"
                >
                  Discord OpenAPI Spec
                </a>
              </span>
            </div>
            <div className="text-sm text-[var(--text-dim)]">
              Not affiliated with Discord Inc.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

// ============================================================================
// Endpoint Card Component
// ============================================================================

interface EndpointCardProps {
  endpoint: ParsedEndpoint;
  spec: OpenAPISpec;
  isExpanded: boolean;
  onToggle: () => void;
  style?: React.CSSProperties;
}

function EndpointCard({ endpoint, spec, isExpanded, onToggle, style }: EndpointCardProps) {
  const { path, method, operation, availability } = endpoint;
  const [activeTab, setActiveTab] = useState<'params' | 'body' | 'responses' | 'try'>('params');
  const [requestParams, setRequestParams] = useState<Record<string, string>>({});
  const [requestBody, setRequestBody] = useState('');
  const [authToken, setAuthToken] = useState('');
  const [response, setResponse] = useState<{ status: number; data: unknown; time: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const pathParams = (operation.parameters || []).filter((p) => p.in === 'path');
  const queryParams = (operation.parameters || []).filter((p) => p.in === 'query');
  const hasParams = pathParams.length > 0 || queryParams.length > 0;

  const requestBodySchema = operation.requestBody;
  const hasBody = !!requestBodySchema;

  const responses = operation.responses || {};
  const hasResponses = Object.keys(responses).length > 0;

  // Build URL with parameters
  const buildUrl = useCallback(() => {
    let url = path;
    pathParams.forEach((p) => {
      const value = requestParams[p.name] || `{${p.name}}`;
      url = url.replace(`{${p.name}}`, encodeURIComponent(value));
    });

    const queryParts = queryParams
      .filter((p) => requestParams[p.name])
      .map((p) => `${p.name}=${encodeURIComponent(requestParams[p.name])}`);

    if (queryParts.length > 0) {
      url += '?' + queryParts.join('&');
    }

    return url;
  }, [path, pathParams, queryParams, requestParams]);

  // Copy cURL command
  const copyCurl = useCallback(() => {
    const url = DISCORD_API_BASE + buildUrl();
    let curl = `curl -X ${method} "${url}"`;
    if (authToken) {
      curl += ` \\\n  -H "Authorization: ${authToken}"`;
    }
    curl += ` \\\n  -H "Content-Type: application/json"`;
    if (hasBody && requestBody) {
      curl += ` \\\n  -d '${requestBody}'`;
    }
    navigator.clipboard.writeText(curl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [method, buildUrl, authToken, hasBody, requestBody]);

  // Send test request
  const sendRequest = useCallback(async () => {
    setLoading(true);
    setResponse(null);
    const startTime = Date.now();

    try {
      const url = DISCORD_API_BASE + buildUrl();
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      if (authToken) {
        headers['Authorization'] = authToken;
      }

      const res = await fetch(url, {
        method,
        headers,
        body: hasBody && requestBody ? requestBody : undefined,
      });

      const data = await res.json().catch(() => null);
      setResponse({
        status: res.status,
        data,
        time: Date.now() - startTime,
      });
    } catch (error) {
      setResponse({
        status: 0,
        data: { error: 'Failed to send request. Check CORS or network issues.' },
        time: Date.now() - startTime,
      });
    } finally {
      setLoading(false);
    }
  }, [buildUrl, method, authToken, hasBody, requestBody]);

  // Get body schema
  const getBodySchema = useCallback(() => {
    if (!requestBodySchema) return null;
    const body = '$ref' in requestBodySchema ? resolveRef(spec, requestBodySchema.$ref) : requestBodySchema;
    if (!body || !('content' in body)) return null;
    const content = body.content?.['application/json'] || Object.values(body.content || {})[0];
    return content?.schema;
  }, [requestBodySchema, spec]);

  // Format path with highlighted params
  const formatPath = (p: string) => p.split(/(\{[^}]+\})/).map((seg, i) =>
    seg.startsWith('{') ? <span key={i} className="text-[var(--method-put)]">{seg}</span> : seg
  );

  return (
    <div
      className={`gradient-border-card border border-[var(--border-default)] transition-all duration-300 animate-fade-in-up ${
        isExpanded ? 'border-[var(--border-prominent)] glow-cyan' : 'hover:border-[var(--border-prominent)]'
      }`}
      style={style}
    >
      {/* Header */}
      <button
        onClick={onToggle}
        className="w-full px-4 sm:px-5 py-4 flex items-center gap-3 sm:gap-4 text-left hover:bg-[var(--bg-hover)]/30 transition-colors"
      >
        <span className={`px-2.5 py-1.5 rounded-md text-xs font-mono font-bold border ${METHOD_STYLES[method]}`}>
          {method}
        </span>

        {availability !== 'both' && (
          <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
            availability === 'preview-only'
              ? 'bg-[var(--accent-secondary)]/10 text-[var(--accent-secondary)]'
              : 'bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]'
          }`}>
            {availability === 'preview-only' ? 'PREVIEW' : 'STABLE ONLY'}
          </span>
        )}

        <code className="text-sm font-mono flex-1 text-[var(--text-secondary)] truncate">
          {formatPath(path)}
        </code>

        {operation.summary && (
          <span className="hidden lg:block text-sm text-[var(--text-muted)] truncate max-w-xs">
            {operation.summary}
          </span>
        )}

        <ChevronIcon className={`w-5 h-5 text-[var(--text-muted)] transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="border-t border-[var(--border-default)] animate-fade-in">
          {/* Description */}
          {(operation.summary || operation.description) && (
            <div className="px-5 py-4 border-b border-[var(--border-default)] bg-[var(--bg-secondary)]/50">
              {operation.summary && (
                <h4 className="font-semibold text-[var(--text-primary)] mb-1" style={{ fontFamily: 'var(--font-heading)' }}>
                  {operation.summary}
                </h4>
              )}
              {operation.description && (
                <p className="text-sm text-[var(--text-muted)] leading-relaxed">{operation.description}</p>
              )}
            </div>
          )}

          {/* Tabs */}
          <div className="flex border-b border-[var(--border-default)] overflow-x-auto hide-scrollbar">
            {hasParams && (
              <TabButton active={activeTab === 'params'} onClick={() => setActiveTab('params')}>
                Parameters
              </TabButton>
            )}
            {hasBody && (
              <TabButton active={activeTab === 'body'} onClick={() => setActiveTab('body')}>
                Request Body
              </TabButton>
            )}
            {hasResponses && (
              <TabButton active={activeTab === 'responses'} onClick={() => setActiveTab('responses')}>
                Responses
              </TabButton>
            )}
            <TabButton active={activeTab === 'try'} onClick={() => setActiveTab('try')} highlight>
              <PlayIcon className="w-3.5 h-3.5" />
              Try It
            </TabButton>
          </div>

          {/* Tab Content */}
          <div className="p-5">
            {/* Parameters Tab */}
            {activeTab === 'params' && (
              <div className="space-y-6">
                {pathParams.length > 0 && (
                  <div>
                    <h5 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-3">
                      Path Parameters
                    </h5>
                    <ParameterTable parameters={pathParams} type="path" />
                  </div>
                )}
                {queryParams.length > 0 && (
                  <div>
                    <h5 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-3">
                      Query Parameters
                    </h5>
                    <ParameterTable parameters={queryParams} type="query" />
                  </div>
                )}
                {!hasParams && (
                  <p className="text-sm text-[var(--text-muted)]">No parameters required for this endpoint.</p>
                )}
              </div>
            )}

            {/* Request Body Tab */}
            {activeTab === 'body' && hasBody && (
              <div>
                <h5 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-3">
                  Request Body Schema
                </h5>
                <div className="rounded-lg p-4 bg-[var(--bg-tertiary)] border border-[var(--border-default)] overflow-x-auto">
                  {getBodySchema() ? (
                    <SchemaView schema={getBodySchema()!} spec={spec} />
                  ) : (
                    <span className="text-sm text-[var(--text-muted)]">No schema available</span>
                  )}
                </div>
              </div>
            )}

            {/* Responses Tab */}
            {activeTab === 'responses' && hasResponses && (
              <div className="space-y-4">
                {Object.entries(responses).map(([code, res]) => (
                  <ResponseBlock key={code} code={code} response={res} spec={spec} />
                ))}
              </div>
            )}

            {/* Try It Tab */}
            {activeTab === 'try' && (
              <div className="space-y-6">
                {/* Auth Token */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-2">
                    Authorization Token
                  </label>
                  <input
                    type="text"
                    placeholder="Bot YOUR_TOKEN or Bearer YOUR_TOKEN"
                    value={authToken}
                    onChange={(e) => setAuthToken(e.target.value)}
                    className="font-mono text-sm"
                  />
                </div>

                {/* Path Parameters */}
                {pathParams.length > 0 && (
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-2">
                      Path Parameters
                    </label>
                    <div className="space-y-2">
                      {pathParams.map((p) => (
                        <div key={p.name} className="flex items-center gap-3">
                          <code className="text-sm font-mono text-[var(--method-put)] w-32 shrink-0">{p.name}</code>
                          <input
                            type="text"
                            placeholder={p.schema?.type || 'string'}
                            value={requestParams[p.name] || ''}
                            onChange={(e) => setRequestParams(prev => ({ ...prev, [p.name]: e.target.value }))}
                            className="font-mono text-sm"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Query Parameters */}
                {queryParams.length > 0 && (
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-2">
                      Query Parameters
                    </label>
                    <div className="space-y-2">
                      {queryParams.map((p) => (
                        <div key={p.name} className="flex items-center gap-3">
                          <code className="text-sm font-mono text-[var(--method-post)] w-32 shrink-0">
                            {p.name}
                            {p.required && <span className="text-[var(--method-delete)]">*</span>}
                          </code>
                          <input
                            type="text"
                            placeholder={p.schema?.type || 'string'}
                            value={requestParams[p.name] || ''}
                            onChange={(e) => setRequestParams(prev => ({ ...prev, [p.name]: e.target.value }))}
                            className="font-mono text-sm"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Request Body */}
                {hasBody && (
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-2">
                      Request Body (JSON)
                    </label>
                    <textarea
                      placeholder="{}"
                      value={requestBody}
                      onChange={(e) => setRequestBody(e.target.value)}
                      rows={6}
                      className="font-mono text-sm resize-y"
                    />
                  </div>
                )}

                {/* URL Preview */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-2">
                    Request URL
                  </label>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 p-3 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border-default)] text-sm font-mono text-[var(--text-secondary)] truncate">
                      {DISCORD_API_BASE}{buildUrl()}
                    </code>
                    <button onClick={copyCurl} className="btn-secondary !py-3 flex items-center gap-2">
                      {copied ? <CheckIcon className="w-4 h-4 text-[var(--method-get)]" /> : <CopyIcon className="w-4 h-4" />}
                      {copied ? 'Copied!' : 'cURL'}
                    </button>
                  </div>
                </div>

                {/* Send Button */}
                <button
                  onClick={sendRequest}
                  disabled={loading}
                  className="btn-primary w-full flex items-center justify-center gap-2 !py-3"
                >
                  {loading ? (
                    <div className="spinner" />
                  ) : (
                    <>
                      <PlayIcon className="w-4 h-4" />
                      Send Request
                    </>
                  )}
                </button>

                {/* Response */}
                {response && (
                  <div className="animate-fade-in">
                    <div className="flex items-center gap-3 mb-2">
                      <label className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                        Response
                      </label>
                      <span className={`px-2 py-0.5 rounded text-xs font-mono font-semibold ${
                        response.status >= 200 && response.status < 300 ? 'status-2xx' :
                        response.status >= 300 && response.status < 400 ? 'status-3xx' :
                        response.status >= 400 && response.status < 500 ? 'status-4xx' : 'status-5xx'
                      }`}>
                        {response.status || 'Error'}
                      </span>
                      <span className="text-xs text-[var(--text-muted)]">{response.time}ms</span>
                    </div>
                    <pre className="p-4 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border-default)] overflow-x-auto text-sm font-mono">
                      <JsonHighlight data={response.data} />
                    </pre>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Helper Components
// ============================================================================

function TabButton({ active, onClick, children, highlight }: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  highlight?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-3 text-sm font-medium flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${
        active
          ? highlight
            ? 'border-[var(--accent-primary)] text-[var(--accent-primary)]'
            : 'border-[var(--accent-secondary)] text-[var(--accent-secondary)]'
          : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
      }`}
    >
      {children}
    </button>
  );
}

function ParameterTable({ parameters, type }: { parameters: any[]; type: 'path' | 'query' }) {
  return (
    <div className="rounded-lg overflow-hidden border border-[var(--border-default)]">
      {parameters.map((p, i) => (
        <div
          key={p.name}
          className={`px-4 py-3 flex flex-wrap items-start gap-3 ${i !== parameters.length - 1 ? 'border-b border-[var(--border-default)]' : ''} bg-[var(--bg-tertiary)]`}
        >
          <code className={`text-sm font-mono font-semibold ${type === 'path' ? 'text-[var(--method-put)]' : 'text-[var(--method-post)]'}`}>
            {p.name}
          </code>
          <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-[var(--bg-elevated)] text-[var(--text-muted)]">
            {p.schema?.type || 'string'}
          </span>
          {p.required && (
            <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-[var(--method-delete)]/10 text-[var(--method-delete)]">
              required
            </span>
          )}
          {p.description && (
            <span className="text-sm text-[var(--text-secondary)] w-full mt-1">{p.description}</span>
          )}
        </div>
      ))}
    </div>
  );
}

function ResponseBlock({ code, response, spec }: { code: string; response: any; spec: OpenAPISpec }) {
  const resolved = '$ref' in response ? resolveRef(spec, response.$ref) : response;
  const content = resolved?.content?.['application/json'] || Object.values(resolved?.content || {})[0];
  const schema = content?.schema;
  const desc = resolved?.description;

  const statusClass = code.startsWith('2') ? 'status-2xx' :
                     code.startsWith('3') ? 'status-3xx' :
                     code.startsWith('4') ? 'status-4xx' : 'status-5xx';

  return (
    <div className="rounded-lg overflow-hidden border border-[var(--border-default)]">
      <div className="px-4 py-3 flex items-center gap-3 bg-[var(--bg-tertiary)] border-b border-[var(--border-default)]">
        <span className={`px-2 py-0.5 rounded text-xs font-mono font-semibold ${statusClass}`}>
          {code}
        </span>
        {desc && <span className="text-sm text-[var(--text-secondary)]">{desc}</span>}
      </div>
      {schema && (
        <div className="p-4 overflow-x-auto">
          <SchemaView schema={schema} spec={spec} />
        </div>
      )}
    </div>
  );
}

// Schema Viewer
function SchemaView({ schema, spec, depth = 0 }: { schema: Schema | { $ref: string }; spec: OpenAPISpec; depth?: number }) {
  const [expanded, setExpanded] = useState(depth < 2);

  if ('$ref' in schema && schema.$ref) {
    const resolved = resolveRef(spec, schema.$ref);
    const name = getSchemaName(schema.$ref);
    if (!resolved) return <span className="text-[var(--method-delete)] text-xs">Unresolved: {schema.$ref}</span>;

    return (
      <div className="ml-2">
        <button onClick={() => setExpanded(!expanded)} className="flex items-center gap-1 text-xs hover:opacity-80">
          <ChevronIcon className={`w-3 h-3 transition-transform ${expanded ? 'rotate-90' : ''}`} />
          <span className="text-[var(--accent-secondary)] font-mono font-semibold">{name}</span>
        </button>
        {expanded && (
          <div className="mt-1 pl-3 border-l border-[var(--border-default)]">
            <SchemaView schema={resolved} spec={spec} depth={depth + 1} />
          </div>
        )}
      </div>
    );
  }

  const s = schema as Schema;

  if (s.allOf) {
    return (
      <div className="space-y-1">
        {s.allOf.map((item, i) => <SchemaView key={i} schema={item} spec={spec} depth={depth} />)}
      </div>
    );
  }

  if (s.oneOf || s.anyOf) {
    const variants = s.oneOf || s.anyOf || [];
    return (
      <div className="space-y-1">
        <span className="text-xs text-[var(--text-muted)]">{s.oneOf ? 'One of:' : 'Any of:'}</span>
        {variants.map((v, i) => (
          <div key={i} className="ml-2">
            <SchemaView schema={v} spec={spec} depth={depth + 1} />
          </div>
        ))}
      </div>
    );
  }

  if (s.type === 'object' || s.properties) {
    const props = s.properties || {};
    const required = s.required || [];
    return (
      <div className="space-y-1">
        {Object.entries(props).map(([name, prop]) => (
          <div key={name} className="flex items-start gap-2">
            <code className="text-xs text-[var(--method-post)] font-semibold">{name}</code>
            {required.includes(name) && <span className="text-[8px] text-[var(--method-delete)]">*</span>}
            <SchemaView schema={prop} spec={spec} depth={depth + 1} />
          </div>
        ))}
      </div>
    );
  }

  if (s.type === 'array' && s.items) {
    return (
      <span className="flex items-center gap-1 text-xs">
        <span className="text-[var(--method-get)]">array</span>
        <span className="text-[var(--text-muted)]">of</span>
        <SchemaView schema={s.items} spec={spec} depth={depth + 1} />
      </span>
    );
  }

  const typeColors: Record<string, string> = {
    string: 'text-[var(--method-get)]',
    integer: 'text-[var(--method-post)]',
    number: 'text-[var(--method-post)]',
    boolean: 'text-[var(--method-put)]',
    null: 'text-[var(--text-muted)]',
  };

  return (
    <span className="flex items-center gap-1 text-xs flex-wrap">
      <span className={`font-mono font-semibold ${typeColors[s.type || 'string'] || 'text-[var(--text-muted)]'}`}>
        {s.type || 'any'}
        {s.format && <span className="text-[var(--text-muted)]">({s.format})</span>}
      </span>
      {s.nullable && <span className="text-[var(--text-muted)]">| null</span>}
      {s.enum && (
        <span className="text-[var(--text-muted)]">[{s.enum.slice(0, 3).join(', ')}{s.enum.length > 3 ? '...' : ''}]</span>
      )}
      {s.description && (
        <span className="text-[var(--text-muted)] truncate max-w-[200px]" title={s.description}>
          — {s.description}
        </span>
      )}
    </span>
  );
}

// JSON Syntax Highlighter
function JsonHighlight({ data }: { data: unknown }) {
  const highlight = (obj: unknown, indent = 0): React.ReactNode => {
    if (obj === null) return <span className="json-null">null</span>;
    if (typeof obj === 'boolean') return <span className="json-boolean">{obj.toString()}</span>;
    if (typeof obj === 'number') return <span className="json-number">{obj}</span>;
    if (typeof obj === 'string') return <span className="json-string">&quot;{obj}&quot;</span>;

    if (Array.isArray(obj)) {
      if (obj.length === 0) return '[]';
      return (
        <>
          {'[\n'}
          {obj.map((item, i) => (
            <span key={i}>
              {'  '.repeat(indent + 1)}
              {highlight(item, indent + 1)}
              {i < obj.length - 1 ? ',\n' : '\n'}
            </span>
          ))}
          {'  '.repeat(indent)}]
        </>
      );
    }

    if (typeof obj === 'object') {
      const entries = Object.entries(obj);
      if (entries.length === 0) return '{}';
      return (
        <>
          {'{\n'}
          {entries.map(([key, value], i) => (
            <span key={key}>
              {'  '.repeat(indent + 1)}
              <span className="json-key">&quot;{key}&quot;</span>: {highlight(value, indent + 1)}
              {i < entries.length - 1 ? ',\n' : '\n'}
            </span>
          ))}
          {'  '.repeat(indent)}}
        </>
      );
    }

    return String(obj);
  };

  return <code>{highlight(data)}</code>;
}

// ============================================================================
// Icons
// ============================================================================

function DiscordIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
    </svg>
  );
}

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  );
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function MenuIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  );
}

function ChevronIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  );
}

function ExternalLinkIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
    </svg>
  );
}

function PlayIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}

function CopyIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  );
}
