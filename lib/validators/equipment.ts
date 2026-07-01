import { z } from "zod";

export const createEquipmentTypeSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  category: z.string().max(50).optional(),
});

export const updateEquipmentTypeSchema = createEquipmentTypeSchema.partial();

export type CreateEquipmentTypeInput = z.infer<typeof createEquipmentTypeSchema>;
export type UpdateEquipmentTypeInput = z.infer<typeof updateEquipmentTypeSchema>;

