const prisma = require('../src/config/database');

const FAQS = [
  { question: 'How do I book a service?', answer: 'Tap any service on the Home screen and follow the steps.', order: 1 },
  { question: 'Is SOS always available?', answer: 'Yes, SOS is 24/7. It alerts our team and your emergency contacts instantly.', order: 2 },
  { question: 'How can I get my lab reports?', answer: 'Reports appear in My Health -> Prescriptions and are sent via WhatsApp/Email.', order: 3 },
  { question: 'What is the refund policy?', answer: 'Cancel 2 hours before the slot for a full refund. Settlement takes 5-7 business days.', order: 4 },
  { question: 'How to add emergency contacts?', answer: 'Go to My Profile -> Emergency Contacts.', order: 5 },
  { question: 'How do I reschedule a service booking?', answer: 'Go to My Bookings, select your active booking, and tap Reschedule, or chat/call our support team.', order: 6 },
  { question: 'Can I book services for family members?', answer: 'Yes, you can add family members under My Profile -> Family Members and select them when making a booking.', order: 7 },
  { question: 'Are caregivers verified?', answer: 'Yes, all our caregivers and support buddies undergo background verification, screening, and basic medical training.', order: 8 },
  { question: 'How do I upgrade to a premium plan?', answer: 'Navigate to My Profile -> Subscription & Membership, select your preferred plan, and proceed to checkout.', order: 9 },
  { question: 'What should I do in a medical emergency?', answer: 'For life-threatening emergencies, call national emergency lines immediately. Tap the SOS Assist button on our app to alert our local response team and your emergency contacts.', order: 10 },
];

(async () => {
  const existing = await prisma.fAQ.count();
  if (existing > 0) {
    console.log(`FAQ table already has ${existing} rows, skipping seed.`);
    process.exit(0);
  }
  for (const f of FAQS) {
    await prisma.fAQ.create({ data: f });
  }
  console.log(`Seeded ${FAQS.length} FAQs.`);
  process.exit(0);
})();
