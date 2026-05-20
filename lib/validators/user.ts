import { z } from "zod";

export const createUserSchema = z.object({
  email: z.string().email().optional(),
  password: z.string().min(6).optional(),
  pin: z.string().min(4).max(6).optional(),
  name: z.string().min(1, "Name is required").max(100),
  title: z.string().max(100).optional(),
  userType: z.enum(["full", "pin_only"]).default("full"),
  roleId: z.string().min(1, "Role is required"),
  managerId: z.string().optional(),
  homeLocationId: z.string().optional(),
  appAccess: z.array(z.string()).optional(),
  hireDate: z.string().datetime().optional(),
});

export const updateUserSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  title: z.string().max(100).optional(),
  email: z.string().email().optional(),
  pin: z.string().min(4).max(6).optional(),
  roleId: z.string().optional(),
  managerId: z.string().nullable().optional(),
  homeLocationId: z.string().nullable().optional(),
  appAccess: z.array(z.string()).optional(),
  isActive: z.boolean().optional(),
  hireDate: z.string().datetime().optional(),
});

export const assignLocationsSchema = z.object({
  locationIds: z.array(z.string()).min(1),
});

export const resetPasswordSchema = z.object({
  newPassword: z.string().min(6),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
