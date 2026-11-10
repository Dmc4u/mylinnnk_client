/**
 * Builds image content objects for a template's photos in
 * /public/template-media/<slug>/. Credits for every file are listed in
 * src/data/template-credits.json (all CC0).
 */
export const media = (slug) => (name, alt, extra = {}) => ({
  src: `/template-media/${slug}/${name}.webp`,
  alt,
  ...extra,
})
