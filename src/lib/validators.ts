import { z } from "zod";
import { MIN_AGE } from "./constants";

export function ageOn(birthDate: Date, now = new Date()): number {
  let age = now.getFullYear() - birthDate.getFullYear();
  const beforeBirthday =
    now.getMonth() < birthDate.getMonth() ||
    (now.getMonth() === birthDate.getMonth() && now.getDate() < birthDate.getDate());
  if (beforeBirthday) age--;
  return age;
}

const required = (label: string) => z.string().trim().min(1, `${label} is required`);

export const beneficiarySchema = z.object({
  firstName: required("First name"),
  middleName: z.string().trim().optional(),
  lastName: required("Last name"),
  birthDate: z
    .string()
    .min(1, "Birth date is required")
    .refine((v) => !Number.isNaN(Date.parse(v)), "Enter a valid date")
    .refine((v) => ageOn(new Date(v)) >= MIN_AGE, `Applicant must be at least ${MIN_AGE} years old`),
  sex: z.enum(["M", "F"], { message: "Sex is required" }),
  address: required("Address"),
  barangay: required("Barangay"),
  contactNo: z.string().trim().optional(),
  oscaIdNo: required("OSCA ID number"),
});
export type BeneficiaryInput = z.infer<typeof beneficiarySchema>;

const isDate = (v: string) => !Number.isNaN(Date.parse(v));

// Everything the registration wizard collects. City and province are saved inside the address.
export const registerSchema = beneficiarySchema.extend({
  suffix: z.string().trim().optional(),
  birthplace: required("Birthplace"),
  civilStatus: required("Civil status"),
  contactNo: required("Mobile number"),
  email: z
    .string()
    .trim()
    .optional()
    .refine((v) => !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), "Enter a valid email address"),
  city: required("City / municipality"),
  province: required("Province"),
  emergencyName: required("Contact name"),
  emergencyRelationship: required("Relationship"),
  emergencyMobile: required("Mobile number"),
  idType: required("ID type"),
  placeOfIssue: required("Place of issue"),
  issueDate: required("Issue date").refine(isDate, "Enter a valid date"),
  expiryDate: z
    .string()
    .optional()
    .refine((v) => !v || isDate(v), "Enter a valid date"),
});
export type RegisterInput = z.infer<typeof registerSchema>;

// An edited record must still belong to a senior citizen, so the registration rules apply here too.
// City and province were saved inside the address, so the address is edited as one field.
export const beneficiaryEditSchema = registerSchema.omit({ city: true, province: true }).extend({
  reason: required("Reason for change"),
});

export const loginSchema = z.object({
  username: required("Username"),
  password: z.string().min(1, "Password is required"),
});

const passwordRule = z.string().min(8, "Password must be at least 8 characters");

export const userCreateSchema = z.object({
  username: z.string().trim().min(3, "Username must be at least 3 characters"),
  fullName: required("Full name"),
  role: z.enum(["STAFF", "ADMIN"]),
  password: passwordRule,
});

export const userEditSchema = z.object({
  fullName: required("Full name"),
  role: z.enum(["STAFF", "ADMIN"]),
  isActive: z.boolean(),
  password: passwordRule.optional().or(z.literal("")),
});

export const embeddingSchema = z.array(z.number()).min(64).max(4096);
