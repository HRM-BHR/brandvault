import { z } from "zod";

export const workspaceIdSchema = z
  .string({ message: "Workspace ID is required." })
  .trim()
  .uuid("Workspace ID must be a valid UUID.");

export const userIdSchema = z
  .string({ message: "User ID is required." })
  .trim()
  .uuid("User ID must be a valid UUID.");

export const signInSchema = z.object({
  email: z.string().trim().email("Enter a valid email address."),
  password: z.string().min(1, "Enter your password."),
});

export const signUpSchema = z
  .object({
    email: z.string().trim().email("Enter a valid email address."),
    password: z.string().min(8, "Password must be at least 8 characters."),
    confirmPassword: z.string().min(1, "Confirm your password."),
  })
  .refine(({ password, confirmPassword }) => password === confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });
