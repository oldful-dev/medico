import { apiClient, ApiResponse } from './apiClient';

export interface FamilyMember {
    id: string;
    userId: string;
    name: string;
    relation: string; // Father, Mother, Spouse, Child, Other
    gender?: string;
    dateOfBirth?: string;
    bloodGroup?: string;
    allergies?: string;
    chronicConditions?: string;
    emergencyNotes?: string;
    createdAt: string;
    updatedAt: string;
}

export interface CreateFamilyMemberPayload {
    name: string;
    relation: string;
    gender?: string;
    dateOfBirth?: string;
    bloodGroup?: string;
    allergies?: string;
    chronicConditions?: string;
    emergencyNotes?: string;
}

export const familyMemberService = {
    getFamilyMembers: async (userId: string): Promise<ApiResponse<FamilyMember[]>> => {
        return apiClient.get<FamilyMember[]>(`/users/${userId}/family-members`);
    },

    addFamilyMember: async (userId: string, data: CreateFamilyMemberPayload): Promise<ApiResponse<FamilyMember>> => {
        return apiClient.post<FamilyMember>(`/users/${userId}/family-members`, data);
    },

    updateFamilyMember: async (userId: string, memberId: string, data: Partial<CreateFamilyMemberPayload>): Promise<ApiResponse<FamilyMember>> => {
        return apiClient.put<FamilyMember>(`/users/${userId}/family-members/${memberId}`, data);
    },

    deleteFamilyMember: async (userId: string, memberId: string): Promise<ApiResponse> => {
        return apiClient.delete(`/users/${userId}/family-members/${memberId}`);
    },
};
