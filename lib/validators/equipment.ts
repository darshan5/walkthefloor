import { z } from "zod";

export const createEquipmentTypeSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  category: z.string().max(50).optional(),
});

export const updateEquipmentTypeSchema = createEquipmentTypeSchema.partial();

export type CreateEquipmentTypeInput = z.infer<typeof createEquipmentTypeSchema>;
export type UpdateEquipmentTypeInput = z.infer<typeof updateEquipmentTypeSchema>;

export const createShiftSchema = z.object({
  name: z.string().min(1, "Name is required").max(50),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, "Must be HH:MM format"),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, "Must be HH:MM format"),
});

export const updateShiftSchema = createShiftSchema.partial();

export type CreateShiftInput = z.infer<typeof createShiftSchema>;
export type UpdateShiftInput = z.infer<typeof updateShiftSchema>;
