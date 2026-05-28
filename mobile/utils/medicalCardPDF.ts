/**
 * Medical Card PDF Generator
 * Generates a professional PDF with user's medical information matching the official AYUXA design
 */

interface MedicalCardData {
    name: string;
    phone: string;
    email?: string;
    dateOfBirth?: string;
    gender?: string;
    uniqueUserId: string;
    bloodGroup?: string;
    allergies?: string[];
    chronicConditions?: string[];
    currentMedications?: string[];
    emergencyContacts?: Array<{ name: string; phone: string; relationship: string }>;
    addresses?: Array<{ line1: string; cityName: string; state: string; pincode: string }>;
    insuranceInfo?: string;
    primaryDoctor?: string;
}

/**
 * Generate HTML content for medical card PDF
 */
export function generateMedicalCardHTML(data: MedicalCardData): string {
    const formatDate = (iso?: string) => {
        if (!iso) return 'N/A';
        try {
            return new Date(iso).toLocaleDateString('en-IN', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
            }).replace(/\//g, '/');
        } catch {
            return iso;
        }
    };

    const primaryContact = data.emergencyContacts?.[0];

    const foodKeywords = ['wheat', 'peanut', 'egg', 'milk', 'soy', 'gluten', 'shellfish', 'nut', 'food'];
    const allAllergies = data.allergies || [];
    const foodAllergies = allAllergies.filter(a => foodKeywords.some(k => a.toLowerCase().includes(k)));
    const medicineAllergies = allAllergies.filter(a => !foodKeywords.some(k => a.toLowerCase().includes(k)));

    const foodAllergiesStr = foodAllergies.join(', ') || 'None';
    const medicineAllergiesStr = medicineAllergies.join(', ') || 'None';
    const medicationsStr = (data.currentMedications || []).join(', ') || 'None';
    const conditionsStr = (data.chronicConditions || []).join(', ') || 'None';

    const address = data.addresses?.[0];
    const addressHTML = address
        ? `${address.line1}, ${address.cityName}, ${address.state} ${address.pincode}`
        : 'N/A';

    const getOrdinalSuffix = (d: number) => {
        if (d > 3 && d < 21) return 'th';
        switch (d % 10) {
            case 1:  return 'st';
            case 2:  return 'nd';
            case 3:  return 'rd';
            default: return 'th';
        }
    };

    const now = new Date();
    const day = now.getDate();
    const monthStr = now.toLocaleDateString('en-GB', { month: 'long' });
    const year = now.getFullYear();
    const timeStr = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    const generationDateStr = `${day}${getOrdinalSuffix(day)} ${monthStr} ${year} at ${timeStr}`;

    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            background: #ffffff;
            padding: 40px;
            color: #2D3748;
        }
        .container {
            max-width: 800px;
            margin: 0 auto;
        }
        .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding-bottom: 20px;
            margin-bottom: 24px;
            border-bottom: 1.5px solid #E2E8F0;
        }
        .logo-section {
            display: flex;
            align-items: center;
        }
        .logo-img {
            height: 44px;
            margin-right: 12px;
        }
        .logo-text {
            display: flex;
            flex-direction: column;
            border-left: 1.5px solid #E2E8F0;
            padding-left: 12px;
        }
        .brand-name {
            font-size: 28px;
            font-weight: 800;
            color: #0E6E45;
            line-height: 1;
            letter-spacing: 0.5px;
        }
        .brand-sub {
            font-size: 7px;
            color: #718096;
            letter-spacing: 1px;
            font-weight: 600;
            text-transform: uppercase;
            margin-top: 3px;
        }
        .header-right {
            font-size: 15px;
            font-weight: 700;
            color: #2D3748;
        }
        .card-title {
            font-weight: 700;
        }
        .card-id {
            color: #2D3748;
        }
        .id-val {
            color: #DC2626;
            font-weight: 800;
        }
        .section {
            margin-bottom: 22px;
        }
        .section-header {
            background-color: #387B57;
            color: white;
            font-size: 14px;
            font-weight: 700;
            padding: 8px 14px;
            border-radius: 4px;
            margin-bottom: 12px;
        }
        .section-content {
            padding-left: 6px;
        }
        .field-row {
            margin-bottom: 6px;
            font-size: 14px;
            color: #2D3748;
        }
        .label {
            color: #1D809F;
            font-weight: 700;
        }
        .value {
            color: #2D3748;
            font-weight: 500;
        }
        .value-red {
            color: #DC2626;
            font-weight: 700;
        }
        .notes-text {
            font-size: 14px;
            line-height: 1.6;
            color: #2D3748;
        }
        .footer-note {
            font-size: 12px;
            color: #2D3748;
            text-align: left;
            margin-top: 30px;
            font-weight: 500;
        }
        .note-red {
            color: #DC2626;
            font-weight: 600;
        }
        .decorator-container {
            text-align: center;
            margin-top: 40px;
        }
    </style>
</head>
<body>
    <div class="container">
        <!-- Header -->
        <div class="header">
            <div class="logo-section">
                <img src="https://storage.googleapis.com/ayuxacare-assets/mobile/assets/images/onlylogo.png" class="logo-img" />
                <div class="logo-text">
                    <span class="brand-name">AYUXA</span>
                    <span class="brand-sub">Your Health, Synchronized</span>
                </div>
            </div>
            <div class="header-right">
                <span class="card-title">AYUXA MEDICAL CARD. </span>
                <span class="card-id">ID: <span class="id-val">${data.uniqueUserId}</span></span>
            </div>
        </div>

        <!-- Personal Detail -->
        <div class="section">
            <div class="section-header">Personal Detail</div>
            <div class="section-content">
                <div class="field-row"><span class="label">Name:</span> <span class="value">${data.name}</span></div>
                <div class="field-row"><span class="label">Address:</span> <span class="value">${addressHTML}</span></div>
                <div class="field-row"><span class="label">DOB:</span> <span class="value">${formatDate(data.dateOfBirth)}</span></div>
                <div class="field-row"><span class="label">Gender:</span> <span class="value">${data.gender || 'N/A'}</span></div>
                <div class="field-row"><span class="label">Phone:</span> <span class="value">${data.phone}</span></div>
                <div class="field-row"><span class="label">Email:</span> <span class="value">${data.email || 'N/A'}</span></div>
            </div>
        </div>

        <!-- Blood Group & Emergency -->
        <div class="section">
            <div class="section-header">Blood Group & Emergency</div>
            <div class="section-content">
                <div class="field-row">
                    <span class="label">Blood Group:</span> 
                    <span class="value-red">${data.bloodGroup || 'Not recorded'}</span>
                </div>
                <div class="field-row">
                    <span class="label">Emergency Contact:</span> 
                    <span class="value">${primaryContact ? primaryContact.phone : 'N/A'}</span>
                </div>
                <div class="field-row">
                    <span class="label">Relation:</span> 
                    <span class="value">${primaryContact ? primaryContact.relationship : 'N/A'}</span>
                </div>
            </div>
        </div>

        <!-- Medicine Allergies -->
        <div class="section">
            <div class="section-header">Medicine Allergies</div>
            <div class="section-content">
                <div class="field-row">
                    <span class="label">Medicine Allergies:</span> 
                    <span class="value">${medicineAllergiesStr}</span>
                </div>
                <div class="field-row">
                    <span class="label">Food Allergies:</span> 
                    <span class="value">${foodAllergiesStr}</span>
                </div>
                <div class="field-row">
                    <span class="label">Current Medications:</span> 
                    <span class="value">${medicationsStr}</span>
                </div>
                <div class="field-row">
                    <span class="label">Existing Conditions:</span> 
                    <span class="value">${conditionsStr}</span>
                </div>
            </div>
        </div>

        <!-- Insurance Provider -->
        <div class="section">
            <div class="section-header">Insurance Provider</div>
            <div class="section-content">
                <div class="field-row">
                    <span class="label">Insurance Provider:</span> 
                    <span class="value">${data.insuranceInfo || 'None'}</span>
                </div>
                <div class="field-row">
                    <span class="label">Broker:</span> 
                    <span class="value">Ayuxa Platforms</span>
                </div>
                <div class="field-row">
                    <span class="label">Type:</span> 
                    <span class="value">${data.insuranceInfo ? 'Personal / Family' : 'None'}</span>
                </div>
            </div>
        </div>

        <!-- Additional Health Notes -->
        <div class="section">
            <div class="section-header">Additional Health Notes</div>
            <div class="section-content">
                <div class="notes-text">None</div>
            </div>
        </div>

        <!-- Footer Note -->
        <div class="footer-note">
            <span class="note-red">Note:</span> This medical card is generated based on self reported health data provided by the user within the Ayuxa mobile application. <span class="note-red">Generated On: ${generationDateStr}</span>
        </div>

        <!-- Decorator -->
        <div class="decorator-container">
            <svg height="24" width="400" style="margin: 0 auto; display: block;">
                <!-- Left Line -->
                <line x1="0" y1="12" x2="160" y2="12" style="stroke:#E28743; stroke-width:1.5" />
                <!-- Left Curly loop -->
                <path d="M 160 12 C 165 7, 168 7, 172 12 C 176 17, 179 17, 184 12" fill="none" style="stroke:#E28743; stroke-width:1.5" />
                <!-- Center Diamonds -->
                <polygon points="190,12 195,7 200,12 195,17" style="fill:#E28743;" />
                <polygon points="202,12 207,7 212,12 207,17" style="fill:#E28743;" />
                <polygon points="214,12 219,7 224,12 219,17" style="fill:#E28743;" />
                <!-- Right Curly loop -->
                <path d="M 230 12 C 235 7, 238 7, 242 12 C 246 17, 249 17, 254 12" fill="none" style="stroke:#E28743; stroke-width:1.5" />
                <!-- Right Line -->
                <line x1="254" y1="12" x2="400" y2="12" style="stroke:#E28743; stroke-width:1.5" />
            </svg>
        </div>
    </div>
</body>
</html>
    `;
}
