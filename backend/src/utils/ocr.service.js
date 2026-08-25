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

// SEP matches inline separators AND line breaks (Indian lab reports often
// put test name on one line and value on the next, or use tab/spaces).
const SEP = `[:\\s=\\-–—|\\t]*(?:\\n[\\s|]*)?`;

const MEDICAL_PATTERNS = {
    // Blood Sugar
    glucose_fasting:     new RegExp(`(?:fasting\\s*(?:blood\\s*)?(?:glucose|sugar|plasma\\s*glucose)|fbg|fbs|fpg)${SEP}([\\d.]+)\\s*(mg\\/dl|mmol\\/l)?`, 'gi'),
    glucose_pp:          new RegExp(`(?:post\\s*(?:prandial|meal|lunch)|pp\\s*(?:glucose|sugar|blood\\s*sugar)|ppbs|pp2bs)${SEP}([\\d.]+)\\s*(mg\\/dl|mmol\\/l)?`, 'gi'),
    glucose_random:      new RegExp(`(?:random\\s*(?:blood\\s*)?(?:glucose|sugar)|rbs|blood\\s*sugar|plasma\\s*glucose)${SEP}([\\d.]+)\\s*(mg\\/dl|mmol\\/l)?`, 'gi'),
    hba1c:               new RegExp(`(?:hba1c|hb\\s*a1c|a1c|glycated\\s*h[ae]moglobin|glycosylated)${SEP}([\\d.]+)\\s*%?`, 'gi'),

    // Blood Pressure (captures systolic/diastolic pair)
    bp:                  /(?:blood\s*pressure|bp)\s*[:=\-–—]?\s*(\d{2,3})\s*[/]\s*(\d{2,3})\s*(mmhg)?/gi,
    bp_systolic_only:    new RegExp(`(?:systolic)${SEP}(\\d{2,3})\\s*(mmhg)?`, 'gi'),
    bp_diastolic_only:   new RegExp(`(?:diastolic)${SEP}(\\d{2,3})\\s*(mmhg)?`, 'gi'),

    // Lipid Profile
    cholesterol_total:   new RegExp(`(?:total\\s*cholesterol|serum\\s*cholesterol|cholesterol\\s*(?:total)?)${SEP}([\\d.]+)\\s*(mg\\/dl)?`, 'gi'),
    ldl:                 new RegExp(`(?:ldl[\\s\\-]*(?:cholesterol)?|low\\s*density\\s*lipoprotein)${SEP}([\\d.]+)\\s*(mg\\/dl)?`, 'gi'),
    hdl:                 new RegExp(`(?:hdl[\\s\\-]*(?:cholesterol)?|high\\s*density\\s*lipoprotein)${SEP}([\\d.]+)\\s*(mg\\/dl)?`, 'gi'),
    triglycerides:       new RegExp(`(?:triglyceride[s]?|tg|trigl)${SEP}([\\d.]+)\\s*(mg\\/dl)?`, 'gi'),

    // Kidney
    creatinine:          new RegExp(`(?:creatinine|creat|s\\.?\\s*creat(?:inine)?)${SEP}([\\d.]+)\\s*(mg\\/dl)?`, 'gi'),
    urea:                new RegExp(`(?:blood\\s*urea(?:\\s*nitrogen)?|urea|bun)${SEP}([\\d.]+)\\s*(mg\\/dl)?`, 'gi'),

    // CBC
    hemoglobin:          new RegExp(`(?:h[ae]moglobin|hb|hgb)${SEP}([\\d.]+)\\s*(g\\/dl|gm?\\/dl|g%)?`, 'gi'),
    wbc:                 new RegExp(`(?:wbc|white\\s*blood\\s*cell[s]?|leucocyte[s]?|total\\s*(?:wbc|leucocyte))${SEP}([\\d.]+)\\s*(\\/cumm|cells?\\/cumm|thou(?:sand)?|x10[\\^³])?`, 'gi'),
    rbc:                 new RegExp(`(?:rbc|red\\s*blood\\s*cell[s]?|erythrocyte[s]?|total\\s*rbc)${SEP}([\\d.]+)\\s*(mill(?:ion)?\\/cumm|million|x10[\\^⁶])?`, 'gi'),
    platelet:            new RegExp(`(?:platelet[s]?|plt|platelet\\s*count)${SEP}([\\d.]+)\\s*(lakh|\\/cumm|thou(?:sand)?|x10[\\^³])?`, 'gi'),
    esr:                 new RegExp(`(?:esr|erythrocyte\\s*sedimentation\\s*rate|sedimentation\\s*rate)${SEP}([\\d.]+)\\s*(mm\\/hr|mm(?:1st\\s*hr)?)?`, 'gi'),

    // Thyroid
    tsh:                 new RegExp(`(?:tsh|thyroid\\s*stimulating\\s*hormone)${SEP}([\\d.]+)\\s*(miu\\/[lm]l|uiu\\/ml|µiu\\/ml)?`, 'gi'),

    // Liver
    sgpt:                new RegExp(`(?:sgpt|alt|alanine\\s*(?:amino)?\\s*transferase)${SEP}([\\d.]+)\\s*(u\\/l|iu\\/l)?`, 'gi'),
    sgot:                new RegExp(`(?:sgot|ast|aspartate\\s*(?:amino)?\\s*transferase)${SEP}([\\d.]+)\\s*(u\\/l|iu\\/l)?`, 'gi'),
    bilirubin:           new RegExp(`(?:total\\s*bilirubin|bilirubin(?:\\s*total)?|tbil)${SEP}([\\d.]+)\\s*(mg\\/dl)?`, 'gi'),

    // Vitamin D / B12 (commonly tested in India)
    vitamin_d:           new RegExp(`(?:vitamin\\s*d|25[\\s\\-]*(?:oh|hydroxy)\\s*(?:vitamin\\s*)?d)${SEP}([\\d.]+)\\s*(ng\\/ml|nmol\\/l)?`, 'gi'),
    vitamin_b12:         new RegExp(`(?:vitamin\\s*b\\s*12|b12|cobalamin)${SEP}([\\d.]+)\\s*(pg\\/ml|pmol\\/l)?`, 'gi'),

    // Uric Acid
    uric_acid:           new RegExp(`(?:uric\\s*acid|serum\\s*uric\\s*acid)${SEP}([\\d.]+)\\s*(mg\\/dl)?`, 'gi'),
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
    vitamin_d:         { high: null, low: 20,   unit: 'ng/mL', flag_low: 'low_vitamin_d' },
    vitamin_b12:       { high: null, low: 200,  unit: 'pg/mL', flag_low: 'low_vitamin_b12' },
    uric_acid:         { high: 7.0, low: null,  unit: 'mg/dL', flag_high: 'high_uric_acid' },
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
    ALLERGY:       ['allergy', 'allergic', 'allergen', 'ige', 'immunoglobulin e', 'hypersensitivity'],
};

// Keywords short/ambiguous enough to collide with ordinary English words
// (e.g. 'ast' inside "Asthma", 'bun' inside nothing medical at all, 't3'/'t4'
// as generic identifiers) — these require a real word boundary on both
// sides, not a bare substring match. Everything else in HEALTH_KEYWORDS is
// distinctive enough that a plain substring match is safe and intentional
// (e.g. 'creatinine', 'cholesterol').
const AMBIGUOUS_KEYWORDS = new Set(['ast', 'alt', 'bun', 't3', 't4']);

const keywordMatches = (lowerText, keyword) => {
    if (AMBIGUOUS_KEYWORDS.has(keyword)) {
        return new RegExp(`\\b${keyword}\\b`, 'i').test(lowerText);
    }
    return lowerText.includes(keyword);
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

// ══════════════════════════════════════════════════════════════
//  GENERIC LAB-FLAG DETECTION
//
//  MEDICAL_PATTERNS/THRESHOLDS only cover ~13 known metabolic/cardiac/renal
//  test types. A report for anything else (allergy panels, IgE, hormones,
//  tumor markers, etc.) produces medicalValues:{} and generateFlags() never
//  runs — so analyzeText() silently reports "all values within normal
//  range" even when the lab printed "High"/"Abnormal" directly on the
//  result. This scans for the lab's own severity word attached to an
//  actual numeric result line, independent of whether that specific test
//  is in the known-pattern list, so an unrecognized-but-flagged test still
//  surfaces as HIGH rather than being silently swallowed.
// ══════════════════════════════════════════════════════════════

// A single result line, evaluated per-line. Legend/reference-range rows
// look like "3.50-17.49  High  Very Common" — the flag word directly
// follows a hyphenated *range*. Real results look like "5.00  High" — the
// flag word directly follows a single value. The distinguishing check is
// local to the matched number itself (is IT the second half of a range?),
// not "does this line contain a range anywhere" — a result line can
// legitimately mention an unrelated range elsewhere (e.g. "Test: 1 day
// (Normal: 1-3 days)" describing turnaround time, not the reference range).
//
// Real-world Vision OCR on a table layout emits ONE CELL PER LINE (columns
// read top-to-bottom, not row-by-row), so "value  High" never share a line:
//   "52.00" / "High" / "<0.35" / "KUA/L"
// A legend/range row is also line-shredded, but a severity word there is
// preceded by a *range* line ("2.00-1600") or another word, never by a lone
// bare-number line — so "bare number, then bare severity word within 2
// lines, not itself range-shaped" is the distinguishing signal.
const BARE_NUMBER_LINE = /^\s*(\d+(?:\.\d+)?)\s*$/;
const BARE_SEVERITY_LINE = /^\s*(Critical|Abnormal|Very\s+High|Very\s+Low|High|Low|Elevated|Deficient)\s*$/i;
const RESULT_FLAG_IN_LINE = /(\d+(?:\.\d+)?)\s*(?:[a-zA-Z%\/µ]{0,8})?\s+(Critical|Abnormal|Very\s+High|Very\s+Low|High|Low|Elevated|Deficient)\b/;
// True when the number just before the match position is immediately
// preceded by "<number>-" (i.e. the matched value is the tail of a range).
const isTailOfRange = (line, matchIndex) => /\d+(?:\.\d+)?\s*[-–—]\s*$/.test(line.slice(0, matchIndex));
const RANGE_LINE = /\d+(?:\.\d+)?\s*[-–—]\s*\d/;

// Report boilerplate sections that legitimately contain severity words in
// prose (legends, explanatory notes) rather than as a result flag.
const NON_RESULT_LINE = /^\s*(?:interpretation|note[s]?|comment[s]?|quantitative\s*result)\b/i;

const detectGenericLabFlags = (fullText, knownFlags) => {
    // Don't duplicate — if generateFlags() already found this via a known
    // pattern, the generic scan doesn't need to add a second flag for it.
    if (knownFlags.length > 0) return [];

    const lines = fullText.split('\n');
    const candidates = [];

    // Pass 1: same-line match (clean OCR / plain-text reports).
    for (const line of lines) {
        if (NON_RESULT_LINE.test(line)) continue;
        const m = line.match(RESULT_FLAG_IN_LINE);
        if (m && !isTailOfRange(line, m.index) && !RANGE_LINE.test(line.slice(0, m.index))) {
            candidates.push({ value: m[1], severityWord: m[2] });
        }
    }

    // Pass 2: line-shredded table cells — bare number line immediately
    // followed (within 2 lines, skipping blanks) by a bare severity line,
    // with no range line in between.
    for (let i = 0; i < lines.length; i++) {
        const numMatch = lines[i].match(BARE_NUMBER_LINE);
        if (!numMatch) continue;
        for (let j = i + 1; j <= Math.min(i + 2, lines.length - 1); j++) {
            if (lines[j].trim() === '') continue;
            if (RANGE_LINE.test(lines[j])) break; // a range came first — this is a legend row
            const sevMatch = lines[j].match(BARE_SEVERITY_LINE);
            if (sevMatch) candidates.push({ value: numMatch[1], severityWord: sevMatch[1] });
            break;
        }
    }

    if (candidates.length === 0) return [];

    // Cap at 3 — this is a coarse fallback signal, not per-test extraction,
    // so surfacing every match on a long panel would be noisy rather than useful.
    return candidates.slice(0, 3).map(c => {
        const severity = c.severityWord.toLowerCase().includes('critical') ? 'CRITICAL' : 'HIGH';
        return {
            type: 'lab_flagged_abnormal',
            severity,
            message: `Lab report flags a result as "${c.severityWord}" (value: ${c.value}) — a test type Ayuxa doesn't recognize by name. Please review the original document.`,
            value: parseFloat(c.value),
            threshold: null,
        };
    });
};

/**
 * Detect health tags from OCR text.
 */
const detectHealthTags = (fullText) => {
    const lower = fullText.toLowerCase();
    const tags = [];
    for (const [tag, keywords] of Object.entries(HEALTH_KEYWORDS)) {
        if (keywords.some(kw => keywordMatches(lower, kw))) {
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
// Matches lab test-name lines of the form "ALLERGY, HOUSE DUST, IgE" (Vision
// OCR sometimes garbles "IgE" to "E") and pulls out just the allergen name.
// Only extracted, never auto-saved — the caller must ask the user to confirm
// before writing to their medical card (see uploadHealthReport / mobile UI).
const ALLERGEN_NAME_LINE = /allergy,\s*([a-z0-9 .'-]{2,40}?),\s*(?:ige|e)\b/i;
const extractSuggestedAllergen = (fullText, flags) => {
    if (flags.length === 0) return null; // only suggest when the report actually flagged something abnormal
    const m = fullText.match(ALLERGEN_NAME_LINE);
    if (!m) return null;
    return m[1]
        .split(' ')
        .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(' ');
};

const analyzeText = (fullText) => {
    const medicalValues = extractMedicalValues(fullText);
    let flags = generateFlags(medicalValues);
    // Fallback: catches lab-flagged abnormal results for test types outside
    // the ~13 known patterns (allergy/IgE panels, hormones, tumor markers,
    // etc.) so they don't silently read as "normal" just because Ayuxa
    // doesn't have a dedicated regex for that specific test.
    flags = flags.concat(detectGenericLabFlags(fullText, flags));
    const healthTags = detectHealthTags(fullText);
    const { flagSeverity, flagNote } = determineSeverity(flags);
    const suggestedAllergen = healthTags.includes('ALLERGY') ? extractSuggestedAllergen(fullText, flags) : null;

    return {
        medicalValues,
        flags,
        healthTags,
        flagSeverity,
        flagNote,
        suggestedAllergen,
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
