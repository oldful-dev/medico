// ──────────────────────────────────────────────
//  OCR Service (Medical Reports)
// ──────────────────────────────────────────────

const { logger } = require('../config/logger');

/**
 * Placeholder for Google Cloud Vision OCR Integration
 * 
 * In a production environment, this would initialize the
 * @google-cloud/vision SDK and process the uploaded image/PDF
 * to extract text.
 * 
 * For now, this service simulates the OCR process by looking
 * at the file name or returning a mocked "High Sugar" positive
 * for testing purposes.
 */

const analyzeMedicalReport = async (fileUrl, fileBuffer) => {
    logger.info(`Starting OCR Analysis for file: ${fileUrl}`);

    try {
        // --- SIMULATED OCR LOGIC ---
        // In reality, we'd send the buffer to Google Cloud Vision API
        // const [result] = await client.documentTextDetection(fileBuffer);
        // const fullText = result.fullTextAnnotation.text;

        // Mocked extracted text processing
        const simulatedText = "Patient shows elevated Glucose levels (HbA1c 7.5%) indicating possible Diabetes.";

        const reportData = {
            rawText: simulatedText,
            flagSeverity: null,
            flagNote: null,
            healthTags: []
        };

        const lowerText = simulatedText.toLowerCase();

        // Keyword checking for critical health tags
        if (lowerText.includes('glucose') || lowerText.includes('sugar') || lowerText.includes('hba1c')) {
            if (lowerText.includes('high') || lowerText.includes('elevated') || lowerText.includes('7.')) {
                reportData.flagSeverity = 'High';
                reportData.flagNote = 'Elevated blood sugar levels detected';
                reportData.healthTags.push('DIABETIC');
            }
        }

        if (lowerText.includes('pressure') && (lowerText.includes('high') || lowerText.includes('elevated'))) {
            reportData.flagSeverity = 'High';
            reportData.flagNote = 'Elevated blood pressure detected';
            reportData.healthTags.push('HYPERTENSION');
        }

        logger.info(`OCR Analysis Complete. Tags found: ${reportData.healthTags.join(', ')}`);
        return reportData;

    } catch (error) {
        logger.error('OCR Analysis failed:', error);
        return {
            rawText: '',
            flagSeverity: null,
            flagNote: null,
            healthTags: []
        };
    }
};

module.exports = { analyzeMedicalReport };
