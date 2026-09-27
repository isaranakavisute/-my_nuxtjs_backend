import { z } from 'zod';

export const userIdParamSchema = z.object({
  id: z.uuid('id must be a UUID'),
});

export const createUserSchema = z.object({
  email: z.email().max(255).transform((value) => value.toLowerCase()),
  name: z.string().trim().min(1).max(120),
});

export const updateUserSchema = createUserSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: 'Provide at least one of: email, name',
  });

export const listUsersQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
  search: z.string().trim().min(1).max(120).optional(),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type ListUsersQuery = z.infer<typeof listUsersQuerySchema>;

export interface User {
  id: string;
  email: string;
  name: string;
  created_at: Date;
  updated_at: Date;
}
