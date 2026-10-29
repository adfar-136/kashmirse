import type { CSSProperties } from 'react';
import { catalogueCrop } from '@/shared/lib/catalog-images';
const crops: Record<string, [number, number, number, number]> = {
  hero: [576, 117, 859, 400],
  walnuts: [47, 756, 324, 182],
  saffron: [389, 756, 324, 182],
  pheran: [732, 756, 324, 182],
  copper: [1074, 756, 316, 182],
  'dry-fruits': [27, 531, 162, 120],
  'saffron-tea': [201, 531, 162, 120],
  pickles: [376, 531, 162, 120],
  clothing: [549, 531, 162, 120],
  shawls: [723, 531, 162, 120],
  crafts: [898, 531, 162, 120],
  cricket: [1073, 531, 162, 120],
  gifts: [1247, 531, 162, 120],
  floral: [0, 118, 99, 399],
  flower: [117, 5, 50, 57],
  corner: [0, 0, 78, 116],
  texture: [400, 125, 160, 100],
  bottom: [0, 1053, 1435, 43],
};
export function Art({
  image,
  alt = '',
  className = '',
  style = {},
}: {
  image: string;
  alt?: string;
  className?: string;
  style?: CSSProperties;
}) {
  const crop = catalogueCrop(image);
  if (crop) {
    const column = crop.tile % crop.columns;
    const row = Math.floor(crop.tile / crop.columns);
    return (
      <div
        role={alt ? 'img' : undefined}
        aria-label={alt || undefined}
        aria-hidden={alt ? undefined : true}
        data-catalog-image={image}
        className={`art art-catalog ${className}`}
        style={{
          backgroundImage: `url("/catalog/${crop.category}.webp")`,
          backgroundSize: `${crop.columns * 100}% ${crop.rows * 100}%`,
          backgroundPosition: `${(column / (crop.columns - 1)) * 100}% ${(row / (crop.rows - 1)) * 100}%`,
          aspectRatio: '1',
          ...style,
        }}
      />
    );
  }
  if (/^\/uploads\/[a-f0-9-]{36}\.(png|jpg|webp)$/.test(image))
    return (
      <div
        role={alt ? 'img' : undefined}
        aria-label={alt || undefined}
        aria-hidden={alt ? undefined : true}
        className={`art ${className}`}
        style={{
          backgroundImage: `url("${image}")`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          aspectRatio: '324/182',
          ...style,
        }}
      />
    );
  const [x, y, w, h] = crops[image] || crops.hero;
  return (
    <div
      role={alt ? 'img' : undefined}
      aria-label={alt || undefined}
      aria-hidden={alt ? undefined : true}
      className={`art ${className}`}
      style={{
        backgroundImage: 'url("/design-reference.png")',
        backgroundSize: `${(1435 / w) * 100}% ${(1096 / h) * 100}%`,
        backgroundPosition: `${(x / (1435 - w || 1)) * 100}% ${(y / (1096 - h)) * 100}%`,
        aspectRatio: `${w}/${h}`,
        ...style,
      }}
    />
  );
}
