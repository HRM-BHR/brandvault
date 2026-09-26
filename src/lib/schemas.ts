import { z } from "zod";

export const workspaceIdSchema = z
  .string({ message: "Workspace ID is required." })
  .trim()
  .min(1, "Workspace ID cannot be empty.")
  .max(128, "Workspace ID is too long.");

export const userIdSchema = z
  .string({ message: "User ID is required." })
  .trim()
  .min(1, "User ID cannot be empty.")
  .max(128, "User ID is too long.");
