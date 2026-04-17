// ──────────────────────────────────────────────
//  Barrel Export — All API Services
// ──────────────────────────────────────────────

export { apiClient, ApiError } from './apiClient';
export type { ApiResponse, PaginatedApiResponse } from './apiClient';

export { authService } from './authService';
export { userService } from './userService';
export type { UserProfile } from './userService';
export { bookingService } from './bookingService';
export { paymentService } from './paymentService';
export { insuranceService } from './insuranceService';
export { serviceCatalogService } from './serviceCatalogService';
export { planService } from './planService';
export { cityService } from './cityService';
export { uiConfigService } from './uiConfigService';
export { legalService } from './legalService';
export { storeService } from './storeService';
export { labService } from './labService';
