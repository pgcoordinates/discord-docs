'use client';

import { useState, useMemo, useCallback } from 'react';
import { OpenAPISpec, ParsedEndpoint, Category, Schema } from '@/types/openapi';
import { slugify, resolveRef, getSchemaName } from '@/lib/openapi';

interface DocsPageProps {
  categories: Category[];
  spec: OpenAPISpec;
}

const METHOD_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  GET: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20' },
  POST: { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/20' },
  PUT: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20' },
  PATCH: { bg: 'bg-orange-500/10', text: 'text-orange-400', border: 'border-orange-500/20' },
  DELETE: { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/20' },
};

export default function DocsPage({ categories, spec }: DocsPageProps) {
  const [search, setSearch] = useState('');
  const [selectedMethods, setSelectedMethods] = useState<Set<string>>(new Set());
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [expandedEndpoint, setExpandedEndpoint] = useState<string | null>(null);

  const allMethods = useMemo(() => {
    const methods = new Set<string>();
    categories.forEach(cat => cat.endpoints.forEach(ep => methods.add(ep.method)));
    return Array.from(methods).sort();
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
          return matchesSearch && matchesMethod;
        })
      }))
      .filter(cat => cat.endpoints.length > 0);
  }, [categories, search, selectedMethods, selectedCategory]);

  const totalEndpoints = useMemo(() =>
    filteredCategories.reduce((sum, cat) => sum + cat.endpoints.length, 0),
  [filteredCategories]);

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
  }, []);

  const hasFilters = search || selectedMethods.size > 0 || selectedCategory;

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-primary)' }}>
      {/* Header */}
      <header className="sticky top-0 z-50 border-b" style={{
        background: 'rgba(12, 12, 15, 0.8)',
        backdropFilter: 'blur(12px)',
        borderColor: 'var(--border-primary)'
      }}>
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between gap-8">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: '#5865F2' }}>
                <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
                </svg>
              </div>
              <div>
                <h1 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Discord API</h1>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>v{spec.info.version}</p>
              </div>
            </div>

            <div className="flex-1 max-w-xl">
              <div className="relative">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-muted)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  placeholder="Search endpoints..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg text-sm focus:outline-none"
                  style={{
                    background: 'var(--bg-tertiary)',
                    border: '1px solid var(--border-primary)',
                    color: 'var(--text-primary)'
                  }}
                />
                {search && (
                  <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-white/10">
                    <svg className="w-4 h-4" style={{ color: 'var(--text-muted)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            </div>

            <a href="https://discord.com/developers/docs" target="_blank" rel="noopener noreferrer"
              className="text-sm px-4 py-2 rounded-lg hidden sm:block"
              style={{ background: 'var(--bg-tertiary)', color: 'var(--text-secondary)', border: '1px solid var(--border-primary)' }}>
              Official Docs →
            </a>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 mb-8">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Method</span>
            <div className="flex gap-1">
              {allMethods.map(method => {
                const colors = METHOD_COLORS[method] || METHOD_COLORS.GET;
                const isSelected = selectedMethods.has(method);
                return (
                  <button key={method} onClick={() => toggleMethod(method)}
                    className={`px-3 py-1.5 text-xs font-mono font-medium rounded-md border transition-all ${isSelected ? `${colors.bg} ${colors.text} ${colors.border}` : ''}`}
                    style={!isSelected ? { background: 'var(--bg-tertiary)', borderColor: 'var(--border-primary)', color: 'var(--text-muted)' } : {}}>
                    {method}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="w-px h-6" style={{ background: 'var(--border-primary)' }} />

          <div className="flex items-center gap-2">
            <span className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Category</span>
            <select value={selectedCategory || ''} onChange={(e) => setSelectedCategory(e.target.value || null)}
              className="px-3 py-1.5 text-sm rounded-md focus:outline-none"
              style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-primary)', color: 'var(--text-secondary)' }}>
              <option value="">All Categories</option>
              {categories.map(cat => (
                <option key={cat.name} value={cat.name}>{cat.name} ({cat.endpoints.length})</option>
              ))}
            </select>
          </div>

          {hasFilters && (
            <>
              <div className="w-px h-6" style={{ background: 'var(--border-primary)' }} />
              <button onClick={clearFilters} className="px-3 py-1.5 text-xs rounded-md hover:bg-red-500/10" style={{ color: 'var(--accent-red)' }}>
                Clear filters
              </button>
            </>
          )}

          <div className="ml-auto text-sm" style={{ color: 'var(--text-muted)' }}>
            {totalEndpoints} endpoint{totalEndpoints !== 1 ? 's' : ''}
          </div>
        </div>

        {/* Endpoints */}
        <div className="space-y-12">
          {filteredCategories.map(category => (
            <section key={category.name}>
              <h2 className="text-xl font-semibold mb-4 pb-2 border-b flex items-center gap-3" style={{ color: 'var(--text-primary)', borderColor: 'var(--border-primary)' }}>
                {category.name}
                <span className="text-xs font-normal px-2 py-0.5 rounded-full" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-muted)' }}>
                  {category.endpoints.length}
                </span>
              </h2>
              <div className="space-y-3">
                {category.endpoints.map(endpoint => (
                  <EndpointCard key={`${endpoint.method}-${endpoint.path}`} endpoint={endpoint} spec={spec}
                    isExpanded={expandedEndpoint === `${endpoint.method}-${slugify(endpoint.path)}`}
                    onToggle={() => {
                      const id = `${endpoint.method}-${slugify(endpoint.path)}`;
                      setExpandedEndpoint(prev => prev === id ? null : id);
                    }} />
                ))}
              </div>
            </section>
          ))}
        </div>

        {filteredCategories.length === 0 && (
          <div className="text-center py-20">
            <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center" style={{ background: 'var(--bg-tertiary)' }}>
              <svg className="w-8 h-8" style={{ color: 'var(--text-muted)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium mb-2" style={{ color: 'var(--text-primary)' }}>No endpoints found</h3>
            <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>Try adjusting your search or filters</p>
            <button onClick={clearFilters} className="text-sm px-4 py-2 rounded-lg" style={{ background: 'var(--accent-blue)', color: 'white' }}>
              Clear all filters
            </button>
          </div>
        )}
      </div>

      <footer className="border-t mt-20 py-8" style={{ borderColor: 'var(--border-primary)' }}>
        <div className="max-w-7xl mx-auto px-6 text-center">
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            Generated from the <a href="https://github.com/discord/discord-api-spec" target="_blank" rel="noopener noreferrer" className="underline hover:no-underline" style={{ color: 'var(--text-secondary)' }}>Discord OpenAPI Spec</a>
          </p>
        </div>
      </footer>
    </div>
  );
}

// Schema Viewer Component
function SchemaView({ schema, spec, depth = 0 }: { schema: Schema | { $ref: string }; spec: OpenAPISpec; depth?: number }) {
  const [expanded, setExpanded] = useState(depth < 2);

  if ('$ref' in schema && schema.$ref) {
    const resolved = resolveRef(spec, schema.$ref);
    const name = getSchemaName(schema.$ref);
    if (!resolved) return <span className="text-red-400 text-xs">Unresolved: {schema.$ref}</span>;

    return (
      <div className="ml-2">
        <button onClick={() => setExpanded(!expanded)} className="flex items-center gap-1 text-xs hover:opacity-80">
          <svg className={`w-3 h-3 transition-transform ${expanded ? 'rotate-90' : ''}`} fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
          </svg>
          <span className="text-purple-400 font-mono">{name}</span>
        </button>
        {expanded && <div className="mt-1 pl-3 border-l border-zinc-700"><SchemaView schema={resolved} spec={spec} depth={depth + 1} /></div>}
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
        <span className="text-xs text-zinc-500">{s.oneOf ? 'One of:' : 'Any of:'}</span>
        {variants.map((v, i) => <div key={i} className="ml-2"><SchemaView schema={v} spec={spec} depth={depth + 1} /></div>)}
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
            <code className="text-xs text-blue-400">{name}</code>
            {required.includes(name) && <span className="text-[10px] text-red-400">*</span>}
            <SchemaView schema={prop} spec={spec} depth={depth + 1} />
          </div>
        ))}
      </div>
    );
  }

  if (s.type === 'array' && s.items) {
    return (
      <div className="flex items-center gap-1">
        <span className="text-xs text-emerald-400">array</span>
        <span className="text-zinc-500 text-xs">of</span>
        <SchemaView schema={s.items} spec={spec} depth={depth + 1} />
      </div>
    );
  }

  // Primitive
  const typeColors: Record<string, string> = {
    string: 'text-emerald-400',
    integer: 'text-blue-400',
    number: 'text-blue-400',
    boolean: 'text-amber-400',
    null: 'text-zinc-500',
  };

  return (
    <span className="flex items-center gap-1 text-xs">
      <span className={`font-mono ${typeColors[s.type || 'string'] || 'text-zinc-400'}`}>
        {s.type || 'any'}{s.format && <span className="text-zinc-500">({s.format})</span>}
      </span>
      {s.nullable && <span className="text-zinc-500">| null</span>}
      {s.enum && <span className="text-zinc-500">[{s.enum.slice(0, 3).join(', ')}{s.enum.length > 3 ? '...' : ''}]</span>}
      {s.description && <span className="text-zinc-500 ml-1 truncate max-w-xs" title={s.description}>— {s.description}</span>}
    </span>
  );
}

interface EndpointCardProps {
  endpoint: ParsedEndpoint;
  spec: OpenAPISpec;
  isExpanded: boolean;
  onToggle: () => void;
}

function EndpointCard({ endpoint, spec, isExpanded, onToggle }: EndpointCardProps) {
  const { path, method, operation } = endpoint;
  const colors = METHOD_COLORS[method] || METHOD_COLORS.GET;
  const [activeTab, setActiveTab] = useState<'params' | 'body' | 'responses'>('params');

  const pathParams = (operation.parameters || []).filter((p: any) => p.in === 'path');
  const queryParams = (operation.parameters || []).filter((p: any) => p.in === 'query');
  const hasParams = pathParams.length > 0 || queryParams.length > 0;

  const requestBody = operation.requestBody;
  const hasBody = !!requestBody;

  const responses = operation.responses || {};
  const hasResponses = Object.keys(responses).length > 0;

  const formatPath = (p: string) => p.split(/(\{[^}]+\})/).map((seg, i) =>
    seg.startsWith('{') ? <span key={i} className="text-amber-400">{seg}</span> : seg
  );

  // Get request body schema
  const getBodySchema = () => {
    if (!requestBody) return null;
    const body = '$ref' in requestBody ? resolveRef(spec, requestBody.$ref) : requestBody;
    if (!body || !('content' in body)) return null;
    const content = body.content?.['application/json'] || Object.values(body.content || {})[0];
    return content?.schema;
  };

  // Get response schema
  const getResponseSchema = (response: any) => {
    const resolved = '$ref' in response ? resolveRef(spec, response.$ref) : response;
    if (!resolved || !('content' in resolved)) return null;
    const content = resolved.content?.['application/json'] || Object.values(resolved.content || {})[0];
    return content?.schema;
  };

  return (
    <div className="rounded-lg border overflow-hidden" style={{ background: 'var(--bg-secondary)', borderColor: isExpanded ? 'var(--border-secondary)' : 'var(--border-primary)' }}>
      <button onClick={onToggle} className="w-full px-4 py-3 flex items-center gap-4 text-left hover:bg-white/[0.02] transition-colors">
        <span className={`px-2.5 py-1 text-xs font-mono font-semibold rounded border ${colors.bg} ${colors.text} ${colors.border}`}>{method}</span>
        <code className="text-sm font-mono flex-1" style={{ color: 'var(--text-secondary)' }}>{formatPath(path)}</code>
        {operation.summary && <span className="text-sm hidden lg:block truncate max-w-sm" style={{ color: 'var(--text-muted)' }}>{operation.summary}</span>}
        <svg className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} style={{ color: 'var(--text-muted)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isExpanded && (
        <div className="border-t" style={{ borderColor: 'var(--border-primary)' }}>
          {/* Description */}
          {(operation.summary || operation.description) && (
            <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--border-primary)' }}>
              {operation.summary && <h4 className="font-medium mb-1" style={{ color: 'var(--text-primary)' }}>{operation.summary}</h4>}
              {operation.description && <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{operation.description}</p>}
            </div>
          )}

          {/* Tabs */}
          <div className="flex border-b" style={{ borderColor: 'var(--border-primary)' }}>
            {hasParams && (
              <button onClick={() => setActiveTab('params')}
                className={`px-4 py-2 text-sm font-medium ${activeTab === 'params' ? 'border-b-2 border-blue-500 text-blue-400' : ''}`}
                style={activeTab !== 'params' ? { color: 'var(--text-muted)' } : {}}>
                Parameters
              </button>
            )}
            {hasBody && (
              <button onClick={() => setActiveTab('body')}
                className={`px-4 py-2 text-sm font-medium ${activeTab === 'body' ? 'border-b-2 border-blue-500 text-blue-400' : ''}`}
                style={activeTab !== 'body' ? { color: 'var(--text-muted)' } : {}}>
                Request Body
              </button>
            )}
            {hasResponses && (
              <button onClick={() => setActiveTab('responses')}
                className={`px-4 py-2 text-sm font-medium ${activeTab === 'responses' ? 'border-b-2 border-blue-500 text-blue-400' : ''}`}
                style={activeTab !== 'responses' ? { color: 'var(--text-muted)' } : {}}>
                Responses
              </button>
            )}
          </div>

          {/* Tab Content */}
          <div className="p-4">
            {activeTab === 'params' && hasParams && (
              <div className="space-y-4">
                {pathParams.length > 0 && (
                  <div>
                    <h5 className="text-xs font-medium uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>Path Parameters</h5>
                    <div className="rounded-lg overflow-hidden" style={{ background: 'var(--bg-tertiary)' }}>
                      {pathParams.map((p: any) => (
                        <div key={p.name} className="px-3 py-2 border-b last:border-0 flex items-center gap-3" style={{ borderColor: 'var(--border-primary)' }}>
                          <code className="text-sm font-mono text-amber-400">{p.name}</code>
                          <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: 'var(--bg-elevated)', color: 'var(--text-muted)' }}>{p.schema?.type || 'string'}</span>
                          {p.required && <span className="text-xs text-red-400">required</span>}
                          {p.description && <span className="text-sm flex-1" style={{ color: 'var(--text-secondary)' }}>{p.description}</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {queryParams.length > 0 && (
                  <div>
                    <h5 className="text-xs font-medium uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>Query Parameters</h5>
                    <div className="rounded-lg overflow-hidden" style={{ background: 'var(--bg-tertiary)' }}>
                      {queryParams.map((p: any) => (
                        <div key={p.name} className="px-3 py-2 border-b last:border-0 flex items-center gap-3" style={{ borderColor: 'var(--border-primary)' }}>
                          <code className="text-sm font-mono text-blue-400">{p.name}</code>
                          <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: 'var(--bg-elevated)', color: 'var(--text-muted)' }}>{p.schema?.type || 'string'}</span>
                          {p.required && <span className="text-xs text-red-400">required</span>}
                          {p.description && <span className="text-sm flex-1" style={{ color: 'var(--text-secondary)' }}>{p.description}</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'body' && hasBody && (
              <div>
                <h5 className="text-xs font-medium uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>Request Body Schema</h5>
                <div className="rounded-lg p-3 overflow-x-auto" style={{ background: 'var(--bg-tertiary)' }}>
                  {getBodySchema() ? <SchemaView schema={getBodySchema()!} spec={spec} /> : <span className="text-zinc-500 text-sm">No schema</span>}
                </div>
              </div>
            )}

            {activeTab === 'responses' && hasResponses && (
              <div className="space-y-4">
                {Object.entries(responses).map(([code, response]) => {
                  const isSuccess = code.startsWith('2');
                  const isError = code.startsWith('4') || code.startsWith('5');
                  const schema = getResponseSchema(response);
                  const desc = ('$ref' in response ? resolveRef(spec, response.$ref) : response)?.description;

                  return (
                    <div key={code} className="rounded-lg overflow-hidden" style={{ background: 'var(--bg-tertiary)' }}>
                      <div className="px-3 py-2 flex items-center gap-3 border-b" style={{ borderColor: 'var(--border-primary)' }}>
                        <span className={`px-2 py-0.5 rounded text-xs font-mono font-semibold ${isSuccess ? 'bg-emerald-500/20 text-emerald-400' : isError ? 'bg-red-500/20 text-red-400' : 'bg-zinc-500/20 text-zinc-400'}`}>
                          {code}
                        </span>
                        {desc && <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{desc}</span>}
                      </div>
                      {schema && (
                        <div className="px-3 py-2 overflow-x-auto">
                          <SchemaView schema={schema} spec={spec} />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {!hasParams && activeTab === 'params' && (
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No parameters required.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
