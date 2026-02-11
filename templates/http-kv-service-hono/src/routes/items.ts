import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { z } from 'zod/mini';

// @ts-expect-error - JCO doesn't generate types for wasi:keyvalue yet
import { open } from 'wasi:keyvalue/store@0.2.0-draft';
// @ts-expect-error - JCO doesn't generate types for wasi:keyvalue yet
import { increment } from 'wasi:keyvalue/atomics@0.2.0-draft';

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

// Helpers for serializing/deserializing items to/from the keyvalue store
const encoder = new TextEncoder();
const decoder = new TextDecoder();

function serializeItem(item: Item): Uint8Array {
  return encoder.encode(JSON.stringify(item));
}

function deserializeItem(bytes: Uint8Array): Item {
  return JSON.parse(decoder.decode(bytes));
}

const ITEM_PREFIX = 'item:';

function getBucket() {
  return open('default');
}

type Variables = {
  requestId: string;
};

const itemsRouter = new Hono<{ Variables: Variables }>();

// List all items
itemsRouter.get('/', (c) => {
  const bucket = getBucket();
  const keys = bucket.listKeys(undefined) as { keys: string[] };
  const itemKeys = keys.keys.filter((k: string) => k.startsWith(ITEM_PREFIX));

  const itemList: Item[] = [];
  for (const key of itemKeys) {
    const bytes = bucket.get(key);
    if (bytes) {
      itemList.push(deserializeItem(bytes));
    }
  }

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
  const bucket = getBucket();
  const bytes = bucket.get(`${ITEM_PREFIX}${id}`);

  if (!bytes) {
    throw new HTTPException(404, { message: `Item with id '${id}' not found` });
  }

  return c.json(deserializeItem(bytes));
});

// Create new item
itemsRouter.post('/', async (c) => {
  const json = await c.req.json();
  const result = createItemSchema.safeParse(json);

  if (!result.success) {
    throw new HTTPException(400, { message: result.error.issues[0].message });
  }

  const bucket = getBucket();
  const id = String(increment(bucket, 'next_id', 1n));
  const now = new Date().toISOString();

  const newItem: Item = {
    id,
    name: result.data.name.trim(),
    description: result.data.description?.trim() || '',
    createdAt: now,
    updatedAt: now,
  };

  bucket.set(`${ITEM_PREFIX}${id}`, serializeItem(newItem));

  c.status(201);
  c.header('Location', `/api/items/${id}`);
  return c.json(newItem);
});

// Update item
itemsRouter.put('/:id', async (c) => {
  const id = c.req.param('id');
  const bucket = getBucket();
  const bytes = bucket.get(`${ITEM_PREFIX}${id}`);

  if (!bytes) {
    throw new HTTPException(404, { message: `Item with id '${id}' not found` });
  }

  const existing = deserializeItem(bytes);

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

  bucket.set(`${ITEM_PREFIX}${id}`, serializeItem(updated));

  return c.json(updated);
});

// Delete item
itemsRouter.delete('/:id', (c) => {
  const id = c.req.param('id');
  const bucket = getBucket();

  if (!bucket.exists(`${ITEM_PREFIX}${id}`)) {
    throw new HTTPException(404, { message: `Item with id '${id}' not found` });
  }

  bucket.delete(`${ITEM_PREFIX}${id}`);

  return c.json({ deleted: true, id });
});

export { itemsRouter };
