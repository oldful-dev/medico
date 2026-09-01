import type { Metadata } from 'next';
import { fetchPublishedList, typeToSlug, slugToType } from '@/lib/legal';
import LegalDocClient from './LegalDocClient';

// Static export: emit one page per published legal doc. New docs appear on next build.
export async function generateStaticParams() {
  const docs = await fetchPublishedList();
  return docs.map((d) => ({ legalSlug: typeToSlug(d.type) }));
}

export const dynamicParams = false;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ legalSlug: string }>;
}): Promise<Metadata> {
  const { legalSlug } = await params;
  const docs = await fetchPublishedList();
  const doc = docs.find((d) => d.type === slugToType(legalSlug));
  return { title: doc ? `${doc.title} | Ayuxa` : 'Ayuxa' };
}

export default async function LegalDocPage({
  params,
}: {
  params: Promise<{ legalSlug: string }>;
}) {
  const { legalSlug } = await params;
  return <LegalDocClient slug={legalSlug} />;
}
