import { z } from "zod";

export const UserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  created_at: z.string().datetime(),
});

export const HubSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  description: z.string().optional(),
  created_at: z.string().datetime(),
});

export const BountySchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  description: z.string(),
  reward: z.number().positive(),
  status: z.enum(["open", "claimed", "completed"]),
  created_at: z.string().datetime(),
});