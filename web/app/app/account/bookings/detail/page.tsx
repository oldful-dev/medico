import { Suspense } from 'react';
import BookingDetailClient from './BookingDetailClient';
import { BookingDetailsSkeleton } from '@/components/booking/BookingDetailsSkeleton';

export default function BookingDetailPage() {
  return (
    <Suspense fallback={<BookingDetailsSkeleton />}>
      <BookingDetailClient />
    </Suspense>
  );
}
