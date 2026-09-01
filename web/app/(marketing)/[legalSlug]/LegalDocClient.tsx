'use client';

import { useEffect, useState } from 'react';
import { notFound } from 'next/navigation';
import { LEGAL_API_URL, slugToType, type LegalDoc } from '@/lib/legal';

type State = { status: 'loading' } | { status: 'ok'; doc: LegalDoc } | { status: 'missing' };

export default function LegalDocClient({ slug }: { slug: string }) {
  const [state, setState] = useState<State>({ status: 'loading' });

  useEffect(() => {
    let alive = true;
    fetch(`${LEGAL_API_URL}/legal/published/${slugToType(slug)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (!alive) return;
        const doc = j?.data as LegalDoc | undefined;
        setState(doc?.content ? { status: 'ok', doc } : { status: 'missing' });
      })
      .catch(() => alive && setState({ status: 'missing' }));
    return () => {
      alive = false;
    };
  }, [slug]);

  if (state.status === 'missing') notFound();

  return (
    <div className="bg-[#FFFCF6] min-h-screen pb-12 px-6 md:px-12 lg:px-24 pt-8">
      <div className="max-w-4xl mx-auto">
        {state.status === 'loading' ? (
          <div className="animate-pulse space-y-4 py-12">
            <div className="h-10 w-2/3 bg-gray-200 rounded" />
            <div className="h-4 w-1/3 bg-gray-200 rounded" />
            <div className="h-64 bg-gray-100 rounded mt-8" />
          </div>
        ) : (
          <>
            {state.doc.publishedAt && (
              <p className="text-sm text-gray-500 mb-6">
                Last Updated:{' '}
                {new Date(state.doc.publishedAt).toLocaleDateString('en-IN', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                })}
              </p>
            )}
            {/* Content owns its markup + <style>; render verbatim from DB. */}
            <div dangerouslySetInnerHTML={{ __html: state.doc.content }} />
          </>
        )}
      </div>
    </div>
  );
}
