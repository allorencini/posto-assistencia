import { beforeEach, describe, expect, it } from 'vitest';
import { db } from './db';

describe('sync engine', () => {
  beforeEach(async () => {
    await db.delete();
    await db.open();
  });

  it('enqueueSync adds item to sync_queue', async () => {
    const { enqueueSync } = await import('./sync');
    await enqueueSync({
      table: 'pessoas',
      operation: 'upsert',
      data: { id: 'p1' },
      user_id: 'u1',
    });
    const queue = await db.sync_queue.toArray();
    expect(queue).toHaveLength(1);
    expect(queue[0].table).toBe('pessoas');
    expect(queue[0].attempts).toBe(0);
  });
});
