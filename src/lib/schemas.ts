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

function isHttpUrl(value: string) {
  try {
    return ["http:", "https:"].includes(new URL(value).protocol);
  } catch {
    return false;
  }
}

export const brandProfileInputSchema = z
  .object({
    name: z.string().trim().min(1, "Brand name is required.").max(120),
    primary_color: z
      .string()
      .trim()
      .regex(/^#[0-9a-fA-F]{6}$/, "Enter a valid 6-digit hex color.")
      .transform((value) => value.toUpperCase()),
    secondary_color: z
      .string()
      .trim()
      .regex(/^#[0-9a-fA-F]{6}$/, "Enter a valid 6-digit hex color.")
      .transform((value) => value.toUpperCase()),
    logo_url: z
      .string()
      .trim()
      .max(2048, "Logo URL is too long.")
      .refine((value) => value.length === 0 || isHttpUrl(value), "Enter a valid HTTP or HTTPS URL.")
      .optional()
      .transform((value) => value || null),
    default_font: z
      .string()
      .trim()
      .max(120, "Default font is too long.")
      .optional()
      .transform((value) => value || null),
  })
  .strict();

export type BrandProfileInput = z.output<typeof brandProfileInputSchema>;

export const MAX_FOLDER_DEPTH = 3;

const folderNameSchema = z
  .string()
  .trim()
  .min(1, "Folder name is required.")
  .max(100, "Folder name must be 100 characters or fewer.");

export const createFolderInputSchema = z
  .object({
    name: folderNameSchema,
    parent_folder_id: z.string().uuid("Parent folder ID must be a valid UUID.").nullable().optional(),
  })
  .strict();

export const updateFolderInputSchema = z
  .object({
    name: folderNameSchema.optional(),
    parent_folder_id: z.string().uuid("Parent folder ID must be a valid UUID.").nullable().optional(),
  })
  .strict()
  .refine((input) => Object.keys(input).length > 0, {
    message: "Provide a folder name or parent folder ID to update.",
  });

export type CreateFolderInput = z.output<typeof createFolderInputSchema>;
export type UpdateFolderInput = z.output<typeof updateFolderInputSchema>;
