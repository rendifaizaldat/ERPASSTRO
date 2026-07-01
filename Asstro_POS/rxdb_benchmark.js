const { createRxDatabase, addRxPlugin } = require('rxdb');
const { getRxStorageMemory } = require('rxdb/plugins/storage-memory');
const { RxDBUpdatePlugin } = require('rxdb/plugins/update');
addRxPlugin(RxDBUpdatePlugin);

const schema = {
  version: 0,
  primaryKey: 'id',
  type: 'object',
  properties: {
    id: { type: 'string', maxLength: 100 },
    name: { type: 'string' }
  },
  required: ['id', 'name']
};

async function run() {
  const db = await createRxDatabase({
    name: 'testdb',
    storage: getRxStorageMemory()
  });

  const collection = await db.addCollections({
    items: {
      schema
    }
  });

  const docs = Array.from({ length: 1000 }, (_, i) => ({ id: i.toString(), name: `Item ${i}` }));

  // N+1 test
  let start = Date.now();
  for (let i = 0; i < docs.length; i++) {
    await db.items.upsert(docs[i]);
  }
  let end = Date.now();
  const n1Time = end - start;
  console.log(`N+1 upsert: ${n1Time}ms`);

  const docs2 = Array.from({ length: 1000 }, (_, i) => ({ id: (i + 1000).toString(), name: `Item ${i + 1000}` }));

  // bulkUpsert test
  start = Date.now();
  await db.items.bulkUpsert(docs2);
  end = Date.now();
  const bulkTime = end - start;
  console.log(`bulkUpsert: ${bulkTime}ms`);

  console.log(`Speedup: ${(n1Time / bulkTime).toFixed(2)}x`);

  process.exit(0);
}

run();
