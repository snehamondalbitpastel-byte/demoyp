import { z } from "zod";

export const loginSchema = z.object({
  email: z
    .string()
    .min(1, "Email is required")
    .email("Please enter a valid email address")
    .refine(
      (val) => {
        const domain = val.split("@")[1];
        return domain ? domain === domain.toLowerCase() : true;
      },
      { message: "Email domain must be lowercase" }
    ),
  password: z
    .string()
    .min(1, "Password is required")
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Must contain at least 1 uppercase letter")
    .regex(/[a-z]/, "Must contain at least 1 lowercase letter")
    .regex(/[0-9]/, "Must contain at least 1 number")
    .regex(/[^A-Za-z0-9]/, "Must contain at least 1 special character"),
});

export type LoginFormData = z.infer<typeof loginSchema>;

/** Base signup fields — exported so SignupForm can validate individual fields on blur. */
export const signupFieldSchemas = {
  first_name: z
    .string()
    .min(1, "First name is required")
    .min(2, "First name must be at least 2 characters")
    .regex(/^[A-Za-z\s]+$/, "First name can only contain letters"),
  last_name: z
    .string()
    .min(1, "Last name is required")
    .min(2, "Last name must be at least 2 characters")
    .regex(/^[A-Za-z\s]+$/, "Last name can only contain letters"),
  email: z
    .string()
    .min(1, "Email is required")
    .email("Please enter a valid email address")
    .regex(
      /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.com$/,
      "Email must end with .com"
    )
    .refine(
      (val) => {
        const domain = val.split("@")[1];
        return domain ? domain === domain.toLowerCase() : true;
      },
      { message: "Email domain must be lowercase" }
    ),
  password: z
    .string()
    .min(1, "Password is required")
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Must contain at least 1 uppercase letter")
    .regex(/[a-z]/, "Must contain at least 1 lowercase letter")
    .regex(/[0-9]/, "Must contain at least 1 number")
    .regex(/[^A-Za-z0-9]/, "Must contain at least 1 special character"),
  confirm_password: z
    .string()
    .min(1, "Confirm password is required"),
};

export const signupSchema = z.object(signupFieldSchemas).refine(
  (data) => data.password === data.confirm_password,
  {
    message: "Passwords do not match",
    path: ["confirm_password"],
  }
);

export type SignupFormData = z.infer<typeof signupSchema>;

export const PASSWORD_RULES = [
  { label: "At least 8 characters", regex: /.{8,}/ },
  { label: "1 uppercase letter", regex: /[A-Z]/ },
  { label: "1 lowercase letter", regex: /[a-z]/ },
  { label: "1 number", regex: /[0-9]/ },
  { label: "1 special character", regex: /[^A-Za-z0-9]/ },
];
