import { fetchOpenAPISpec, parseEndpoints, groupByCategory } from '@/lib/openapi';
import DocsPage from '@/components/DocsPage';

export default async function Home() {
  try {
    const spec = await fetchOpenAPISpec();
    const endpoints = parseEndpoints(spec);
    const categories = groupByCategory(endpoints);

    return <DocsPage categories={categories} spec={spec} />;
  } catch (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8" style={{ background: 'var(--bg-primary)' }}>
        <div className="max-w-md w-full rounded-xl p-8 text-center" style={{
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-primary)'
        }}>
          <div className="w-14 h-14 rounded-full mx-auto mb-5 flex items-center justify-center" style={{ background: 'rgba(239, 68, 68, 0.1)' }}>
            <svg className="w-7 h-7 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h1 className="text-xl font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
            Failed to Load
          </h1>
          <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>
            Unable to fetch the Discord OpenAPI specification.
          </p>
          <p className="text-xs font-mono p-3 rounded-lg" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-muted)' }}>
            {error instanceof Error ? error.message : 'Unknown error'}
          </p>
        </div>
      </div>
    );
  }
}
