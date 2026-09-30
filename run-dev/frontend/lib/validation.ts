import { z } from "zod";
import { MIN_PASSWORD } from "./password";

const email = z.string().trim().toLowerCase().pipe(z.email("That doesn't look like an email address."));

export const loginSchema = z.object({
  email,
  password: z.string().min(1, "Enter your password."),
});

export const signupSchema = z
  .object({
    name: z.string().trim().min(1, "What should the admin call you?").max(80, "Keep it under 80 characters."),
    email,
    password: z.string().min(MIN_PASSWORD, `Needs at least ${MIN_PASSWORD} characters.`).max(256),
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, { path: ["confirm"], message: "These two don't match yet." });

export const forgotSchema = z.object({ email });

export const resetSchema = z
  .object({
    password: z.string().min(MIN_PASSWORD, `Needs at least ${MIN_PASSWORD} characters.`).max(256),
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, { path: ["confirm"], message: "These two don't match yet." });

/** Flatten zod issues to { field: firstMessage }. */
export function fieldErrors<T extends string>(error: z.ZodError): Partial<Record<T, string>> {
  const out: Partial<Record<T, string>> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form") as T;
    out[key] ??= issue.message;
  }
  return out;
}
