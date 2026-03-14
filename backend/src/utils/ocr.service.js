// ──────────────────────────────────────────────
//  Google Cloud Vision OCR Service
// ──────────────────────────────────────────────

const vision = require('@google-cloud/vision');
const { logger } = require('../config/logger');

const client = new vision.ImageAnnotatorClient({
    keyFilename: process.env.FIREBASE_SERVICE_ACCOUNT_PATH,
});

/**
 * Analyze Medical Report using OCR
 * @param {string} imageUrl 
 * @param {Buffer} imageBuffer 
 */
const analyzeMedicalReport = async (imageUrl, imageBuffer) => {
    try {
        // Perform text detection
        const [result] = await client.textDetection(imageBuffer);
        const detections = result.textAnnotations;
        const fullText = detections.length > 0 ? detections[0].description : '';

        logger.info('OCR Analysis completed for report');

        // Simple Keyword Analysis (Business logic from Oldful PRD)
        const healthTags = [];
        let flagSeverity = 'LOW';
        let flagNote = 'Analysis completed.';

        const lowerText = fullText.toLowerCase();

        if (lowerText.includes('diabetes') || lowerText.includes('hba1c') || lowerText.includes('glucose')) {
            healthTags.push('DIABETIC');
        }
        if (lowerText.includes('hypertension') || lowerText.includes('bp high') || lowerText.includes('systolic')) {
            healthTags.push('HYPERTENSION');
        }

        // Check for critical flags
        if (lowerText.includes('critical') || lowerText.includes('abnormal') || lowerText.includes('danger')) {
            flagSeverity = 'HIGH';
            flagNote = 'CRITICAL VALUES DETECTED in medical report. Please consult a doctor immediately.';
        }

        return {
            fullText,
            healthTags,
            flagSeverity,
            flagNote,
        };
    } catch (error) {
        logger.error('OCR Analysis Error:', error);
        return {
            fullText: '',
            healthTags: [],
            flagSeverity: 'LOW',
            flagNote: 'OCR analysis failed. Manual review recommended.',
        };
    }
};

module.exports = {
    analyzeMedicalReport,
};
