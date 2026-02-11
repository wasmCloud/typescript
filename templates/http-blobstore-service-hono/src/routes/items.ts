import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { z } from 'zod/mini';

// @ts-expect-error - JCO doesn't generate types for wasi:blobstore yet
import { getContainer, createContainer, containerExists } from 'wasi:blobstore/blobstore@0.2.0-draft';
// @ts-expect-error - JCO doesn't generate types for wasi:blobstore yet
import { OutgoingValue, IncomingValue } from 'wasi:blobstore/types@0.2.0-draft';

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

// Helpers for serializing/deserializing items
const encoder = new TextEncoder();
const decoder = new TextDecoder();

function serializeItem(item: Item): Uint8Array {
  return encoder.encode(JSON.stringify(item));
}

function deserializeItem(bytes: Uint8Array): Item {
  return JSON.parse(decoder.decode(bytes));
}

const ITEM_PREFIX = 'item:';
const CONTAINER_NAME = 'default';

// ---------------------------------------------------------------------------
// Blobstore helpers
// ---------------------------------------------------------------------------

/** Ensure a blobstore container exists, creating it if necessary. */
function ensureContainer(name: string) {
  if (!containerExists(name)) {
    createContainer(name);
  }
  return getContainer(name);
}

/** Write bytes to a blob in the given container. */
function writeBlob(container: any, name: string, bytes: Uint8Array): void {
  const ov = OutgoingValue.newOutgoingValue();
  const stream = ov.outgoingValueWriteBody();
  stream.blockingWriteAndFlush(bytes);
  container.writeData(name, ov);
  OutgoingValue.finish(ov);
}

/** Read a blob from the given container, returning the bytes. */
function readBlob(container: any, name: string): Uint8Array {
  const metadata = container.objectInfo(name);
  const iv = container.getData(name, 0n, metadata.size - 1n);
  return IncomingValue.incomingValueConsumeSync(iv);
}

/** List all object names in the given container. */
function listObjectNames(container: any): string[] {
  const stream = container.listObjects();
  const names: string[] = [];
  while (true) {
    const [batch, done] = stream.readStreamObjectNames(100n);
    names.push(...batch);
    if (done) break;
  }
  return names;
}

type Variables = {
  requestId: string;
};

const itemsRouter = new Hono<{ Variables: Variables }>();

// List all items
itemsRouter.get('/', (c) => {
  const container = ensureContainer(CONTAINER_NAME);
  const names = listObjectNames(container);
  const itemNames = names.filter((n: string) => n.startsWith(ITEM_PREFIX));

  const itemList: Item[] = [];
  for (const name of itemNames) {
    const bytes = readBlob(container, name);
    itemList.push(deserializeItem(bytes));
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
  const container = ensureContainer(CONTAINER_NAME);

  if (!container.hasObject(`${ITEM_PREFIX}${id}`)) {
    throw new HTTPException(404, { message: `Item with id '${id}' not found` });
  }

  const bytes = readBlob(container, `${ITEM_PREFIX}${id}`);
  return c.json(deserializeItem(bytes));
});

// Create new item
itemsRouter.post('/', async (c) => {
  const json = await c.req.json();
  const result = createItemSchema.safeParse(json);

  if (!result.success) {
    throw new HTTPException(400, { message: result.error.issues[0].message });
  }

  const container = ensureContainer(CONTAINER_NAME);
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  const newItem: Item = {
    id,
    name: result.data.name.trim(),
    description: result.data.description?.trim() || '',
    createdAt: now,
    updatedAt: now,
  };

  writeBlob(container, `${ITEM_PREFIX}${id}`, serializeItem(newItem));

  c.status(201);
  c.header('Location', `/api/items/${id}`);
  return c.json(newItem);
});

// Update item
itemsRouter.put('/:id', async (c) => {
  const id = c.req.param('id');
  const container = ensureContainer(CONTAINER_NAME);

  if (!container.hasObject(`${ITEM_PREFIX}${id}`)) {
    throw new HTTPException(404, { message: `Item with id '${id}' not found` });
  }

  const existing = deserializeItem(readBlob(container, `${ITEM_PREFIX}${id}`));

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

  writeBlob(container, `${ITEM_PREFIX}${id}`, serializeItem(updated));

  return c.json(updated);
});

// Delete item
itemsRouter.delete('/:id', (c) => {
  const id = c.req.param('id');
  const container = ensureContainer(CONTAINER_NAME);

  if (!container.hasObject(`${ITEM_PREFIX}${id}`)) {
    throw new HTTPException(404, { message: `Item with id '${id}' not found` });
  }

  container.deleteObject(`${ITEM_PREFIX}${id}`);

  return c.json({ deleted: true, id });
});

export { itemsRouter };
