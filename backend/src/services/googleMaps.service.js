const axios = require('axios');
const { logger } = require('../config/logger');

const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;
const PLACES_API_BASE = 'https://maps.googleapis.com/maps/api/place';

if (!GOOGLE_MAPS_API_KEY) {
    logger.warn('GOOGLE_MAPS_API_KEY not configured. Location services will fail.');
}

// Session tokens for Places API (improves billing and autocomplete ML)
const sessionTokens = new Map();

const getOrCreateSessionToken = (userId) => {
    if (!sessionTokens.has(userId)) {
        sessionTokens.set(userId, {
            token: `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            createdAt: Date.now(),
        });
    }
    return sessionTokens.get(userId).token;
};

/**
 * Places Autocomplete - Swiggy-style endpoint
 * Fetches predictions as user types
 */
exports.placeAutocomplete = async (input, userId, options = {}) => {
    try {
        if (!input || input.length < 1) {
            return { statusCode: 0, data: [] };
        }

        const sessionToken = getOrCreateSessionToken(userId);

        const params = {
            input,
            key: GOOGLE_MAPS_API_KEY,
            sessionToken,
            components: 'country:in', // India only
            language: 'en',
            // Minimize fields for lower cost
            fields: 'place_id,description,types,matched_substrings,terms,structured_formatting',
        };

        const response = await axios.get(`${PLACES_API_BASE}/autocomplete/json`, {
            params,
            timeout: 5000,
        });

        if (response.data.status !== 'OK' && response.data.status !== 'ZERO_RESULTS') {
            logger.error(`Places Autocomplete error: ${response.data.status}`);
            return { statusCode: 1, data: [], message: response.data.error_message || 'Failed to fetch locations' };
        }

        // Transform Google response to Swiggy-like format
        const predictions = (response.data.predictions || []).map(pred => ({
            description: pred.description,
            place_id: pred.place_id,
            types: pred.types || [],
            matched_substrings: pred.matched_substrings || [],
            terms: pred.terms || [],
            structured_formatting: {
                main_text: pred.structured_formatting?.main_text || '',
                secondary_text: pred.structured_formatting?.secondary_text || '',
            },
        }));

        return {
            statusCode: 0,
            data: predictions,
        };
    } catch (error) {
        logger.error(`[GoogleMaps] placeAutocomplete error: ${error.message}`);
        return {
            statusCode: 2,
            data: [],
            message: 'Unable to fetch locations. Please try again.',
        };
    }
};

/**
 * Get Place Details - Get coordinates and full info
 * Called after user selects a suggestion
 */
exports.getPlaceDetails = async (placeId, userId, options = {}) => {
    try {
        const sessionToken = getOrCreateSessionToken(userId);

        const params = {
            place_id: placeId,
            key: GOOGLE_MAPS_API_KEY,
            sessionToken,
            fields: 'geometry,formatted_address,address_components,name,types',
            language: 'en',
        };

        const response = await axios.get(`${PLACES_API_BASE}/details/json`, {
            params,
            timeout: 5000,
        });

        if (response.data.status !== 'OK') {
            logger.error(`Place Details error: ${response.data.status}`);
            return { statusCode: 1, data: null, message: response.data.error_message };
        }

        const result = response.data.result;
        return {
            statusCode: 0,
            data: {
                placeId,
                name: result.name || '',
                formatted_address: result.formatted_address || '',
                latitude: result.geometry?.location?.lat || 0,
                longitude: result.geometry?.location?.lng || 0,
                address_components: result.address_components || [],
                types: result.types || [],
            },
        };
    } catch (error) {
        logger.error(`[GoogleMaps] getPlaceDetails error: ${error.message}`);
        return {
            statusCode: 2,
            data: null,
            message: 'Unable to fetch place details.',
        };
    }
};

/**
 * Reverse Geocoding - Get address from coordinates
 * Called when user drags marker on map
 */
exports.reverseGeocode = async (latitude, longitude, options = {}) => {
    try {
        const params = {
            latlng: `${latitude},${longitude}`,
            key: GOOGLE_MAPS_API_KEY,
            language: 'en',
            result_type: 'street_address|locality|administrative_area_level_2',
        };

        const response = await axios.get(
            'https://maps.googleapis.com/maps/api/geocode/json',
            { params, timeout: 5000 }
        );

        if (response.data.status !== 'OK') {
            logger.error(`Reverse Geocode error: ${response.data.status}`);
            return { statusCode: 1, data: null, message: response.data.error_message };
        }

        const results = response.data.results || [];
        if (results.length === 0) {
            return { statusCode: 1, data: null, message: 'No address found' };
        }

        const bestResult = results[0];
        return {
            statusCode: 0,
            data: {
                formatted_address: bestResult.formatted_address || '',
                address_components: bestResult.address_components || [],
                latitude,
                longitude,
            },
        };
    } catch (error) {
        logger.error(`[GoogleMaps] reverseGeocode error: ${error.message}`);
        return {
            statusCode: 2,
            data: null,
            message: 'Unable to reverse geocode location.',
        };
    }
};

/**
 * Geocode - Get coordinates from address text
 */
exports.geocode = async (address, options = {}) => {
    try {
        const params = {
            address,
            key: GOOGLE_MAPS_API_KEY,
            components: 'country:in',
            language: 'en',
        };

        const response = await axios.get(
            'https://maps.googleapis.com/maps/api/geocode/json',
            { params, timeout: 5000 }
        );

        if (response.data.status !== 'OK') {
            logger.error(`Geocode error: ${response.data.status}`);
            return { statusCode: 1, data: null };
        }

        const results = response.data.results || [];
        if (results.length === 0) {
            return { statusCode: 1, data: null, message: 'No results found' };
        }

        const result = results[0];
        return {
            statusCode: 0,
            data: {
                formatted_address: result.formatted_address || '',
                latitude: result.geometry?.location?.lat || 0,
                longitude: result.geometry?.location?.lng || 0,
                address_components: result.address_components || [],
            },
        };
    } catch (error) {
        logger.error(`[GoogleMaps] geocode error: ${error.message}`);
        return { statusCode: 2, data: null };
    }
};

/**
 * Clear session token (call after booking completed)
 */
exports.clearSessionToken = (userId) => {
    sessionTokens.delete(userId);
};
