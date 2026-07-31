// ──────────────────────────────────────────────
//  PDF Generator (PDFKit) – Invoice & SLA PDF
// ──────────────────────────────────────────────

const PDFDocument = require('pdfkit');

/**
 * Generate GST Invoice PDF
 * @returns {Promise<Buffer>}
 */
const puppeteer = require('puppeteer');
const fontLoader = require('./fontLoader');
const imageLoader = require('./imageLoader');

/**
 * Generate GST Invoice PDF using Puppeteer with self-contained Base64 assets
 * @returns {Promise<Buffer>}
 */
const generateInvoicePDF = async (invoiceData) => {
    let browser;
    try {
        const itemSubtotalNum = Number(invoiceData.subtotal || invoiceData.totalAmount || 1999);
        const gstRateNum = Number(invoiceData.gstRate || 18);
        const gstAmountNum = invoiceData.gstAmount !== undefined ? Number(invoiceData.gstAmount) : (itemSubtotalNum * gstRateNum / 100);
        const totalAmountNum = invoiceData.totalAmount !== undefined ? Number(invoiceData.totalAmount) : (itemSubtotalNum + gstAmountNum);

        const subTotalFormatted = itemSubtotalNum.toFixed(2);
        const gstAmountFormatted = gstAmountNum.toFixed(2);
        const totalFormatted = totalAmountNum.toFixed(2);

        const invoiceNumber = invoiceData.invoiceNumber || 'N/A';
        const invoiceDate = new Date(invoiceData.invoiceDate || new Date()).toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'long',
            year: 'numeric'
        }).toUpperCase();
        const billingName = invoiceData.billingName || 'N/A';
        const billingAddress = invoiceData.billingAddress || 'N/A';
        const billingPhone = invoiceData.billingPhone || '+91-9480198108';
        const gstNumber = process.env.COMPANY_GSTIN || '29AAKFO1251B1ZJ';
        const description = invoiceData.description || 'Home Nurse Visit';
        const discount = '0.00';

        const invoiceRows = `
            <tr>
                <td style="padding: 10px; font-size: 10px; font-weight: 500; border-bottom: 1px solid #bfbfbf;">
                    <img src="${imageLoader.check}" style="width: 11px; height: 11px; vertical-align: middle; margin-right: 6px;" alt="✔" />
                    <span style="vertical-align: middle;">${description}</span>
                </td>
                <td class="center" style="padding: 10px; font-size: 10px; font-weight: 500; border-bottom: 1px solid #bfbfbf; text-align: center;">Rs. ${subTotalFormatted}</td>
                <td class="center" style="padding: 10px; font-size: 10px; font-weight: 500; border-bottom: 1px solid #bfbfbf; text-align: center;">1</td>
                <td class="right" style="padding: 10px; font-size: 10px; font-weight: 600; border-bottom: 1px solid #bfbfbf; text-align: right;">Rs. ${subTotalFormatted}</td>
            </tr>
        `;

        const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <style>
                @font-face {
                    font-family: 'Montserrat';
                    font-weight: 400;
                    font-style: normal;
                    src: url('${fontLoader.regular}') format('truetype'),
                         url('${fontLoader.regular}') format('opentype');
                }
                @font-face {
                    font-family: 'Montserrat';
                    font-weight: 600;
                    font-style: normal;
                    src: url('${fontLoader.semiBold}') format('truetype'),
                         url('${fontLoader.semiBold}') format('opentype');
                }
                @font-face {
                    font-family: 'Montserrat';
                    font-weight: 700;
                    font-style: normal;
                    src: url('${fontLoader.bold}') format('truetype'),
                         url('${fontLoader.bold}') format('opentype');
                }

                :root {
                    --green: #1D5E35;
                    --red: #A52227;
                    --text: #222222;
                    --gray: #666666;
                }

                * {
                    margin: 0;
                    padding: 0;
                    box-sizing: border-box;
                }

                body {
                    background: #ffffff;
                    font-family: 'Montserrat', Arial, Helvetica, sans-serif;
                    color: var(--text);
                    width: 595px;
                    height: 842px;
                    margin: 0 auto;
                    position: relative;
                    overflow: hidden;
                    -webkit-print-color-adjust: exact;
                }

                .page {
                    width: 595px;
                    height: 842px;
                    background: #fff;
                    margin: 0 auto;
                    position: relative;
                    overflow: hidden;
                    color: var(--text);
                }

                .top {
                    height: 32px;
                    background: var(--green);
                    position: relative;
                }

                .top:before {
                    content: '';
                    position: absolute;
                    left: 0;
                    top: 0;
                    width: 200px;
                    height: 32px;
                    background: var(--red);
                    transform: skewX(-26deg);
                    transform-origin: left;
                }

                .top:after {
                    content: '';
                    position: absolute;
                    left: 188px;
                    top: 0;
                    width: 5px;
                    height: 32px;
                    background: #fff;
                    transform: skewX(-26deg);
                }

                .header {
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-start;
                    padding: 28px 45px 0;
                    margin-bottom: 20px;
                }

                .logo {
                    width: 195px;
                    max-height: 55px;
                    object-fit: contain;
                }

                .inv h1 {
                    font-size: 31px;
                    font-weight: 700;
                    letter-spacing: 0.3px;
                    color: var(--red);
                    margin-bottom: 8px;
                    line-height: 1;
                }

                .meta {
                    font-size: 9px;
                    font-weight: 600;
                    line-height: 1.8;
                    color: var(--text);
                }

                .info {
                    display: flex;
                    justify-content: space-between;
                    padding: 30px 45px 0;
                }

                .bill,
                .company {
                    width: 215px;
                }

                .bill h3 {
                    font-size: 13px;
                    font-weight: 700;
                    color: var(--text);
                    margin-bottom: 6px;
                }

                .company h3 {
                    font-size: 17px;
                    font-weight: 700;
                    color: var(--green);
                    margin-bottom: 6px;
                }

                .bill p {
                    font-size: 11px;
                    font-weight: 600;
                    line-height: 1.45;
                    color: var(--text);
                    margin-bottom: 4px;
                }

                .company p {
                    font-size: 11px;
                    font-weight: 500;
                    line-height: 1.45;
                    color: var(--text);
                    margin-bottom: 4px;
                }

                table {
                    width: 505px;
                    margin: 40px auto 0;
                    border-collapse: collapse;
                }

                th {
                    background: var(--green);
                    color: #fff;
                    font-size: 11px;
                    font-weight: 700;
                    padding: 9px 10px;
                    letter-spacing: 0.3px;
                }

                td {
                    font-size: 10px;
                    font-weight: 500;
                    padding: 10px;
                    border-bottom: 1px solid #bfbfbf;
                    color: var(--text);
                }

                .center {
                    text-align: center;
                }

                .right {
                    text-align: right;
                }

                .totals {
                    width: 205px;
                    margin: 36px 45px 0 auto;
                    font-size: 10px;
                }

                .r {
                    display: flex;
                    justify-content: space-between;
                    margin: 6px 0;
                    color: var(--text);
                }

                .r span:first-child {
                    font-weight: 700;
                }

                .r span:last-child {
                    font-weight: 500;
                }

                .total {
                    margin-top: 10px;
                    background: var(--red);
                    color: #fff;
                    padding: 8px 12px;
                    font-size: 11px;
                    font-weight: 700;
                    display: flex;
                    justify-content: space-between;
                }

                .footer {
                    position: absolute;
                    left: 45px;
                    right: 45px;
                    bottom: 60px;
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-end;
                }

                .terms h4 {
                    font-size: 11px;
                    font-weight: 700;
                    color: var(--red);
                    margin-bottom: 6px;
                }

                .terms p {
                    font-size: 10px;
                    font-weight: 600;
                    margin: 6px 0;
                    color: var(--text);
                    display: flex;
                    align-items: center;
                    gap: 6px;
                }

                .icon-img {
                    width: 14px;
                    height: 14px;
                    object-fit: contain;
                }

                .sign {
                    text-align: center;
                    width: 155px;
                }

                .sign img {
                    width: 145px;
                    height: 52px;
                    object-fit: contain;
                }

                .sign hr {
                    margin: 4px 0 6px 0;
                    width: 155px;
                    border: 0;
                    border-top: 1px solid #cccccc;
                }

                .sign b {
                    font-size: 11px;
                    font-weight: 700;
                    color: var(--text);
                }

                .sign div {
                    font-size: 9px;
                    font-weight: 600;
                    color: var(--gray);
                }

                .bottom {
                    position: absolute;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    height: 28px;
                    background: var(--green);
                }

                .bottom:before {
                    content: '';
                    position: absolute;
                    right: 0;
                    bottom: 0;
                    width: 200px;
                    height: 28px;
                    background: var(--red);
                    transform: skewX(-26deg);
                    transform-origin: right;
                }

                .bottom:after {
                    content: '';
                    position: absolute;
                    right: 188px;
                    bottom: 0;
                    width: 5px;
                    height: 28px;
                    background: #fff;
                    transform: skewX(-26deg);
                }

                .chev {
                    position: absolute;
                    left: 18px;
                    bottom: 2px;
                    color: #fff;
                    font-size: 18px;
                    font-weight: 700;
                    letter-spacing: -2px;
                }
            </style>
        </head>

        <body>
            <div class="page">
                <div class="top"></div>
                <div class="header">
                    <img class="logo" src="${imageLoader.logo}" alt="Logo">
                    <div class="inv">
                        <h1>INVOICE</h1>
                        <div class="meta"><b>INVOICE NO :</b> ${invoiceNumber}<br><b>INVOICE DATE :</b> ${invoiceDate}</div>
                    </div>
                </div>
                <div class="info">
                    <div class="bill">
                        <h3>Bill To</h3>
                        <p><b>${billingName}</b></p>
                        <p>${billingAddress}</p>
                        <p><b>Mobile:</b> ${billingPhone}</p>
                    </div>
                    <div class="company">
                        <h3>AYUXA PLATFORMS</h3>
                        <p><b>GST:</b> ${gstNumber}</p>
                        <p>BANGALORE - INDIA</p>
                    </div>
                </div>
                <table>
                    <thead>
                        <tr>
                            <th style="text-align: left;">DESCRIPTION</th>
                            <th style="text-align: center;">SUBTOTAL</th>
                            <th style="text-align: center;">QTY</th>
                            <th style="text-align: right;">SUBTOTAL</th>
                        </tr>
                    </thead>
                    <tbody>${invoiceRows}</tbody>
                </table>
                <div class="totals">
                    <div class="r"><span>Sub-total</span><span>Rs. ${subTotalFormatted}</span></div>
                    <div class="r"><span>Discount</span><span>${discount}</span></div>
                    <div class="r"><span>GST (${gstRateNum}%)</span><span>Rs. ${gstAmountFormatted}</span></div>
                    <div class="total"><span>Total</span><span>Rs. ${totalFormatted}</span></div>
                </div>
                <div class="footer">
                    <div class="terms">
                        <h4>TERMS AND CONDITIONS</h4>
                        <p><b style="color: var(--red);">ALL SALES ARE FINAL AFTER INVOICING</b></p>
                        <p><img class="icon-img" src="${imageLoader.phone}" alt="Phone" /> 080 4728 0789</p>
                        <p><img class="icon-img" src="${imageLoader.email}" alt="Email" /> support@ayuxacare.com</p>
                        <p><img class="icon-img" src="${imageLoader.globe}" alt="Website" /> www.ayuxacare.com</p>
                    </div>
                    <div class="sign">
                        <img src="${imageLoader.signature}" alt="Signature">
                        <hr>
                        <b>DHEMAAN G. ADITYA</b>
                        <div>AUTHORIZED SIGNATORY</div>
                    </div>
                </div>
                <div class="bottom"></div>
                <div class="chev">❯❯❯❯❯</div>
            </div>
        </body>
        </html>
        `;

        console.log('[PUPPETEER_LOG] Launching browser...');
        const launchOptions = {
            headless: 'new',
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu',
                '--disable-software-rasterizer'
            ]
        };

        if (process.env.PUPPETEER_EXECUTABLE_PATH) {
            launchOptions.executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
        } else if (process.platform === 'linux') {
            const fs = require('fs');
            const linuxPaths = [
                '/usr/bin/chromium-browser',
                '/usr/bin/chromium',
                '/usr/bin/google-chrome-stable',
                '/usr/bin/google-chrome'
            ];
            for (const p of linuxPaths) {
                if (fs.existsSync(p)) {
                    launchOptions.executablePath = p;
                    break;
                }
            }
        }

        browser = await puppeteer.launch(launchOptions);
        console.log('[PUPPETEER_LOG] Browser launched');

        const page = await browser.newPage();
        console.log('[PUPPETEER_LOG] Loading HTML content...');
        await page.setContent(htmlContent, { waitUntil: 'domcontentloaded', timeout: 15000 });

        console.log('[PUPPETEER_LOG] Rendering PDF page...');
        const pdfBuffer = await page.pdf({
            width: '595px',
            height: '842px',
            printBackground: true
        });
        console.log('[PUPPETEER_LOG] PDF rendered. Size:', pdfBuffer.length);

        await browser.close();
        return pdfBuffer;
    } catch (error) {
        console.error('[PUPPETEER_ERROR] PDF generation error:', error);
        if (browser) await browser.close().catch(() => {});
        throw error;
    }
};

/**
 * Generate Welcome SLA PDF for a new user
 * @returns {Promise<Buffer>}
 */
const generateWelcomeSLAPDF = async (userData) => {
    let browser;
    try {
        const formattedDate = new Date().toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'long',
            year: 'numeric'
        }).toUpperCase();

        const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <style>
                @import url('https://fonts.googleapis.com/css2?family=Montserrat:ital,wght@0,300;0,400;0,600;0,700;0,800;1,400&display=swap');
                
                * {
                    box-sizing: border-box;
                    margin: 0;
                    padding: 0;
                }
                body {
                    font-family: 'Montserrat', sans-serif;
                    color: #1a1a1a;
                    background: #ffffff;
                    width: 595px;
                    height: 842px;
                    position: relative;
                    padding: 0;
                    overflow: hidden;
                    -webkit-print-color-adjust: exact;
                }
                
                /* Top Header Decor */
                .top-decor {
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 35px;
                    background: #0B5135;
                    overflow: hidden;
                    z-index: 10;
                }
                .top-decor-red {
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 210px;
                    height: 100%;
                    background: #A81D23;
                    transform: skewX(-25deg);
                    transform-origin: top left;
                }
                .top-decor-white {
                    position: absolute;
                    top: 0;
                    left: 198px;
                    width: 6px;
                    height: 100%;
                    background: #ffffff;
                    transform: skewX(-25deg);
                    transform-origin: top left;
                }

                /* Header Info */
                .header-container {
                    padding: 60px 45px 30px 45px;
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-start;
                }
                .logo-group {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                }
                .logo-icon {
                    width: 48px;
                    height: 48px;
                }
                .logo-text-title {
                    font-size: 26px;
                    font-weight: 800;
                    color: #0B5135;
                    letter-spacing: 0.5px;
                    line-height: 1;
                }
                .logo-text-subtitle {
                    font-size: 8.5px;
                    font-weight: 600;
                    color: #555555;
                    text-transform: capitalize;
                    margin-top: 4px;
                    letter-spacing: 0.2px;
                }
                .invoice-meta {
                    text-align: right;
                }
                .invoice-title {
                    font-size: 20px;
                    font-weight: 800;
                    color: #A81D23;
                    letter-spacing: 1px;
                    margin-bottom: 12px;
                }

                /* Sections */
                .content-section {
                    padding: 0 45px;
                    margin-bottom: 25px;
                }
                .section-title {
                    font-size: 13px;
                    font-weight: 700;
                    color: #0B5135;
                    border-bottom: 2px solid #E8F5E9;
                    padding-bottom: 6px;
                    margin-bottom: 12px;
                }
                .details-grid {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 12px;
                }
                .detail-item {
                    font-size: 10px;
                    color: #333333;
                }
                .detail-label {
                    font-weight: 700;
                    color: #666666;
                    display: inline-block;
                    width: 90px;
                }
                .detail-value {
                    font-weight: 600;
                }

                /* Terms List */
                .terms-list {
                    list-style: none;
                }
                .term-item {
                    font-size: 10px;
                    line-height: 1.5;
                    margin-bottom: 8px;
                    color: #444444;
                    display: flex;
                    gap: 8px;
                    align-items: flex-start;
                }
                .term-check {
                    color: #0B5135;
                    font-weight: 700;
                }

                /* Signatory */
                .signature-block {
                    margin-top: 15px;
                    display: flex;
                    justify-content: flex-end;
                }
                .sign-column {
                    width: 180px;
                    text-align: center;
                }
                .signature-scribble {
                    height: 35px;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    margin-bottom: 5px;
                }
                .sig-line {
                    border-top: 1px solid #cccccc;
                    padding-top: 6px;
                }
                .signatory-name {
                    font-size: 10.5px;
                    font-weight: 700;
                    color: #111111;
                    margin-bottom: 3px;
                }
                .signatory-title {
                    font-size: 8px;
                    color: #666666;
                    font-weight: 600;
                }

                /* Bottom Accent Shape */
                .bottom-decor {
                    position: absolute;
                    bottom: 0;
                    left: 0;
                    width: 100%;
                    height: 30px;
                    background: #0B5135;
                    overflow: hidden;
                    display: flex;
                    align-items: center;
                    padding-left: 20px;
                }
                .bottom-decor-red {
                    position: absolute;
                    bottom: 0;
                    right: 0;
                    width: 220px;
                    height: 100%;
                    background: #A81D23;
                    transform: skewX(-25deg);
                    transform-origin: bottom right;
                }
                .bottom-decor-white {
                    position: absolute;
                    bottom: 0;
                    right: 208px;
                    width: 6px;
                    height: 100%;
                    background: #ffffff;
                    transform: skewX(-25deg);
                    transform-origin: bottom right;
                }
                .chevrons {
                    color: #ffffff;
                    font-size: 14px;
                    font-weight: 700;
                    letter-spacing: -2px;
                    z-index: 10;
                }
            </style>
        </head>
        <body>
            <!-- Top decorative bar -->
            <div class="top-decor">
                <div class="top-decor-red"></div>
                <div class="top-decor-white"></div>
            </div>

            <!-- Header Info -->
            <div class="header-container">
                <div class="logo-group">
                    <svg class="logo-icon" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
                        <path d="M 50 20 C 30 5, 20 40, 50 50 C 80 40, 70 5, 50 20 Z" fill="none" stroke="#0B5135" stroke-width="9" stroke-linecap="round"/>
                        <path d="M 50 50 C 30 60, 20 95, 50 80 C 80 95, 70 60, 50 50 Z" fill="none" stroke="#0B5135" stroke-width="9" stroke-linecap="round"/>
                    </svg>
                    <div>
                        <div class="logo-text-title">AYUXA</div>
                        <div class="logo-text-subtitle">Your Health, Synchronized</div>
                    </div>
                </div>
                <div class="invoice-meta">
                    <div class="invoice-title">WELCOME KIT & SLA</div>
                    <div style="font-size: 8.5px; color: #666666;">DATE: ${formattedDate}</div>
                </div>
            </div>

            <!-- Member Details -->
            <div class="content-section">
                <div class="section-title">Member Details</div>
                <div class="details-grid">
                    <div class="detail-item">
                        <span class="detail-label">Member ID:</span>
                        <span class="detail-value">${userData.uniqueUserId}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Name:</span>
                        <span class="detail-value">${userData.name}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Phone:</span>
                        <span class="detail-value">${userData.phone}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">City:</span>
                        <span class="detail-value">${userData.cityName || 'Bangalore'}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Plan:</span>
                        <span class="detail-value">${userData.planName || 'N/A'}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Joined:</span>
                        <span class="detail-value">${formattedDate}</span>
                    </div>
                </div>
            </div>

            <!-- Service Level Agreement -->
            <div class="content-section">
                <div class="section-title">Service Level Agreement Terms</div>
                <ul class="terms-list">
                    <li class="term-item"><span class="term-check">✔</span> 1. Response time for doctor home visit: within 4 hours of booking.</li>
                    <li class="term-item"><span class="term-check">✔</span> 2. Nurse assignment: within 24 hours for scheduled bookings.</li>
                    <li class="term-item"><span class="term-check">✔</span> 3. SOS response: immediate alert + callback within 5 minutes.</li>
                    <li class="term-item"><span class="term-check">✔</span> 4. Hospital trip: pickup within 1 hour of scheduled time.</li>
                    <li class="term-item"><span class="term-check">✔</span> 5. Blood test reports: delivered within 24 hours.</li>
                    <li class="term-item"><span class="term-check">✔</span> 6. Refund processing: within 5-7 business days.</li>
                    <li class="term-item"><span class="term-check">✔</span> 7. 24/7 customer support available via app and phone.</li>
                </ul>
            </div>

            <!-- Emergency Info -->
            <div class="content-section">
                <div class="section-title">Emergency Contacts</div>
                <div class="details-grid">
                    <div class="detail-item">
                        <span class="detail-label">Ayuxa SOS:</span>
                        <span class="detail-value">1800-OLDFUL (24/7)</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Personal Contact:</span>
                        <span class="detail-value">${userData.emergencyContactName || 'Not set'} (${userData.emergencyContactPhone || 'Not set'})</span>
                    </div>
                </div>
            </div>

            <!-- Signatory section -->
            <div class="content-section" style="margin-top: 10px;">
                <div class="signature-block">
                    <div class="sign-column">
                        <div class="signature-scribble">
                            <svg width="100" height="35" viewBox="0 0 100 35" xmlns="http://www.w3.org/2000/svg">
                                <path d="M 10 20 Q 25 5 35 25 T 60 10 T 85 20" fill="none" stroke="#1E2A38" stroke-width="1.8" stroke-linecap="round"/>
                                <text x="55" y="12" fill="#3b5998" font-size="6" font-weight="bold">AYUXA HEALTH</text>
                                <text x="55" y="20" fill="#3b5998" font-size="6" font-weight="bold">BLR-001</text>
                            </svg>
                        </div>
                        <div class="sig-line">
                            <div class="signatory-name">DHEMAAN G. ADITYA</div>
                            <div class="signatory-title">AUTHORIZED SIGNATORY</div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Bottom decorative bar -->
            <div class="bottom-decor">
                <div class="bottom-decor-red"></div>
                <div class="bottom-decor-white"></div>
                <span class="chevrons">>>>>>></span>
            </div>
        </body>
        </html>
        `;

        browser = await puppeteer.launch({
            headless: 'new',
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        const page = await browser.newPage();
        await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
        const pdfBuffer = await page.pdf({
            width: '595px',
            height: '842px',
            printBackground: true
        });
        await browser.close();
        return pdfBuffer;
    } catch (error) {
        if (browser) await browser.close().catch(() => {});
        throw error;
    }
};

module.exports = { generateInvoicePDF, generateWelcomeSLAPDF };
