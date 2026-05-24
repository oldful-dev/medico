import axios from 'axios';
import Cookies from 'js-cookie';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.ayuxacare.com/api';

const api = axios.create({
    baseURL: API_URL,
    withCredentials: true,
    headers: { 'Content-Type': 'application/json' },
});

// ── Request interceptor: Inject auth token ──
api.interceptors.request.use(
    (config) => {
        const token = Cookies.get('adminToken');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// ── Response interceptor: Handle 401 / auto-refresh ──
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        if (error.response?.status === 401) {
            // Try refresh token
            const refreshToken = Cookies.get('adminRefreshToken');
            if (refreshToken && !error.config._retry) {
                error.config._retry = true;
                try {
                    const res = await axios.post(`${API_URL}/auth/admin/refresh`, { refreshToken });
                    if (res.data.success) {
                        Cookies.set('adminToken', res.data.data.accessToken, { expires: 1 });
                        error.config.headers.Authorization = `Bearer ${res.data.data.accessToken}`;
                        return api(error.config);
                    }
                } catch (_) { }
            }
            Cookies.remove('adminToken');
            Cookies.remove('adminRefreshToken');
            if (typeof window !== 'undefined') {
                window.location.href = '/login';
            }
        }
        return Promise.reject(error);
    }
);

// ════════════════════════════════════════════════════
//  API SERVICE METHODS — mirrors every backend route
// ════════════════════════════════════════════════════

// ── Auth ─────────────────────────────────────────────
export const authAPI = {
    login: (email, password) => api.post('/auth/admin/login', { email, password }),
    register: (data) => api.post('/auth/admin/register', data),
    refresh: (refreshToken) => api.post('/auth/admin/refresh', { refreshToken }),
    logout: () => api.post('/auth/logout'),
};

// ── Admins ───────────────────────────────────────────
export const adminAPI = {
    getAll: () => api.get('/admin'),
    getById: (id) => api.get(`/admin/${id}`),
    update: (id, data) => api.put(`/admin/${id}`, data),
    updatePassword: (id, data) => api.put(`/admin/${id}/password`, data),
    delete: (id) => api.delete(`/admin/${id}`),
};

export const profilesAPI = {
    getAll: (params) => api.get('/admin/profiles', { params }),
    getMetadata: () => api.get('/admin/profiles/metadata'),
    updateMetadata: (data) => api.put('/admin/profiles/metadata', data),
    getUploadUrl: (data) => api.post('/admin/profiles/upload-url', data),
    bulkStatus: (data) => api.post('/admin/profiles/bulk-status', data),
    bulkDelete: (data) => api.post('/admin/profiles/bulk-delete', data),
    delete: (id, type) => api.delete(`/admin/profiles/${id}`, { params: { type } }),
    update: (id, type, data) => api.put(`/admin/profiles/${id}`, data, { params: { type } }),
    create: (type, data) => api.post('/admin/profiles', data, { params: { type } }),
};

// ── Cities ───────────────────────────────────────────
export const cityAPI = {
    getAll: () => api.get('/cities'),
    getById: (id) => api.get(`/cities/${id}`),
    create: (data) => api.post('/cities', data),
    update: (id, data) => api.put(`/cities/${id}`, data),
    delete: (id) => api.delete(`/cities/${id}`),
    getRevenue: (id) => api.get(`/cities/${id}/revenue`),
};

// ── Users ────────────────────────────────────────────
export const userAPI = {
    getAll: (params) => api.get('/users', { params }),
    getById: (id) => api.get(`/users/${id}`),
    create: (data) => api.post('/users', data),
    update: (id, data) => api.put(`/users/${id}`, data),
    block: (id) => api.put(`/users/${id}/block`),
    suspend: (id) => api.put(`/users/${id}/suspend`),
    activate: (id) => api.put(`/users/${id}/activate`),
    addEmergencyContact: (id, data) => api.post(`/users/${id}/emergency-contacts`, data),
    removeEmergencyContact: (userId, contactId) => api.delete(`/users/${userId}/emergency-contacts/${contactId}`),
    upsertMedicalCard: (id, data) => api.post(`/users/${id}/medical-card`, data),
};

// ── Services ─────────────────────────────────────────
export const serviceAPI = {
    getAll: () => api.get('/services'),
    getById: (id) => api.get(`/services/${id}`),
    create: (data) => api.post('/services', data),
    update: (id, data) => api.put(`/services/${id}`, data),
    toggle: (id) => api.put(`/services/${id}/toggle`),
    reorder: (data) => api.put('/services/reorder', data),
    delete: (id) => api.delete(`/services/${id}`),
};

// ── Bookings ─────────────────────────────────────────
export const bookingAPI = {
    getAll: (params) => api.get('/bookings', { params }),
    getById: (id) => api.get(`/bookings/${id}`),
    create: (data) => api.post('/bookings', data),
    assignCaregiver: (id, data) => api.put(`/bookings/${id}/assign`, data),
    reassignCaregiver: (id, data) => api.put(`/bookings/${id}/reassign`, data),
    updateStatus: (id, data) => api.put(`/bookings/${id}/status`, data),
    updatePaymentStatus: (id, data) => api.put(`/bookings/${id}/payment-status`, data),
    updateServicePerson: (id, data) => api.put(`/bookings/${id}/service-person`, data),
    escalate: (id) => api.put(`/bookings/${id}/escalate`),
};

// ── Caregivers ───────────────────────────────────────
export const caregiverAPI = {
    getAll: (params) => api.get('/caregivers', { params }),
    getById: (id) => api.get(`/caregivers/${id}`),
    create: (data) => api.post('/caregivers', data),
    update: (id, data) => api.put(`/caregivers/${id}`, data),
    updateVerification: (id, data) => api.put(`/caregivers/${id}/verification`, data),
    toggleAvailability: (id) => api.put(`/caregivers/${id}/availability`),
    delete: (id) => api.delete(`/caregivers/${id}`),
};

// ── Plans ────────────────────────────────────────────
export const planAPI = {
    getAll: () => api.get('/plans/admin/all'),
    getById: (id) => api.get(`/plans/${id}`),
    create: (data) => api.post('/plans', data),
    update: (id, data) => api.put(`/plans/${id}`, data),
    delete: (id) => api.delete(`/plans/${id}`),
};

// ── Subscriptions ────────────────────────────────────
export const subscriptionAPI = {
    getAll: (params) => api.get('/subscriptions', { params }),
    create: (data) => api.post('/subscriptions', data),
    pause: (id) => api.put(`/subscriptions/${id}/pause`),
    resume: (id) => api.put(`/subscriptions/${id}/resume`),
    extend: (id, data) => api.put(`/subscriptions/${id}/extend`, data),
    cancel: (id) => api.put(`/subscriptions/${id}/cancel`),
    toggleAutoRenew: (id) => api.put(`/subscriptions/${id}/auto-renew`),
    compassionate: (id, data) => api.put(`/subscriptions/${id}/compassionate`, data),
};

// ── Payments ─────────────────────────────────────────
export const paymentAPI = {
    getAll: (params) => api.get('/payments', { params }),
    updateStatus: (id, data) => api.put(`/payments/${id}/status`, data),
    initiateRefund: (data) => api.post('/payments/refund', data),
    getRefundStatus: (id) => api.get(`/payments/${id}/refund-status`),
};

// ── SOS ──────────────────────────────────────────────
export const sosAPI = {
    getAll: (params) => api.get('/sos', { params }),
    assignResponder: (id, data) => api.put(`/sos/${id}/assign`, data),
    resolve: (id, data) => api.put(`/sos/${id}/resolve`, data),
    updateNotification: (id, data) => api.put(`/sos/${id}/notify`, data),
};

// ── Notifications ────────────────────────────────────
export const notificationAPI = {
    getLogs: (params) => api.get('/notifications/logs', { params }),
    getTemplates: () => api.get('/notifications/templates'),
    createTemplate: (data) => api.post('/notifications/templates', data),
    updateTemplate: (id, data) => api.put(`/notifications/templates/${id}`, data),
    deleteTemplate: (id) => api.delete(`/notifications/templates/${id}`),
    sendCampaign: (data) => api.post('/notifications/send-campaign', data),
};

// ── Legal ────────────────────────────────────────────
export const legalAPI = {
    getAll: () => api.get('/legal'),
    getById: (id) => api.get(`/legal/${id}`),
    create: (data) => api.post('/legal', data),
    update: (id, data) => api.put(`/legal/${id}`, data),
    publish: (id) => api.put(`/legal/${id}/publish`),
    delete: (id) => api.delete(`/legal/${id}`),
};

// ── Products (Wellness Store) ────────────────────────
export const productAPI = {
    getAll: (params) => api.get('/products', { params }),
    getById: (id) => api.get(`/products/${id}`),
    create: (data) => api.post('/products', data),
    update: (id, data) => api.put(`/products/${id}`, data),
    delete: (id) => api.delete(`/products/${id}`),
    // Order management — updateOrderStatus to DISPATCHED fires MEDICINE_OUT_FOR_DELIVERY SMS (215398)
    getOrders: (params) => api.get('/products/admin/orders', { params }),
    updateOrderStatus: (id, data) => api.put(`/products/admin/orders/${id}/status`, data),
};

// ── Categories (Wellness Store) ──────────────────────
export const categoryAPI = {
    getAll: () => api.get('/categories'),
    create: (data) => api.post('/categories', data),
    update: (id, data) => api.put(`/categories/${id}`, data),
    delete: (id) => api.delete(`/categories/${id}`),
};

// ── Audit Logs ───────────────────────────────────────
export const auditAPI = {
    getAll: (params) => api.get('/audit-logs', { params }),
    getById: (id) => api.get(`/audit-logs/${id}`),
};

// ── Banners (Home Screen Carousel) ───────────────────
export const bannerAPI = {
    getHome: () => api.get('/banners/home'),  // Public
    getAll: (params) => api.get('/banners', { params }),
    getById: (id) => api.get(`/banners/${id}`),
    create: (data) => api.post('/banners', data),
    update: (id, data) => api.put(`/banners/${id}`, data),
    toggle: (id, data) => api.patch(`/banners/${id}/toggle`, data),
    reorder: (data) => api.post('/banners/reorder', data),
    delete: (id) => api.delete(`/banners/${id}`),
};

// ── UI Config (Server-Driven UI) ─────────────────────
export const uiConfigAPI = {
    getAll: () => api.get('/ui-config'),
    getById: (id) => api.get(`/ui-config/${id}`),
    create: (data) => api.post('/ui-config', data),
    update: (id, data) => api.put(`/ui-config/${id}`, data),
    publish: (id) => api.put(`/ui-config/${id}/publish`),
    delete: (id) => api.delete(`/ui-config/${id}`),
};

// ── Reports ──────────────────────────────────────────
export const reportAPI = {
    dashboard: () => api.get('/reports/dashboard'),
    revenueByCity: () => api.get('/reports/revenue-by-city'),
    revenueByPlan: () => api.get('/reports/revenue-by-plan'),
    serviceUsage: () => api.get('/reports/service-usage'),
    caregiverPerformance: () => api.get('/reports/caregiver-performance'),
    refundAnalysis: () => api.get('/reports/refund-analysis'),
    customerRetention: () => api.get('/reports/customer-retention'),
    getAlerts: () => api.get('/reports/alerts'),
    exportCSV: (type) => api.get(`/reports/csv/${type}`, { responseType: 'blob' }),
};

// ── Insurance ────────────────────────────────────────
export const insuranceAPI = {
    getApplications: (params) => api.get('/insurance/applications', { params }),
    updateApplication: (id, data) => api.put(`/insurance/applications/${id}`, data),
};

// ── Support ──────────────────────────────────────────
export const supportAPI = {
    getTickets: (params) => api.get('/support/tickets', { params }),
    getTicketById: (id) => api.get(`/support/tickets/${id}`),
    updateTicket: (id, data) => api.put(`/support/tickets/${id}`, data),
    resolveTicket: (id, data) => api.put(`/support/tickets/${id}/resolve`, data),
    createTicket: (data) => api.post('/support/tickets', data),
    addMessage: (id, data) => api.post(`/support/tickets/${id}/messages`, data),
};

// ── Media ────────────────────────────────────────────
export const mediaAPI = {
    getAll: (params) => api.get('/media', { params }),
    upload: (formData) => api.post('/media/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
    confirm: (data) => api.post('/media/confirm', data),
    delete: (id) => api.delete(`/media/${id}`),
};

// ── Lab Orders ───────────────────────────────────────
export const labAPI = {
    getOrders: (params) => api.get('/labs/admin/orders', { params }),
    getOrderStatus: (id) => api.get(`/labs/booking/${id}`),
    updateOrder: (id, data) => api.post(`/labs/booking/${id}/update`, data),
    getDigitalReport: (id) => api.get(`/labs/booking/${id}/digital-report`),
    downloadReport: (id) => api.get(`/labs/booking/${id}/report`, { responseType: 'blob' }),
};

export const waitlistAPI = {
    getAll: () => api.get('/waitlist'),
};

// ── Meetups ──────────────────────────────────────────
export const meetupAPI = {
    getAll: (params) => api.get('/meetups', { params }),
    getById: (id) => api.get(`/meetups/${id}`),
    create: (data) => api.post('/meetups/admin', data),
    update: (id, data) => api.put(`/meetups/admin/${id}`, data),
    delete: (id) => api.delete(`/meetups/admin/${id}`),
    getRegistrations: (id) => api.get(`/meetups/admin/${id}/registrations`),
    updateRegistrationStatus: (meetupId, regId, status) => api.put(`/meetups/admin/registrations/${regId}`, { status }),
};

// ── Activity Updates ──────────────────────────
export const activityAPI = {
    // Admin: all updates across all orders (feed)
    getAllUpdates: (params) => api.get('/activity/admin/all', { params }),
    // Assign staff + push activity update to user
    assignStaff: (labOrderId, data) => api.post(`/activity/lab-orders/${labOrderId}/assign`, data),
    // Get all activity updates for a specific lab order
    getOrderUpdates: (labOrderId) => api.get(`/activity/lab-orders/${labOrderId}`),
    // Edit an activity update
    updateUpdate: (updateId, data) => api.put(`/activity/updates/${updateId}`, data),
    // Delete an activity update
    deleteUpdate: (updateId) => api.delete(`/activity/updates/${updateId}`),
};

// ── Service Charges ──────────────────────────────────
export const serviceChargeAPI = {
    getAll: () => api.get('/admin/service-charges'),
    create: (data) => api.post('/admin/service-charges', data),
    update: (id, data) => api.put(`/admin/service-charges/${id}`, data),
    delete: (id) => api.delete(`/admin/service-charges/${id}`),
};

export default api;

