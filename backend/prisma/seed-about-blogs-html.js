const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const aboutHtml = `<section>
  <h1 class="text-4xl md:text-5xl font-bold text-gray-900 mb-6">About Ayuxa</h1>
  <p class="text-lg text-gray-600 leading-relaxed mb-6">
    Ayuxa provides comprehensive elder care management services, including care coordination, health monitoring, and assistance with daily living activities. We act as a dedicated care management platform, blending technology with deep human empathy to keep your loved ones safe.
  </p>
</section>

<section id="statutory" class="bg-gray-50 p-8 md:p-10 rounded-3xl border border-gray-100">
  <h2 class="text-2xl font-bold text-gray-900 mb-6">Statutory Disclosures</h2>
  <p class="text-sm text-gray-500 mb-8 italic">(As per Consumer Protection [E-Commerce] Rules, 2020)</p>
  
  <div class="flex flex-col gap-8">
    <div>
      <h3 class="text-lg font-bold text-gray-800 mb-3 block">Corporate Identity</h3>
      <ul class="list-none flex flex-col gap-2 text-gray-600">
        <li><strong class="text-gray-800">Legal Name:</strong> OLDFUL GENTLORA ESTEEM LLP</li>
        <li><strong class="text-gray-800">Headquarters Address:</strong> No 402-B 1TF, ITI HBCS Layout, Phase 3, Mysore Road Rajarajeshwari Nagar Bangalore 560039</li>
        <li><strong class="text-gray-800">Email:</strong> <a href="mailto:compliance@Ayuxa.com" class="text-[var(--color-primary)] hover:underline">compliance@Ayuxa.com</a></li>
        <li><strong class="text-gray-800">Mobile:</strong> +91 80621 80429</li>
        <li><strong class="text-gray-800">Website:</strong> www.Ayuxa.com</li>
      </ul>
    </div>

    <div>
      <h3 class="text-lg font-bold text-gray-800 mb-3 block">Grievance Redressal Mechanism</h3>
      <p class="text-gray-600 mb-3">If you have a complaint regarding our services, privacy, or usage, please contact our designated officer:</p>
      <ul class="list-none flex flex-col gap-2 text-gray-600 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <li><strong class="text-gray-800">Grievance Officer:</strong> SK Murgan</li>
        <li><strong class="text-gray-800">Email:</strong> <a href="mailto:compliance@Ayuxa.com" class="text-[var(--color-primary)] hover:underline">compliance@Ayuxa.com</a></li>
        <li><strong class="text-gray-800">Phone:</strong> +91 80621 80429</li>
        <li><strong class="text-gray-800">Address:</strong> No 402-B 1TF, ITI HBCS Layout, Phase 3, Mysore Road Rajarajeshwari Nagar Bangalore 560039</li>
      </ul>
      <p class="text-gray-600 mt-4 leading-relaxed bg-blue-50/50 p-4 rounded-xl border border-blue-100">
        <strong>Our Promise:</strong> We will acknowledge your complaint within 48 hours and resolve it within 1 month from the date of receipt. You will be issued a unique Ticket Number to track the status of your complaint.
      </p>
    </div>
    
    <div>
      <h3 class="text-lg font-bold text-gray-800 mb-3 block">Nodal Officer</h3>
      <p class="text-gray-600 mb-3">For Law Enforcement Coordination.</p>
      <ul class="list-none flex flex-col gap-2 text-gray-600">
        <li><strong class="text-gray-800">Name:</strong> SK Murgan</li>
        <li><strong class="text-gray-800">Email:</strong> compliance@Ayuxa.com</li>
      </ul>
    </div>
  </div>
</section>

<section id="refund" class="bg-red-50 p-8 md:p-10 rounded-3xl border border-red-100">
  <h2 class="text-2xl font-bold text-red-900 mb-4">Refund Policy Overview</h2>
  <p class="text-red-800 leading-relaxed">
    <strong>Cancellations:</strong> Refunds for mid-cycle cancellations are calculated on a pro-rata basis, subject to a distinct cancellation fee.<br /><br />
    <strong>Service Failure:</strong> Full refunds are issued only if Ayuxa fails to deploy a caregiver/service as per the agreed Service Level Agreement (SLA).
  </p>
</section>`;

const blogsHtml = `<section style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 2rem; margin-bottom: 3rem;">
  <!-- Article 1 -->
  <div style="background-color: #ffffff; border-radius: 2rem; border: 1px solid #f3f4f6; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.05); display: flex; flex-direction: column;">
    <div style="position: relative; height: 14rem; overflow: hidden;">
      <img src="https://plus.unsplash.com/premium_photo-1663036976879-4baf18adfd5b?w=600&auto=format&fit=crop&q=60" alt="Understanding Elder Care" style="width: 100%; height: 100%; object-fit: cover;" />
      <span style="position: absolute; top: 1rem; left: 1rem; padding: 0.25rem 0.75rem; background-color: rgba(255,255,255,0.9); backdrop-filter: blur(4px); color: #10b981; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; border-radius: 0.5rem;">Caregiving</span>
    </div>
    <div style="padding: 1.5rem; flex: 1; display: flex; flex-direction: column; justify-content: space-between;">
      <div>
        <div style="display: flex; gap: 1rem; color: #9ca3af; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 1rem;">
          <span>April 10, 2026</span>
          <span>Dr. Satish Babu</span>
        </div>
        <h3 style="font-size: 1.25rem; font-weight: 700; color: #111827; margin-bottom: 0.75rem;">Understanding Elder Care: A Comprehensive Guide</h3>
        <p style="font-size: 0.875rem; color: #6b7280; line-height: 1.6; margin-bottom: 1.5rem;">Learn about the different aspects of elder care and how to choose the right services for your loved ones.</p>
      </div>
      <a href="#" style="color: #10b981; font-weight: 700; font-size: 0.875rem; text-decoration: none;">Keep Reading →</a>
    </div>
  </div>

  <!-- Article 2 -->
  <div style="background-color: #ffffff; border-radius: 2rem; border: 1px solid #f3f4f6; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.05); display: flex; flex-direction: column;">
    <div style="position: relative; height: 14rem; overflow: hidden;">
      <img src="https://images.unsplash.com/photo-1441986300917-64674bd600d8?q=80&w=800&auto=format&fit=crop" alt="Social Interaction" style="width: 100%; height: 100%; object-fit: cover;" />
      <span style="position: absolute; top: 1rem; left: 1rem; padding: 0.25rem 0.75rem; background-color: rgba(255,255,255,0.9); backdrop-filter: blur(4px); color: #10b981; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; border-radius: 0.5rem;">Wellness</span>
    </div>
    <div style="padding: 1.5rem; flex: 1; display: flex; flex-direction: column; justify-content: space-between;">
      <div>
        <div style="display: flex; gap: 1rem; color: #9ca3af; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 1rem;">
          <span>April 5, 2026</span>
          <span>Emily Chen</span>
        </div>
        <h3 style="font-size: 1.25rem; font-weight: 700; color: #111827; margin-bottom: 0.75rem;">The Importance of Social Interaction for Seniors</h3>
        <p style="font-size: 0.875rem; color: #6b7280; line-height: 1.6; margin-bottom: 1.5rem;">Discover why staying socially active is crucial for the mental and physical health of senior citizens.</p>
      </div>
      <a href="#" style="color: #10b981; font-weight: 700; font-size: 0.875rem; text-decoration: none;">Keep Reading →</a>
    </div>
  </div>

  <!-- Article 3 -->
  <div style="background-color: #ffffff; border-radius: 2rem; border: 1px solid #f3f4f6; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.05); display: flex; flex-direction: column;">
    <div style="position: relative; height: 14rem; overflow: hidden;">
      <img src="https://images.unsplash.com/photo-1733685373369-95bda03f2b40?w=600&auto=format&fit=crop&q=60" alt="Tech Solutions" style="width: 100%; height: 100%; object-fit: cover;" />
      <span style="position: absolute; top: 1rem; left: 1rem; padding: 0.25rem 0.75rem; background-color: rgba(255,255,255,0.9); backdrop-filter: blur(4px); color: #10b981; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; border-radius: 0.5rem;">Technology</span>
    </div>
    <div style="padding: 1.5rem; flex: 1; display: flex; flex-direction: column; justify-content: space-between;">
      <div>
        <div style="display: flex; gap: 1rem; color: #9ca3af; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 1rem;">
          <span>March 28, 2026</span>
          <span>Dhemaan G. Aditya</span>
        </div>
        <h3 style="font-size: 1.25rem; font-weight: 700; color: #111827; margin-bottom: 0.75rem;">Tech Solutions for Aging in Place</h3>
        <p style="font-size: 0.875rem; color: #6b7280; line-height: 1.6; margin-bottom: 1.5rem;">Exploring how modern technology is making it safer and easier for elders to live independently at home.</p>
      </div>
      <a href="#" style="color: #10b981; font-weight: 700; font-size: 0.875rem; text-decoration: none;">Keep Reading →</a>
    </div>
  </div>
</section>`;

async function main() {
  const config = await prisma.uIConfig.findUnique({
    where: { key: 'company_global_config' }
  });

  if (!config) {
    console.error('company_global_config not found!');
    return;
  }

  let configJson = {};
  if (typeof config.configJson === 'string') {
    try {
      configJson = JSON.parse(config.configJson);
    } catch (_) {}
  } else if (typeof config.configJson === 'object' && config.configJson !== null) {
    configJson = config.configJson;
  }

  configJson.about_html = aboutHtml;
  configJson.blogs_html = blogsHtml;

  await prisma.uIConfig.update({
    where: { key: 'company_global_config' },
    data: {
      configJson: configJson
    }
  });

  console.log('Seeded about_html and blogs_html successfully!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
