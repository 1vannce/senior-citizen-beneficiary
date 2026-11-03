export const ROLES = ["STAFF", "ADMIN"] as const;
export type Role = (typeof ROLES)[number];

export const VERIFICATION_METHODS = ["FACE", "MANUAL_ID", "REPRESENTATIVE"] as const;
export type VerificationMethod = (typeof VERIFICATION_METHODS)[number];

export const BARANGAYS = ["Poblacion", "San Isidro", "Santa Cruz", "Bagong Silang"];

export const MAX_FAILED_ATTEMPTS = 5;
export const SESSION_IDLE_MINUTES = 15;
export const MIN_AGE = 60;

// How audit actions read in the change log and the dashboard activity list
export const ACTION_LABELS: Record<string, string> = {
  REGISTER: "Registered beneficiary",
  UPDATE: "Updated beneficiary",
  DEACTIVATE: "Deactivated beneficiary",
  REACTIVATE: "Reactivated beneficiary",
  RELEASE_ASSISTANCE: "Released assistance",
  CREATE_USER: "Created account",
  UPDATE_USER: "Updated account",
};

export const CIVIL_STATUSES = ["Single", "Married", "Widowed", "Separated"];
export const ID_TYPES = ["OSCA ID", "Senior Citizen ID"];
