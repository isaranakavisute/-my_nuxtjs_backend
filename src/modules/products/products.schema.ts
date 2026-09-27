import { z } from 'zod';

export const listProductsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
  category: z.string().trim().min(1).max(120).optional(),
  search: z.string().trim().min(1).max(120).optional(),
});

export type ListProductsQuery = z.infer<typeof listProductsQuerySchema>;

export interface Product {
  id: string;
  name: string;
  category: string;
  emoji: string;
  price: number;
  original_price: number | null;
  rating: number;
  sold_count: number;
  location: string;
}
