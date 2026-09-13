import { useEffect, useState } from 'react';
import { bannerService, Banner } from '@/services/api/bannerService';

/**
 * Fetches banners for a given placement string (Banner.category set in
 * admin). Renders nothing via BannerSlider if empty, so dropping this into
 * any screen is safe even before an admin has added banners for it.
 */
export function usePlacementBanners(placement: string): Banner[] {
  const [banners, setBanners] = useState<Banner[]>([]);
  useEffect(() => {
    let alive = true;
    bannerService.getBannersByPlacement(placement).then(b => { if (alive) setBanners(b); });
    return () => { alive = false; };
  }, [placement]);
  return banners;
}
