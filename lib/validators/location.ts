import { z } from "zod";

export const createLocationSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  storeNumber: z.string().max(20).optional(),
  address: z.string().max(500).optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  geoFenceRadius: z.number().int().positive().optional(),
  timezone: z.string().default("America/New_York"),
  operatingHours: z.record(z.string(), z.object({
    open: z.string().regex(/^\d{2}:\d{2}$/),
    close: z.string().regex(/^\d{2}:\d{2}$/),
  })).optional(),
  complianceStartDate: z.string().datetime().optional(),
  regionId: z.string().optional(),
});

export const updateLocationSchema = createLocationSchema.partial();

export type CreateLocationInput = z.infer<typeof createLocationSchema>;
export type UpdateLocationInput = z.infer<typeof updateLocationSchema>;

export const assignEquipmentSchema = z.object({
  equipmentTypeId: z.string().min(1),
  instanceName: z.string().min(1, "Instance name is required").max(100),
  sortOrder: z.number().int().default(0),
});

export const cloneBookConfigSchema = z.object({
  sourceLocationId: z.string().min(1, "Source location is required"),
});
