// Symptom-Doctor Mapping Helper
// PRD: Smart logic to distinguish between General Physicians and Physiotherapists
import { SYMPTOMS } from '@/constants/appConstants';
import { DoctorType, Symptom } from '@/types/booking';

export function getDoctorTypeForSymptoms(symptoms: Symptom[]): DoctorType {
  const physioSymptoms: Symptom[] = ['post-surgery-rehab'];
  
  const hasPhysioSymptom = symptoms.some(s => physioSymptoms.includes(s));
  
  if (hasPhysioSymptom) {
    return 'physiotherapist';
  }
  
  return 'general-physician';
}

export function getSymptomLabel(symptomId: Symptom): string {
  const symptom = SYMPTOMS.find(s => s.id === symptomId);
  return symptom?.label || symptomId;
}

export function getSymptomIcon(symptomId: Symptom): string {
  const symptom = SYMPTOMS.find(s => s.id === symptomId);
  return symptom?.icon || '❓';
}
