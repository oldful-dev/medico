const express = require('express');
const googleMapsService = require('../services/googleMaps.service');
const { logger } = require('../config/logger');

const router = express.Router();

/**
 * POST /api/location/place-autocomplete
 * Swiggy-style place autocomplete
 */
router.post('/place-autocomplete', async (req, res, next) => {
    try {
        const { input } = req.body;
        const userId = req.user?.id || 'anonymous'; // From auth middleware

        if (!input || typeof input !== 'string') {
            return res.status(400).json({
                statusCode: 1,
                data: [],
                message: 'Invalid input parameter',
            });
        }

        const result = await googleMapsService.placeAutocomplete(input, userId);
        res.json(result);
    } catch (error) {
        logger.error(`[Location] place-autocomplete error: ${error.message}`);
        res.status(500).json({
            statusCode: 2,
            data: [],
            message: 'Internal server error',
        });
    }
});

/**
 * POST /api/location/place-details
 * Get full place details including coordinates
 */
router.post('/place-details', async (req, res, next) => {
    try {
        const { placeId } = req.body;
        const userId = req.user?.id || 'anonymous';

        if (!placeId) {
            return res.status(400).json({
                statusCode: 1,
                data: null,
                message: 'placeId is required',
            });
        }

        const result = await googleMapsService.getPlaceDetails(placeId, userId);
        res.json(result);
    } catch (error) {
        logger.error(`[Location] place-details error: ${error.message}`);
        res.status(500).json({
            statusCode: 2,
            data: null,
            message: 'Internal server error',
        });
    }
});

/**
 * POST /api/location/reverse-geocode
 * Get address from coordinates
 */
router.post('/reverse-geocode', async (req, res, next) => {
    try {
        const { latitude, longitude } = req.body;

        if (latitude === undefined || longitude === undefined) {
            return res.status(400).json({
                statusCode: 1,
                data: null,
                message: 'latitude and longitude are required',
            });
        }

        const result = await googleMapsService.reverseGeocode(latitude, longitude);
        res.json(result);
    } catch (error) {
        logger.error(`[Location] reverse-geocode error: ${error.message}`);
        res.status(500).json({
            statusCode: 2,
            data: null,
            message: 'Internal server error',
        });
    }
});

/**
 * POST /api/location/geocode
 * Get coordinates from address text
 */
router.post('/geocode', async (req, res, next) => {
    try {
        const { address } = req.body;

        if (!address) {
            return res.status(400).json({
                statusCode: 1,
                data: null,
                message: 'address is required',
            });
        }

        const result = await googleMapsService.geocode(address);
        res.json(result);
    } catch (error) {
        logger.error(`[Location] geocode error: ${error.message}`);
        res.status(500).json({
            statusCode: 2,
            data: null,
            message: 'Internal server error',
        });
    }
});

module.exports = router;
