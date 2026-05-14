const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function seedLegalDocs() {
  try {
    console.log('🌱 Seeding legal documents...');

    const disclaimerContent = `
<div class="space-y-8">
  <section class="space-y-4">
    <h2 class="text-2xl font-bold text-gray-900">No Medical Advice Disclaimer</h2>
    <p class="text-gray-700 leading-relaxed">
      The content provided on the Ayuxa website, including blogs, health tips, and care plans, is for informational purposes only.
    </p>
    <div class="space-y-3 pl-6 border-l-4 border-blue-400">
      <div>
        <h3 class="font-semibold text-gray-900">Not a doctor</h3>
        <p class="text-gray-700">Ayuxa is a care management company, not a hospital or a medical doctor. Our caregivers are trained for assistance, not for performing invasive medical procedures unless explicitly stated and performed by a qualified nurse/doctor.</p>
      </div>
      <div>
        <h3 class="font-semibold text-gray-900">Consult Professionals</h3>
        <p class="text-gray-700">Always seek the advice of a physician or qualified health provider regarding medical conditions. Never disregard professional medical advice or delay seeking it because of something read on this Website.</p>
      </div>
    </div>
  </section>

  <section class="space-y-4">
    <h2 class="text-2xl font-bold text-gray-900">Third-Party Service Disclaimer</h2>
    <p class="text-gray-700 leading-relaxed">
      Ayuxa may facilitate services provided by third-party vendors (such as physiotherapists, urban maintenance services, or diagnostic labs).
    </p>
    <div class="space-y-3 pl-6 border-l-4 border-blue-400">
      <div>
        <h3 class="font-semibold text-gray-900">Independent Contractors</h3>
        <p class="text-gray-700">These vendors are independent contractors and not employees of Ayuxa.</p>
      </div>
      <div>
        <h3 class="font-semibold text-gray-900">Liability</h3>
        <p class="text-gray-700">While we exercise due diligence in selecting partners, Ayuxa assumes no responsibility or liability for any act, error, omission, or negligence committed by third-party providers.</p>
      </div>
    </div>
  </section>

  <section class="space-y-4">
    <h2 class="text-2xl font-bold text-gray-900">"As Is" Warranty</h2>
    <p class="text-gray-700 leading-relaxed">
      The services and the website are provided on an "as is" and "as available" basis. Ayuxa makes no representations or warranties of any kind, express or implied, regarding the operation of the services or the information, content, or materials included.
    </p>
  </section>

  <section class="space-y-4">
    <h2 class="text-2xl font-bold text-gray-900">Outcome Disclaimer</h2>
    <p class="text-gray-700 leading-relaxed">
      While Ayuxa strives to improve the quality of life for elders, we cannot guarantee specific health outcomes. Health conditions are complex and variable; deterioration due to natural causes or pre-existing conditions is not the liability of Ayuxa.
    </p>
    <div class="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
      <p class="text-sm text-gray-700 italic">
        <strong>Legal Notice:</strong> Continued use of this website or our services constitutes acceptance of the terms outlined above.
      </p>
    </div>
  </section>
</div>
    `.trim();

    const statutoryContent = `
<div class="space-y-8">
  <section class="space-y-4">
    <h2 class="text-2xl font-bold text-gray-900">Corporate Identity</h2>
    <div class="space-y-2 text-gray-700">
      <p><strong>Legal Name of Entity:</strong> OLDFUL GENTLORA ESTEEM LLP</p>
      <p><strong>Headquarters Address:</strong> No 402-B 1TF, ITI HBCS Layout, Phase 3, Mysore Road Rajarajeshwari Nagar Bangalore 560039</p>
      <p><strong>Branch Office(s):</strong> None</p>
      <p><strong>Contact:</strong> <a href="mailto:compliance@ayuxa.com" class="text-blue-600 hover:underline">compliance@ayuxa.com</a> | +91 80621 80429</p>
    </div>
  </section>

  <section class="space-y-4">
    <h2 class="text-2xl font-bold text-gray-900">Grievance Redressal Mechanism</h2>
    <p class="text-sm text-gray-600 italic mb-4">(As per Rule 4(4) and Rule 4(5) of the Consumer Protection (E-Commerce) Rules, 2020)</p>
    <div class="space-y-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
      <div>
        <p class="font-semibold text-gray-900">Grievance Officer</p>
        <p class="text-gray-700">SK Murgan</p>
      </div>
      <div>
        <p class="font-semibold text-gray-900">Email</p>
        <p class="text-gray-700"><a href="mailto:compliance@ayuxa.com" class="text-blue-600 hover:underline">compliance@ayuxa.com</a></p>
      </div>
      <div>
        <p class="font-semibold text-gray-900">Direct Phone</p>
        <p class="text-gray-700">+91 80621 80429</p>
      </div>
    </div>
    <div class="mt-4 space-y-2 text-gray-700">
      <p><strong>Our Promise:</strong></p>
      <ul class="list-disc list-inside space-y-1 ml-2">
        <li>Acknowledgement within 48 hours</li>
        <li>Resolution within 1 month</li>
        <li>Unique Ticket Number provided for tracking</li>
      </ul>
    </div>
  </section>

  <section class="space-y-4">
    <h2 class="text-2xl font-bold text-gray-900">Nodal Officer</h2>
    <p class="text-sm text-gray-600 italic mb-4">(For Law Enforcement Coordination)</p>
    <div class="space-y-2 text-gray-700">
      <p><strong>Name:</strong> SK Murgan</p>
      <p><strong>Email:</strong> <a href="mailto:compliance@ayuxa.com" class="text-blue-600 hover:underline">compliance@ayuxa.com</a></p>
      <p><strong>Role:</strong> Responsible for compliance and coordination with government agencies/Police/Cyber Cells.</p>
    </div>
  </section>

  <section class="space-y-4">
    <h2 class="text-2xl font-bold text-gray-900">Service Provider Details</h2>
    <p class="text-gray-700 leading-relaxed">
      Ayuxa acts as a Marketplace / Facilitator for specific medical and home maintenance services. The specific service provider (Seller) details, including their legal name and contact, will be provided to the User upon confirmation of booking.
    </p>
    <p class="text-gray-700"><strong>Country of Origin:</strong> All services and goods supplied are of Indian Origin.</p>
  </section>

  <section class="space-y-4">
    <h2 class="text-2xl font-bold text-gray-900">Pricing & Payments</h2>
    <div class="space-y-3">
      <div>
        <h3 class="font-semibold text-gray-900">Single Figure Total</h3>
        <p class="text-gray-700">All subscription prices displayed include all compulsory charges, taxes (GST), and handling fees.</p>
      </div>
      <div>
        <h3 class="font-semibold text-gray-900">Price Breakup</h3>
        <p class="text-gray-700">A detailed breakup (Base Fee + GST) is provided at checkout.</p>
      </div>
      <div>
        <h3 class="font-semibold text-gray-900">Refunds</h3>
        <p class="text-gray-700">Governed by our <a href="/refund" class="text-blue-600 hover:underline">Refund Policy</a>.</p>
      </div>
    </div>
  </section>

  <section class="space-y-4">
    <h2 class="text-2xl font-bold text-gray-900">Quality Standards</h2>
    <p class="text-gray-700 leading-relaxed">
      Ayuxa maintains ISO 9001-2015 Certification, ensuring precision and excellence in our geriatric care management processes.
    </p>
  </section>
</div>
    `.trim();

    const servicePolicyContent = `
<div class="space-y-8">
  <section class="space-y-4">
    <h2 class="text-2xl font-bold text-gray-900">Purpose</h2>
    <p class="text-gray-700 leading-relaxed">
      To clearly define the duties, limitations, and operational protocols for Ayuxa Care Associates (Caregivers) and Care Managers to ensure professional, safe, and dignified care.
    </p>
  </section>

  <section class="space-y-6">
    <h2 class="text-2xl font-bold text-gray-900">Scope of Services (What We Do)</h2>
    <p class="text-gray-700 leading-relaxed mb-4">
      Our Care Associates are trained to assist with the following:
    </p>

    <div class="space-y-4">
      <div class="border-l-4 border-blue-400 pl-4">
        <h3 class="text-xl font-semibold text-gray-900">A. Personal Care (ADLs)</h3>
        <div class="mt-3 space-y-3">
          <div>
            <p class="font-semibold text-gray-900">Hygiene</p>
            <p class="text-gray-700">Bathing, sponging, grooming (hair/nails), and oral care.</p>
          </div>
          <div>
            <p class="font-semibold text-gray-900">Toileting</p>
            <p class="text-gray-700">Diaper changing, bedpan assistance, and catheter bag emptying (not insertion).</p>
          </div>
          <div>
            <p class="font-semibold text-gray-900">Mobility</p>
            <p class="text-gray-700">Assisting with walking, transfers (bed to wheelchair), and fall prevention.</p>
          </div>
        </div>
      </div>

      <div class="border-l-4 border-green-400 pl-4">
        <h3 class="text-xl font-semibold text-gray-900">B. Health Support</h3>
        <div class="mt-3 space-y-3">
          <div>
            <p class="font-semibold text-gray-900">Vitals Monitoring</p>
            <p class="text-gray-700">Checking BP, Sugar (Glucometer), Pulse, and Temperature.</p>
          </div>
          <div>
            <p class="font-semibold text-gray-900">Medication</p>
            <p class="text-gray-700">Reminding and administering oral medicines as per the prescription.</p>
          </div>
          <div>
            <p class="font-semibold text-gray-900">Exercise</p>
            <p class="text-gray-700">Assisting with basic physiotherapy exercises prescribed by a doctor.</p>
          </div>
        </div>
      </div>

      <div class="border-l-4 border-amber-400 pl-4">
        <h3 class="text-xl font-semibold text-gray-900">C. Nutritional Support</h3>
        <div class="mt-3 space-y-3">
          <p class="text-gray-700">Assisting with feeding (oral/tube feeding if qualified).</p>
          <p class="text-gray-700">Light meal preparation strictly for the patient (e.g., tea, oats, soup, khichdi).</p>
        </div>
      </div>

      <div class="border-l-4 border-purple-400 pl-4">
        <h3 class="text-xl font-semibold text-gray-900">D. Companionship</h3>
        <p class="text-gray-700 mt-3">Reading, conversation, accompanying on walks, and cognitive engagement activities.</p>
      </div>
    </div>
  </section>

  <section class="space-y-4">
    <h2 class="text-2xl font-bold text-gray-900">Service Exclusions (What We DO NOT Do)</h2>
    <p class="text-gray-700 leading-relaxed mb-4">
      To protect our staff and liability, Ayuxa Care Associates are strictly prohibited from performing these tasks:
    </p>
    <div class="space-y-3 p-4 bg-red-50 border border-red-200 rounded-lg">
      <div>
        <p class="font-semibold text-gray-900">Domestic Help</p>
        <p class="text-gray-700">No sweeping/mopping, washing family clothes, or cooking for other members. Cleaning is limited to patient's area.</p>
      </div>
      <div>
        <p class="font-semibold text-gray-900">Invasive Medical</p>
        <p class="text-gray-700">No injections (IV/IM), catheter insertion, or wound suturing (unless RN with prescription).</p>
      </div>
      <div>
        <p class="font-semibold text-gray-900">Financial Handling</p>
        <p class="text-gray-700">Forbidden from handling cash, credit cards, or ATM transactions.</p>
      </div>
      <div>
        <p class="font-semibold text-gray-900">Heavy Lifting</p>
        <p class="text-gray-700">Moving heavy furniture or gas cylinders.</p>
      </div>
    </div>
  </section>

  <section class="space-y-4">
    <h2 class="text-2xl font-bold text-gray-900">Staff Welfare & Working Conditions</h2>

    <div class="space-y-4">
      <div>
        <h3 class="font-semibold text-gray-900 text-lg">Rest Periods</h3>
        <div class="space-y-2 mt-2 pl-4">
          <div>
            <p class="font-semibold text-gray-800">12-Hour Shift</p>
            <p class="text-gray-700">1 hour of break time for meals/rest.</p>
          </div>
          <div>
            <p class="font-semibold text-gray-800">24-Hour (Live-in) Shift</p>
            <p class="text-gray-700">Min 8 hours sleep at night + 2 hours break during day. Continuous 24-hour wakefulness is not permitted.</p>
          </div>
        </div>
      </div>

      <div>
        <h3 class="font-semibold text-gray-900 text-lg">Food & Accommodation</h3>
        <p class="text-gray-700 mt-2">The Client must provide clean, hygienic sleeping arrangements (bed/mattress) and access to a toilet. Adequate food (3 meals + tea) must be provided, or a food allowance must be paid.</p>
      </div>

      <div>
        <h3 class="font-semibold text-gray-900 text-lg">Safety</h3>
        <p class="text-gray-700 mt-2">The environment must be free from harassment. We reserve the right to pull staff out immediately if they face verbal or physical abuse.</p>
      </div>

      <div>
        <h3 class="font-semibold text-gray-900 text-lg">Inventory & Consumables</h3>
        <ul class="list-disc list-inside space-y-1 mt-2 text-gray-700">
          <li>Family must provide all necessary medical/hygiene supplies (Gloves, Sanitizers, Diapers, etc)</li>
          <li>Staff will use resources efficiently but are not liable for cost of replenishment.</li>
        </ul>
      </div>
    </div>
  </section>

  <section class="space-y-4">
    <h2 class="text-2xl font-bold text-gray-900">Cross-Gender Care Policy</h2>
    <ul class="list-disc list-inside space-y-2 text-gray-700">
      <li>Generally assign same-gender care for personal hygiene tasks.</li>
      <li>Exceptions made ONLY upon explicit written family request and staff consent.</li>
    </ul>
  </section>

  <section class="space-y-4">
    <h2 class="text-2xl font-bold text-gray-900">Medical Disclaimer</h2>
    <p class="text-gray-700 leading-relaxed">
      Ayuxa Care Associates are caregivers, not doctors. They will never make medical decisions (e.g. insulin adjustment). They will contact the Family or Care Manager who will consult the treating physician.
    </p>
  </section>
</div>
    `.trim();

    // Seed documents
    let disclaimer = await prisma.legalDocument.findFirst({
      where: { type: 'DISCLAIMER' },
    });

    if (disclaimer) {
      disclaimer = await prisma.legalDocument.update({
        where: { id: disclaimer.id },
        data: {
          title: 'Disclaimer',
          content: disclaimerContent,
          status: 'PUBLISHED',
          publishedAt: new Date(),
        },
      });
    } else {
      disclaimer = await prisma.legalDocument.create({
        data: {
          type: 'DISCLAIMER',
          title: 'Disclaimer',
          content: disclaimerContent,
          status: 'PUBLISHED',
          publishedAt: new Date(),
        },
      });
    }
    console.log('✅ Disclaimer document seeded');

    let statutory = await prisma.legalDocument.findFirst({
      where: { type: 'STATUTORY_DISCLOSURES' },
    });

    if (statutory) {
      statutory = await prisma.legalDocument.update({
        where: { id: statutory.id },
        data: {
          title: 'Statutory Disclosures',
          content: statutoryContent,
          status: 'PUBLISHED',
          publishedAt: new Date(),
        },
      });
    } else {
      statutory = await prisma.legalDocument.create({
        data: {
          type: 'STATUTORY_DISCLOSURES',
          title: 'Statutory Disclosures',
          content: statutoryContent,
          status: 'PUBLISHED',
          publishedAt: new Date(),
        },
      });
    }
    console.log('✅ Statutory Disclosures document seeded');

    let servicePolicy = await prisma.legalDocument.findFirst({
      where: { type: 'SERVICE_POLICY' },
    });

    if (servicePolicy) {
      servicePolicy = await prisma.legalDocument.update({
        where: { id: servicePolicy.id },
        data: {
          title: 'Service Scope & Operational Policy',
          content: servicePolicyContent,
          status: 'PUBLISHED',
          publishedAt: new Date(),
        },
      });
    } else {
      servicePolicy = await prisma.legalDocument.create({
        data: {
          type: 'SERVICE_POLICY',
          title: 'Service Scope & Operational Policy',
          content: servicePolicyContent,
          status: 'PUBLISHED',
          publishedAt: new Date(),
        },
      });
    }
    console.log('✅ Service Policy document seeded');

    console.log('\n🎉 All legal documents seeded successfully!');
  } catch (error) {
    console.error('❌ Error seeding documents:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

seedLegalDocs();
