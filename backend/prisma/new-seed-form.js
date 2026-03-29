// ──────────────────────────────────────────────
//  Seed Service Form Fields (formFieldsJson)
//  Run: node backend/prisma/seed-form-fields.js
//  Populates Service.formFieldsJson for SDUI rendering
// ──────────────────────────────────────────────

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// ─── Form Configs by slug ───

const FORM_CONFIGS = {

  // ═══════════════════════════════════════
  // OLDFUL SERVICES
  // ═══════════════════════════════════════

  'home-nurse': {
    version: 1,
    layout: {
      header_style: 'green_bar',
      description: 'Booking long-term or shift-based care at home with experienced nursing professionals and caretakers.',
      cta_text: 'Request Staff',
      cta_loading_text: 'Processing...',
    },
    sections: [
      {
        id: 'who',
        title: 'Who is it for?',
        sort_order: 1,
        card_style: 'muted',
        fields: [{
          id: 'recipient',
          type: 'radio',
          display: 'row',
          default_value: 'Self',
          options: [
            { id: 'Self', label: 'Self', sort_order: 1 },
            { id: 'Spouse', label: 'Spouse', image_url: 'https://storage.googleapis.com/oldful-assets/mobile/assets/images/cb86876504871abc5e6db19e5612175dae2b0479.png', sort_order: 2 },
            { id: 'Parent', label: 'Parent', image_url: 'https://storage.googleapis.com/oldful-assets/mobile/assets/images/cb86876504871abc5e6db19e5612175dae2b0479.png', sort_order: 3 },
          ],
        }],
      },
      {
        id: 'staff',
        title: 'Type of Staff Needed',
        sort_order: 2,
        card_style: 'none',
        fields: [{
          id: 'staff_type',
          type: 'radio',
          display: 'card',
          default_value: 'qualified_nurse',
          options: [
            { id: 'qualified_nurse', label: 'Option A: Qualified Nurse', sub_label: '(For injections, wound dressing, IV Tracheostomy)', sort_order: 1 },
            { id: 'bedside_attendant', label: 'Option B: Bedside Attendant / Aya', sub_label: '(For bathing, feeding, toilet help - non medical)', sort_order: 2 },
          ],
        }],
      },
      {
        id: 'duration',
        title: 'Preferred Duration',
        sort_order: 3,
        card_style: 'none',
        fields: [{
          id: 'duration',
          type: 'radio',
          display: 'stacked',
          default_value: '12hr_night',
          options: [
            { id: 'short_visit', label: 'Short Visit', sub_label: '(1-2 Hour - Injection/dressing)', sort_order: 1 },
            { id: '12hr_night', label: '12 Hours (Night Shift)', sort_order: 2 },
            { id: '12hr_day', label: '12 Hours (Day Shift)', sort_order: 3 },
            { id: '24hr_livein', label: '24 Hours (Live-in)', sort_order: 4 },
          ],
        }],
      },
      {
        id: 'condition',
        title: 'Patient Condition',
        sort_order: 4,
        card_style: 'none',
        fields: [{
          id: 'condition',
          type: 'radio',
          display: 'stacked',
          options: [
            { id: 'walking', label: 'Walking/ Mobile', sort_order: 1 },
            { id: 'bedridden', label: 'Bedridden', sort_order: 2 },
            { id: 'post_surgery', label: 'Post-Surgery', sort_order: 3 },
          ],
        }],
      },
      {
        id: 'gender',
        title: 'Gender preferences',
        sort_order: 5,
        card_style: 'none',
        fields: [{
          id: 'gender_pref',
          type: 'radio',
          display: 'stacked',
          options: [
            { id: 'Male', label: 'Male', sort_order: 1 },
            { id: 'Female', label: 'Female', sort_order: 2 },
            { id: 'Any', label: 'Any', sort_order: 3 },
          ],
        }],
      },
      {
        id: 'banner',
        sort_order: 6,
        card_style: 'none',
        fields: [{
          id: 'not_sure_banner',
          type: 'info_banner',
          title: "Not sure about your options?",
          subtitle: "I'm not sure, let an Expert call me decide",
          image_url: 'https://storage.googleapis.com/oldful-assets/mobile/assets/images/c1c9dfda80d0a21cae62694d5d1f8d7ea182b581.png',
          bg_color: 'rgba(243,223,255,0.41)',
        }],
      },
    ],
  },

  'blood-test': {
    version: 1,
    layout: {
      header_style: 'cream_flat',
      description: 'Lab tests & checkup at your doorstep',
      cta_text: 'Confirm Booking',
      cta_loading_text: 'Processing...',
    },
    sections: [
      {
        id: 'test_selection',
        title: 'Select Your Test',
        sort_order: 1,
        card_style: 'default',
        fields: [{
          id: 'test_type',
          type: 'dropdown',
          label: 'Choose Test',
          default_value: 'full_body',
          options: [
            { id: 'full_body', label: 'Full Body Package', sort_order: 1 },
            { id: 'sugar_fasting', label: 'Sugar (Fasting)', sort_order: 2 },
            { id: 'lipid_profile', label: 'Lipid Profile', sort_order: 3 },
            { id: 'thyroid', label: 'Thyroid Panel', sort_order: 4 },
            { id: 'cbc', label: 'CBC (Complete Blood Count)', sort_order: 5 },
          ],
          alert_on_select: {
            title: 'Fasting Required',
            message: 'Please do not eat 10-12 hours before this test.',
            trigger_values: ['sugar_fasting', 'lipid_profile'],
          },
        }],
      },
      {
        id: 'schedule',
        title: 'Schedule Your Appointment',
        sort_order: 2,
        card_style: 'tinted',
        fields: [{
          id: 'appointment_date',
          type: 'datetime',
          label: 'Schedule Your Appointment',
          mode: 'datetime',
          min_date: 'today',
        }],
      },
      {
        id: 'prescription',
        sort_order: 3,
        card_style: 'none',
        fields: [{
          id: 'prescription_images',
          type: 'image_upload',
          title: 'Upload Prescription (Optional)',
          subtitle: 'Help us understand which tests you need',
          max_images: 3,
          upload_category: 'blood-tests',
        }],
      },
    ],
  },

  'tech-helper': {
    version: 1,
    layout: {
      header_style: 'green_bar',
      description: 'We fix phones, Wi-Fi, and TV remotes.',
      cta_text: 'Book Tech Support',
      cta_loading_text: 'Processing...',
    },
    sections: [
      {
        id: 'issues',
        title: "What's the issue?",
        sort_order: 1,
        card_style: 'none',
        fields: [{
          id: 'issues',
          type: 'checkbox',
          display: 'card',
          options: [
            { id: 'phone', label: 'Phone Help', sub_label: '(WhatsApp, Zoom, Contacts setup)', sort_order: 1 },
            { id: 'tv_wifi', label: 'TV & Wi-Fi', sub_label: '(Netflix login, Remote fix)', sort_order: 2 },
            { id: 'banking', label: 'Banking App', sub_label: '(Teach me how to use UPI safely)', sort_order: 3 },
          ],
        }],
      },
      {
        id: 'other',
        title: 'Something Else?',
        sort_order: 2,
        card_style: 'none',
        fields: [{
          id: 'other_issue',
          type: 'textarea',
          placeholder: 'Describe the problem you are facing...',
        }],
      },
      {
        id: 'schedule',
        sort_order: 3,
        card_style: 'none',
        fields: [{
          id: 'preferred_date',
          type: 'datetime',
          label: 'Preferred Date & Time',
          mode: 'datetime',
          min_date: 'today',
        }],
      },
      {
        id: 'photos',
        sort_order: 4,
        card_style: 'none',
        fields: [{
          id: 'photos',
          type: 'image_upload',
          title: 'Upload Photos (Optional)',
          subtitle: 'Show us the error message or broken device',
          max_images: 5,
          upload_category: 'tech-helper',
        }],
      },
      {
        id: 'mode',
        title: 'Select Mode',
        sort_order: 5,
        card_style: 'none',
        fields: [{
          id: 'mode',
          type: 'mode_card',
          default_value: 'home',
          options: [
            { id: 'home', label: 'Home Visit', sub_label: 'A buddy comes to teach', price: '₹599', price_value: 599, sort_order: 1 },
            { id: 'phone', label: 'Phone Call', sub_label: 'Remote help', price: '₹399', price_value: 399, sort_order: 2 },
          ],
        }],
      },
    ],
  },

  'physio-fitness': {
    version: 1,
    layout: {
      header_style: 'green_hero',
      header_subtitle: 'Pain relief therapy and senior-friendly yoga.',
      cta_text: 'Book Appointment',
      cta_loading_text: 'Processing...',
    },
    sections: [
      {
        id: 'service',
        title: 'Select Service',
        sort_order: 1,
        card_style: 'none',
        fields: [{
          id: 'service_type',
          type: 'radio',
          display: 'card',
          default_value: 'pain',
          options: [
            { id: 'pain', label: 'Pain Relief', sub_label: '(Physiotherapy)', description: 'For back pain, frozen shoulder, recovery', bg_color: '#FFEBDF', border_color: '#FF8800', badge: '+10% OFF', sort_order: 1 },
            { id: 'fitness', label: 'Senior Fitness', sub_label: '(Yoga/Exercise)', description: 'To stay active and mobile', bg_color: '#D3FBFF', border_color: '#313A51', sort_order: 2 },
          ],
        }],
      },
      {
        id: 'body_part',
        title: 'Select Body Part',
        sort_order: 2,
        card_style: 'none',
        fields: [{
          id: 'body_part',
          type: 'pill_select',
          default_value: 'Back',
          options: [
            { id: 'Back', label: 'Back', sort_order: 1 },
            { id: 'Knee', label: 'Knee', sort_order: 2 },
            { id: 'Neck', label: 'Neck', sort_order: 3 },
            { id: 'Shoulder', label: 'Shoulder', sort_order: 4 },
            { id: 'Leg', label: 'Leg', sort_order: 5 },
          ],
        }],
      },
      {
        id: 'other_issue',
        title: 'Other Issue',
        sort_order: 3,
        card_style: 'none',
        fields: [{
          id: 'other_issue',
          type: 'textarea',
          placeholder: 'Describe your issue',
        }],
      },
      {
        id: 'schedule',
        sort_order: 4,
        card_style: 'none',
        fields: [{
          id: 'appointment_date',
          type: 'datetime',
          label: 'Schedule Appointment',
          mode: 'datetime',
          min_date: 'today',
        }],
      },
    ],
  },

  'hospital-trip': {
    version: 1,
    layout: {
      header_style: 'green_bar',
      description: 'Safe & comfortable hospital trips with trained escorts.',
      cta_text: 'Book Hospital Trip',
      cta_loading_text: 'Processing...',
    },
    sections: [
      {
        id: 'specialist',
        title: 'Select Specialist',
        sort_order: 1,
        card_style: 'none',
        fields: [{
          id: 'specialist',
          type: 'icon_grid',
          columns: 3,
          options: [
            { id: 'eye', label: 'Eye Specialist', image_url: 'https://storage.googleapis.com/oldful-assets/mobile/assets/images/e9d68d0206e443ceceadd7907cd94f1c86fcacd4.png', sort_order: 1 },
            { id: 'brain', label: 'Brain & Nerves', image_url: 'https://storage.googleapis.com/oldful-assets/mobile/assets/images/2e6febd890c9753178f23a84a8293d0b79e606b6.png', sort_order: 2 },
            { id: 'kidney', label: 'Kidney & Urinary', image_url: 'https://storage.googleapis.com/oldful-assets/mobile/assets/images/bc2188e6d87da62a1af90ead7f0bf3503c62395c.png', sort_order: 3 },
            { id: 'lungs', label: 'Lungs & Breathing', image_url: 'https://storage.googleapis.com/oldful-assets/mobile/assets/images/2e704f53861f02d36dae70114611506893870ca5.png', sort_order: 4 },
            { id: 'dental', label: 'Dental Care', image_url: 'https://storage.googleapis.com/oldful-assets/mobile/assets/images/fde7739eae440fa8bbeccc49dfe81d9417584cdb.png', sort_order: 5 },
            { id: 'cancer', label: 'Cancer Specialist', image_url: 'https://storage.googleapis.com/oldful-assets/mobile/assets/images/12a939ac9402eccf1948ba9378dc7ffb078381cb.png', sort_order: 6 },
          ],
        }],
      },
      {
        id: 'hospital',
        title: 'Hospital / Clinic',
        sort_order: 2,
        card_style: 'none',
        fields: [{
          id: 'hospital_name',
          type: 'text_input',
          placeholder: 'Search hospital or clinic name...',
        }],
      },
      {
        id: 'doctor',
        title: 'Doctor Preference',
        sort_order: 3,
        card_style: 'none',
        fields: [
          {
            id: 'doctor_preference',
            type: 'radio',
            display: 'stacked',
            default_value: 'preferred',
            options: [
              { id: 'preferred', label: 'I have a preferred doctor', sort_order: 1 },
              { id: 'recommend', label: 'Recommend me a doctor', sort_order: 2 },
            ],
          },
          {
            id: 'preferred_doctor_name',
            type: 'text_input',
            placeholder: 'Doctor name...',
            visible_when: { field_id: 'doctor_preference', operator: 'eq', value: 'preferred' },
          },
        ],
      },
      {
        id: 'addons',
        title: 'Add-ons',
        sort_order: 4,
        card_style: 'none',
        fields: [
          { id: 'transport_addon', type: 'toggle', label: 'Transport', description: 'Pick-up & drop in comfortable vehicle' },
          { id: 'support_addon', type: 'toggle', label: 'Support Person', description: 'Trained companion during visit', default_value: true },
        ],
      },
      {
        id: 'schedule',
        sort_order: 5,
        card_style: 'none',
        fields: [{
          id: 'appointment_date',
          type: 'datetime',
          label: 'Preferred Date & Time',
          mode: 'datetime',
          min_date: 'today',
        }],
      },
    ],
  },

  'medicines': {
    version: 1,
    layout: {
      header_style: 'green_bar',
      description: 'Upload your prescription or type medicines manually. We deliver to your doorstep.',
      cta_text: 'Order Medicines',
      cta_loading_text: 'Processing...',
    },
    sections: [
      {
        id: 'prescription',
        title: 'Upload Prescription',
        sort_order: 1,
        card_style: 'default',
        fields: [{
          id: 'prescription_images',
          type: 'image_upload',
          title: 'Take Photo or Upload',
          subtitle: 'JPG, PNG or PDF — take a clear photo of your prescription',
          max_images: 5,
          upload_category: 'medicines',
        }],
      },
      {
        id: 'manual',
        title: 'Or Type Medicines',
        sort_order: 2,
        card_style: 'none',
        fields: [{
          id: 'manual_medicines',
          type: 'textarea',
          placeholder: 'e.g. Metformin 500mg, Amlodipine 5mg...',
        }],
      },
      {
        id: 'duration',
        title: 'Duration',
        sort_order: 3,
        card_style: 'none',
        fields: [{
          id: 'duration',
          type: 'pill_select',
          default_value: '1_month',
          options: [
            { id: '1_month', label: '1 Month', sort_order: 1 },
            { id: '3_months', label: '3 Months', sort_order: 2 },
            { id: '6_months', label: '6 Months', sort_order: 3 },
          ],
        }],
      },
      {
        id: 'auto_refill',
        sort_order: 4,
        card_style: 'none',
        fields: [{
          id: 'auto_refill',
          type: 'toggle',
          label: 'Auto-Refill',
          description: 'Automatically re-order when supply runs low',
          default_value: true,
        }],
      },
    ],
  },

  'equipment-rental': {
    version: 1,
    layout: {
      header_style: 'green_bar',
      description: 'Rent wheelchairs, hospital beds, oxygen concentrators, and more.',
      cta_text: 'Reserve Equipment',
      cta_loading_text: 'Processing...',
    },
    sections: [
      {
        id: 'equipment',
        title: 'Select Equipment',
        sort_order: 1,
        card_style: 'none',
        fields: [{
          id: 'equipment_type',
          type: 'icon_grid',
          columns: 2,
          default_value: 'wheelchair',
          options: [
            { id: 'wheelchair', label: 'Wheelchair', icon_key: 'equip_wheelchair', sort_order: 1 },
            { id: 'hospital_bed', label: 'Hospital Bed', icon_key: 'equip_bed', sort_order: 2 },
            { id: 'oxygen', label: 'Oxygen Concentrator', icon_key: 'equip_oxygen', sort_order: 3 },
            { id: 'walker', label: 'Walker', icon_key: 'equip_walker', sort_order: 4 },
          ],
        }],
      },
      {
        id: 'rental_duration',
        title: 'Rental Duration',
        sort_order: 2,
        card_style: 'none',
        fields: [{
          id: 'rental_duration',
          type: 'pill_select',
          default_value: 'Monthly',
          options: [
            { id: 'Weekly', label: 'Weekly', sort_order: 1 },
            { id: 'Monthly', label: 'Monthly', sort_order: 2 },
            { id: '3_Months', label: '3 Months', sort_order: 3 },
          ],
        }],
      },
      {
        id: 'schedule',
        sort_order: 3,
        card_style: 'none',
        fields: [{
          id: 'delivery_date',
          type: 'datetime',
          label: 'Delivery Date',
          mode: 'date',
          min_date: 'today',
        }],
      },
    ],
  },

  'tiffin': {
    version: 1,
    layout: {
      header_style: 'green_bar',
      description: 'Healthy, home-style meals delivered to your door. Choose your plan.',
      cta_text: 'Start Subscription',
      cta_loading_text: 'Processing...',
    },
    sections: [
      {
        id: 'meal_type',
        title: 'Meal Type',
        sort_order: 1,
        card_style: 'none',
        fields: [{
          id: 'meal_type',
          type: 'radio',
          display: 'stacked',
          default_value: 'home_style',
          options: [
            { id: 'diabetic', label: 'Diabetic Friendly', sub_label: '(Low GI, less rice)', sort_order: 1 },
            { id: 'home_style', label: 'Home Style', sub_label: '(Roti, Dal, Sabzi)', sort_order: 2 },
            { id: 'soft_food', label: 'Soft Food', sub_label: '(Khichdi/Porridge - for recovering patients)', sort_order: 3 },
          ],
        }],
      },
      {
        id: 'plan',
        title: 'Subscription Mode',
        sort_order: 2,
        card_style: 'none',
        fields: [{
          id: 'subscription_mode',
          type: 'radio',
          display: 'stacked',
          default_value: 'monthly',
          options: [
            { id: 'trial', label: 'Trial (3 Days)', sort_order: 1 },
            { id: 'monthly', label: 'Monthly Subscription', sub_label: '(Lunch & Dinner)', sort_order: 2 },
          ],
        }],
      },
      {
        id: 'preferences',
        title: 'Dietary Preferences',
        sort_order: 3,
        card_style: 'none',
        fields: [
          { id: 'no_onion_garlic', type: 'toggle', label: 'No Onion/Garlic (Jain)' },
          { id: 'less_spicy', type: 'toggle', label: 'Less Spicy' },
          { id: 'other_requirements', type: 'textarea', placeholder: 'Any other dietary needs...' },
        ],
      },
    ],
  },

  'insurance': {
    version: 1,
    layout: {
      header_style: 'green_bar',
      description: 'Get the right health insurance plan for seniors with pre-existing condition coverage.',
      cta_text: 'Get Insurance Quote',
      cta_loading_text: 'Submitting...',
    },
    sections: [
      {
        id: 'recipient',
        title: 'Who needs insurance?',
        sort_order: 1,
        card_style: 'none',
        fields: [{
          id: 'recipient',
          type: 'radio',
          display: 'stacked',
          default_value: 'self',
          options: [
            { id: 'self', label: 'Self (Age 45-70)', sort_order: 1 },
            { id: 'parents', label: 'Parents', sort_order: 2 },
          ],
        }],
      },
      {
        id: 'conditions',
        title: 'Pre-existing Conditions',
        sort_order: 2,
        card_style: 'none',
        fields: [{
          id: 'conditions',
          type: 'checkbox',
          display: 'stacked',
          default_value: ['diabetes', 'hypertension'],
          options: [
            { id: 'diabetes', label: 'Diabetes', sort_order: 1 },
            { id: 'hypertension', label: 'Hypertension (BP)', sort_order: 2 },
            { id: 'heart', label: 'Heart Condition', sort_order: 3 },
            { id: 'none', label: 'None', sort_order: 4 },
          ],
        }],
      },
      {
        id: 'requirements',
        title: 'Special Requirements',
        sort_order: 3,
        card_style: 'none',
        fields: [{
          id: 'requirements',
          type: 'textarea',
          placeholder: 'Any specific coverage requirements...',
        }],
      },
    ],
  },

  'trip-travels': {
    version: 1,
    layout: {
      header_style: 'cream_flat',
      description: 'Meet friends, go on trips, and have fun...',
      cta_text: 'Submit inquiry',
      cta_loading_text: 'Processing...',
    },
    sections: [
      {
        id: 'destination',
        title: 'Where do you want to go?',
        sort_order: 1,
        card_style: 'default',
        fields: [
          {
            id: 'destination',
            type: 'radio',
            display: 'stacked',
            default_value: 'temple_tours',
            options: [
              { id: 'temple_tours', label: 'Temple Tours', sub_label: '(Day trips to Tirupati/local temples)', sort_order: 1 },
              { id: 'out_of_station', label: 'Out of station', sub_label: '/anywhere in india', sort_order: 2 },
            ],
          },
          {
            id: 'trip_date',
            type: 'datetime',
            label: 'When?',
            mode: 'date',
            min_date: 'today',
          },
          {
            id: 'trip_people_count',
            type: 'stepper',
            label: 'How Many People?',
            min: 1,
            max: 20,
            default_value: 1,
          },
        ],
      },
      {
        id: 'events',
        title: 'Join Local Events',
        sort_order: 2,
        card_style: 'default',
        fields: [
          {
            id: 'event',
            type: 'radio',
            display: 'stacked',
            default_value: 'morning_yoga',
            options: [
              { id: 'morning_yoga', label: 'Morning Yoga Group', sub_label: '(Park meetups)', sort_order: 1 },
              { id: 'day_outing', label: 'Day Outing', sub_label: '(Picnic spots)', sort_order: 2 },
              { id: 'chai_chat', label: 'Chai & Chat', sub_label: '(Weekly meetup)', sort_order: 3 },
            ],
          },
          {
            id: 'event_group_size',
            type: 'stepper',
            label: 'Group Size',
            min: 1,
            max: 20,
            default_value: 1,
          },
        ],
      },
    ],
  },

  // ═══════════════════════════════════════
  // HOME ESSENTIALS
  // ═══════════════════════════════════════

  'appliance-repair': {
    version: 1,
    layout: {
      header_style: 'cream_flat',
      description: 'Book a reliable technician for AC, refrigerator, washing machine, and other household appliance repairs.',
      hero_subtitle: 'Concierge Services',
      cta_text: 'Book Service',
      cta_loading_text: 'Processing...',
    },
    sections: [
      {
        id: 'pricing',
        sort_order: 0,
        card_style: 'none',
        fields: [{
          id: 'pricing_banner',
          type: 'info_banner',
          icon_key: 'price_tag',
          title: 'Price: ₹499 Booking Fee + Vendor Bill',
          bg_color: '#FFF8E1',
        }],
      },
      {
        id: 'details',
        title: 'Appliance Details',
        sort_order: 1,
        card_style: 'default',
        fields: [
          {
            id: 'appliance',
            type: 'text_input',
            label: 'Appliance',
            placeholder: 'Appliance Model / Name',
            required: true,
          },
          {
            id: 'issue',
            type: 'textarea',
            label: 'Issue Description',
            placeholder: 'Describe the problem you are facing...',
            required: true,
          },
        ],
      },
      {
        id: 'photos',
        sort_order: 2,
        card_style: 'none',
        fields: [{
          id: 'photos',
          type: 'image_upload',
          title: 'Upload Photos of the Issue',
          subtitle: 'Help our technician understand the problem better',
          max_images: 5,
          upload_category: 'appliance-repair',
        }],
      },
      {
        id: 'schedule',
        sort_order: 3,
        card_style: 'none',
        fields: [{
          id: 'appointment_date',
          type: 'datetime',
          label: 'Schedule Appointment',
          mode: 'datetime',
          min_date: 'today',
          required: true,
        }],
      },
      {
        id: 'disclaimer',
        sort_order: 99,
        card_style: 'none',
        fields: [{
          id: 'service_note',
          type: 'info_banner',
          icon_key: 'info',
          title: 'Booking Fee covers finding, verifying & scheduling the professional. Actual repair cost (parts, labour) is paid directly to the vendor on completion.',
          bg_color: '#F5F5F5',
        }],
      },
    ],
  },

  'grocery-run': {
    version: 1,
    layout: {
      header_style: 'cream_flat',
      description: 'We pick up groceries from your favourite store and deliver to your door.',
      hero_subtitle: 'Concierge Services',
      cta_text: 'Book Service',
      cta_loading_text: 'Processing...',
    },
    sections: [
      {
        id: 'pricing',
        sort_order: 0,
        card_style: 'none',
        fields: [{
          id: 'pricing_banner',
          type: 'info_banner',
          icon_key: 'price_tag',
          title: 'Price: ₹299 Delivery Fee + Bill',
          bg_color: '#FFF8E1',
        }],
      },
      {
        id: 'order',
        title: 'What do you need?',
        sort_order: 1,
        card_style: 'default',
        fields: [
          {
            id: 'items',
            type: 'textarea',
            placeholder: 'e.g. 1L Milk, 2 Dozen Eggs, Bread...',
            required: true,
          },
          {
            id: 'store',
            type: 'text_input',
            label: 'Preferred Store (Optional)',
            placeholder: "e.g. DMart, Reliance Fresh or 'Any nearby'",
          },
        ],
      },
      {
        id: 'schedule',
        sort_order: 2,
        card_style: 'none',
        fields: [{
          id: 'delivery_time',
          type: 'datetime',
          label: 'Delivery Time',
          mode: 'datetime',
          min_date: 'today',
          required: true,
        }],
      },
      {
        id: 'upload',
        sort_order: 3,
        card_style: 'none',
        fields: [{
          id: 'list_images',
          type: 'image_upload',
          title: 'Upload Handwritten List',
          subtitle: 'JPG, PNG or PDF, file size no more than 10MB',
          max_images: 5,
          upload_category: 'grocery-run',
        }],
      },
      {
        id: 'disclaimer',
        sort_order: 99,
        card_style: 'none',
        fields: [{
          id: 'service_note',
          type: 'info_banner',
          icon_key: 'info',
          title: 'Delivery Fee covers the pickup and delivery. Grocery bill amount is paid separately.',
          bg_color: '#F5F5F5',
        }],
      },
    ],
  },

  'deep-cleaning': {
    version: 1,
    layout: {
      header_style: 'cream_flat',
      description: 'Professional deep cleaning for your home, kitchen, and bathrooms.',
      hero_subtitle: 'Concierge Services',
      cta_text: 'Book Service',
      cta_loading_text: 'Processing...',
    },
    sections: [
      {
        id: 'pricing',
        sort_order: 0,
        card_style: 'none',
        fields: [{
          id: 'pricing_banner',
          type: 'info_banner',
          icon_key: 'price_tag',
          title: 'Price: ₹499 Booking Fee + Vendor Bill',
          bg_color: '#FFF8E1',
        }],
      },
      {
        id: 'details',
        sort_order: 1,
        card_style: 'default',
        fields: [
          {
            id: 'cleaning_type',
            type: 'text_input',
            label: 'Cleaning Type',
            placeholder: 'e.g. Full Home, Kitchen Only, Bathroom...',
            required: true,
          },
          {
            id: 'area_size',
            type: 'text_input',
            label: 'Area Size',
            placeholder: 'e.g. 2BHK, 1000 sq ft...',
            required: true,
          },
        ],
      },
      {
        id: 'schedule',
        sort_order: 2,
        card_style: 'none',
        fields: [{
          id: 'preferred_date',
          type: 'datetime',
          label: 'Preferred Date',
          mode: 'datetime',
          min_date: 'today',
          required: true,
        }],
      },
      {
        id: 'photos',
        sort_order: 3,
        card_style: 'none',
        fields: [{
          id: 'photos',
          type: 'image_upload',
          title: 'Upload Photos (Optional)',
          subtitle: 'Photos of areas that need cleaning',
          max_images: 5,
          upload_category: 'deep-cleaning',
        }],
      },
      {
        id: 'disclaimer',
        sort_order: 99,
        card_style: 'none',
        fields: [{
          id: 'service_note',
          type: 'info_banner',
          icon_key: 'info',
          title: 'Booking Fee covers finding, verifying & scheduling the professional. Actual cleaning cost is paid directly to the vendor on completion.',
          bg_color: '#F5F5F5',
        }],
      },
    ],
  },

  'plumbing-electrical': {
    version: 1,
    layout: {
      header_style: 'cream_flat',
      description: 'Certified plumbers and electricians for your home repairs.',
      hero_subtitle: 'Concierge Services',
      cta_text: 'Book Service',
      cta_loading_text: 'Processing...',
    },
    sections: [
      {
        id: 'pricing',
        sort_order: 0,
        card_style: 'none',
        fields: [{
          id: 'pricing_banner',
          type: 'info_banner',
          icon_key: 'price_tag',
          title: 'Price: ₹499 Booking Fee + Vendor Bill',
          bg_color: '#FFF8E1',
        }],
      },
      {
        id: 'details',
        sort_order: 1,
        card_style: 'default',
        fields: [
          {
            id: 'service_type',
            type: 'text_input',
            label: 'Service Type',
            placeholder: 'e.g. Plumbing, Electrical, Both...',
            required: true,
          },
          {
            id: 'issue',
            type: 'textarea',
            label: 'Issue Description',
            placeholder: 'Describe the problem...',
            required: true,
          },
        ],
      },
      {
        id: 'schedule',
        sort_order: 2,
        card_style: 'none',
        fields: [{
          id: 'preferred_date',
          type: 'datetime',
          label: 'Preferred Date & Time',
          mode: 'datetime',
          min_date: 'today',
          required: true,
        }],
      },
      {
        id: 'photos',
        sort_order: 3,
        card_style: 'none',
        fields: [{
          id: 'photos',
          type: 'image_upload',
          title: 'Upload Photos (Optional)',
          subtitle: 'Photos of the issue',
          max_images: 5,
          upload_category: 'plumbing-electrical',
        }],
      },
      {
        id: 'disclaimer',
        sort_order: 99,
        card_style: 'none',
        fields: [{
          id: 'service_note',
          type: 'info_banner',
          icon_key: 'info',
          title: 'Booking Fee covers finding, verifying & scheduling the professional. Actual repair cost (parts, labour) is paid directly to the vendor on completion.',
          bg_color: '#F5F5F5',
        }],
      },
    ],
  },

  'driving-cab': {
    version: 1,
    layout: {
      header_style: 'cream_flat',
      description: 'Reliable drivers for local travel, airport drops, and outstation trips.',
      hero_subtitle: 'Concierge Services',
      cta_text: 'Book Ride',
      cta_loading_text: 'Processing...',
    },
    sections: [
      {
        id: 'pricing',
        sort_order: 0,
        card_style: 'none',
        fields: [{
          id: 'pricing_banner',
          type: 'info_banner',
          icon_key: 'price_tag',
          title: 'Price: ₹299 Booking Fee + Trip Cost',
          bg_color: '#FFF8E1',
        }],
      },
      {
        id: 'route',
        sort_order: 1,
        card_style: 'default',
        fields: [
          {
            id: 'pickup_location',
            type: 'text_input',
            label: 'Pickup Location',
            placeholder: 'Enter pickup address...',
            required: true,
          },
          {
            id: 'drop_location',
            type: 'text_input',
            label: 'Drop Location',
            placeholder: 'Enter drop address...',
            required: true,
          },
          {
            id: 'vehicle_preference',
            type: 'text_input',
            label: 'Vehicle Preference',
            placeholder: 'e.g. Sedan, SUV, Auto...',
          },
        ],
      },
      {
        id: 'schedule',
        sort_order: 2,
        card_style: 'none',
        fields: [{
          id: 'ride_date',
          type: 'datetime',
          label: 'Pickup Date & Time',
          mode: 'datetime',
          min_date: 'today',
          required: true,
        }],
      },
      {
        id: 'disclaimer',
        sort_order: 99,
        card_style: 'none',
        fields: [{
          id: 'service_note',
          type: 'info_banner',
          icon_key: 'info',
          title: 'Booking Fee covers scheduling. Trip cost (fuel, tolls, distance) is paid directly to the driver.',
          bg_color: '#F5F5F5',
        }],
      },
    ],
  },

  'bill-payment': {
    version: 1,
    layout: {
      header_style: 'cream_flat',
      description: 'We help you pay electricity, water, gas, and other utility bills.',
      hero_subtitle: 'Concierge Services',
      cta_text: 'Submit Request',
      cta_loading_text: 'Processing...',
    },
    sections: [
      {
        id: 'pricing',
        sort_order: 0,
        card_style: 'none',
        fields: [{
          id: 'pricing_banner',
          type: 'info_banner',
          icon_key: 'price_tag',
          title: 'Price: ₹299 Service Fee (Max 2 Bills)',
          bg_color: '#FFF8E1',
        }],
      },
      {
        id: 'bill_details',
        sort_order: 1,
        card_style: 'default',
        fields: [
          {
            id: 'bill_type',
            type: 'text_input',
            label: 'Bill Type',
            placeholder: 'e.g. Electricity, Water, Gas, Internet...',
            required: true,
          },
          {
            id: 'account_id',
            type: 'text_input',
            label: 'Account / Consumer Number',
            placeholder: 'Enter your account number...',
            required: true,
          },
          {
            id: 'amount',
            type: 'text_input',
            label: 'Amount (if known)',
            placeholder: '₹',
            keyboard_type: 'numeric',
          },
        ],
      },
      {
        id: 'upload',
        sort_order: 2,
        card_style: 'none',
        fields: [{
          id: 'bill_images',
          type: 'image_upload',
          title: 'Upload Bill Copy (Optional)',
          subtitle: 'Photo of your utility bill',
          max_images: 3,
          upload_category: 'bill-payment',
        }],
      },
      {
        id: 'disclaimer',
        sort_order: 99,
        card_style: 'none',
        fields: [{
          id: 'service_note',
          type: 'info_banner',
          icon_key: 'info',
          title: 'Service Fee covers processing up to 2 bills. Bill amounts are paid separately by you.',
          bg_color: '#F5F5F5',
        }],
      },
    ],
  },

  'bank-paperwork': {
    version: 1,
    layout: {
      header_style: 'cream_flat',
      description: 'Assistance with KYC, forms, and bank-related paperwork.',
      hero_subtitle: 'Concierge Services',
      cta_text: 'Submit Request',
      cta_loading_text: 'Processing...',
    },
    sections: [
      {
        id: 'pricing',
        sort_order: 0,
        card_style: 'none',
        fields: [{
          id: 'pricing_banner',
          type: 'info_banner',
          icon_key: 'price_tag',
          title: 'Price: ₹499 Booking Fee + Actuals',
          bg_color: '#FFF8E1',
        }],
      },
      {
        id: 'details',
        sort_order: 1,
        card_style: 'default',
        fields: [
          {
            id: 'bank_name',
            type: 'text_input',
            label: 'Bank Name',
            placeholder: 'e.g. SBI, HDFC, ICICI...',
            required: true,
          },
          {
            id: 'procedure_type',
            type: 'text_input',
            label: 'Procedure Type',
            placeholder: 'e.g. KYC Update, FD Renewal, Account Opening...',
            required: true,
          },
        ],
      },
      {
        id: 'schedule',
        sort_order: 2,
        card_style: 'none',
        fields: [{
          id: 'preferred_date',
          type: 'datetime',
          label: 'Preferred Date',
          mode: 'date',
          min_date: 'today',
        }],
      },
      {
        id: 'documents',
        sort_order: 3,
        card_style: 'none',
        fields: [{
          id: 'document_images',
          type: 'image_upload',
          title: 'Upload Documents (Optional)',
          subtitle: 'Any relevant documents like passbook, ID proof',
          max_images: 5,
          upload_category: 'bank-paperwork',
        }],
      },
      {
        id: 'disclaimer',
        sort_order: 99,
        card_style: 'none',
        fields: [{
          id: 'service_note',
          type: 'info_banner',
          icon_key: 'info',
          title: 'Booking Fee covers scheduling and assistance. Any bank charges or stamp duties are paid separately.',
          bg_color: '#F5F5F5',
        }],
      },
    ],
  },

  'paper-legal': {
    version: 1,
    layout: {
      header_style: 'green_bar',
      description: 'Get help with legal documents, life certificates, and government paperwork.',
      cta_text: 'Submit Request',
      cta_loading_text: 'Processing...',
    },
    sections: [
      {
        id: 'service',
        title: 'Select Service',
        sort_order: 1,
        card_style: 'none',
        fields: [{
          id: 'legal_service',
          type: 'radio',
          display: 'stacked',
          default_value: 'digital_life_cert',
          options: [
            { id: 'digital_life_cert', label: 'Digital Life Certificate', sub_label: '(Jeevan Pramaan - Home visit)', sort_order: 1 },
            { id: 'bank_kyc', label: 'Bank KYC Update', sub_label: '(Assistance)', sort_order: 2 },
            { id: 'will_registration', label: 'Will Registration', sub_label: '(Lawyer connect)', sort_order: 3 },
            { id: 'govt_id_update', label: 'Govt ID Update', sub_label: '(Aadhaar/PAN fix)', sort_order: 4 },
          ],
        }],
      },
      {
        id: 'details',
        title: 'Additional Details',
        sort_order: 2,
        card_style: 'none',
        fields: [{
          id: 'details',
          type: 'textarea',
          placeholder: 'Describe what you need help with...',
        }],
      },
      {
        id: 'schedule',
        sort_order: 3,
        card_style: 'none',
        fields: [{
          id: 'preferred_date',
          type: 'datetime',
          label: 'Preferred Date',
          mode: 'date',
          min_date: 'today',
        }],
      },
      {
        id: 'documents',
        sort_order: 4,
        card_style: 'none',
        fields: [{
          id: 'document_images',
          type: 'image_upload',
          title: 'Upload Documents (Optional)',
          subtitle: 'Relevant existing documents',
          max_images: 5,
          upload_category: 'paper-legal',
        }],
      },
    ],
  },

  'anything-else': {
    version: 1,
    layout: {
      header_style: 'cream_flat',
      description: 'Need help with something not listed? Tell us and we will find a solution.',
      hero_subtitle: 'Concierge Services',
      cta_text: 'Submit Request',
      cta_loading_text: 'Processing...',
    },
    sections: [
      {
        id: 'request',
        sort_order: 1,
        card_style: 'default',
        fields: [
          {
            id: 'request_title',
            type: 'text_input',
            label: 'What do you need?',
            placeholder: 'Brief title of your request...',
            required: true,
          },
          {
            id: 'request_description',
            type: 'textarea',
            label: 'Describe in detail',
            placeholder: 'Tell us more about what you need help with...',
            required: true,
          },
        ],
      },
      {
        id: 'schedule',
        sort_order: 2,
        card_style: 'none',
        fields: [{
          id: 'preferred_date',
          type: 'datetime',
          label: 'Preferred Date & Time',
          mode: 'datetime',
          min_date: 'today',
        }],
      },
      {
        id: 'photos',
        sort_order: 3,
        card_style: 'none',
        fields: [{
          id: 'photos',
          type: 'image_upload',
          title: 'Upload Photos (Optional)',
          subtitle: 'Any relevant images',
          max_images: 5,
          upload_category: 'anything-else',
        }],
      },
    ],
  },

  'smart-upgrade': {
    version: 1,
    layout: {
      header_style: 'green_hero',
      header_subtitle: 'Make your home elderly-friendly with smart upgrades.',
      cta_text: 'Get Free Quote',
      cta_loading_text: 'Submitting...',
    },
    sections: [
      {
        id: 'upgrades',
        title: 'What upgrades interest you?',
        sort_order: 1,
        card_style: 'none',
        fields: [{
          id: 'upgrade_areas',
          type: 'checkbox',
          display: 'card',
          options: [
            { id: 'bathroom_safety', label: 'Bathroom Safety', sub_label: 'Grab bars, anti-slip, shower seat', sort_order: 1 },
            { id: 'smart_lighting', label: 'Smart Lighting', sub_label: 'Motion sensors, night lights', sort_order: 2 },
            { id: 'emergency_system', label: 'Emergency System', sub_label: 'Panic buttons, fall detection', sort_order: 3 },
            { id: 'ramp_access', label: 'Ramp & Access', sub_label: 'Wheelchair ramps, door widening', sort_order: 4 },
          ],
        }],
      },
      {
        id: 'details',
        sort_order: 2,
        card_style: 'none',
        fields: [{
          id: 'additional_notes',
          type: 'textarea',
          label: 'Additional Requirements',
          placeholder: 'Any specific requirements or questions...',
        }],
      },
    ],
  },
  'doctor-home-visit': {
    version: 1,
    layout: {
      header_style: 'green_bar',
      description: 'Booking a doctor or physiotherapist to visit your home for non-emergency issues.',
      description_highlight: 'physiotherapist',
      cta_text: 'Book Appointment',
      cta_loading_text: 'Processing...',
    },
    sections: [
      {
        id: 'select_problem',
        title: 'Select Problem',
        sort_order: 1,
        card_style: 'default',
        fields: [
          {
            id: 'problem',
            type: 'icon_grid',
            required: true,
            columns: 3,
            options: [
              { id: 'fever_flu', label: 'Fever/Flu', image_url: 'https://storage.googleapis.com/oldful-assets/mobile/assets/images/85703338762dce300aaacb9a05f302adc3d527f4.png', sort_order: 1 },
              { id: 'bp_sugar', label: 'BP/Sugar check', image_url: 'https://storage.googleapis.com/oldful-assets/mobile/assets/images/a094df3aff84fca10f86363d2a72a2a9a16cb8b9.png', sort_order: 2 },
              { id: 'general_weakness', label: 'General Weakness', image_url: 'https://storage.googleapis.com/oldful-assets/mobile/assets/images/a4cc4e445884c7ec5ea2ea73c3cf8315b9a5fd4b.png', sort_order: 3 },
              { id: 'body_pain', label: 'Body pain/joint pain', image_url: 'https://storage.googleapis.com/oldful-assets/mobile/assets/images/3a3fbbfc074010919d54378e2349e7a3ecdea262.png', sort_order: 4 },
              { id: 'post_surgery', label: 'Post-surgery Rehab', image_url: 'https://storage.googleapis.com/oldful-assets/mobile/assets/images/cc303b4d8fc2cc0ba55dc7a7b0eaaee1385183f1.png', sort_order: 5 },
              { id: 'stroke_recovery', label: 'Stroke Recovery', image_url: 'https://storage.googleapis.com/oldful-assets/mobile/assets/images/9c25016906e38b6b999adf0f9fb6cb2adb589322.png', sort_order: 6 },
              { id: 'frozen_shoulder', label: 'Frozen shoulder', image_url: 'https://storage.googleapis.com/oldful-assets/mobile/assets/images/05879295a9b69201cfab443f22bf9218402f1522.png', sort_order: 7 },
              { id: 'other', label: 'Other', image_url: 'https://storage.googleapis.com/oldful-assets/mobile/assets/images/34a78d011624199a5541b871a68bb218b41e5aba.png', sort_order: 8 },
            ],
          },
          {
            id: 'smart_tip',
            type: 'info_banner',
            title: 'Smart :',
            subtitle: 'Post-surgery, frozen shoulder & stroke visits will auto-select physiotherapist',
            bg_color: 'rgba(97,172,102,0.15)',
          },
        ],
      },
      {
        id: 'select_doctor_type',
        title: 'Select Doctor Type',
        sort_order: 2,
        card_style: 'default',
        fields: [{
          id: 'doctor_type',
          type: 'icon_grid',
          columns: 2,
          default_value: 'GP',
          options: [
            { id: 'GP', label: 'General Physician (MBBS)', image_url: 'https://storage.googleapis.com/oldful-assets/mobile/assets/images/9bbd0539ddfd504d8362c951cb07d107b0df9fdf.png', sort_order: 1 },
            { id: 'Physio', label: 'Physiotherapist', image_url: 'https://storage.googleapis.com/oldful-assets/mobile/assets/images/ad2bd697d39bc0738ca19a09e58ce4677761ca47.png', sort_order: 2 },
          ],
        }],
      },
      {
        id: 'select_visit_type',
        title: 'Select Visit Type',
        sort_order: 3,
        card_style: 'default',
        fields: [{
          id: 'visit_type',
          type: 'radio',
          display: 'stacked',
          default_value: 'Home',
          options: [
            { id: 'Home', label: 'Home Session', sort_order: 1 },
            { id: 'Clinic', label: 'Clinic Visit', sort_order: 2 },
          ],
        }],
      },
      {
        id: 'select_when',
        title: 'When?',
        sort_order: 4,
        card_style: 'default',
        fields: [{
          id: 'when',
          type: 'radio',
          display: 'stacked',
          default_value: 'ASAP',
          options: [
            { id: 'ASAP', label: 'Come ASAP', sub_label: '(Urgent)', sort_order: 1 },
            { id: 'Later', label: 'Schedule for later', sub_label: '(Date & Time Picker)', sort_order: 2 },
          ],
        }],
      },
      {
        id: 'schedule_datetime',
        title: 'Select Date & Time',
        sort_order: 5,
        card_style: 'default',
        visible_when: { field_id: 'when', operator: 'eq', value: 'Later' },
        fields: [{
          id: 'scheduled_date',
          type: 'datetime',
          mode: 'datetime',
          min_date: 'today',
        }],
      },
      {
        id: 'upload_reports',
        title: 'Upload Reports (Optional)',
        sort_order: 6,
        card_style: 'none',
        fields: [{
          id: 'reports',
          type: 'image_upload',
          title: 'Upload Reports (Optional)',
          subtitle: 'JPG, PNG or PDF, help our doctors understand better',
          max_images: 5,
          upload_category: 'doctor-visits',
        }],
      },
    ],
  },
};

// ─── Main seed function ───

async function main() {
  console.log('🌱 Seeding formFieldsJson for all services...\n');

  let updated = 0;
  let notFound = 0;

  for (const [slug, formConfig] of Object.entries(FORM_CONFIGS)) {
    const service = await prisma.service.findUnique({ where: { slug } });
    if (!service) {
      console.log(`  ⚠️  Service "${slug}" not found in DB — skipping`);
      notFound++;
      continue;
    }

    await prisma.service.update({
      where: { slug },
      data: { formFieldsJson: formConfig },
    });

    console.log(`  ✅ ${slug} — ${formConfig.sections.length} sections`);
    updated++;
  }

  console.log(`\n🎉 Done! Updated ${updated} services, ${notFound} not found.`);
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
