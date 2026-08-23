// ──────────────────────────────────────────────
//  Email Template Registry
//
//  All HTML email templates are defined here.
//  To add a new email: add a new key with a subject + html(vars) function.
//  Controllers never write HTML — they call named functions in router.js.
//
//  Sender: noreply@ayuxacare.com (ZeptoMail, domain: ayuxacare.com)
// ──────────────────────────────────────────────

const PRIMARY = '#02743F';
const PRIMARY_DARK = '#015C32';
const BG = '#F4FBF7';

// Shared layout wrapper
const layout = (content) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>
<body style="margin:0;padding:0;background-color:#f4f4f4;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f4;padding:30px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">

        <!-- Header -->
        <tr>
          <td style="background-color:${PRIMARY};padding:24px 32px;">
            <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;letter-spacing:0.3px;">Ayuxa Platforms</h1>
            <p style="margin:4px 0 0;color:#a8d8c0;font-size:13px;">Making Elder Care Better</p>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:32px;">
            ${content}
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background-color:#f9f9f9;padding:20px 32px;border-top:1px solid #eee;text-align:center;">
            <p style="margin:0;font-size:12px;color:#999;">© 2006 Ayuxa Platforms. All Rights Reserved.</p>
            <p style="margin:4px 0 0;font-size:12px;color:#bbb;">Bangalore | Karnataka | India</p>
            <p style="margin:4px 0 0;font-size:12px;color:#bbb;"><a href="mailto:support@ayuxacare.com" style="color:#bbb;text-decoration:none;">support@ayuxacare.com</a></p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>
`;

// ─── Template Definitions ─────────────────────

const EMAIL_TEMPLATES = {

    // ─── Onboarding ───────────────────────────

    WELCOME: {
        subject: (vars) => `Welcome to Ayuxa Platforms, ${vars.name}!`,
        html: (vars) => layout(`
            <h2 style="margin:0 0 8px;color:${PRIMARY};font-size:20px;">Welcome, ${vars.name}! 🎉</h2>
            <p style="margin:0 0 20px;color:#555;font-size:15px;line-height:1.6;">
                Your Ayuxa Platforms account is ready. You now have access to premium elder care services at your doorstep.
            </p>
            <div style="background:${BG};border:1px solid #c9e9d8;border-radius:8px;padding:20px;margin-bottom:24px;">
                <p style="margin:0 0 8px;font-size:14px;color:#333;"><strong>Your Ayuxa ID:</strong></p>
                <p style="margin:0;font-size:22px;font-weight:700;color:${PRIMARY};letter-spacing:2px;">${vars.uniqueUserId}</p>
            </div>
            <p style="margin:0 0 20px;color:#555;font-size:14px;line-height:1.6;">
                Use this ID when contacting our support team or when checking in at our partner facilities.
            </p>
            <table cellpadding="0" cellspacing="0"><tr><td style="background-color:${PRIMARY};border-radius:6px;">
                <a href="${vars.appUrl || 'https://ayuxacare.com'}" style="display:inline-block;padding:12px 28px;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;">Open App</a>
            </td></tr></table>
        `),
    },

    // ─── Transactional ────────────────────────

    BOOKING_CONFIRMED: {
        subject: (vars) => `Booking Confirmed — ${vars.bookingCode}`,
        html: (vars) => layout(`
            <h2 style="margin:0 0 8px;color:${PRIMARY};font-size:20px;">Booking Confirmed ✅</h2>
            <p style="margin:0 0 20px;color:#555;font-size:15px;">Hi ${vars.name}, your booking has been confirmed.</p>
            <div style="background:${BG};border:1px solid #c9e9d8;border-radius:8px;padding:20px;margin-bottom:24px;">
                <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                        <td style="padding:6px 0;font-size:14px;color:#666;">Booking ID</td>
                        <td style="padding:6px 0;font-size:14px;color:#222;font-weight:600;text-align:right;">${vars.bookingCode}</td>
                    </tr>
                    ${vars.serviceName ? `<tr>
                        <td style="padding:6px 0;font-size:14px;color:#666;">Service</td>
                        <td style="padding:6px 0;font-size:14px;color:#222;text-align:right;">${vars.serviceName}</td>
                    </tr>` : ''}
                    ${vars.scheduledDate ? `<tr>
                        <td style="padding:6px 0;font-size:14px;color:#666;">Scheduled</td>
                        <td style="padding:6px 0;font-size:14px;color:#222;text-align:right;">${vars.scheduledDate}</td>
                    </tr>` : ''}
                    ${vars.amount ? `<tr>
                        <td style="padding:6px 0;font-size:14px;color:#666;">Amount Paid</td>
                        <td style="padding:6px 0;font-size:14px;color:${PRIMARY};font-weight:700;text-align:right;">₹${vars.amount}</td>
                    </tr>` : ''}
                </table>
            </div>
            <p style="margin:0;color:#777;font-size:13px;">Need help? Contact <a href="mailto:support@ayuxacare.com" style="color:${PRIMARY};">support@ayuxacare.com</a> or call us at <a href="tel:080-4728-0789" style="color:${PRIMARY};">080-4728-0789</a>.</p>
        `),
    },
    
    BOOKING_CONFIRMED_ADMIN: {
        subject: (vars) => `[ADMIN ALERT] ${vars.eventLabel || 'New Booking'} — ${vars.bookingCode} | ${vars.serviceName}`,
        html: (vars) => layout(`
            <h2 style="margin:0 0 8px;color:${PRIMARY};font-size:20px;">Booking Confirmed (Admin Alert) 📢</h2>
            <p style="margin:0 0 20px;color:#555;font-size:15px;line-height:1.5;">
                A booking has been placed and confirmed. Below are the complete customer and operational details.
            </p>
            
            <!-- Customer Section -->
            <div style="margin-bottom:20px;">
                <h3 style="margin:0 0 10px;font-size:14px;color:${PRIMARY};text-transform:uppercase;letter-spacing:0.5px;">Customer Profile</h3>
                <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9f9f9;border:1px solid #eee;border-radius:8px;padding:16px;">
                    <tr><td style="padding:4px 0;font-size:13px;color:#666;width:120px;">Name</td><td style="font-size:14px;color:#222;font-weight:600;">${vars.customerName}</td></tr>
                    <tr><td style="padding:4px 0;font-size:13px;color:#666;">Phone</td><td style="font-size:14px;color:#222;">${vars.customerPhone}</td></tr>
                </table>
            </div>

            <!-- Booking Section -->
            <div style="margin-bottom:20px;">
                <h3 style="margin:0 0 10px;font-size:14px;color:${PRIMARY};text-transform:uppercase;letter-spacing:0.5px;">Service Details</h3>
                <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9f9f9;border:1px solid #eee;border-radius:8px;padding:16px;">
                    <tr><td style="padding:4px 0;font-size:13px;color:#666;width:120px;">Booking Code</td><td style="font-size:14px;color:#222;font-weight:600;">${vars.bookingCode}</td></tr>
                    <tr><td style="padding:4px 0;font-size:13px;color:#666;">Service</td><td style="font-size:14px;color:#222;font-weight:600;color:${PRIMARY};">${vars.serviceName}</td></tr>
                    <tr><td style="padding:4px 0;font-size:13px;color:#666;">Date & Time</td><td style="font-size:14px;color:#222;">${vars.scheduledDate} ${vars.scheduledTime ? `| ${vars.scheduledTime}` : ''}</td></tr>
                    <tr><td style="padding:4px 0;font-size:13px;color:#666;">Amount Paid</td><td style="font-size:14px;color:#222;font-weight:700;">₹${vars.amount}</td></tr>
                </table>
            </div>

            <!-- Location & Requirements Section -->
            <div style="margin-bottom:20px;">
                <h3 style="margin:0 0 10px;font-size:14px;color:${PRIMARY};text-transform:uppercase;letter-spacing:0.5px;">Operational Info</h3>
                <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9f9f9;border:1px solid #eee;border-radius:8px;padding:16px;">
                    <tr><td style="padding:4px 0;font-size:13px;color:#666;width:120px;vertical-align:top;">Address</td><td style="font-size:14px;color:#222;line-height:1.4;">${vars.addressLine || 'N/A'}</td></tr>
                    ${vars.latitude ? `<tr><td style="padding:4px 0;font-size:13px;color:#666;">Coordinates</td><td style="font-size:14px;color:#222;">${vars.latitude}, ${vars.longitude}</td></tr>` : ''}
                    
                    <!-- Doctor / Staff specifics -->
                    ${vars.staffType ? `<tr><td style="padding:4px 0;font-size:13px;color:#666;">Staff Type</td><td style="font-size:14px;color:#222;font-weight:600;">${vars.staffType}</td></tr>` : ''}
                    ${vars.doctorType ? `<tr><td style="padding:4px 0;font-size:13px;color:#666;">Doctor Type</td><td style="font-size:14px;color:#222;font-weight:600;">${vars.doctorType}</td></tr>` : ''}
                    ${vars.shiftDuration ? `<tr><td style="padding:4px 0;font-size:13px;color:#666;">Shift Duration</td><td style="font-size:14px;color:#222;">${vars.shiftDuration}</td></tr>` : ''}
                    
                    <!-- Symptoms / Notes -->
                    ${vars.symptoms && vars.symptoms.length > 0 ? `<tr><td style="padding:4px 0;font-size:13px;color:#666;vertical-align:top;">Symptoms</td><td style="font-size:14px;color:#222;line-height:1.4;">${vars.symptoms.join(', ')}</td></tr>` : ''}
                    ${vars.requirements && vars.requirements.length > 0 ? `<tr><td style="padding:4px 0;font-size:13px;color:#666;vertical-align:top;">Requirements</td><td style="font-size:14px;color:#222;line-height:1.4;">${vars.requirements.join(', ')}</td></tr>` : ''}

                    <!-- Transport specifics -->
                    ${vars.pickupAddress ? `<tr><td style="padding:4px 0;font-size:13px;color:#666;vertical-align:top;">Pickup</td><td style="font-size:14px;color:#222;line-height:1.4;">${vars.pickupAddress}</td></tr>` : ''}
                    ${vars.dropAddress ? `<tr><td style="padding:4px 0;font-size:13px;color:#666;vertical-align:top;">Drop</td><td style="font-size:14px;color:#222;line-height:1.4;">${vars.dropAddress}</td></tr>` : ''}
                    ${vars.vehicleType ? `<tr><td style="padding:4px 0;font-size:13px;color:#666;">Vehicle Type</td><td style="font-size:14px;color:#222;">${vars.vehicleType}</td></tr>` : ''}
                </table>
            </div>
        `),
    },

    PAYMENT_RECEIPT: {
        subject: (vars) => `Payment Receipt — ₹${vars.amount} | ${vars.invoiceNumber}`,
        html: (vars) => layout(`
            <h2 style="margin:0 0 8px;color:${PRIMARY};font-size:20px;">Payment Successful 💳</h2>
            <p style="margin:0 0 20px;color:#555;font-size:15px;">Hi ${vars.name}, your payment has been received.</p>
            <div style="background:${BG};border:1px solid #c9e9d8;border-radius:8px;padding:20px;margin-bottom:24px;">
                <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                        <td style="padding:6px 0;font-size:14px;color:#666;">Invoice No.</td>
                        <td style="padding:6px 0;font-size:14px;color:#222;font-weight:600;text-align:right;">${vars.invoiceNumber}</td>
                    </tr>
                    <tr>
                        <td style="padding:6px 0;font-size:14px;color:#666;">Amount</td>
                        <td style="padding:6px 0;font-size:20px;color:${PRIMARY};font-weight:700;text-align:right;">₹${vars.amount}</td>
                    </tr>
                    ${vars.paymentId ? `<tr>
                        <td style="padding:6px 0;font-size:14px;color:#666;">Payment ID</td>
                        <td style="padding:6px 0;font-size:13px;color:#888;text-align:right;">${vars.paymentId}</td>
                    </tr>` : ''}
                    <tr>
                        <td style="padding:6px 0;font-size:14px;color:#666;">Date</td>
                        <td style="padding:6px 0;font-size:14px;color:#222;text-align:right;">${vars.date || new Date().toLocaleDateString('en-IN')}</td>
                    </tr>
                </table>
            </div>
            ${vars.invoicePdfUrl ? `
            <table cellpadding="0" cellspacing="0" style="margin-bottom:20px;"><tr><td style="background-color:${PRIMARY};border-radius:6px;">
                <a href="${vars.invoicePdfUrl}" style="display:inline-block;padding:12px 28px;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;">Download GST Invoice</a>
            </td></tr></table>` : ''}
            <p style="margin:0;color:#777;font-size:13px;">Keep this email as your payment confirmation. For any issues, contact <a href="mailto:support@ayuxacare.com" style="color:${PRIMARY};">support@ayuxacare.com</a> or call <a href="tel:080-4728-0789" style="color:${PRIMARY};">080-4728-0789</a>.</p>
        `),
    },

    DATA_EXPORT: {
        subject: () => `Your Ayuxa Data Export`,
        html: (vars) => layout(`
            <h2 style="margin:0 0 8px;color:${PRIMARY};font-size:20px;">Your Data is Attached 📄</h2>
            <p style="margin:0 0 20px;color:#555;font-size:15px;">Hi ${vars.name}, as requested, we've attached a complete export of the personal data Ayuxa holds against your account (Ref ID: ${vars.uniqueUserId}).</p>
            <div style="background:${BG};border:1px solid #c9e9d8;border-radius:8px;padding:20px;margin-bottom:24px;">
                <p style="margin:0;color:#555;font-size:14px;">The attached PDF includes your profile, addresses, emergency contacts, family members, bookings, orders, payments, and subscriptions.</p>
            </div>
            <p style="margin:0;color:#777;font-size:13px;">If you did not request this, please contact <a href="mailto:support@ayuxacare.com" style="color:${PRIMARY};">support@ayuxacare.com</a> immediately.</p>
        `),
    },

    PLAN_EXPIRY_REMINDER: {
        subject: (vars) => `Your ${vars.planName} plan expires in ${vars.daysLeft} day${vars.daysLeft === 1 ? '' : 's'}`,
        html: (vars) => layout(`
            <h2 style="margin:0 0 8px;color:#E65C00;font-size:20px;">Plan Expiring Soon ⏰</h2>
            <p style="margin:0 0 20px;color:#555;font-size:15px;">Hi ${vars.name}, your subscription is expiring soon.</p>
            <div style="background:#FFF8F5;border:1px solid #F5C6A0;border-radius:8px;padding:20px;margin-bottom:24px;">
                <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                        <td style="padding:6px 0;font-size:14px;color:#666;">Plan</td>
                        <td style="padding:6px 0;font-size:14px;color:#222;font-weight:600;text-align:right;">${vars.planName}</td>
                    </tr>
                    <tr>
                        <td style="padding:6px 0;font-size:14px;color:#666;">Expires On</td>
                        <td style="padding:6px 0;font-size:14px;color:#E65C00;font-weight:700;text-align:right;">${vars.expiryDate}</td>
                    </tr>
                    <tr>
                        <td style="padding:6px 0;font-size:14px;color:#666;">Days Remaining</td>
                        <td style="padding:6px 0;font-size:20px;color:#E65C00;font-weight:700;text-align:right;">${vars.daysLeft} day${vars.daysLeft === 1 ? '' : 's'}</td>
                    </tr>
                </table>
            </div>
            <p style="margin:0 0 20px;color:#555;font-size:14px;">Renew now to continue uninterrupted access to Ayuxa healthcare services for you and your family.</p>
            <table cellpadding="0" cellspacing="0"><tr><td style="background-color:${PRIMARY};border-radius:6px;">
                <a href="${vars.renewUrl || 'https://ayuxacare.com'}" style="display:inline-block;padding:12px 28px;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;">Renew Plan</a>
            </td></tr></table>
        `),
    },

    // ─── Support ──────────────────────────────

    SUPPORT_TICKET_ADMIN: {
        subject: (vars) => `[Support Ticket ${vars.ticketCode}] ${vars.subject}`,
        html: (vars) => layout(`
            <h2 style="margin:0 0 16px;color:${PRIMARY};font-size:18px;">New Support Ticket</h2>
            <div style="background:#F9F9F9;border:1px solid #eee;border-radius:8px;padding:20px;margin-bottom:20px;">
                <table width="100%" cellpadding="0" cellspacing="0">
                    <tr><td style="padding:5px 0;font-size:14px;color:#666;width:120px;">Ticket ID</td><td style="font-size:14px;color:#222;font-weight:600;">${vars.ticketCode}</td></tr>
                    <tr><td style="padding:5px 0;font-size:14px;color:#666;">User</td><td style="font-size:14px;color:#222;">${vars.userName} (${vars.userUniqueId || ''})</td></tr>
                    <tr><td style="padding:5px 0;font-size:14px;color:#666;">Category</td><td style="font-size:14px;color:#222;">${vars.category}</td></tr>
                    <tr><td style="padding:5px 0;font-size:14px;color:#666;">Priority</td><td style="font-size:14px;color:#E65C00;font-weight:600;">${vars.priority?.toUpperCase()}</td></tr>
                </table>
            </div>
            <div style="border-left:4px solid ${PRIMARY};padding-left:16px;margin-bottom:20px;">
                <p style="margin:0;font-size:14px;color:#333;line-height:1.6;">${vars.description}</p>
            </div>
            <p style="margin:0;font-size:12px;color:#aaa;">Reply to this email to respond to the user. Include [${vars.ticketCode}] in the subject.</p>
        `),
    },

    SUPPORT_USER_REPLY_NOTIFY: {
        subject: (vars) => `[${vars.ticketCode}] New message from user`,
        html: (vars) => layout(`
            <h2 style="margin:0 0 16px;color:${PRIMARY};font-size:18px;">New Reply on Ticket ${vars.ticketCode}</h2>
            <div style="border-left:4px solid #ccc;padding-left:16px;margin-bottom:20px;">
                <p style="margin:0;font-size:14px;color:#333;line-height:1.6;">"${vars.message}"</p>
            </div>
            <p style="margin:0;font-size:12px;color:#aaa;">Reply to this email to respond. Include [${vars.ticketCode}] in the subject line.</p>
        `),
    },

    // ─── Emergency ────────────────────────────

    SOS_ALERT_ADMIN: {
        subject: (vars) => `🚨 SOS ALERT — ${vars.userName} (${vars.userUniqueId})`,
        html: (vars) => layout(`
            <div style="background:#FFF0F0;border:2px solid #FF4444;border-radius:8px;padding:20px;margin-bottom:20px;">
                <h2 style="margin:0 0 4px;color:#CC0000;font-size:20px;">🚨 Emergency SOS Alert</h2>
                <p style="margin:0;color:#CC0000;font-size:13px;">Immediate attention required</p>
            </div>
            <div style="background:#F9F9F9;border-radius:8px;padding:20px;margin-bottom:20px;">
                <table width="100%" cellpadding="0" cellspacing="0">
                    <tr><td style="padding:5px 0;font-size:14px;color:#666;width:100px;">User</td><td style="font-size:14px;color:#222;font-weight:600;">${vars.userName} (${vars.userUniqueId})</td></tr>
                    <tr><td style="padding:5px 0;font-size:14px;color:#666;">Phone</td><td style="font-size:14px;color:#222;">${vars.phone}</td></tr>
                    ${vars.location ? `<tr><td style="padding:5px 0;font-size:14px;color:#666;">Location</td><td style="font-size:14px;color:#222;">${vars.location}</td></tr>` : ''}
                    <tr><td style="padding:5px 0;font-size:14px;color:#666;">Time</td><td style="font-size:14px;color:#CC0000;font-weight:600;">${new Date().toLocaleString('en-IN')}</td></tr>
                </table>
            </div>
            <p style="margin:0;font-size:13px;color:#555;">Contact the user immediately and dispatch help if required.</p>
        `),
    },

    // ─── HR / Careers ─────────────────────────

    CAREERS_ADMIN_NOTIFY: {
        subject: (vars) => `[Job Application] ${vars.role} — ${vars.name}`,
        html: (vars) => layout(`
            <h2 style="margin:0 0 16px;color:${PRIMARY};font-size:18px;">New Job Application</h2>
            <div style="background:#F9F9F9;border:1px solid #eee;border-radius:8px;padding:20px;margin-bottom:20px;">
                <table width="100%" cellpadding="0" cellspacing="0">
                    <tr><td style="padding:5px 0;font-size:14px;color:#666;width:130px;">Name</td><td style="font-size:14px;color:#222;font-weight:600;">${vars.name}</td></tr>
                    <tr><td style="padding:5px 0;font-size:14px;color:#666;">Email</td><td style="font-size:14px;color:#222;">${vars.email}</td></tr>
                    <tr><td style="padding:5px 0;font-size:14px;color:#666;">Phone</td><td style="font-size:14px;color:#222;">${vars.phone}</td></tr>
                    <tr><td style="padding:5px 0;font-size:14px;color:#666;">Role</td><td style="font-size:14px;color:${PRIMARY};font-weight:600;">${vars.role}</td></tr>
                    <tr><td style="padding:5px 0;font-size:14px;color:#666;">Experience</td><td style="font-size:14px;color:#222;">${vars.experience} years</td></tr>
                    ${vars.resumeLink ? `<tr><td style="padding:5px 0;font-size:14px;color:#666;">Resume</td><td style="font-size:14px;"><a href="${vars.resumeLink}" style="color:${PRIMARY};">View Resume</a></td></tr>` : ''}
                </table>
            </div>
            ${vars.coverLetter ? `
            <div style="border-left:4px solid ${PRIMARY};padding-left:16px;margin-bottom:20px;">
                <p style="margin:0 0 6px;font-size:13px;color:#999;font-weight:600;">COVER LETTER</p>
                <p style="margin:0;font-size:14px;color:#333;line-height:1.6;">${vars.coverLetter}</p>
            </div>` : ''}
        `),
    },

    CAREERS_APPLICANT_CONFIRM: {
        subject: (vars) => `Application Received: ${vars.role} at Ayuxa Platforms`,
        html: (vars) => layout(`
            <h2 style="margin:0 0 8px;color:${PRIMARY};font-size:20px;">Application Received! 🙌</h2>
            <p style="margin:0 0 20px;color:#555;font-size:15px;">Hi ${vars.name}, thank you for your interest in joining Ayuxa Platforms.</p>
            <p style="margin:0 0 20px;color:#555;font-size:14px;line-height:1.6;">
                We've received your application for the <strong>${vars.role}</strong> position. Our talent team is reviewing your profile and will reach out if your qualifications match our needs.
            </p>
            <div style="background:${BG};border:1px solid #c9e9d8;border-radius:8px;padding:20px;margin-bottom:24px;">
                <p style="margin:0 0 12px;font-size:14px;color:${PRIMARY};font-weight:700;">What happens next?</p>
                <ol style="margin:0;padding-left:20px;font-size:14px;color:#444;line-height:2;">
                    <li>Profile review within 3–5 business days</li>
                    <li>Initial screening call for shortlisted candidates</li>
                    <li>In-depth interviews with team leads</li>
                </ol>
            </div>
            <p style="margin:0;font-size:12px;color:#aaa;">This is an automated confirmation. Please do not reply to this email.</p>
        `),
    },

    // ─── Marketing ────────────────────────────

    NEWSLETTER_CONFIRM: {
        subject: () => `Welcome to the Ayuxa Journal!`,
        html: (vars) => layout(`
            <h2 style="margin:0 0 8px;color:${PRIMARY};font-size:24px;text-align:center;">You're In! 🎉</h2>
            <p style="margin:0 0 20px;color:#666;font-size:15px;text-align:center;">Thank you for subscribing to the Ayuxa Journal.</p>
            <div style="background:${BG};border:1px solid #c9e9d8;border-radius:8px;padding:24px;margin-bottom:24px;text-align:center;">
                <p style="margin:0;color:#444;font-size:15px;line-height:1.7;">
                    We share elder care insights, geriatric health tips, and community stories every week.
                    Our mission: helping every family give their elders the dignity they deserve.
                </p>
            </div>
            <p style="margin:0;font-size:13px;color:#aaa;text-align:center;">
                To ensure delivery, add <strong>care@ayuxacare.com</strong> to your contacts.
            </p>
        `),
    },

    WAITLIST_CONFIRM: {
        subject: (vars) => `You're on the Waitlist — ${vars.serviceName}`,
        html: (vars) => layout(`
            <h2 style="margin:0 0 8px;color:${PRIMARY};font-size:20px;">You're on the Waitlist! 🙌</h2>
            <p style="margin:0 0 20px;color:#555;font-size:15px;">Hi ${vars.name}, you've been added to the waitlist for <strong>${vars.serviceName}</strong>.</p>
            <div style="background:${BG};border:1px solid #c9e9d8;border-radius:8px;padding:20px;margin-bottom:24px;">
                <p style="margin:0 0 8px;font-size:14px;color:#333;"><strong>Service:</strong> ${vars.serviceName}</p>
                ${vars.city ? `<p style="margin:0 0 8px;font-size:14px;color:#333;"><strong>City:</strong> ${vars.city}</p>` : ''}
                <p style="margin:0;font-size:14px;color:#555;">We'll notify you as soon as this service becomes available in your area.</p>
            </div>
            <p style="margin:0;color:#777;font-size:13px;">Questions? Reach us at <a href="mailto:care@ayuxacare.com" style="color:${PRIMARY};">care@ayuxacare.com</a></p>
        `),
    },
};

module.exports = { EMAIL_TEMPLATES };
