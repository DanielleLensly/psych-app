export type UserRole = 'admin' | 'psychologist';

export interface Profile {
  id: string;
  role: UserRole | null;
  full_name: string | null;
  updated_at: string | null;
}
// Re-using Profile for Patient for now, but explicit type helps clarity
export interface Patient extends Profile {
  // Add patient-specific fields here later if needed
  email?: string; // Often joined from auth.users, but useful to have on profile for display if synced
  date_of_birth?: string;
  phone?: string;
  address?: string;
  status?: 'in-patient' | 'out-patient';
  mental_hospital_history?: string;
  doctors_history?: string;
}

export interface EncryptedNote {
  id: string;
  patient_id: string;
  created_by: string;
  content: string; // Encrypted
  iv: string;
  created_at: string;
}

export interface Appointment {
  id: string;
  patient_id: string;
  date: string;
  duration: number; // minutes
  type: string;
  status: 'Scheduled' | 'Completed' | 'Cancelled';
  notes?: string;
  created_at: string;
}

export interface PatientComment {
  id: string;
  patient_id: string;
  author_id: string;
  content: string;
  created_at: string;
}
