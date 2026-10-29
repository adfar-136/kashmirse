# Kashmir Se catalogue imagery

These twelve local WebP atlases contain 78 individually composed product photos. Every seeded product has its own distinct tile, and the four original featured products also retain their approved reference photographs.

The photos were generated using built-in Imagegen for this store. They are illustrative seed assets, not supplier documentation. Exact subjects and generation instructions are recorded in scripts/catalog-image-prompts.json. Original generation output paths are recorded in scripts/catalog-image-sources.json; the running application uses only the local WebP files in this directory.

Each atlas has three columns. Clothing and Home & Crafts have three rows; the remaining atlases have two rows. src/shared/lib/catalog-images.ts validates every tile reference. Rendering through CSS retains each original composition without crossing into neighbouring tiles.
