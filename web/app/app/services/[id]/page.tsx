import { SERVICES_CONFIG } from '@/lib/services-config';
import ServiceDetailClient from './ServiceDetailClient';

export function generateStaticParams() {
  return Object.keys(SERVICES_CONFIG).map((id) => ({ id }));
}

export default function ServiceDetailPage() {
  return <ServiceDetailClient />;
}
