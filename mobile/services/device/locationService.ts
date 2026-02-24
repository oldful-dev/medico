// Location Service - GPS location fetching for SOS and address
// PRD: SOS shares GPS location with admins and emergency contacts

export interface LocationCoordinates {
  latitude: number;
  longitude: number;
  accuracy?: number;
}

export const locationService = {
  getCurrentLocation: async (): Promise<LocationCoordinates> => {
    // TODO: Use expo-location to get current GPS coordinates
    throw new Error('Not implemented');
  },

  requestPermission: async (): Promise<boolean> => {
    // TODO: Request location permission
    throw new Error('Not implemented');
  },

  watchLocation: (callback: (location: LocationCoordinates) => void): (() => void) => {
    // TODO: Watch location changes, return unsubscribe function
    return () => {};
  },

  getAddressFromCoordinates: async (coords: LocationCoordinates): Promise<string> => {
    // TODO: Reverse geocode coordinates to address
    throw new Error('Not implemented');
  },
};
