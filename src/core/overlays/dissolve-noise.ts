export type DissolveNoiseField = Readonly<{
  columns: number;
  rows: number;
  thresholds: Float32Array;
}>;

function randomAt(index: number, seed: number): number {
  let value = (index + 1) ^ seed;
  value = Math.imul(value ^ (value >>> 16), 2_246_822_519);
  value = Math.imul(value ^ (value >>> 13), 3_266_489_917);
  return ((value ^ (value >>> 16)) >>> 0) / 4_294_967_295;
}

export function createDissolveNoiseField(
  columns: number,
  rows: number,
  seed: number,
): DissolveNoiseField {
  const safeColumns = Math.max(1, Math.floor(columns));
  const safeRows = Math.max(1, Math.floor(rows));
  const thresholds = new Float32Array(safeColumns * safeRows);
  const clusterColumns = Math.ceil(safeColumns / 4);

  for (let index = 0; index < thresholds.length; index += 1) {
    const x = index % safeColumns;
    const y = Math.floor(index / safeColumns);
    const clusterIndex = Math.floor(x / 4) + Math.floor(y / 4) * clusterColumns;
    const fine = randomAt(index, seed);
    const cluster = randomAt(clusterIndex, seed ^ 0x9e3779b9);
    thresholds[index] = fine * 0.68 + cluster * 0.32;
  }

  return { columns: safeColumns, rows: safeRows, thresholds };
}
