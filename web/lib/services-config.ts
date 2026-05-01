export interface ServiceConfig {
  id: string;
  slug: string;
  category: 'medical' | 'home-essentials' | 'diagnostic' | 'wellness';
  title: string;
  tagline: string;
  description: string;
  icon: string;
  heroImage: string;
  inclusions: string[];
  howItWorks: string[];
  faqs: { q: string; a: string }[];
  pricing: { label: string; price: number }[];
  formFields: {
    id: string;
    label: string;
    type: 'text' | 'select' | 'textarea' | 'number';
    placeholder?: string;
    options?: string[];
    required?: boolean;
  }[];
}

export const SERVICES_CONFIG: Record<string, ServiceConfig> = {
  // ─── MEDICAL SERVICES ───
  'home-nurse': {
    id: 'home-nurse',
    slug: 'home-nurse',
    title: 'Nurse Home Visit',
    tagline: 'Professional nursing care at your doorstep',
    category: 'medical',
    description: 'Get hospital-grade nursing care in the comfort of your home. From wound dressing to post-surgical care, our qualified nurses ensure professional medical attention.',
    icon: 'afd8e2afab202de7ddce09bf8add378c861b9347.png',
    heroImage: 'nurse-hero.jpg',
    inclusions: [
      'Vital signs monitoring',
      'Medication management',
      'Wound dressing & care',
      'IV infusions & injections',
      'Post-surgical support'
    ],
    howItWorks: [
      'Select nursing requirement',
      'Choose timing & duration',
      'Expert nurse arrives',
      'Receive professional care'
    ],
    faqs: [
      { q: 'Are your nurses qualified?', a: 'Yes, all our nurses are certified professionals with clinical experience.' },
      { q: 'Can I book for 24 hours?', a: 'Yes, we offer both shift-based and 24-hour live-in nursing options.' }
    ],
    pricing: [{ label: 'Starting from', price: 499 }],
    formFields: [
      { id: 'recipient', label: 'Who is it for?', type: 'select', options: ['Self', 'Spouse', 'Parent'], required: true },
      { id: 'staffType', label: 'Staff Type', type: 'select', options: ['Qualified Nurse', 'Bedside Attendant'], required: true },
      { id: 'duration', label: 'Duration', type: 'select', options: ['Short Visit', '12 Hours (Day)', '12 Hours (Night)', '24 Hours (Live-in)'], required: true },
      { id: 'condition', label: 'Patient Condition', type: 'select', options: ['Walking/Mobile', 'Bedridden', 'Post-Surgery'], required: true },
      { id: 'gender', label: 'Gender Preference', type: 'select', options: ['Male', 'Female', 'Any'], required: true }
    ]
  },

  'blood-test': {
    id: 'blood-test',
    slug: 'blood-test',
    title: 'Blood Test at Home',
    tagline: 'Safe & painless sample collection at home',
    category: 'diagnostic',
    description: 'Book diagnostic tests and full body checkups. Certified phlebotomists will collect samples from your home, and reports will be delivered online.',
    icon: 'f74321d18a86a9e77628058ed35a50d284752eb2.png',
    heroImage: 'diagnostic-hero.jpg',
    inclusions: [
      'Home sample collection',
      'NABL certified labs',
      'Digital reports in 24h',
      'Doctor report review',
      'Painless collection'
    ],
    howItWorks: [
      'Choose your test/package',
      'Schedule collection time',
      'Phlebotomist visits home',
      'View reports on app/email'
    ],
    faqs: [
      { q: 'Is fasting required?', a: 'Fasting requirements depend on the test. Sugar and Lipid tests usually require 10-12h fasting.' },
      { q: 'How long to get reports?', a: 'Most reports are delivered within 24 hours of collection.' }
    ],
    pricing: [{ label: 'Basic Health', price: 599 }],
    formFields: [
      { id: 'testType', label: 'Select Test / Package', type: 'select', options: ['Full Body Package', 'Sugar (Fasting)', 'Lipid Profile', 'Thyroid Profile', 'Custom Test'], required: true }
    ]
  },

  'hospital-trip': {
    id: 'hospital-trip',
    slug: 'hospital-trip',
    title: 'Hospital Trip & Support',
    tagline: 'A buddy to accompany you to the hospital',
    category: 'medical',
    description: 'Don\'t go to the hospital alone. Our Oldful buddies will accompany you, help with paperwork, and stay with you throughout your appointment.',
    icon: 'e1baef7b977f856b4e0401f74fbf21e0ce5348f7.png',
    heroImage: 'escort-hero.jpg',
    inclusions: [
      'Buddy companionship',
      'Paperwork assistance',
      'Pharmacy coordination',
      'Transportation help',
      'Safe return home'
    ],
    howItWorks: [
      'Select hospital & specialist',
      'Book a buddy for the slot',
      'Buddy meets you at home/hospital',
      'Hassle-free hospital visit'
    ],
    faqs: [
      { q: 'Do you provide transport?', a: 'We can arrange a cab for you as an add-on, or meet you at the hospital.' },
      { q: 'How long does a session last?', a: 'A standard session covers up to 4 hours of hospital assistance.' }
    ],
    pricing: [{ label: 'Standard Support', price: 500 }],
    formFields: [
      { id: 'specialist', label: 'Specialist Needed', type: 'select', options: ['General', 'Eye Specialist', 'Brain & Nerves', 'Kidney & Urinary', 'Lungs & Breathing', 'Dental Care', 'Cancer Specialist'], required: true },
      { id: 'hospital', label: 'Preferred Hospital', type: 'text', placeholder: 'e.g., St. Johns Hospital', required: true },
      { id: 'doctorType', label: 'Doctor Preference', type: 'select', options: ['Recommend for me', 'I have a preferred doctor'], required: true },
      { id: 'preferredDoctor', label: 'Doctor Name (If preferred)', type: 'text', placeholder: 'Dr. Anil Mehta' },
      { id: 'transport', label: 'Need Cab Arrangement?', type: 'select', options: ['Yes', 'No'], required: true }
    ]
  },

  'doctor-home-visit': {
    id: 'doctor-home-visit',
    slug: 'doctor-home-visit',
    category: 'medical',
    title: 'Doctor Home Visit',
    tagline: 'Certified physician at your door',
    description: 'Professional General Physicians and Physiotherapists for non-emergency issues at home.',
    icon: '32a4661f97e2fa2dd2c85c403a7c530b7214e7f7.png',
    heroImage: 'doctor-hero.jpg',
    inclusions: [
      'Clinical assessment',
      'Digital prescription',
      'Medicine guidance',
      'Follow-up plan'
    ],
    howItWorks: [
      'Select symptoms',
      'Choose doctor type',
      'Doctor visits home',
      'Receive treatment'
    ],
    pricing: [{ label: 'GP Visit', price: 499 }, { label: 'Physio Visit', price: 699 }],
    faqs: [
      { q: 'How fast will they arrive?', a: 'Typically within 60 minutes for ASAP bookings.' }
    ],
    formFields: [
      { id: 'symptoms', label: 'Select Symptoms', type: 'select', options: ['Fever/Flu', 'BP/Sugar Check', 'General Weakness', 'Body Pain', 'Post-Surgery Rehab', 'Stroke Recovery', 'Other'], required: true },
      { id: 'doctorType', label: 'Doctor Type', type: 'select', options: ['General Physician', 'Physiotherapist'], required: true },
      { id: 'visitType', label: 'Visit Type', type: 'select', options: ['Home Session', 'Clinic Visit'], required: true },
      { id: 'urgency', label: 'When?', type: 'select', options: ['Come ASAP', 'Schedule Later'], required: true }
    ]
  },

  'physio-fitness': {
    id: 'physio-fitness',
    slug: 'physio-fitness',
    title: 'Physio & Fitness',
    tagline: 'Stay mobile and pain-free',
    category: 'medical',
    description: 'Expert physiotherapy for pain relief and senior-friendly yoga sessions to improve mobility and strength.',
    icon: '54f5c849cf75e776592dec8236f221da3694ca53.png',
    heroImage: 'physio-hero.jpg',
    inclusions: [
      'Pain assessment',
      'Manual therapy',
      'Personalized exercise plan',
      'Mobility training'
    ],
    howItWorks: [
      'Select pain relief or fitness',
      'Identify focus area',
      'Expert visit',
      'Therapy session'
    ],
    faqs: [
      { q: 'Is it only for seniors?', a: 'Our sessions are tailored for seniors but beneficial for all adults.' }
    ],
    pricing: [{ label: 'Per Session', price: 699 }],
    formFields: [
      { id: 'service', label: 'Select Service', type: 'select', options: ['Pain Relief (Physiotherapy)', 'Senior Fitness (Yoga/Exercise)'], required: true },
      { id: 'bodyPart', label: 'Focus Area', type: 'select', options: ['Back', 'Knee', 'Neck', 'Shoulder', 'Leg', 'Other'], required: true },
      { id: 'details', label: 'Issue Details', type: 'textarea', placeholder: 'Describe your pain or requirements...' }
    ]
  },

  'equipment-rental': {
    id: 'equipment-rental',
    slug: 'equipment-rental',
    title: 'Medical Equipment Rental',
    tagline: 'Hospital beds, wheelchairs & more',
    category: 'diagnostic',
    description: 'High-quality medical equipment available for rent. We deliver and set up everything at your home.',
    icon: 'd3906f517597b2ef10369d92c422b16bf20e879e.png',
    heroImage: 'equipment-hero.jpg',
    inclusions: [
      'Home delivery',
      'Professional setup',
      'Maintenance support',
      'Easy return'
    ],
    howItWorks: [
      'Select equipment',
      'Choose rental duration',
      'Safe delivery & setup',
      'Pick-up when done'
    ],
    faqs: [
      { q: 'Is there a deposit?', a: 'Yes, a refundable security deposit is required for certain equipment.' }
    ],
    pricing: [{ label: 'Starting from', price: 500 }],
    formFields: [
      { id: 'equipment', label: 'Equipment Needed', type: 'select', options: ['Wheelchair', 'Hospital Bed', 'Oxygen Concentrator', 'Walker/Stick'], required: true },
      { id: 'duration', label: 'Rental Duration', type: 'select', options: ['Weekly', 'Monthly', 'Custom'], required: true }
    ]
  },

  'insurance': {
    id: 'insurance',
    slug: 'insurance',
    title: 'Insurance Assistance',
    tagline: 'Claims and policy management support',
    category: 'diagnostic',
    description: 'Expert help in understanding your insurance policies, managing claims, and navigating health infrastructure.',
    icon: 'e453f94c7e87531b0da0b6712f8dc4b3bc7084a9.png',
    heroImage: 'insurance-hero.jpg',
    inclusions: [
      'Policy review',
      'Pre-auth assistance',
      'Documentation support'
    ],
    howItWorks: [
      'Share policy details',
      'Expert consultation',
      'Support initiated'
    ],
    faqs: [
      { q: 'Do you provide insurance?', a: 'No, we only assist you in managing and claiming your existing policies.' }
    ],
    pricing: [{ label: 'Consultation', price: 499 }],
    formFields: [
      { id: 'recipient', label: 'Policy Holder', type: 'select', options: ['Self', 'Parents'], required: true },
      { id: 'conditions', label: 'Pre-existing Conditions', type: 'select', options: ['Diabetes', 'Hypertension', 'Heart Condition', 'None'], required: true },
      { id: 'details', label: 'Describe Requirements', type: 'textarea', placeholder: 'What do you need help with?' }
    ]
  },

  // ─── HOME ESSENTIALS SERVICES ───
  'appliance-repair': {
    id: 'appliance-repair',
    slug: 'appliance-repair',
    category: 'home-essentials',
    title: 'AC & Appliance Repair',
    tagline: 'Fix any household appliance within 90 mins',
    description: 'Professional technicians for your AC, Refrigerator, Washing Machine, and more. Certified and background-checked experts.',
    icon: 'fa6360cf6179cebaed29a6c808bafae2d31ad753.png',
    heroImage: 'appliance-hero.jpg',
    inclusions: ['Diagnosis & inspection', 'Genuine spare parts', 'Service warranty', 'Certified technicians'],
    howItWorks: ['Select appliance', 'Technician visit', 'Repair initiated', 'Work finished'],
    pricing: [{ label: 'Visit Fee', price: 299 }],
    faqs: [{ q: 'Is there a visit charge?', a: 'Yes, but it is adjusted against the final repair bill.' }],
    formFields: [
      { id: 'appliance', label: 'Appliance Model', type: 'text', placeholder: 'e.g., Samsung Front Load', required: true },
      { id: 'issue', label: 'Describe the issue', type: 'textarea', placeholder: 'Not cooling / making noise...', required: true }
    ]
  },

  'deep-cleaning': {
    id: 'deep-cleaning',
    slug: 'deep-cleaning',
    category: 'home-essentials',
    title: 'Professional Deep Cleaning',
    tagline: 'Sparkling clean homes',
    description: 'Full home cleaning using eco-friendly chemicals and heavy-duty equipment.',
    icon: 'ad6b9b061bc7b1487a0e73c2557f711136d2a4d9.png',
    heroImage: 'cleaning-hero.jpg',
    inclusions: ['Sanitization', 'Window cleaning', 'Kitchen degreasing', 'Floor scrubbing'],
    howItWorks: ['Choose area size', 'Team arrival', 'Deep cleaning', 'Inspection'],
    pricing: [{ label: 'Starting at', price: 1999 }],
    faqs: [{ q: 'Do you bring equipment?', a: 'Yes, we bring all tools and chemicals.' }],
    formFields: [
      { id: 'area', label: 'Cleaning Area', type: 'select', options: ['Full Home', 'Kitchen Only', 'Bathroom Only', 'Sofa/Curtain'], required: true },
      { id: 'size', label: 'Home Size', type: 'select', options: ['1 BHK', '2 BHK', '3 BHK', 'Villa'], required: true }
    ]
  },

  'plumbing-electrical': {
    id: 'plumbing-electrical',
    slug: 'plumbing-electrical',
    category: 'home-essentials',
    title: 'Plumbing & Electrical',
    tagline: 'Licensed experts for all home fixes',
    description: 'Reliable repair and installation for leaking taps, fuse fixes, and wiring issues.',
    icon: '8ce612b04a3a83f1e834c7b71a6dd2c0174cb918.png',
    heroImage: 'plumbing-hero.jpg',
    inclusions: ['Fast arrival', 'Quality material', 'Fair pricing', 'Clean workspace'],
    howItWorks: ['Select problem', 'Technician visit', 'Work finished'],
    pricing: [{ label: 'Inspection Fee', price: 199 }],
    faqs: [],
    formFields: [
      { id: 'workType', label: 'Service Type', type: 'select', options: ['Plumbing', 'Electrical', 'Carpentry'], required: true },
      { id: 'issue', label: 'Problem Description', type: 'textarea', placeholder: 'Describe the issue...', required: true }
    ]
  },

  'grocery-run': {
    id: 'grocery-run',
    slug: 'grocery-run',
    category: 'home-essentials',
    title: 'Grocery Run / Errand',
    tagline: 'Fresh supplies delivered ASAP',
    description: 'Buddies to pick up anything you need from local stores and deliver straight to your kitchen.',
    icon: '8888c71f466119aa294bd00136ff887f616d4737.png',
    heroImage: 'grocery-hero.jpg',
    inclusions: ['Quality selection', 'Home delivery', 'Price list sharing'],
    howItWorks: ['List your items', 'Buddy heads out', 'Delivery done'],
    pricing: [{ label: 'Delivery Fee', price: 99 }],
    faqs: [],
    formFields: [
      { id: 'items', label: 'Grocery List', type: 'textarea', placeholder: 'e.g., 2kg Rice, 1L Milk...', required: true },
      { id: 'store', label: 'Preferred Store', type: 'text', placeholder: 'e.g. BigBasket, Local Shop' }
    ]
  },

  'tech-helper': {
    id: 'tech-helper',
    slug: 'tech-helper',
    category: 'home-essentials',
    title: 'Tech Helper',
    tagline: 'We fix phones, Wi-Fi, and remotes',
    description: 'Get help with WhatsApp, digital payments, Wi-Fi setup, and smart home devices.',
    icon: 'fa6360cf6179cebaed29a6c808bafae2d31ad753.png',
    heroImage: 'tech-hero.jpg',
    inclusions: ['Patience & teaching', 'Safe setup', 'Error fixing'],
    howItWorks: ['Select issue', 'Support mode', 'Buddy assists'],
    pricing: [{ label: 'Starting at', price: 399 }],
    faqs: [],
    formFields: [
      { id: 'issueType', label: 'What is the issue?', type: 'select', options: ['Phone Help (WhatsApp/Zoom)', 'TV & Wi-Fi', 'Banking/UPI Help', 'Smart Device Setup', 'Other'], required: true },
      { id: 'details', label: 'Problem Details', type: 'textarea', placeholder: 'Describe what you need help with...' },
      { id: 'mode', label: 'Support Mode', type: 'select', options: ['Home Visit (₹599)', 'Phone Call (₹399)'], required: true }
    ]
  },

  'tiffin': {
    id: 'tiffin',
    slug: 'tiffin',
    category: 'home-essentials',
    title: 'Home Meal Service',
    tagline: 'Home-cooked healthy meals',
    description: 'Nutritious, low-spice, and hygienic meals tailored for senior health.',
    icon: '8f136eff1200bb21c080348f6cdb7ad1c2831bdf.png',
    heroImage: 'meal-hero.jpg',
    inclusions: ['Nutrient balanced', 'Hygienic prep', 'Timely delivery'],
    howItWorks: ['Select meal type', 'Choose plan', 'Daily delivery'],
    pricing: [{ label: 'Trial Meal', price: 150 }],
    faqs: [],
    formFields: [
      { id: 'mealType', label: 'Meal Preference', type: 'select', options: ['Pure Veg', 'Veg + Egg', 'Non-Veg'], required: true },
      { id: 'plan', label: 'Subscription Plan', type: 'select', options: ['One-time Trial', 'Weekly (7 Days)', 'Monthly (30 Days)'], required: true },
      { id: 'specialNote', label: 'Special Instructions', type: 'text', placeholder: 'e.g., No Onion/Garlic' }
    ]
  },

  'medicines': {
    id: 'medicines',
    slug: 'medicines',
    category: 'wellness',
    title: 'Medicine Delivery',
    tagline: 'Fast delivery of verified meds',
    description: 'Upload your prescription and get medicines delivered home with great discounts.',
    icon: '79c15725f6f1a73658b615886f1289634cef9408.png',
    heroImage: 'medicine-hero.jpg',
    inclusions: ['Verified meds', 'Best discounts', 'Quick delivery'],
    howItWorks: ['Upload prescription', 'Buddy confirms meds', 'Delivery & payment'],
    pricing: [{ label: 'Service Charge', price: 0 }],
    faqs: [],
    formFields: [
      { id: 'notes', label: 'Notes for Pharmacist', type: 'textarea', placeholder: 'Any specific brand or pack size?' }
    ]
  },

  'driving-cab': {
    id: 'driving-cab',
    slug: 'driving-cab',
    category: 'home-essentials',
    title: 'Driving & Cab',
    tagline: 'Secure and comfortable rides',
    description: 'Hire a reliable driver for your car or book an assisted cab for safe trips.',
    icon: '60d4d0afa5801aeaa9e593bc049e3b017ef5624c.png',
    heroImage: 'driver-hero.jpg',
    inclusions: ['Verified drivers', 'GPS tracking', 'Assisted booking'],
    howItWorks: ['Enter locations', 'Choose vehicle', 'Trip starts'],
    pricing: [{ label: 'Booking Fee', price: 149 }],
    faqs: [],
    formFields: [
      { id: 'pickup', label: 'Pickup Location', type: 'text', required: true },
      { id: 'destination', label: 'Drop Location', type: 'text', required: true },
      { id: 'vehicle', label: 'Vehicle Preference', type: 'select', options: ['Sedan', 'SUV', 'Driver for my car'], required: true }
    ]
  },

  'bill-payment': {
    id: 'bill-payment',
    slug: 'bill-payment',
    category: 'home-essentials',
    title: 'Utility Bill Payment',
    tagline: 'Utility bills paid safely',
    description: 'Assistance in paying electricity, water, or other utility bills online or offline.',
    icon: '056ecb9c01dd2283b1c0db1e84c1eb94c6d8a45a.png',
    heroImage: 'bill-hero.jpg',
    inclusions: ['Bill verification', 'Timely payment', 'Receipt provided'],
    howItWorks: ['Select bill type', 'Provide ID', 'Payment done'],
    pricing: [{ label: 'Service Fee', price: 99 }],
    faqs: [],
    formFields: [
      { id: 'billType', label: 'Bill Type', type: 'select', options: ['Electricity', 'Water', 'Gas', 'Property Tax', 'Mobile/Wifi'], required: true },
      { id: 'accountId', label: 'Consumer Number', type: 'text', required: true }
    ]
  },

  'bank-paperwork': {
    id: 'bank-paperwork',
    slug: 'bank-paperwork',
    category: 'home-essentials',
    title: 'Bank & Paperwork',
    tagline: 'Help with bank visits and forms',
    description: 'Assistance for bank visits, KYC updates, and filling government/legal forms.',
    icon: '33ede0e57be708b9775957c3ecec7013b0a56c6d.png',
    heroImage: 'bank-hero.jpg',
    inclusions: ['Form filling help', 'Bank visit partner', 'Trusted companionship'],
    howItWorks: ['State requirement', 'Buddy joins you', 'Task completed'],
    pricing: [{ label: 'Assistance Fee', price: 399 }],
    faqs: [],
    formFields: [
      { id: 'bankName', label: 'Bank Name', type: 'text', placeholder: 'e.g., SBI, HDFC', required: true },
      { id: 'procedure', label: 'Required Procedure', type: 'select', options: ['KYC Update', 'New Account', 'Pension Paperwork', 'Cheque Book', 'Other'], required: true }
    ]
  },

  'anything-else': {
    id: 'anything-else',
    slug: 'anything-else',
    category: 'home-essentials',
    title: 'Anything Else',
    tagline: 'No request is too small',
    description: 'Whatever you need help with, just let us know. We solve custom requests with care.',
    icon: '6c8ed456023258e8b4095af93909c6cbc6c4b909.png',
    heroImage: 'concierge-hero.jpg',
    inclusions: ['Personalized help', 'Safe execution', 'Quick response'],
    howItWorks: ['Describe request', 'Confirm time', 'Buddy arrives'],
    pricing: [{ label: 'Per Request', price: 299 }],
    faqs: [],
    formFields: [
      { id: 'taskTitle', label: 'Request Title', type: 'text', placeholder: 'What do you need?', required: true },
      { id: 'details', label: 'Description', type: 'textarea', placeholder: 'Describe your requirement in detail...', required: true }
    ]
  },

  'paper-legal': {
    id: 'paper-legal',
    slug: 'paper-legal',
    category: 'home-essentials',
    title: 'Paper & Legal',
    tagline: 'Life Certificates & Documents',
    description: 'Assistance with Jeevan Pramaan, Will registration, and government ID updates.',
    icon: '33ede0e57be708b9775957c3ecec7013b0a56c6d.png',
    heroImage: 'legal-hero.jpg',
    inclusions: ['Life Certificate help', 'Lawyer coordination', 'Document pickup'],
    howItWorks: ['Select service', 'Provide info', 'Task completed'],
    pricing: [{ label: 'Visit Fee', price: 499 }],
    faqs: [],
    formFields: [
      { id: 'serviceType', label: 'Select Service', type: 'select', options: ['Life Certificate', 'Will Registration', 'ID Update', 'Property Docs'], required: true },
      { id: 'details', label: 'Details', type: 'textarea', placeholder: 'Provide more info...', required: true }
    ]
  },

  'trip-travels': {
    id: 'trip-travels',
    slug: 'trip-travels',
    category: 'home-essentials',
    title: 'Trip & Travels',
    tagline: 'Meet friends & go on tours',
    description: 'Safe tours and social meetups tailored for seniors to enjoy and connect.',
    icon: '60d4d0afa5801aeaa9e593bc049e3b017ef5624c.png',
    heroImage: 'travel-hero.jpg',
    inclusions: ['Safe travel', 'Food included', 'Expert guide'],
    howItWorks: ['Join a group', 'Confirm date', 'Head out!'],
    pricing: [{ label: 'Day Trip', price: 1499 }],
    faqs: [],
    formFields: [
      { id: 'destination', label: 'Where do you want to go?', type: 'select', options: ['Temple Tour', 'Local Sightseeing', 'Yoga Group Meetup', 'Chai & Chat'], required: true },
      { id: 'people', label: 'No. of People', type: 'number', placeholder: '1', required: true }
    ]
  },

  'smart-upgrade': {
    id: 'smart-upgrade',
    slug: 'smart-upgrade',
    category: 'home-essentials',
    title: 'Smart Upgrade',
    tagline: 'Better home management',
    description: 'Upgrade to Homemaker Plan for priority support and zero booking fees.',
    icon: 'ad6b9b061bc7b1487a0e73c2557f711136d2a4d9.png',
    heroImage: 'smart-hero.jpg',
    inclusions: ['Zero booking fees', 'Dedicated manager', 'Priority support'],
    howItWorks: ['Confirm plan', 'Immediate benefits'],
    pricing: [{ label: 'Subscription', price: 3499 }],
    faqs: [],
    formFields: [
      { id: 'plan', label: 'Selected Plan', type: 'select', options: ['Oldful Homemaker Plan'], required: true }
    ]
  }
};

// ─── Slug aliases (mobile app uses different slugs than the config keys) ───
const SLUG_ALIASES: Record<string, string> = {
  'nurse-care': 'home-nurse',
  'doctor-visit': 'doctor-home-visit',
  'meal-service': 'tiffin',
  'order-medicines': 'medicines',
  'medical-equipment': 'equipment-rental',
};

export function getServiceConfig(id: string): ServiceConfig | undefined {
  return SERVICES_CONFIG[id] ?? SERVICES_CONFIG[SLUG_ALIASES[id] ?? ''];
}
