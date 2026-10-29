/** Each catalogue photo is a separate tile of an original, locally stored photo atlas. */
export const catalogueAtlases: Record<string, { columns: number; rows: number }> = {
  'dry-fruits': { columns: 3, rows: 2 },
  'saffron-tea': { columns: 3, rows: 2 },
  'food-pickles': { columns: 3, rows: 2 },
  clothing: { columns: 3, rows: 3 },
  shawls: { columns: 3, rows: 2 },
  'home-crafts': { columns: 3, rows: 3 },
  cricket: { columns: 3, rows: 2 },
  gifts: { columns: 3, rows: 2 },
  'fresh-produce': { columns: 3, rows: 2 },
  'dried-foods': { columns: 3, rows: 2 },
  bakery: { columns: 3, rows: 2 },
  accessories: { columns: 3, rows: 2 },
};
export function catalogueCrop(image: string) {
  const match = /^catalog:([a-z-]+):([0-8])$/.exec(image);
  if (!match) return null;
  const atlas = catalogueAtlases[match[1]];
  const tile = Number(match[2]);
  if (!atlas || tile >= atlas.columns * atlas.rows) return null;
  return { category: match[1], tile, ...atlas };
}
