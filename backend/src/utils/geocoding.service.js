// ──────────────────────────────────────────────
//  Google Maps Geocoding Service
//  Reverse geocode + coordinate lookup via Google Maps API
// ──────────────────────────────────────────────

const { logger } = require('../config/logger');

const MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;
const GEOCODE_BASE = 'https://maps.googleapis.com/maps/api/geocode/json';

/**
 * Reverse geocode coordinates to a formatted address
 */
const reverseGeocode = async (latitude, longitude) => {
    if (!MAPS_API_KEY) {
        logger.warn('GOOGLE_MAPS_API_KEY not set — geocoding unavailable');
        return null;
    }

    try {
        const url = `${GEOCODE_BASE}?latlng=${latitude},${longitude}&key=${MAPS_API_KEY}`;
        const response = await fetch(url);
        const data = await response.json();

        if (data.status === 'OK' && data.results.length > 0) {
            return {
                formattedAddress: data.results[0].formatted_address,
                placeId: data.results[0].place_id,
                components: data.results[0].address_components,
            };
        }

        logger.warn(`Geocoding returned status: ${data.status}`);
        return null;
    } catch (error) {
        logger.error('Reverse geocode error:', error.message);
        return null;
    }
};

/**
 * Geocode an address string to coordinates
 */
const geocodeAddress = async (address) => {
    if (!MAPS_API_KEY) {
        logger.warn('GOOGLE_MAPS_API_KEY not set — geocoding unavailable');
        return null;
    }

    try {
        const url = `${GEOCODE_BASE}?address=${encodeURIComponent(address)}&key=${MAPS_API_KEY}`;
        const response = await fetch(url);
        const data = await response.json();

        if (data.status === 'OK' && data.results.length > 0) {
            const { lat, lng } = data.results[0].geometry.location;
            return {
                latitude: lat,
                longitude: lng,
                formattedAddress: data.results[0].formatted_address,
                placeId: data.results[0].place_id,
            };
        }

        return null;
    } catch (error) {
        logger.error('Geocode address error:', error.message);
        return null;
    }
};

module.exports = { reverseGeocode, geocodeAddress };
