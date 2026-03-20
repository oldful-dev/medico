// ══════════════════════════════════════════════════════════════
//  Google Cloud Vision OCR Service
//
//  Pipeline:
//    1. Accept image/PDF from GCS URI or buffer
//    2. Run Google Vision OCR (textDetection / documentTextDetection)
//    3. Extract full text
//    4. Parse structured medical values via regex
//    5. Generate flags based on clinical thresholds
//    6. Detect health categories (tags)
//    7. Return structured result for DB storage
//
//  Supported values:
//    glucose, hba1c, hemoglobin, bp (systolic/diastolic),
//    cholesterol (total, LDL, HDL, triglycerides),
//    creatinine, urea/BUN, TSH, WBC, platelet, RBC, ESR
// ══════════════════════════════════════════════════════════════

const vision = require('@google-cloud/vision');
const { logger } = require('../config/logger');

const client = new vision.ImageAnnotatorClient({
    keyFilename: process.env.FIREBASE_SERVICE_ACCOUNT_PATH,
});

// ══════════════════════════════════════════════════════════════
//  MEDICAL VALUE PATTERNS
//  Each pattern captures: value (group 1), optional unit (group 2)
//  BP pattern captures: systolic (group 1), diastolic (group 2)
// ══════════════════════════════════════════════════════════════

const MEDICAL_PATTERNS = {
    // Blood Sugar
    glucose_fasting:     /(?:fasting\s*(?:blood\s*)?(?:glucose|sugar)|fbg|fbs)\s*[:=\-]?\s*([\d.]+)\s*(mg\/dl|mmol\/l)?/gi,
    glucose_pp:          /(?:post\s*(?:prandial|meal)|pp\s*(?:glucose|sugar)|ppbs)\s*[:=\-]?\s*([\d.]+)\s*(mg\/dl|mmol\/l)?/gi,
    glucose_random:      /(?:random\s*(?:blood\s*)?(?:glucose|sugar)|rbs|blood\s*sugar)\s*[:=\-]?\s*([\d.]+)\s*(mg\/dl|mmol\/l)?/gi,
    hba1c:               /(?:hba1c|a1c|glycated\s*h[ae]moglobin|glycosylated)\s*[:=\-]?\s*([\d.]+)\s*%?/gi,

    // Blood Pressure (captures systolic/diastolic pair)
    bp:                  /(?:blood\s*pressure|bp)\s*[:=\-]?\s*(\d{2,3})\s*[/]\s*(\d{2,3})\s*(mmhg)?/gi,
    bp_systolic_only:    /(?:systolic)\s*[:=\-]?\s*(\d{2,3})\s*(mmhg)?/gi,
    bp_diastolic_only:   /(?:diastolic)\s*[:=\-]?\s*(\d{2,3})\s*(mmhg)?/gi,

    // Lipid Profile
    cholesterol_total:   /(?:total\s*cholesterol|serum\s*cholesterol|cholesterol)\s*[:=\-]?\s*([\d.]+)\s*(mg\/dl)?/gi,
    ldl:                 /(?:ldl|low\s*density)\s*[:=\-]?\s*([\d.]+)\s*(mg\/dl)?/gi,
    hdl:                 /(?:hdl|high\s*density)\s*[:=\-]?\s*([\d.]+)\s*(mg\/dl)?/gi,
    triglycerides:       /(?:triglyceride|tg|trigl)\s*[:=\-]?\s*([\d.]+)\s*(mg\/dl)?/gi,

    // Kidney
    creatinine:          /(?:creatinine|creat|s\.creat)\s*[:=\-]?\s*([\d.]+)\s*(mg\/dl)?/gi,
    urea:                /(?:blood\s*urea|urea|bun)\s*[:=\-]?\s*([\d.]+)\s*(mg\/dl)?/gi,

    // CBC
    hemoglobin:          /(?:h[ae]moglobin|hb|hgb)\s*[:=\-]?\s*([\d.]+)\s*(g\/dl|gm\/dl|g%)?/gi,
    wbc:                 /(?:wbc|white\s*blood\s*cell|leucocyte|total\s*wbc)\s*[:=\-]?\s*([\d.]+)\s*(\/cumm|cells\/cumm|thou)?/gi,
    rbc:                 /(?:rbc|red\s*blood\s*cell|erythrocyte)\s*[:=\-]?\s*([\d.]+)\s*(mill\/cumm|million)?/gi,
    platelet:            /(?:platelet|plt)\s*[:=\-]?\s*([\d.]+)\s*(lakh|\/cumm|thou)?/gi,
    esr:                 /(?:esr|sedimentation\s*rate)\s*[:=\-]?\s*([\d.]+)\s*(mm\/hr|mm)?/gi,

    // Thyroid
    tsh:                 /(?:tsh|thyroid\s*stimulating)\s*[:=\-]?\s*([\d.]+)\s*(miu\/l|uiu\/ml|miu\/ml)?/gi,

    // Liver
    sgpt:                /(?:sgpt|alt|alanine)\s*[:=\-]?\s*([\d.]+)\s*(u\/l|iu\/l)?/gi,
    sgot:                /(?:sgot|ast|aspartate)\s*[:=\-]?\s*([\d.]+)\s*(u\/l|iu\/l)?/gi,
    bilirubin:           /(?:total\s*bilirubin|bilirubin|tbil)\s*[:=\-]?\s*([\d.]+)\s*(mg\/dl)?/gi,
};

// ══════════════════════════════════════════════════════════════
//  CLINICAL THRESHOLDS — generates flags when values exceed
//  Reference: standard Indian lab ranges (adult)
// ══════════════════════════════════════════════════════════════

const THRESHOLDS = {
    glucose_fasting:   { high: 126, low: 70,   unit: 'mg/dL', flag_high: 'high_sugar',       flag_low: 'low_sugar' },
    glucose_pp:        { high: 200, low: null,  unit: 'mg/dL', flag_high: 'high_sugar_pp' },
    glucose_random:    { high: 200, low: 70,    unit: 'mg/dL', flag_high: 'high_sugar',       flag_low: 'low_sugar' },
    hba1c:             { high: 6.5, low: null,  unit: '%',     flag_high: 'high_hba1c' },
    cholesterol_total: { high: 200, low: null,  unit: 'mg/dL', flag_high: 'high_cholesterol' },
    ldl:               { high: 130, low: null,  unit: 'mg/dL', flag_high: 'high_ldl' },
    hdl:               { high: null, low: 40,   unit: 'mg/dL', flag_low: 'low_hdl' },
    triglycerides:     { high: 150, low: null,  unit: 'mg/dL', flag_high: 'high_triglycerides' },
    creatinine:        { high: 1.4, low: null,  unit: 'mg/dL', flag_high: 'high_creatinine' },
    urea:              { high: 45,  low: null,  unit: 'mg/dL', flag_high: 'high_urea' },
    hemoglobin:        { high: 17,  low: 11,    unit: 'g/dL',  flag_high: 'high_hemoglobin',  flag_low: 'low_hemoglobin' },
    wbc:               { high: 11000, low: 4000, unit: '/cumm', flag_high: 'high_wbc',        flag_low: 'low_wbc' },
    platelet:          { high: 450000, low: 150000, unit: '/cumm', flag_high: 'high_platelet', flag_low: 'low_platelet' },
    tsh:               { high: 5.5, low: 0.4,  unit: 'mIU/L', flag_high: 'high_tsh',         flag_low: 'low_tsh' },
    sgpt:              { high: 45,  low: null,  unit: 'U/L',   flag_high: 'high_sgpt' },
    sgot:              { high: 40,  low: null,  unit: 'U/L',   flag_high: 'high_sgot' },
    bilirubin:         { high: 1.2, low: null,  unit: 'mg/dL', flag_high: 'high_bilirubin' },
};

// BP has its own thresholds (systolic/diastolic)
const BP_THRESHOLDS = {
    systolic:  { high: 140, low: 90 },
    diastolic: { high: 90,  low: 60 },
};

// ══════════════════════════════════════════════════════════════
//  HEALTH TAG KEYWORDS
// ══════════════════════════════════════════════════════════════

const HEALTH_KEYWORDS = {
    DIABETIC:      ['diabetes', 'hba1c', 'glucose', 'insulin', 'diabetic', 'sugar'],
    HYPERTENSION:  ['hypertension', 'bp high', 'systolic', 'diastolic', 'blood pressure'],
    THYROID:       ['thyroid', 'tsh', 't3', 't4', 'hypothyroid', 'hyperthyroid'],
    RENAL:         ['creatinine', 'kidney', 'renal', 'urea', 'bun', 'gfr', 'egfr'],
    LIVER:         ['liver', 'sgpt', 'sgot', 'bilirubin', 'alt', 'ast', 'alkaline phosphatase'],
    CARDIAC:       ['cardiac', 'troponin', 'ecg', 'cholesterol', 'ldl', 'hdl', 'triglyceride'],
    ANEMIA:        ['anemia', 'hemoglobin low', 'iron deficiency', 'ferritin'],
};

// ══════════════════════════════════════════════════════════════
//  EXTRACTION + FLAGGING
// ══════════════════════════════════════════════════════════════

/**
 * Extract structured medical values from OCR text.
 * Returns: { glucose_fasting: { value, unit, raw }, bp: { systolic, diastolic, raw }, ... }
 */
const extractMedicalValues = (fullText) => {
    const values = {};

    for (const [key, regex] of Object.entries(MEDICAL_PATTERNS)) {
        const matches = [...fullText.matchAll(new RegExp(regex.source, regex.flags))];
        if (matches.length === 0) continue;

        const match = matches[0];

        // BP is special — captures two values (systolic/diastolic)
        if (key === 'bp') {
            values.bp = {
                systolic: parseInt(match[1]),
                diastolic: parseInt(match[2]),
                unit: 'mmHg',
                raw: match[0].trim(),
            };
        } else if (key === 'bp_systolic_only' && !values.bp) {
            values.bp = values.bp || {};
            values.bp.systolic = parseInt(match[1]);
            values.bp.unit = 'mmHg';
        } else if (key === 'bp_diastolic_only' && !values.bp?.diastolic) {
            values.bp = values.bp || {};
            values.bp.diastolic = parseInt(match[1]);
            values.bp.unit = 'mmHg';
        } else {
            values[key] = {
                value: parseFloat(match[1]),
                unit: (match[2] || '').trim() || THRESHOLDS[key]?.unit || null,
                raw: match[0].trim(),
            };
        }
    }

    return values;
};

/**
 * Generate clinical flags from parsed values.
 * Returns: [{ type, message, severity, value, threshold }]
 */
const generateFlags = (parsedValues) => {
    const flags = [];

    // Check standard thresholds
    for (const [key, threshold] of Object.entries(THRESHOLDS)) {
        const entry = parsedValues[key];
        if (!entry || entry.value === undefined) continue;

        const val = entry.value;

        if (threshold.high !== null && val > threshold.high) {
            flags.push({
                type: threshold.flag_high,
                severity: val > threshold.high * 1.5 ? 'CRITICAL' : 'HIGH',
                message: `${key.replace(/_/g, ' ')} is elevated: ${val} ${entry.unit || threshold.unit} (normal < ${threshold.high})`,
                value: val,
                threshold: threshold.high,
            });
        }
        if (threshold.low !== null && threshold.flag_low && val < threshold.low) {
            flags.push({
                type: threshold.flag_low,
                severity: val < threshold.low * 0.7 ? 'CRITICAL' : 'HIGH',
                message: `${key.replace(/_/g, ' ')} is low: ${val} ${entry.unit || threshold.unit} (normal > ${threshold.low})`,
                value: val,
                threshold: threshold.low,
            });
        }
    }

    // Check BP
    const bp = parsedValues.bp;
    if (bp?.systolic) {
        if (bp.systolic >= BP_THRESHOLDS.systolic.high) {
            flags.push({
                type: 'high_bp',
                severity: bp.systolic >= 180 ? 'CRITICAL' : 'HIGH',
                message: `Systolic BP elevated: ${bp.systolic} mmHg (normal < ${BP_THRESHOLDS.systolic.high})`,
                value: bp.systolic,
                threshold: BP_THRESHOLDS.systolic.high,
            });
        }
        if (bp.systolic < BP_THRESHOLDS.systolic.low) {
            flags.push({
                type: 'low_bp',
                severity: bp.systolic < 80 ? 'CRITICAL' : 'HIGH',
                message: `Systolic BP low: ${bp.systolic} mmHg (normal > ${BP_THRESHOLDS.systolic.low})`,
                value: bp.systolic,
                threshold: BP_THRESHOLDS.systolic.low,
            });
        }
    }
    if (bp?.diastolic) {
        if (bp.diastolic >= BP_THRESHOLDS.diastolic.high) {
            flags.push({
                type: 'high_bp',
                severity: bp.diastolic >= 120 ? 'CRITICAL' : 'HIGH',
                message: `Diastolic BP elevated: ${bp.diastolic} mmHg (normal < ${BP_THRESHOLDS.diastolic.high})`,
                value: bp.diastolic,
                threshold: BP_THRESHOLDS.diastolic.high,
            });
        }
    }

    return flags;
};

/**
 * Detect health tags from OCR text.
 */
const detectHealthTags = (fullText) => {
    const lower = fullText.toLowerCase();
    const tags = [];
    for (const [tag, keywords] of Object.entries(HEALTH_KEYWORDS)) {
        if (keywords.some(kw => lower.includes(kw))) {
            tags.push(tag);
        }
    }
    return [...new Set(tags)]; // deduplicate
};

/**
 * Determine overall severity from flags.
 */
const determineSeverity = (flags) => {
    if (flags.some(f => f.severity === 'CRITICAL')) {
        return {
            flagSeverity: 'CRITICAL',
            flagNote: `${flags.filter(f => f.severity === 'CRITICAL').length} CRITICAL value(s) detected. Consult a doctor immediately.`,
        };
    }
    if (flags.some(f => f.severity === 'HIGH')) {
        return {
            flagSeverity: 'HIGH',
            flagNote: `${flags.filter(f => f.severity === 'HIGH').length} elevated value(s) detected. Medical review recommended.`,
        };
    }
    if (flags.length > 0) {
        return {
            flagSeverity: 'NORMAL',
            flagNote: 'Minor deviations detected. Values mostly within range.',
        };
    }
    return {
        flagSeverity: 'NORMAL',
        flagNote: 'All detected values are within normal range.',
    };
};

// ══════════════════════════════════════════════════════════════
//  FULL ANALYSIS PIPELINE
// ══════════════════════════════════════════════════════════════

/**
 * Full analysis: text → parsed values → flags → severity → tags
 * @param {string} fullText - Raw OCR text
 * @returns {Object} Complete structured result
 */
const analyzeText = (fullText) => {
    const medicalValues = extractMedicalValues(fullText);
    const flags = generateFlags(medicalValues);
    const healthTags = detectHealthTags(fullText);
    const { flagSeverity, flagNote } = determineSeverity(flags);

    return {
        medicalValues,
        flags,
        healthTags,
        flagSeverity,
        flagNote,
        valueCount: Object.keys(medicalValues).length,
        flagCount: flags.length,
    };
};

// ══════════════════════════════════════════════════════════════
//  GOOGLE VISION API CALLS
// ══════════════════════════════════════════════════════════════

/** Analyze image via GCS URI (preferred — zero memory overhead) */
const analyzeMedicalReportFromGCS = async (gcsUri) => {
    try {
        const [result] = await client.textDetection({ image: { source: { imageUri: gcsUri } } });
        const detections = result.textAnnotations || [];
        const fullText = detections.length > 0 ? detections[0].description : '';

        logger.info(`OCR via GCS URI: ${gcsUri} (${fullText.length} chars)`);
        return { fullText, ...analyzeText(fullText) };
    } catch (error) {
        logger.error(`OCR GCS URI failed [${gcsUri}]:`, error.message);
        return failedResult('OCR analysis via GCS URI failed.');
    }
};

/** Analyze image from buffer (proxy upload fallback) */
const analyzeMedicalReportFromBuffer = async (imageBuffer) => {
    try {
        const [result] = await client.textDetection({ image: { content: imageBuffer } });
        const detections = result.textAnnotations || [];
        const fullText = detections.length > 0 ? detections[0].description : '';

        logger.info(`OCR via buffer (${fullText.length} chars)`);
        return { fullText, ...analyzeText(fullText) };
    } catch (error) {
        logger.error('OCR buffer failed:', error.message);
        return failedResult('OCR analysis via buffer failed.');
    }
};

/** Analyze PDF via GCS URI (documentTextDetection) */
const analyzeDocumentFromGCS = async (gcsUri, mimeType = 'application/pdf') => {
    try {
        if (mimeType.startsWith('image/')) {
            return analyzeMedicalReportFromGCS(gcsUri);
        }

        const [result] = await client.documentTextDetection({
            image: { source: { imageUri: gcsUri } },
        });

        const fullText = result.fullTextAnnotation?.text || '';
        logger.info(`OCR document: ${gcsUri} (${fullText.length} chars)`);
        return { fullText, ...analyzeText(fullText) };
    } catch (error) {
        logger.error(`OCR document failed [${gcsUri}]:`, error.message);
        return failedResult('OCR document analysis failed.');
    }
};

/** Analyze buffer (auto-detect: PDF vs image) */
const analyzeBuffer = async (buffer, mimeType = 'image/jpeg') => {
    try {
        if (mimeType === 'application/pdf') {
            const [result] = await client.documentTextDetection({ image: { content: buffer } });
            const fullText = result.fullTextAnnotation?.text || '';
            logger.info(`OCR PDF buffer (${fullText.length} chars)`);
            return { fullText, ...analyzeText(fullText) };
        }
        return analyzeMedicalReportFromBuffer(buffer);
    } catch (error) {
        logger.error('OCR analyzeBuffer failed:', error.message);
        return failedResult('OCR analysis failed.');
    }
};

// ─── Helpers ─────────────────────────────────────────────

const failedResult = (note) => ({
    fullText: '',
    medicalValues: {},
    flags: [],
    healthTags: [],
    flagSeverity: 'LOW',
    flagNote: note,
    valueCount: 0,
    flagCount: 0,
});

module.exports = {
    analyzeMedicalReportFromGCS,
    analyzeMedicalReportFromBuffer,
    analyzeDocumentFromGCS,
    analyzeBuffer,
    analyzeText,
    extractMedicalValues,
    generateFlags,
    // Legacy alias
    analyzeMedicalReport: async (url, imageBuffer) => analyzeMedicalReportFromBuffer(imageBuffer),
};
