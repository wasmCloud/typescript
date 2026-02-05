import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { z } from 'zod/mini';

// Validation schemas
const createItemSchema = z.object({
  name: z.string().check(z.minLength(1, 'Name is required and must be a non-empty string')),
  description: z.optional(z.string()),
});

const updateItemSchema = z.object({
  name: z.optional(z.string().check(z.minLength(1, 'Name must be a non-empty string'))),
  description: z.optional(z.string()),
});

// Types
type CreateItemInput = z.infer<typeof createItemSchema>;
type UpdateItemInput = z.infer<typeof updateItemSchema>;

interface Item extends Required<CreateItemInput> {
  id: string;
  createdAt: string;
  updatedAt: string;
}

// Simulated database
const items = new Map<string, Item>();
let nextId = 1;

// Initialize with sample data
items.set('1', {
  id: '1',
  name: 'Sample Item',
  description: 'This is a sample item',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});
nextId = 2;

type Variables = {
  requestId: string;
};

const itemsRouter = new Hono<{ Variables: Variables }>();

// List all items
itemsRouter.get('/', (c) => {
  const itemList = Array.from(items.values());

  // Support filtering by name via query parameter
  const nameFilter = c.req.query('name');
  const filtered = nameFilter
    ? itemList.filter((item) => item.name.toLowerCase().includes(nameFilter.toLowerCase()))
    : itemList;

  // Support pagination via query parameters
  const limit = parseInt(c.req.query('limit') || '10', 10);
  const offset = parseInt(c.req.query('offset') || '0', 10);
  const paginated = filtered.slice(offset, offset + limit);

  return c.json({
    items: paginated,
    total: filtered.length,
    limit,
    offset,
  });
});

// Get single item by ID
itemsRouter.get('/:id', (c) => {
  const id = c.req.param('id');
  const item = items.get(id);

  if (!item) {
    throw new HTTPException(404, { message: `Item with id '${id}' not found` });
  }

  return c.json(item);
});

// Create new item
itemsRouter.post('/', async (c) => {
  const json = await c.req.json();
  const result = createItemSchema.safeParse(json);

  if (!result.success) {
    throw new HTTPException(400, { message: result.error.issues[0].message });
  }

  const id = String(nextId++);
  const now = new Date().toISOString();

  const newItem: Item = {
    id,
    name: result.data.name.trim(),
    description: result.data.description?.trim() || '',
    createdAt: now,
    updatedAt: now,
  };

  items.set(id, newItem);

  c.status(201);
  c.header('Location', `/api/items/${id}`);
  return c.json(newItem);
});

// Update item
itemsRouter.put('/:id', async (c) => {
  const id = c.req.param('id');
  const existing = items.get(id);

  if (!existing) {
    throw new HTTPException(404, { message: `Item with id '${id}' not found` });
  }

  const json = await c.req.json();
  const result = updateItemSchema.safeParse(json);

  if (!result.success) {
    throw new HTTPException(400, { message: result.error.issues[0].message });
  }

  const updated: Item = {
    ...existing,
    name: result.data.name?.trim() ?? existing.name,
    description: result.data.description?.trim() ?? existing.description,
    updatedAt: new Date().toISOString(),
  };

  items.set(id, updated);

  return c.json(updated);
});

// Delete item
itemsRouter.delete('/:id', (c) => {
  const id = c.req.param('id');

  if (!items.has(id)) {
    throw new HTTPException(404, { message: `Item with id '${id}' not found` });
  }

  items.delete(id);

  return c.json({ deleted: true, id });
});

export { itemsRouter };
