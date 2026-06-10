import { z } from "zod";

const windowSchema = z.object({
  start: z.string().regex(/^\d{2}:\d{2}$/, "Must be HH:MM"),
  end: z.string().regex(/^\d{2}:\d{2}$/, "Must be HH:MM"),
  label: z.string().optional(),
});

const scheduleSchema = z.discriminatedUnion("frequency", [
  z.object({
    frequency: z.literal("daily"),
    timesPerDay: z.number().int().min(1).max(6).default(1),
    windows: z.array(windowSchema).min(1),
  }),
  z.object({
    frequency: z.literal("every_4h"),
    windows: z.array(windowSchema).length(6),
  }),
  z.object({
    frequency: z.literal("every_8h"),
    windows: z.array(windowSchema).length(3),
  }),
  z.object({
    frequency: z.literal("every_12h"),
    windows: z.array(windowSchema).length(2),
  }),
  z.object({
    frequency: z.literal("weekly"),
    days: z.array(z.enum(["mon", "tue", "wed", "thu", "fri", "sat", "sun"])).min(1),
    windows: z.array(windowSchema).min(1),
  }),
  z.object({
    frequency: z.literal("monthly"),
    dayOfMonth: z.number().int().min(1).max(31),
    windows: z.array(windowSchema).min(1),
  }),
  z.object({
    frequency: z.literal("custom"),
    intervalDays: z.number().int().min(1),
    windows: z.array(windowSchema).min(1),
  }),
]);

export const createTemplateSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  description: z.string().max(1000).optional(),
  category: z.string().max(50).optional(),
  schedule: scheduleSchema,
  isCustom: z.boolean().default(true),
});

export const updateTemplateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional(),
  category: z.string().max(50).optional(),
  assignmentType: z.enum(["book", "task"]).optional(),
  schedule: scheduleSchema.optional(),
  isActive: z.boolean().optional(),
});

const taskConfigSchema = z.object({
  min: z.number().optional(),
  max: z.number().optional(),
  target: z.number().optional(),
  unit: z.string().optional(),
  expectedAnswer: z.string().optional(),
  choices: z.array(z.string()).optional(),
}).passthrough();

export const createTaskSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  description: z.string().max(1000).optional(),
  taskType: z.enum([
    "YES_NO", "TEMPERATURE", "NUMERIC", "TEXT",
    "SELECT", "MULTI_SELECT", "PHOTO_ONLY", "SIGNATURE_ONLY",
  ]),
  config: taskConfigSchema.default({}),
  equipmentTypeId: z.string().optional(),
  scheduledTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  sortOrder: z.number().int().default(0),
  isRequired: z.boolean().default(true),
  isCritical: z.boolean().default(false),
  requiresPhoto: z.boolean().default(false),
  requiresSignature: z.boolean().default(false),
  helpText: z.string().max(500).optional(),
});

export const updateTaskSchema = createTaskSchema.partial();

export const reorderTasksSchema = z.object({
  taskIds: z.array(z.string()).min(1),
});

export type CreateTemplateInput = z.infer<typeof createTemplateSchema>;
export type UpdateTemplateInput = z.infer<typeof updateTemplateSchema>;
export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type ScheduleInput = z.infer<typeof scheduleSchema>;
