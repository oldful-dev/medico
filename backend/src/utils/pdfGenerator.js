// ──────────────────────────────────────────────
//  PDF Generator (PDFKit) – Invoice & SLA PDF
// ──────────────────────────────────────────────

const PDFDocument = require('pdfkit');

/**
 * Generate GST Invoice PDF
 * @returns {Promise<Buffer>}
 */
const generateInvoicePDF = async (invoiceData) => {
    return new Promise((resolve, reject) => {
        try {
            const doc = new PDFDocument({ size: 'A4', margin: 50 });
            const buffers = [];

            doc.on('data', (chunk) => buffers.push(chunk));
            doc.on('end', () => resolve(Buffer.concat(buffers)));

            // Header
            doc.fontSize(22).font('Helvetica-Bold').text('MEDICO HEALTHCARE', { align: 'center' });
            doc.fontSize(10).font('Helvetica').text(process.env.COMPANY_ADDRESS || 'Bangalore, India', { align: 'center' });
            doc.text(`GSTIN: ${process.env.COMPANY_GSTIN || 'N/A'}`, { align: 'center' });
            doc.moveDown(1);

            // Title
            doc.fontSize(16).font('Helvetica-Bold').text('TAX INVOICE', { align: 'center' });
            doc.moveDown(0.5);

            // Invoice details
            doc.fontSize(10).font('Helvetica');
            doc.text(`Invoice No: ${invoiceData.invoiceNumber}`);
            doc.text(`Date: ${new Date(invoiceData.invoiceDate).toLocaleDateString('en-IN')}`);
            doc.moveDown(0.5);

            // Bill To
            doc.font('Helvetica-Bold').text('Bill To:');
            doc.font('Helvetica');
            doc.text(invoiceData.billingName || 'N/A');
            doc.text(invoiceData.billingAddress || 'N/A');
            if (invoiceData.billingGstin) doc.text(`GSTIN: ${invoiceData.billingGstin}`);
            doc.moveDown(1);

            // Line separator
            doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
            doc.moveDown(0.5);

            // Items header
            doc.font('Helvetica-Bold');
            doc.text('Description', 50, doc.y, { width: 250 });
            doc.text('Amount', 400, doc.y - 12, { width: 100, align: 'right' });
            doc.moveDown(0.5);

            // Items
            doc.font('Helvetica');
            doc.text(invoiceData.description || 'Healthcare Services', 50, doc.y, { width: 250 });
            doc.text(`₹${invoiceData.subtotal?.toFixed(2)}`, 400, doc.y - 12, { width: 100, align: 'right' });
            doc.moveDown(1);

            // Totals
            doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
            doc.moveDown(0.5);

            doc.text(`Subtotal:`, 350, doc.y, { width: 100 });
            doc.text(`₹${invoiceData.subtotal?.toFixed(2)}`, 450, doc.y - 12, { width: 100, align: 'right' });
            doc.moveDown(0.3);

            doc.text(`GST (${invoiceData.gstRate}%):`, 350, doc.y, { width: 100 });
            doc.text(`₹${invoiceData.gstAmount?.toFixed(2)}`, 450, doc.y - 12, { width: 100, align: 'right' });
            doc.moveDown(0.3);

            doc.font('Helvetica-Bold');
            doc.text(`Total:`, 350, doc.y, { width: 100 });
            doc.text(`₹${invoiceData.totalAmount?.toFixed(2)}`, 450, doc.y - 12, { width: 100, align: 'right' });
            doc.moveDown(2);

            // Footer
            doc.fontSize(8).font('Helvetica').text(
                'This is a computer-generated invoice and does not require a signature.',
                { align: 'center' }
            );

            doc.end();
        } catch (error) {
            reject(error);
        }
    });
};

/**
 * Generate Welcome SLA PDF for a new user
 * @returns {Promise<Buffer>}
 */
const generateWelcomeSLAPDF = async (userData) => {
    return new Promise((resolve, reject) => {
        try {
            const doc = new PDFDocument({ size: 'A4', margin: 50 });
            const buffers = [];

            doc.on('data', (chunk) => buffers.push(chunk));
            doc.on('end', () => resolve(Buffer.concat(buffers)));

            // Header
            doc.fontSize(22).font('Helvetica-Bold').text('MEDICO HEALTHCARE', { align: 'center' });
            doc.fontSize(10).font('Helvetica').text('Service Level Agreement & Welcome Kit', { align: 'center' });
            doc.moveDown(2);

            // User Details
            doc.fontSize(14).font('Helvetica-Bold').text('Member Details');
            doc.moveDown(0.5);
            doc.fontSize(11).font('Helvetica');
            doc.text(`Member ID: ${userData.uniqueUserId}`);
            doc.text(`Name: ${userData.name}`);
            doc.text(`Phone: ${userData.phone}`);
            doc.text(`City: ${userData.cityName}`);
            doc.text(`Plan: ${userData.planName || 'N/A'}`);
            doc.text(`Joined: ${new Date().toLocaleDateString('en-IN')}`);
            doc.moveDown(1);

            // SLA Terms
            doc.fontSize(14).font('Helvetica-Bold').text('Service Level Agreement');
            doc.moveDown(0.5);
            doc.fontSize(10).font('Helvetica');

            const slaTerms = [
                '1. Response time for doctor home visit: within 4 hours of booking.',
                '2. Nurse assignment: within 24 hours for scheduled bookings.',
                '3. SOS response: immediate alert + callback within 5 minutes.',
                '4. Hospital trip: pickup within 1 hour of scheduled time.',
                '5. Blood test reports: delivered within 24 hours.',
                '6. Refund processing: within 5-7 business days.',
                '7. 24/7 customer support available via app and phone.',
            ];
            slaTerms.forEach((term) => {
                doc.text(term);
                doc.moveDown(0.3);
            });

            doc.moveDown(1);

            // Emergency Info
            doc.fontSize(14).font('Helvetica-Bold').text('Emergency Contacts');
            doc.moveDown(0.5);
            doc.fontSize(10).font('Helvetica');
            doc.text('Medico SOS Helpline: 1800-MEDICO (24/7)');
            doc.text(`Your Emergency Contact: ${userData.emergencyContactName || 'Not set'} - ${userData.emergencyContactPhone || 'Not set'}`);

            doc.moveDown(2);
            doc.fontSize(8).text('This document is a binding service level agreement between Medico Healthcare and the member.', { align: 'center' });

            doc.end();
        } catch (error) {
            reject(error);
        }
    });
};

module.exports = { generateInvoicePDF, generateWelcomeSLAPDF };
