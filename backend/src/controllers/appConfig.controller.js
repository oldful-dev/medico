// ──────────────────────────────────────────────
//  App Config Controller — SDUI (Server-Driven UI)
//  GET  /api/app-config          (public — mobile app fetches on startup)
//  PUT  /api/app-config          (SUPER_ADMIN only — update via admin panel)
//  POST /api/app-config/reset    (SUPER_ADMIN only — restore defaults)
// ──────────────────────────────────────────────

const prisma = require('../config/database');
const { logger } = require('../config/logger');

// ─── Default SDUI Config ─────────────────────────────────────────────────────
// This is the source-of-truth fallback. The DB overrides this when an admin
// publishes a config update via the admin panel.

const DEFAULT_CONFIG = {
    version: '1.0.0',
    cache_ttl: 3600, // seconds the mobile app should cache this response

    // ── Feature Flags ── toggle app features without a new app build
    feature_flags: {
        sos_enabled: true,
        essentials_visible: true,
        trust_badges_visible: true,
        sos_banner_visible: true,
        plans_enabled: true,
        insurance_enabled: true,
        blood_test_enabled: true,
        meal_service_enabled: true,
        promo_section_visible: false,
    },

    // ── Screens ─────────────────────────────────────────────────────────────
    screens: {

        // ── Home Screen ────────────────────────────────────────────────────
        home: {
            sections: [
                {
                    id: 'quick_services',
                    type: 'quick_services',
                    visible: true,
                    sort_order: 1,
                    items: [
                        { id: 'doctor',    label: 'Ayuxa\nDoctor',     icon_key: 'quick_doctor',    image_url: 'https://storage.googleapis.com/ayuxa-assets/mobile/assets/images/98e939543c86f26f5f26210bb160eb927b5ff057.png', route: '/doctor-visit',  visible: true, sort_order: 1 },
                        { id: 'nursing',   label: 'Nursing\nCare',      icon_key: 'quick_nursing',   image_url: 'https://storage.googleapis.com/ayuxa-assets/mobile/assets/images/21e5a8a8650cf8eda36be3744c70099580173129.png', route: '/nurse-care',    visible: true, sort_order: 2 },
                        { id: 'caregiver', label: 'Caregiver\nSupport', icon_key: 'quick_caregiver', image_url: 'https://storage.googleapis.com/ayuxa-assets/mobile/assets/images/2fb222a5f206ff64415b72a8d4ac9290b4e6f720.png', route: '/nurse-care',    visible: true, sort_order: 3 },
                        { id: 'emergency', label: 'Emergency\nAssist',  icon_key: 'quick_emergency', image_url: 'https://storage.googleapis.com/ayuxa-assets/mobile/assets/images/e1baef7b977f856b4e0401f74fbf21e0ce5348f7.png', route: '/sos-emergency', visible: true, sort_order: 4 },
                    ],
                },
                {
                    id: 'ayuxa_services',
                    type: 'service_grid',
                    title: 'Ayuxa Services',
                    visible: true,
                    sort_order: 2,
                    view_all_route: '/all-ayuxa-services',
                    config: { max_items: 6, columns: 3 },
                    items: [
                        { id: 'doctor_visit',   label: 'Doctor\nVisit',            icon_key: 'svc_doctor_visit',   image_url: 'https://storage.googleapis.com/ayuxa-assets/mobile/assets/images/32a4661f97e2fa2dd2c85c403a7c530b7214e7f7.png', route: '/doctor-visit',     visible: true, sort_order: 1 },
                        { id: 'homing_nursing', label: 'Homing\nNursing',          icon_key: 'svc_homing_nursing', image_url: 'https://storage.googleapis.com/ayuxa-assets/mobile/assets/images/afd8e2afab202de7ddce09bf8add378c861b9347.png', route: '/nurse-care',        visible: true, sort_order: 2 },
                        { id: 'blood_test',     label: 'Home\nBlood Test',         icon_key: 'svc_blood_test',     image_url: 'https://storage.googleapis.com/ayuxa-assets/mobile/assets/images/f74321d18a86a9e77628058ed35a50d284752eb2.png', route: '/blood-test',        visible: true, sort_order: 3 },
                        { id: 'fitness',        label: 'Fitness &\nTherapy',       icon_key: 'svc_fitness',        image_url: 'https://storage.googleapis.com/ayuxa-assets/mobile/assets/images/54f5c849cf75e776592dec8236f221da3694ca53.png', route: '/physio-fitness',    visible: true, sort_order: 4 },
                        { id: 'equipment',      label: 'Rent Medical\nEquipment',  icon_key: 'svc_equipment',      image_url: 'https://storage.googleapis.com/ayuxa-assets/mobile/assets/images/d3906f517597b2ef10369d92c422b16bf20e879e.png', route: '/medical-equipment', visible: true, sort_order: 5 },
                        { id: 'medicines',      label: 'Order\nMedicines',         icon_key: 'svc_medicines',      image_url: 'https://storage.googleapis.com/ayuxa-assets/mobile/assets/images/79c15725f6f1a73658b615886f1289634cef9408.png', route: '/order-medicines',   visible: true, sort_order: 6 },
                        { id: 'meal',           label: 'Meal\nService',            icon_key: 'svc_meal',           image_url: 'https://storage.googleapis.com/ayuxa-assets/mobile/assets/images/8f136eff1200bb21c080348f6cdb7ad1c2831bdf.png', route: '/meal-service',      visible: true, sort_order: 7 },
                        { id: 'physio',         label: 'Physio\nFitness',          icon_key: 'svc_physio',         image_url: 'https://storage.googleapis.com/ayuxa-assets/mobile/assets/images/4ea419052803769fad63ff4292316ce7f8f77dbc.png', route: '/physio-fitness',    visible: true, sort_order: 8 },
                        { id: 'hospital_trip',  label: 'Hospital\nTrip',           icon_key: 'svc_hospital_trip',  image_url: 'https://storage.googleapis.com/ayuxa-assets/mobile/assets/images/e1baef7b977f856b4e0401f74fbf21e0ce5348f7.png', route: '/hospital-trip',     visible: true, sort_order: 9 },
                        { id: 'insurance',      label: 'Insurance\n& Claims',      icon_key: 'svc_insurance',      image_url: 'https://storage.googleapis.com/ayuxa-assets/mobile/assets/images/e453f94c7e87531b0da0b6712f8dc4b3bc7084a9.png', route: '/insurance',         visible: true, sort_order: 10 },
                    ],
                },
                {
                    id: 'trust_badges',
                    type: 'trust_badges',
                    visible: true,
                    sort_order: 3,
                    items: [
                        { id: 'support',    label: '24/7 Support',       icon_key: 'badge_support',    image_url: 'https://storage.googleapis.com/ayuxa-assets/mobile/assets/images/cea3b8dc2ce488942e83a8a4cd0dbe1e6173764b.png', visible: true, sort_order: 1 },
                        { id: 'caregivers', label: 'Verified Caregivers', icon_key: 'badge_caregivers', image_url: 'https://storage.googleapis.com/ayuxa-assets/mobile/assets/images/4dcdffbd537a1de53d947d7f0c7c548318bc85a7.png', visible: true, sort_order: 2 },
                        { id: 'family',     label: 'Family-first Care',  icon_key: 'badge_family',     image_url: 'https://storage.googleapis.com/ayuxa-assets/mobile/assets/images/f90ea6c9d084318475183b0a2f11175f0f34640e.png', visible: true, sort_order: 3 },
                    ],
                },
                {
                    id: 'sos_banner',
                    type: 'sos_banner',
                    visible: true,
                    sort_order: 4,
                    config: {
                        title_line1: 'Need Immediate',
                        title_line2: 'Medical Support?',
                        cta_text: 'Click here',
                        cta_route: '/sos-emergency',
                        icon_url: 'https://storage.googleapis.com/ayuxa-assets/mobile/assets/images/5eedb2a89f68f0fea90ef304401e7d38d0fc1790.png',
                        illustration_url: 'https://storage.googleapis.com/ayuxa-assets/mobile/assets/images/e453f94c7e87531b0da0b6712f8dc4b3bc7084a9.png',
                    },
                },
                {
                    id: 'essentials',
                    type: 'essentials_grid',
                    title: 'Home Essentials Services',
                    visible: true,
                    sort_order: 5,
                    view_all_route: '/all-home-essentials',
                    config: { columns: 4, max_visible_rows: 2 },
                    items: [
                        { id: 'ac_repair',    label: 'AC\nRepair',      icon_key: 'ess_ac_repair', image_url: 'https://storage.googleapis.com/ayuxa-assets/mobile/assets/images/fa6360cf6179cebaed29a6c808bafae2d31ad753.png', route: '/appliance-repair',     visible: true, sort_order: 1 },
                        { id: 'plumbing',     label: 'Plumbing',        icon_key: 'ess_plumbing',  image_url: 'https://storage.googleapis.com/ayuxa-assets/mobile/assets/images/8ce612b04a3a83f1e834c7b71a6dd2c0174cb918.png', route: '/plumbing-electrical',  visible: true, sort_order: 2 },
                        { id: 'cleaning',     label: 'Cleaning',        icon_key: 'ess_cleaning',  image_url: 'https://storage.googleapis.com/ayuxa-assets/mobile/assets/images/ad6b9b061bc7b1487a0e73c2557f711136d2a4d9.png', route: '/deep-cleaning',        visible: true, sort_order: 3 },
                        { id: 'driver',       label: 'Driver',          icon_key: 'ess_driver',    image_url: 'https://storage.googleapis.com/ayuxa-assets/mobile/assets/images/60d4d0afa5801aeaa9e593bc049e3b017ef5624c.png', route: '/driving-cab',          visible: true, sort_order: 4 },
                        { id: 'bills',        label: 'Bills',           icon_key: 'ess_bills',     image_url: 'https://storage.googleapis.com/ayuxa-assets/mobile/assets/images/056ecb9c01dd2283b1c0db1e84c1eb94c6d8a45a.png', route: '/bill-payment',         visible: true, sort_order: 5 },
                        { id: 'bank',         label: 'Bank\nWork',      icon_key: 'ess_bank',      image_url: 'https://storage.googleapis.com/ayuxa-assets/mobile/assets/images/33ede0e57be708b9775957c3ecec7013b0a56c6d.png', route: '/bank-paperwork',       visible: true, sort_order: 6 },
                        { id: 'grocery',      label: 'Gro-\ncery',      icon_key: 'ess_grocery',   image_url: 'https://storage.googleapis.com/ayuxa-assets/mobile/assets/images/8888c71f466119aa294bd00136ff887f616d4737.png', route: '/grocery-run',          visible: true, sort_order: 7 },
                        { id: 'anything',     label: 'Anything\nElse',  icon_key: 'ess_anything',  image_url: 'https://storage.googleapis.com/ayuxa-assets/mobile/assets/images/6c8ed456023258e8b4095af93909c6cbc6c4b909.png', route: '/anything-else',        visible: true, sort_order: 8 },
                        { id: 'paper_legal',  label: 'Paper &\nLegal',  icon_key: 'ess_bank',      image_url: 'https://storage.googleapis.com/ayuxa-assets/mobile/assets/images/33ede0e57be708b9775957c3ecec7013b0a56c6d.png', route: '/paper-legal',          visible: true, sort_order: 9 },
                        { id: 'trip_travel',  label: 'Trip &\nTravel',  icon_key: 'ess_driver',    image_url: 'https://storage.googleapis.com/ayuxa-assets/mobile/assets/images/60d4d0afa5801aeaa9e593bc049e3b017ef5624c.png', route: '/trip-travels',         visible: true, sort_order: 10 },
                        { id: 'tech_helper',  label: 'Tech\nHelper',    icon_key: 'ess_ac_repair', image_url: 'https://storage.googleapis.com/ayuxa-assets/mobile/assets/images/fa6360cf6179cebaed29a6c808bafae2d31ad753.png', route: '/tech-helper',          visible: true, sort_order: 11 },
                        { id: 'smart_upgrade',label: 'Smart\nUpgrade',  icon_key: 'ess_cleaning',  image_url: 'https://storage.googleapis.com/ayuxa-assets/mobile/assets/images/ad6b9b061bc7b1487a0e73c2557f711136d2a4d9.png', route: '/smart-upgrade',        visible: true, sort_order: 12 },
                    ],
                },
            ],
        },

        // ── Plans Screen ───────────────────────────────────────────────────
        plans: {
            banner: {
                title: 'Value Plans for Your Peace of Mind',
                subtitle: 'Subscribe and save with our exclusive Ayuxa plans.',
            },
            plans: [
                {
                    id: 'care_plan',
                    name: 'Care Plan',
                    accent_color: '#4B78D8',
                    price_bg_color: '#56BDB7',
                    cta_color: '#4B78D8',
                    tab_bg: '#EAEFFF',
                    tab_active_bg: '#D1DEFE',
                    tab_text_color: '#4B73D0',
                    active_duration_label: 'Yearly',
                    durations: [
                        { label: 'Quarterly',  price: '₹599',   suffix: '/ Quarterly' },
                        { label: 'Biannually', price: '₹999',   suffix: '/ Biannually' },
                        { label: 'Yearly',     price: '₹1,999', suffix: '/ Yearly' },
                    ],
                    features: [
                        '25% Off Healthy Meals',
                        'Temple & Picnic Group Trips',
                        'Paperwork & Tech Support',
                    ],
                    cta_text: 'View Details / Subscribe',
                    cta_route: '/smart-upgrade',
                    visible: true,
                    sort_order: 1,
                },
                {
                    id: 'home_maker_plan',
                    name: 'Home Maker Plan',
                    accent_color: '#048357',
                    price_bg_color: '#75B55E',
                    cta_color: '#42884F',
                    tab_bg: '#E8F5E9',
                    tab_active_bg: '#D8ECDC',
                    tab_text_color: '#048357',
                    active_duration_label: 'Yearly',
                    durations: [
                        { label: 'Quarterly',  price: '₹1,499', suffix: '/ Quarterly' },
                        { label: 'Biannually', price: '₹2,499', suffix: '/ Biannually' },
                        { label: 'Yearly',     price: '₹4,799', suffix: '/ Yearly' },
                    ],
                    features: [
                        'Home Cook (Daily Meals)',
                        'Bank, Will & ID Certificate Updates',
                        'Medicines & Doctor Visits',
                        'Tech Help at Home',
                    ],
                    cta_text: 'View Details / Subscribe',
                    cta_route: '/smart-upgrade',
                    visible: true,
                    sort_order: 2,
                },
            ],
            benefits: [
                {
                    id: 'save_big',
                    title: 'Save Big',
                    description: 'Recover your plan cost in just 2 orders.',
                    highlight: '2 orders.',
                    icon_key: 'benefit_money_bag',
                    image_url: 'https://storage.googleapis.com/ayuxa-assets/mobile/assets/images/26948a93a4bbaa57b96ff130f4425886b3c5d292.png',
                    sort_order: 1,
                },
                {
                    id: 'priority_support',
                    title: 'Priority Support',
                    description: 'Skip the queue. Members get answered first.',
                    highlight: 'Skip the queue.',
                    icon_key: 'benefit_checkmark',
                    image_url: 'https://storage.googleapis.com/ayuxa-assets/mobile/assets/images/019640d27de157c119b045c46aae6a6559dd3a79.png',
                    sort_order: 2,
                },
                {
                    id: 'family_updates',
                    title: 'Family Updates',
                    description: 'We send a weekly health report to your children.',
                    highlight: '',
                    icon_key: 'benefit_family',
                    image_url: 'https://storage.googleapis.com/ayuxa-assets/mobile/assets/images/26945e6abc1b678cf3cb29a1a66c0cf290cc7cfd.png',
                    sort_order: 3,
                },
            ],
        },

        // ── City Selection Screen ──────────────────────────────────────────
        city_selection: {
            cities: [
                { id: 'bangalore', name: 'Bangalore', state: 'Karnataka',    available: true,  sort_order: 1 },
                { id: 'chennai',   name: 'Chennai',   state: 'Tamil Nadu',   available: false, sort_order: 2 },
                { id: 'hyderabad', name: 'Hyderabad', state: 'Telangana',    available: false, sort_order: 3 },
                { id: 'mumbai',    name: 'Mumbai',    state: 'Maharashtra',  available: false, sort_order: 4 },
                { id: 'delhi',     name: 'Delhi NCR', state: 'Delhi',        available: false, sort_order: 5 },
                { id: 'pune',      name: 'Pune',      state: 'Maharashtra',  available: false, sort_order: 6 },
            ],
        },

        // ── Language Selection Screen ──────────────────────────────────────
        language_selection: {
            languages: [
                { code: 'en', label: 'English',   native_label: 'English',  sort_order: 1 },
                { code: 'hi', label: 'Hindi',     native_label: 'हिन्दी',   sort_order: 2 },
                { code: 'kn', label: 'Kannada',   native_label: 'ಕನ್ನಡ',    sort_order: 3 },
                { code: 'ta', label: 'Tamil',     native_label: 'தமிழ்',    sort_order: 4 },
                { code: 'te', label: 'Telugu',    native_label: 'తెలుగు',   sort_order: 5 },
                { code: 'ml', label: 'Malayalam', native_label: 'മലയാളം',   sort_order: 6 },
                { code: 'mr', label: 'Marathi',   native_label: 'मराठी',    sort_order: 7 },
                { code: 'bn', label: 'Bengali',   native_label: 'বাংলা',    sort_order: 8 },
            ],
        },

        doctor_visit: {
            title: 'Doctor Home Visit',
            sections: [
                {
                    id: "header",
                    type: "header",
                    components: [
                        { id: "header_title", type: "text", data: { label: "Doctor Home Visit", icon: "", tagline: "" } }
                    ]
                },
                {
                    id: "description_card",
                    type: "banner",
                    data: { label: "Booking a doctor or physiotherapist to visit your home for non-emergency issues.", icon: "", tagline: "physiotherapist", action: null }
                },
                {
                    id: "select_problem_section",
                    type: "section",
                    title: "Select Problem",
                    components: [
                        {
                            id: "problems_grid",
                            type: "grid",
                            layout: { columns: 3 },
                            items: [
                                { id: "fever_flu", label: "Fever/Flu", icon: "https://storage.googleapis.com/ayuxa-assets/mobile/assets/images/85703338762dce300aaacb9a05f302adc3d527f4.png", tagline: "", action: { type: "navigate", route: "select_problem" } },
                                { id: "bp_sugar", label: "BP/Sugar check", icon: "https://storage.googleapis.com/ayuxa-assets/mobile/assets/images/a094df3aff84fca10f86363d2a72a2a9a16cb8b9.png", tagline: "", action: { type: "navigate", route: "select_problem" } },
                                { id: "general_weakness", label: "General Weakness", icon: "https://storage.googleapis.com/ayuxa-assets/mobile/assets/images/a4cc4e445884c7ec5ea2ea73c3cf8315b9a5fd4b.png", tagline: "", action: { type: "navigate", route: "select_problem" } },
                                { id: "body_pain", label: "Body pain/joint pain", icon: "https://storage.googleapis.com/ayuxa-assets/mobile/assets/images/3a3fbbfc074010919d54378e2349e7a3ecdea262.png", tagline: "", action: { type: "navigate", route: "select_problem" } },
                                { id: "post_surgery", label: "Post-surgery Rehab", icon: "https://storage.googleapis.com/ayuxa-assets/mobile/assets/images/cc303b4d8fc2cc0ba55dc7a7b0eaaee1385183f1.png", tagline: "", action: { type: "navigate", route: "select_problem" } },
                                { id: "stroke_recovery", label: "Stroke Recovery", icon: "https://storage.googleapis.com/ayuxa-assets/mobile/assets/images/9c25016906e38b6b999adf0f9fb6cb2adb589322.png", tagline: "", action: { type: "navigate", route: "select_problem" } },
                                { id: "frozen_shoulder", label: "Frozen shoulder", icon: "https://storage.googleapis.com/ayuxa-assets/mobile/assets/images/05879295a9b69201cfab443f22bf9218402f1522.png", tagline: "", action: { type: "navigate", route: "select_problem" } },
                                { id: "other", label: "Other", icon: "https://storage.googleapis.com/ayuxa-assets/mobile/assets/images/34a78d011624199a5541b871a68bb218b41e5aba.png", tagline: "", action: { type: "navigate", route: "select_problem" } }
                            ]
                        },
                        {
                            id: "smart_banner",
                            type: "banner",
                            data: { label: "Smart :", icon: "", tagline: "Post-surgery, frozen shoulder & stroke visits will auto-select physiotherapist", action: { type: "navigate", route: "" } }
                        }
                    ]
                },
                {
                    id: "select_doctor_type_section",
                    type: "section",
                    title: "Select Doctor Type",
                    components: [
                        {
                            id: "doctor_types_grid",
                            type: "grid",
                            layout: { columns: 2 },
                            items: [
                                { id: "GP", label: "General Physician (MBBS)", icon: "https://storage.googleapis.com/ayuxa-assets/mobile/assets/images/9bbd0539ddfd504d8362c951cb07d107b0df9fdf.png", tagline: "", action: { type: "navigate", route: "select_doctor_type" } },
                                { id: "Physio", label: "Physiotherapist", icon: "https://storage.googleapis.com/ayuxa-assets/mobile/assets/images/ad2bd697d39bc0738ca19a09e58ce4677761ca47.png", tagline: "", action: { type: "navigate", route: "select_doctor_type" } }
                            ]
                        }
                    ]
                },
                {
                    id: "select_visit_type_section",
                    type: "section",
                    title: "Select Visit Type",
                    components: [
                        {
                            id: "visit_types_grid",
                            type: "grid",
                            layout: { columns: 2 },
                            items: [
                                { id: "Home", label: "Home Session", icon: "home-outline", tagline: "", action: { type: "navigate", route: "select_visit_type" } },
                                { id: "Clinic", label: "Clinic Visit", icon: "business-outline", tagline: "", action: { type: "navigate", route: "select_visit_type" } }
                            ]
                        }
                    ]
                },
                {
                    id: "select_when_section",
                    type: "section",
                    title: "When?",
                    components: [
                        {
                            id: "when_list",
                            type: "list",
                            layout: { columns: 1 },
                            items: [
                                { id: "ASAP", label: "Come ASAP", icon: "radio-button-on", tagline: "(Urgent)", action: { type: "navigate", route: "select_when" } },
                                { id: "Later", label: "Schedule for later", icon: "radio-button-off", tagline: "(Date & Time Picker)", action: { type: "navigate", route: "select_when" } }
                            ]
                        }
                    ]
                },
                {
                    id: "upload_documents_section",
                    type: "section",
                    title: "Upload Reports (Optional)",
                    components: [
                        {
                            id: "upload_form",
                            type: "form",
                            layout: { columns: 1 },
                            items: [
                                { id: "upload_reports", label: "Upload Reports (Optional)", icon: "cloud-upload-outline", tagline: "JPG, PNG or PDF, help our doctors understand better", action: { type: "navigate", route: "upload_document" } }
                            ]
                        }
                    ]
                },
                {
                    id: "confirm_address_section",
                    type: "section",
                    title: "Confirm Address",
                    components: [
                        {
                            id: "address_form",
                            type: "form",
                            layout: { columns: 1 },
                            items: [
                                { id: "address", label: "Fetching address...", icon: "location-outline", tagline: "Auto-fitted from user profile(Google maps location).", action: { type: "navigate", route: "edit_address" } }
                            ]
                        }
                    ]
                },
                {
                    id: "bottom_action_section",
                    type: "section",
                    title: "",
                    components: [
                        {
                            id: "book_button",
                            type: "form",
                            layout: { columns: 1 },
                            items: [
                                { id: "submit_booking", label: "Book Appointment", icon: "", tagline: "", action: { type: "navigate", route: "submit_booking" } }
                            ]
                        }
                    ]
                }
            ]
        },

        // ── Help & Support Screen ──────────────────────────────────────────
        help_support: {
            phone: '+919480198108',
            whatsapp_url: 'https://wa.me/919480198108',
            page_description: 'Our support team is available to help with bookings, services, and payments.',
            contacts: [
                { id: 'customer_support', label: 'Customer Support', phone: '+91 94801 98108', email: 'client@ayuxa.com',      name: null },
                { id: 'grievance',        label: 'Grievance Officer', phone: null,              email: 'compliance@ayuxa.com', name: 'SK Murgan' },
            ],
            ticket_categories: [
                { id: 'billing',    label: 'Billing',    sort_order: 1 },
                { id: 'service',    label: 'Service',    sort_order: 2 },
                { id: 'complaint',  label: 'Complaint',  sort_order: 3 },
                { id: 'lab',        label: 'Lab / Test', sort_order: 4 },
                { id: 'technical',  label: 'Technical',  sort_order: 5 },
                { id: 'other',      label: 'Other',      sort_order: 6 },
            ],
            ticket_status_colors: {
                open:        '#F5A623',
                in_progress: '#4A90E2',
                resolved:    '#27AE60',
                closed:      '#9B9B9B',
            },
            support_promise: [
                { id: 'ack',     text: 'Acknowledgement within 48 hours',                              ionicon: 'checkmark-circle' },
                { id: 'resolve', text: 'Resolution within 1 month',                                    ionicon: 'checkmark-circle' },
                { id: 'track',   text: 'A unique ticket number is provided to track your request.',    ionicon: 'information-circle' },
            ],
            faqs: [
                { id: 'book',     q: 'How do I book a service?',       a: 'Tap any service on the Home screen and follow the steps.',                                             sort_order: 1 },
                { id: 'sos',      q: 'Is SOS always available?',        a: 'Yes, SOS is 24/7. It alerts our team and your emergency contacts instantly.',                          sort_order: 2 },
                { id: 'lab',      q: 'How can I get my lab reports?',   a: 'Reports appear in My Health → Prescriptions and are sent via WhatsApp/Email.',                        sort_order: 3 },
                { id: 'refund',   q: 'What is the refund policy?',      a: 'Cancel 2 hours before the slot for a full refund. Settlement takes 5–7 business days.',               sort_order: 4 },
                { id: 'contacts', q: 'How to add emergency contacts?',  a: 'Go to My Profile → Emergency Contacts.',                                                              sort_order: 5 },
            ],
        },
    },
};

// ─── Handlers ────────────────────────────────────────────────────────────────

/**
 * GET /api/app-config
 * Public. Returns the current SDUI config.
 * Checks DB for an admin-published override first; falls back to DEFAULT_CONFIG.
 */
const getAppConfig = async (req, res) => {
    try {
        const stored = await prisma.uIConfig.findUnique({
            where: { key: 'sdui_app_config' },
        });

        if (stored?.configJson) {
            return res.json({ success: true, data: stored.configJson });
        }

        return res.json({ success: true, data: DEFAULT_CONFIG });
    } catch (error) {
        // Never fail the mobile app — always return the default
        logger.error('App config fetch error:', error.message);
        return res.json({ success: true, data: DEFAULT_CONFIG });
    }
};

/**
 * PUT /api/app-config
 * SUPER_ADMIN only. Publishes a new config to the mobile app.
 * Body: { config: { ...full AppConfig object } }
 */
const updateAppConfig = async (req, res, next) => {
    try {
        const { config } = req.body;
        if (!config || typeof config !== 'object') {
            return res.status(400).json({ success: false, message: 'config object required' });
        }

        await prisma.uIConfig.upsert({
            where:  { key: 'sdui_app_config' },
            create: {
                type:       'CUSTOM',
                key:        'sdui_app_config',
                label:      'SDUI App Configuration',
                configJson: config,
                sortOrder:  0,
                isVisible:  true,
                version:    1,
            },
            update: {
                configJson:  config,
                version:     { increment: 1 },
                publishedAt: new Date(),
            },
        });

        logger.info('SDUI app config updated by admin:', req.admin?.id);
        return res.json({ success: true, message: 'App config published' });
    } catch (error) {
        next(error);
    }
};

/**
 * POST /api/app-config/reset
 * SUPER_ADMIN only. Deletes the DB override — reverts app to DEFAULT_CONFIG.
 */
const resetAppConfig = async (req, res, next) => {
    try {
        await prisma.uIConfig.deleteMany({ where: { key: 'sdui_app_config' } });
        logger.info('SDUI app config reset to defaults by admin:', req.admin?.id);
        return res.json({ success: true, message: 'App config reset to defaults' });
    } catch (error) {
        next(error);
    }
};

/**
 * GET /api/app-config/default
 * SUPER_ADMIN only. Returns the hardcoded DEFAULT_CONFIG for reference.
 * Useful when building the admin UI editor.
 */
const getDefaultConfig = (req, res) => {
    return res.json({ success: true, data: DEFAULT_CONFIG });
};

module.exports = { getAppConfig, updateAppConfig, resetAppConfig, getDefaultConfig, DEFAULT_CONFIG };
