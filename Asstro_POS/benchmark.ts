import { performance } from "perf_hooks";

async function simulateDbUpsert(item: any) {
  // Simulate DB async call
  await new Promise((resolve) => setTimeout(resolve, 5));
}

async function simulateDbBulkUpsert(items: any[]) {
  // Simulate bulk DB async call (faster than individual calls)
  await new Promise((resolve) => setTimeout(resolve, 5 + items.length * 0.5));
}

async function runBenchmark() {
  const numItems = 100;
  const items = Array.from({ length: numItems }, (_, i) => ({
    id: `id_${i}`,
    name: `Name ${i}`
  }));

  // Baseline: loop upsert
  const startLoop = performance.now();
  for (const item of items) {
    await simulateDbUpsert(item);
  }
  const endLoop = performance.now();
  console.log(`Loop upsert ${numItems} items: ${(endLoop - startLoop).toFixed(2)} ms`);

  // Optimized: bulkUpsert
  const startBulk = performance.now();
  await simulateDbBulkUpsert(items);
  const endBulk = performance.now();
  console.log(`Bulk upsert ${numItems} items: ${(endBulk - startBulk).toFixed(2)} ms`);
}

runBenchmark().catch(console.error);
