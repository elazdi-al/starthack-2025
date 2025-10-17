const ROOT_URL =
  process.env.NEXT_PUBLIC_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : 'http://localhost:3000');

/**
 * MiniApp configuration object. Must follow the Farcaster MiniApp specification.
 *
 * @see {@link https://miniapps.farcaster.xyz/docs/guides/publishing}
 */
export const minikitConfig = {
 accountAssociation: {
    header: "eyJmaWQiOjEzOTA0NTAsInR5cGUiOiJjdXN0b2R5Iiwia2V5IjoiMHg4NjE5RUI4Y2M0ODM1YkU4RkEyNzZDMzU4ZGMzOUVBRjQwM0VCZjdjIn0",
    payload: "eyJkb21haW4iOiJzdGFydGhhY2stMjAyNS1pb3RhLnZlcmNlbC5hcHAifQ",
    signature: "f8n/ksHVfEhU5nDREMVqx5ECKAZHDseBS3IzevhVKI5/emAIduoB90HEvskpdRIqQ4HnXiBY7D6OGsxrYirtOBw="
  },

  miniapp: {
    version: "1",
    name: "Cubey", 
    subtitle: "Your AI Ad Companion", 
    description: "Ads",
    screenshotUrls: [`${ROOT_URL}/screenshot-portrait.png`],
    iconUrl: `${ROOT_URL}/blue-icon.png`,
    splashImageUrl: `${ROOT_URL}/blue-hero.png`,
    splashBackgroundColor: "#000000",
    homeUrl: ROOT_URL,
    webhookUrl: `${ROOT_URL}/api/webhook`,
    primaryCategory: "social",
    tags: ["marketing", "ads", "quickstart", "waitlist"],
    heroImageUrl: `${ROOT_URL}/blue-hero.png`, 
    tagline: "",
    ogTitle: "",
    ogDescription: "",
    ogImageUrl: `${ROOT_URL}/blue-hero.png`,
  },
} as const;

