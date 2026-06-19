const prisma = require('../config/database');
const { logger } = require('../config/logger');

// GET /api/admin/customer-media-dump
const getCustomerMediaDump = async (req, res, next) => {
    try {
        logger.info('fetching all customer details and files for media dump');
        
        // Fetch all users with all related tables
        const users = await prisma.user.findMany({
            include: {
                city: true,
                addresses: true,
                emergencyContacts: true,
                familyMembers: true,
                medicalCards: true,
                healthReports: {
                    orderBy: { createdAt: 'desc' }
                },
                bookings: {
                    include: {
                        service: { select: { name: true } }
                    },
                    orderBy: { createdAt: 'desc' }
                },
                insuranceApps: {
                    orderBy: { createdAt: 'desc' }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        // Generate premium HTML
        const html = generateDumpHtml(users);
        
        res.setHeader('Content-Type', 'text/html');
        return res.send(html);
    } catch (error) {
        logger.error(`Error generating customer media dump: ${error.message}`);
        next(error);
    }
};

const generateDumpHtml = (users) => {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Ayuxa Customers & Document Dump</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
    <style>
        :root {
            --bg-base: #0b0f19;
            --bg-surface: #151c2c;
            --bg-card: #1e293b;
            --border: rgba(255, 255, 255, 0.08);
            --text-primary: #f8fafc;
            --text-secondary: #94a3b8;
            --text-muted: #64748b;
            --accent: #3b82f6;
            --accent-glow: rgba(59, 130, 246, 0.15);
            --success: #10b981;
            --warning: #f59e0b;
            --danger: #ef4444;
            --radius-lg: 12px;
            --radius-md: 8px;
            --transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        }

        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }

        body {
            font-family: 'Plus Jakarta Sans', sans-serif;
            background-color: var(--bg-base);
            color: var(--text-primary);
            line-height: 1.5;
            padding: 40px 20px;
        }

        .container {
            max-width: 1400px;
            margin: 0 auto;
        }

        header {
            margin-bottom: 40px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 1px solid var(--border);
            padding-bottom: 24px;
        }

        h1 {
            font-size: 2rem;
            font-weight: 800;
            letter-spacing: -0.025em;
            background: linear-gradient(135deg, #60a5fa 0%, #3b82f6 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }

        .stats-badge {
            background: var(--bg-surface);
            border: 1px solid var(--border);
            padding: 8px 16px;
            border-radius: var(--radius-md);
            font-weight: 600;
            color: var(--text-secondary);
            font-size: 0.9rem;
        }

        .filter-controls {
            display: grid;
            grid-template-columns: 1fr auto auto;
            gap: 16px;
            margin-bottom: 30px;
        }

        .search-input {
            background: var(--bg-surface);
            border: 1px solid var(--border);
            color: var(--text-primary);
            padding: 12px 16px;
            border-radius: var(--radius-md);
            font-family: inherit;
            font-size: 1rem;
            width: 100%;
            outline: none;
            transition: var(--transition);
        }

        .search-input:focus {
            border-color: var(--accent);
            box-shadow: 0 0 0 3px var(--accent-glow);
        }

        .filter-select {
            background: var(--bg-surface);
            border: 1px solid var(--border);
            color: var(--text-primary);
            padding: 12px 16px;
            border-radius: var(--radius-md);
            font-family: inherit;
            font-size: 1rem;
            outline: none;
            cursor: pointer;
            min-width: 180px;
        }

        .user-card {
            background: var(--bg-surface);
            border: 1px solid var(--border);
            border-radius: var(--radius-lg);
            padding: 24px;
            margin-bottom: 24px;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1);
            transition: var(--transition);
        }

        .user-card:hover {
            box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.2), 0 4px 6px -4px rgba(0, 0, 0, 0.2);
            border-color: rgba(255, 255, 255, 0.15);
        }

        .user-header {
            display: flex;
            align-items: center;
            gap: 16px;
            border-bottom: 1px solid var(--border);
            padding-bottom: 20px;
            margin-bottom: 20px;
            flex-wrap: wrap;
        }

        .avatar {
            width: 64px;
            height: 64px;
            border-radius: 50%;
            object-fit: cover;
            border: 2px solid var(--accent);
            background: var(--bg-card);
        }

        .avatar-placeholder {
            width: 64px;
            height: 64px;
            border-radius: 50%;
            background: var(--accent);
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 700;
            font-size: 1.5rem;
            color: #ffffff;
        }

        .user-title {
            flex: 1;
        }

        .user-name {
            font-size: 1.4rem;
            font-weight: 700;
            margin-bottom: 4px;
        }

        .user-meta {
            display: flex;
            gap: 12px;
            font-size: 0.85rem;
            color: var(--text-secondary);
            flex-wrap: wrap;
        }

        .badge {
            display: inline-flex;
            align-items: center;
            padding: 4px 10px;
            border-radius: 20px;
            font-size: 0.75rem;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.05em;
        }

        .badge-success { background: rgba(16, 185, 129, 0.15); color: var(--success); }
        .badge-warning { background: rgba(245, 158, 11, 0.15); color: var(--warning); }
        .badge-danger { background: rgba(239, 68, 68, 0.15); color: var(--danger); }
        .badge-info { background: rgba(59, 130, 246, 0.15); color: var(--accent); }

        .details-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
            gap: 24px;
            margin-bottom: 24px;
        }

        .section-card {
            background: var(--bg-card);
            border: 1px solid var(--border);
            border-radius: var(--radius-md);
            padding: 16px;
        }

        .section-card h3 {
            font-size: 1rem;
            font-weight: 700;
            margin-bottom: 12px;
            border-bottom: 1px solid var(--border);
            padding-bottom: 8px;
            color: var(--accent);
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .info-row {
            display: flex;
            justify-content: space-between;
            font-size: 0.9rem;
            margin-bottom: 8px;
        }

        .info-row:last-child {
            margin-bottom: 0;
        }

        .info-label {
            color: var(--text-secondary);
            font-weight: 500;
        }

        .info-value {
            color: var(--text-primary);
            font-weight: 600;
            text-align: right;
            max-width: 60%;
            word-break: break-word;
        }

        .media-container {
            margin-top: 24px;
        }

        .media-title {
            font-size: 1.1rem;
            font-weight: 700;
            margin-bottom: 12px;
            color: var(--text-primary);
        }

        .media-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
            gap: 16px;
        }

        .media-item {
            background: var(--bg-card);
            border: 1px solid var(--border);
            border-radius: var(--radius-md);
            overflow: hidden;
            display: flex;
            flex-direction: column;
            transition: var(--transition);
        }

        .media-item:hover {
            transform: translateY(-2px);
            border-color: rgba(255,255,255,0.15);
        }

        .media-preview {
            height: 150px;
            background: #111827;
            display: flex;
            align-items: center;
            justify-content: center;
            overflow: hidden;
            position: relative;
        }

        .media-preview img {
            width: 100%;
            height: 100%;
            object-fit: cover;
            cursor: pointer;
        }

        .doc-icon {
            font-size: 3rem;
            color: var(--text-secondary);
        }

        .media-info {
            padding: 12px;
            flex: 1;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
        }

        .media-name {
            font-size: 0.85rem;
            font-weight: 600;
            margin-bottom: 4px;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }

        .media-meta {
            font-size: 0.75rem;
            color: var(--text-muted);
            margin-bottom: 8px;
        }

        .btn-view {
            display: block;
            text-align: center;
            background: var(--accent);
            color: #ffffff;
            text-decoration: none;
            padding: 6px 12px;
            border-radius: var(--radius-md);
            font-size: 0.8rem;
            font-weight: 600;
            transition: var(--transition);
        }

        .btn-view:hover {
            background: #2563eb;
        }

        .no-data {
            color: var(--text-muted);
            font-size: 0.9rem;
            font-style: italic;
        }

        /* Lightbox modal styles */
        .lightbox {
            display: none;
            position: fixed;
            z-index: 1000;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.9);
            justify-content: center;
            align-items: center;
        }

        .lightbox-content {
            max-width: 90%;
            max-height: 85%;
        }

        .lightbox-close {
            position: absolute;
            top: 20px;
            right: 30px;
            color: #fff;
            font-size: 40px;
            font-weight: bold;
            cursor: pointer;
        }
    </style>
</head>
<body>
    <div class="container">
        <header>
            <div>
                <h1>Ayuxa Customers & Document Dump</h1>
                <p style="color: var(--text-secondary); margin-top: 4px;">Comprehensive list of all customers, profiles, uploaded photos, documents, and medical card detail.</p>
            </div>
            <div class="stats-badge">
                Total Customers: <span id="count-value">${users.length}</span>
            </div>
        </header>

        <div class="filter-controls">
            <input type="text" id="search-bar" class="search-input" placeholder="Search by name, phone number, or User ID..." oninput="filterUsers()">
            <select id="city-filter" class="filter-select" onchange="filterUsers()">
                <option value="">All Cities</option>
                ${Array.from(new Set(users.map(u => u.city?.name).filter(Boolean))).map(city => `<option value="${city}">${city}</option>`).join('')}
            </select>
            <select id="doc-filter" class="filter-select" onchange="filterUsers()">
                <option value="">All Customers</option>
                <option value="has-uploads">Has Uploads / Photos</option>
                <option value="has-bookings">Has Bookings</option>
            </select>
        </div>

        <div id="users-list">
            ${users.map(user => {
                const initials = user.name ? user.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : 'U';
                const hasHealthReports = user.healthReports && user.healthReports.length > 0;
                const hasBookings = user.bookings && user.bookings.length > 0;
                const hasPrescriptions = user.bookings && user.bookings.some(b => b.prescriptionUrl);
                const hasAnyUploads = hasHealthReports || hasPrescriptions;

                return `
                <div class="user-card" data-name="${(user.name || '').toLowerCase()}" data-phone="${(user.phone || '')}" data-uid="${(user.uniqueUserId || '').toLowerCase()}" data-city="${user.city?.name || ''}" data-has-uploads="${hasAnyUploads}" data-has-bookings="${hasBookings}">
                    <div class="user-header">
                        ${user.profileImageUrl ? 
                            `<img src="${user.profileImageUrl}" class="avatar" alt="${user.name}">` : 
                            `<div class="avatar-placeholder">${initials}</div>`
                        }
                        <div class="user-title">
                            <div class="user-name">${user.name}</div>
                            <div class="user-meta">
                                <span>ID: <code>${user.uniqueUserId}</code></span>
                                <span>•</span>
                                <span>Phone: ${user.phone}</span>
                                <span>•</span>
                                <span>Email: ${user.email || 'N/A'}</span>
                            </div>
                        </div>
                        <div style="display: flex; gap: 8px;">
                            <span class="badge ${user.status === 'ACTIVE' ? 'badge-success' : 'badge-danger'}">${user.status}</span>
                            <span class="badge badge-info">${user.healthTag}</span>
                            <span class="badge badge-warning">${user.city?.name || 'No City'}</span>
                        </div>
                    </div>

                    <div class="details-grid">
                        <!-- Demographics & Address -->
                        <div class="section-card">
                            <h3>Demographics & Addresses</h3>
                            <div class="info-row">
                                <span class="info-label">Gender</span>
                                <span class="info-value">${user.gender || 'N/A'}</span>
                            </div>
                            <div class="info-row">
                                <span class="info-label">Date of Birth</span>
                                <span class="info-value">${user.dateOfBirth ? new Date(user.dateOfBirth).toLocaleDateString() : 'N/A'}</span>
                            </div>
                            <div class="info-row">
                                <span class="info-label font-bold" style="margin-top: 10px; display: block; border-bottom: 1px solid var(--border);">Registered Addresses</span>
                            </div>
                            ${user.addresses.length === 0 ? `<div class="no-data">No addresses registered</div>` : user.addresses.map(addr => `
                                <div style="margin-top: 6px; font-size: 0.85rem; padding-bottom: 6px; border-bottom: 1px dashed var(--border);">
                                    <strong>${addr.label}:</strong> ${addr.line1}, ${addr.line2 ? addr.line2 + ', ' : ''}${addr.cityName}, ${addr.state} - ${addr.pincode}
                                </div>
                            `).join('')}
                        </div>

                        <!-- Emergency Contacts & Family Members -->
                        <div class="section-card">
                            <h3>Contacts & Family</h3>
                            <div class="info-row">
                                <span class="info-label" style="font-weight:700;">Emergency Contacts</span>
                            </div>
                            ${user.emergencyContacts.length === 0 ? `<div class="no-data">No emergency contacts</div>` : user.emergencyContacts.map(ec => `
                                <div class="info-row" style="font-size: 0.85rem;">
                                    <span class="info-label">${ec.name} (${ec.relationship})</span>
                                    <span class="info-value">${ec.phone}</span>
                                </div>
                            `).join('')}

                            <div class="info-row" style="margin-top: 12px; font-weight:700;">
                                <span class="info-label">Family Members</span>
                            </div>
                            ${user.familyMembers.length === 0 ? `<div class="no-data">No family members registered</div>` : user.familyMembers.map(fm => `
                                <div style="font-size: 0.85rem; margin-top: 6px; padding: 4px; background: rgba(255,255,255,0.02); border-radius: 4px;">
                                    <strong>${fm.name}</strong> (${fm.relation}) ${fm.bloodGroup ? ' - ' + fm.bloodGroup : ''}
                                    ${fm.allergies ? `<div style="font-size: 0.75rem; color: var(--danger)">Allergies: ${fm.allergies}</div>` : ''}
                                </div>
                            `).join('')}
                        </div>

                        <!-- Medical Cards -->
                        <div class="section-card">
                            <h3>Medical Profile</h3>
                            ${user.medicalCards.length === 0 ? `<div class="no-data">No medical card profile created</div>` : user.medicalCards.map(mc => `
                                <div class="info-row">
                                    <span class="info-label">Blood Group</span>
                                    <span class="info-value" style="color: var(--danger);">${mc.bloodGroup || 'N/A'}</span>
                                </div>
                                <div class="info-row">
                                    <span class="info-label">Primary Doctor</span>
                                    <span class="info-value">${mc.primaryDoctor || 'N/A'}</span>
                                </div>
                                <div class="info-row">
                                    <span class="info-label">Allergies</span>
                                    <span class="info-value">${mc.allergies && mc.allergies.length > 0 ? mc.allergies.join(', ') : 'None'}</span>
                                </div>
                                <div class="info-row">
                                    <span class="info-label">Chronic Conditions</span>
                                    <span class="info-value">${mc.chronicConditions && mc.chronicConditions.length > 0 ? mc.chronicConditions.join(', ') : 'None'}</span>
                                </div>
                                <div style="margin-top: 10px;">
                                    <span class="info-label" style="font-size: 0.85rem; font-weight:700;">Current Medications:</span>
                                    <p style="font-size: 0.85rem; background: rgba(0,0,0,0.2); padding: 8px; border-radius: 4px; margin-top: 4px;">
                                        ${mc.currentMedications && mc.currentMedications.length > 0 ? mc.currentMedications.join('<br>') : 'None listed'}
                                    </p>
                                </div>
                            `).join('')}
                        </div>
                    </div>

                    <!-- Documents & Uploads -->
                    ${hasAnyUploads ? `
                    <div class="media-container">
                        <div class="media-title">Uploaded Photos & Documents</div>
                        <div class="media-grid">
                            
                            <!-- Health Reports -->
                            ${user.healthReports.map(report => {
                                const isImg = ['jpg', 'jpeg', 'png', 'webp', 'gif'].includes((report.fileType || '').toLowerCase()) || 
                                              (report.fileUrl && /\.(jpg|jpeg|png|webp|gif)/i.test(report.fileUrl));
                                return `
                                <div class="media-item">
                                    <div class="media-preview">
                                        ${isImg ? 
                                            `<img src="${report.fileUrl}" alt="${report.title}" onclick="openLightbox('${report.fileUrl}')">` : 
                                            `<div class="doc-icon">📄</div>`
                                        }
                                    </div>
                                    <div class="media-info">
                                        <div>
                                            <div class="media-name">${report.title}</div>
                                            <div class="media-meta">Health Report • ${report.fileType?.toUpperCase() || 'FILE'}</div>
                                        </div>
                                        <a href="${report.fileUrl}" target="_blank" class="btn-view">View Original</a>
                                    </div>
                                </div>
                                `;
                            }).join('')}

                            <!-- Booking Prescriptions & dynamic uploaded bills -->
                            ${user.bookings.filter(b => b.prescriptionUrl).map(booking => {
                                const isImg = /\.(jpg|jpeg|png|webp|gif)/i.test(booking.prescriptionUrl);
                                return `
                                <div class="media-item">
                                    <div class="media-preview">
                                        ${isImg ? 
                                            `<img src="${booking.prescriptionUrl}" alt="Booking prescription" onclick="openLightbox('${booking.prescriptionUrl}')">` : 
                                            `<div class="doc-icon">💊</div>`
                                        }
                                    </div>
                                    <div class="media-info">
                                        <div>
                                            <div class="media-name">Prescription - ${booking.bookingCode}</div>
                                            <div class="media-meta">${booking.service?.name} Booking</div>
                                        </div>
                                        <a href="${booking.prescriptionUrl}" target="_blank" class="btn-view">View Prescription</a>
                                    </div>
                                </div>
                                `;
                            }).join('')}

                            <!-- Dynamic form fields data upload -->
                            ${user.bookings.filter(b => {
                                try {
                                    if (!b.formDataJson) return false;
                                    const parsed = typeof b.formDataJson === 'string' ? JSON.parse(b.formDataJson) : b.formDataJson;
                                    return Object.values(parsed).some(val => typeof val === 'string' && val.startsWith('http') && (val.includes('storage.googleapis') || val.includes('ayuxa-assets')));
                                } catch(e) { return false; }
                            }).map(booking => {
                                const parsed = typeof booking.formDataJson === 'string' ? JSON.parse(booking.formDataJson) : booking.formDataJson;
                                return Object.entries(parsed).filter(([k, val]) => typeof val === 'string' && val.startsWith('http') && (val.includes('storage.googleapis') || val.includes('ayuxa-assets'))).map(([key, fileUrl]) => {
                                    const isImg = /\.(jpg|jpeg|png|webp|gif)/i.test(fileUrl);
                                    return `
                                    <div class="media-item">
                                        <div class="media-preview">
                                            ${isImg ? 
                                                `<img src="${fileUrl}" alt="Booking form field upload" onclick="openLightbox('${fileUrl}')">` : 
                                                `<div class="doc-icon">📎</div>`
                                            }
                                        </div>
                                        <div class="media-info">
                                            <div>
                                                <div class="media-name">Booking Attachment - ${booking.bookingCode}</div>
                                                <div class="media-meta">Field: ${key} (${booking.service?.name})</div>
                                            </div>
                                            <a href="${fileUrl}" target="_blank" class="btn-view">View File</a>
                                        </div>
                                    </div>
                                    `;
                                }).join('');
                            }).join('')}

                        </div>
                    </div>
                    ` : `<div style="margin-top: 16px; color: var(--text-muted); font-size: 0.9rem;">No uploaded documents or photos found.</div>`}
                </div>
                `;
            }).join('')}
        </div>
    </div>

    <!-- Lightbox Modal -->
    <div id="lightbox" class="lightbox" onclick="closeLightbox()">
        <span class="lightbox-close">&times;</span>
        <img class="lightbox-content" id="lightbox-img" onclick="event.stopPropagation()">
    </div>

    <script>
        function filterUsers() {
            const query = document.getElementById('search-bar').value.toLowerCase();
            const city = document.getElementById('city-filter').value;
            const docFilter = document.getElementById('doc-filter').value;
            
            const cards = document.querySelectorAll('.user-card');
            let visibleCount = 0;

            cards.forEach(card => {
                const name = card.getAttribute('data-name');
                const phone = card.getAttribute('data-phone');
                const uid = card.getAttribute('data-uid');
                const userCity = card.getAttribute('data-city');
                const hasUploads = card.getAttribute('data-has-uploads') === 'true';
                const hasBookings = card.getAttribute('data-has-bookings') === 'true';

                const matchesQuery = name.includes(query) || phone.includes(query) || uid.includes(query);
                const matchesCity = !city || userCity === city;
                
                let matchesDoc = true;
                if (docFilter === 'has-uploads') {
                    matchesDoc = hasUploads;
                } else if (docFilter === 'has-bookings') {
                    matchesDoc = hasBookings;
                }

                if (matchesQuery && matchesCity && matchesDoc) {
                    card.style.display = 'block';
                    visibleCount++;
                } else {
                    card.style.display = 'none';
                }
            });

            document.getElementById('count-value').innerText = visibleCount;
        }

        function openLightbox(url) {
            document.getElementById('lightbox-img').src = url;
            document.getElementById('lightbox').style.display = 'flex';
        }

        function closeLightbox() {
            document.getElementById('lightbox').style.display = 'none';
        }
    </script>
</body>
</html>`;
};

module.exports = {
    getCustomerMediaDump
};
