export const ROLES = ["STAFF", "ADMIN"] as const;
export type Role = (typeof ROLES)[number];

export const VERIFICATION_METHODS = ["FACE", "MANUAL_ID", "REPRESENTATIVE"] as const;
export type VerificationMethod = (typeof VERIFICATION_METHODS)[number];

export const BARANGAYS = ["Poblacion", "San Isidro", "Santa Cruz", "Bagong Silang"];

export const MAX_FAILED_ATTEMPTS = 5;
export const SESSION_IDLE_MINUTES = 15;
export const MIN_AGE = 60;
