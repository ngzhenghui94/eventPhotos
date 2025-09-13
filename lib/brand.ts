export const brand = {
  productName: 'The Crowd Grid',
  productShort: 'tcg',
  orgName: 'danielninetyfour',
  siteDomain: 'events.danielninetyfour.com',
  siteUrl: process.env.BASE_URL || 'https://events.danielninetyfour.com'
} as const;

export const titleWithProduct = (title?: string) =>
  title ? `${title} · ${brand.productName}` : brand.productName;
