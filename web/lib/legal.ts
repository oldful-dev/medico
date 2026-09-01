// Legal docs: slug <-> DB `type` are pure transforms — no hardcoded list.
//   STATUTORY_DISCLOSURES  <->  statutory-disclosures
export const typeToSlug = (type: string) => type.toLowerCase().replace(/_/g, '-');
export const slugToType = (slug: string) => slug.toUpperCase().replace(/-/g, '_');

export const LEGAL_API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.BACKEND_URL ||
  'https://api.ayuxacare.com/api';

export type LegalDoc = {
  id: string;
  type: string;
  title: string;
  content: string;
  publishedAt?: string;
};

export async function fetchPublishedList(): Promise<LegalDoc[]> {
  const res = await fetch(`${LEGAL_API_URL}/legal/published`);
  if (!res.ok) return [];
  const json = await res.json();
  return json.data ?? [];
}
