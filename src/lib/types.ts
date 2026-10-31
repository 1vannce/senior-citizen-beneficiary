// Shapes shared between API routes and client components (no server imports here).
export type BeneficiarySummary = {
  id: string;
  referenceNo: string;
  name: string;
  barangay: string;
  oscaIdNo: string;
  age: number;
  status: string;
  needsManualVerification: boolean;
};

export type Verified = {
  beneficiary: BeneficiarySummary;
  method: "FACE" | "MANUAL_ID" | "REPRESENTATIVE";
  embedding?: number[];
  score?: number;
  representativeName?: string;
};
