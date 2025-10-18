import EventPageClient from "./EventPageClient";

export default async function EventPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const eventId = Number.parseInt(id, 10);

  return <EventPageClient eventId={Number.isNaN(eventId) ? null : eventId} />;
}
