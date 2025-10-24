function withValidProperties(properties: Record<string, undefined | string | string[]>) {
  return Object.fromEntries(
    Object.entries(properties).filter(([_, value]) => (Array.isArray(value) ? value.length > 0 : !!value))
  );
}

export async function GET() {
  const URL = process.env.NEXT_PUBLIC_URL as string;

  return Response.json({
    accountAssociation: {
      header: "eyJmaWQiOjEzOTA0NTAsInR5cGUiOiJjdXN0b2R5Iiwia2V5IjoiMHg4NjE5RUI4Y2M0ODM1YkU4RkEyNzZDMzU4ZGMzOUVBRjQwM0VCZjdjIn0",
      payload: "eyJkb21haW4iOiJzdGFydGhhY2stMjAyNS1pb3RhLnZlcmNlbC5hcHAifQ",
      signature: "f8n/ksHVfEhU5nDREMVqx5ECKAZHDseBS3IzevhVKI5/emAIduoB90HEvskpdRIqQ4HnXiBY7D6OGsxrYirtOBw="
    },
    miniapp: withValidProperties({
      version: "1",
      name: "Stars",
      subtitle: "Join the constellation",
      description: "Experience events on the blockchain",
      screenshotUrls: [`${URL}/screenshot-portrait.png`],
      iconUrl: `${URL}/app-icon.png`,
      splashImageUrl: `${URL}/hero.png`,
      splashBackgroundColor: "#000000",
      homeUrl: URL,
      webhookUrl: `${URL}/api/webhook`,
      primaryCategory: "social",
      tags: ["marketing", "ads", "quickstart", "waitlist"],
      heroImageUrl: `${URL}/hero.png`,
      tagline: "",
      ogTitle: "",
      ogDescription: "",
      ogImageUrl: `${URL}/hero.png`,
    })
  });
}
