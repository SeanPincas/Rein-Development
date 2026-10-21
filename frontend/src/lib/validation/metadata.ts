import { z } from "zod";

export const metadataRequestSchema = z.object({
  url: z.string().trim().min(1).max(2048),
}).strict();

export type MetadataRequest = z.infer<typeof metadataRequestSchema>;
