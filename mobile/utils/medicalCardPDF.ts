/**
 * Medical Card PDF Generator
 * Generates a professional PDF with user's medical information
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
 * Can be rendered to PDF on native side
 */
export function generateMedicalCardHTML(data: MedicalCardData): string {
    const formatDate = (iso?: string) => {
        if (!iso) return 'N/A';
        try {
            return new Date(iso).toLocaleDateString('en-IN', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
            });
        } catch {
            return iso;
        }
    };

    const emergencyContactsHTML = (data.emergencyContacts || [])
        .map(
            (contact) => `
        <div class="contact-item">
            <div class="contact-name">${contact.name}</div>
            <div class="contact-details">
                ${contact.relationship} • ${contact.phone}
            </div>
        </div>
    `
        )
        .join('');

    const allergiesHTML =
        data.allergies && data.allergies.length > 0
            ? data.allergies.map((a) => `<span class="tag">${a}</span>`).join('')
            : '<span class="text-muted">None recorded</span>';

    const conditionsHTML =
        data.chronicConditions && data.chronicConditions.length > 0
            ? data.chronicConditions.map((c) => `<span class="tag">${c}</span>`).join('')
            : '<span class="text-muted">None recorded</span>';

    const medicationsHTML =
        data.currentMedications && data.currentMedications.length > 0
            ? data.currentMedications
                  .map((m) => `<div class="medication-item">• ${m}</div>`)
                  .join('')
            : '<div class="text-muted">None recorded</div>';

    const address = data.addresses?.[0];
    const addressHTML = address
        ? `${address.line1}, ${address.cityName}, ${address.state} ${address.pincode}`
        : 'N/A';

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
            background: #f5f5f5;
            padding: 20px;
        }
        .container {
            max-width: 900px;
            margin: 0 auto;
            background: white;
            border-radius: 12px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            overflow: hidden;
        }
        .header {
            background: linear-gradient(135deg, #02743F 0%, #048357 100%);
            color: white;
            padding: 30px;
            text-align: center;
        }
        .header-title {
            font-size: 28px;
            font-weight: 700;
            margin-bottom: 8px;
        }
        .header-subtitle {
            font-size: 14px;
            opacity: 0.9;
            margin-bottom: 4px;
        }
        .header-id {
            font-size: 12px;
            opacity: 0.8;
            font-family: 'Courier New', monospace;
        }
        .content {
            padding: 30px;
        }
        .section {
            margin-bottom: 28px;
            page-break-inside: avoid;
        }
        .section-title {
            font-size: 16px;
            font-weight: 700;
            color: #02743F;
            margin-bottom: 12px;
            padding-bottom: 8px;
            border-bottom: 2px solid #E8F5E9;
        }
        .row {
            display: flex;
            margin-bottom: 12px;
            gap: 30px;
        }
        .col {
            flex: 1;
        }
        .field-label {
            font-size: 12px;
            color: #666;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 4px;
        }
        .field-value {
            font-size: 15px;
            color: #2F2F2F;
            font-weight: 500;
        }
        .text-muted {
            color: #999;
            font-style: italic;
        }
        .tags-container {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
        }
        .tag {
            background: #E8F5E9;
            color: #02743F;
            padding: 6px 12px;
            border-radius: 20px;
            font-size: 13px;
            font-weight: 500;
        }
        .medication-item {
            font-size: 14px;
            color: #2F2F2F;
            margin-bottom: 6px;
            line-height: 1.5;
        }
        .contact-item {
            background: #F9F9F9;
            padding: 10px;
            border-radius: 8px;
            margin-bottom: 8px;
            border-left: 3px solid #02743F;
        }
        .contact-name {
            font-weight: 600;
            color: #2F2F2F;
            font-size: 14px;
        }
        .contact-details {
            font-size: 12px;
            color: #666;
            margin-top: 2px;
        }
        .footer {
            background: #F9F9F9;
            padding: 20px 30px;
            text-align: center;
            border-top: 1px solid #E5E5E5;
            font-size: 11px;
            color: #999;
            margin-top: 30px;
        }
        .print-note {
            text-align: center;
            color: #999;
            font-size: 12px;
            margin-top: 20px;
            padding-top: 20px;
            border-top: 1px solid #E5E5E5;
        }
        @media print {
            body {
                background: white;
                padding: 0;
            }
            .container {
                box-shadow: none;
                border-radius: 0;
            }
            .print-note {
                display: none;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="header-title">Medical Card</div>
            <div class="header-subtitle">${data.name}</div>
            <div class="header-id">AYUXA ID: ${data.uniqueUserId}</div>
        </div>

        <div class="content">
            <!-- Personal Information -->
            <div class="section">
                <div class="section-title">Personal Information</div>
                <div class="row">
                    <div class="col">
                        <div class="field-label">Full Name</div>
                        <div class="field-value">${data.name}</div>
                    </div>
                    <div class="col">
                        <div class="field-label">AYUXA Client ID</div>
                        <div class="field-value">${data.uniqueUserId}</div>
                    </div>
                </div>
                <div class="row">
                    <div class="col">
                        <div class="field-label">Phone</div>
                        <div class="field-value">${data.phone}</div>
                    </div>
                    <div class="col">
                        <div class="field-label">Email</div>
                        <div class="field-value">${data.email || 'N/A'}</div>
                    </div>
                </div>
                <div class="row">
                    <div class="col">
                        <div class="field-label">Date of Birth</div>
                        <div class="field-value">${formatDate(data.dateOfBirth)}</div>
                    </div>
                    <div class="col">
                        <div class="field-label">Gender</div>
                        <div class="field-value">${data.gender || 'N/A'}</div>
                    </div>
                </div>
                <div class="row">
                    <div class="col">
                        <div class="field-label">Address</div>
                        <div class="field-value">${addressHTML}</div>
                    </div>
                </div>
            </div>

            <!-- Blood Group & Emergency -->
            <div class="section">
                <div class="section-title">Blood Group & Emergency</div>
                <div class="row">
                    <div class="col">
                        <div class="field-label">Blood Group</div>
                        <div class="field-value" style="font-size: 20px; color: #DC2626; font-weight: 700;">
                            ${data.bloodGroup || 'Not recorded'}
                        </div>
                    </div>
                    <div class="col">
                        <div class="field-label">Primary Doctor</div>
                        <div class="field-value">${data.primaryDoctor || 'Not assigned'}</div>
                    </div>
                </div>
            </div>

            <!-- Medical History -->
            <div class="section">
                <div class="section-title">Medical History</div>

                <div style="margin-bottom: 16px;">
                    <div class="field-label">Allergies</div>
                    <div class="tags-container">${allergiesHTML}</div>
                </div>

                <div style="margin-bottom: 16px;">
                    <div class="field-label">Existing Conditions</div>
                    <div class="tags-container">${conditionsHTML}</div>
                </div>

                <div>
                    <div class="field-label">Current Medications</div>
                    ${medicationsHTML}
                </div>
            </div>

            <!-- Emergency Contacts -->
            ${
                emergencyContactsHTML
                    ? `
            <div class="section">
                <div class="section-title">Emergency Contacts</div>
                ${emergencyContactsHTML}
            </div>
            `
                    : ''
            }

            <!-- Insurance Information -->
            ${
                data.insuranceInfo
                    ? `
            <div class="section">
                <div class="section-title">Insurance Information</div>
                <div class="field-value">${data.insuranceInfo}</div>
            </div>
            `
                    : ''
            }

            <div class="print-note">
                Generated on ${new Date().toLocaleDateString('en-IN', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                })}
            </div>
        </div>

        <div class="footer">
            This is an official AYUXA medical card for emergency reference.
            Keep a digital and printed copy with you at all times.
        </div>
    </div>
</body>
</html>
    `;
}
