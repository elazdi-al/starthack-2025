"use client";
import { BackgroundGradient } from "@/components/BackgroundGradient";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { CalendarBlank, MapPin, Users, ArrowLeft } from "phosphor-react";
import { useAuthCheck } from "@/lib/store/authStore";

// Mock event data - replace with actual data source
const events = [
  {
    id: 1,
    title: "Web3 Developer Meetup",
    description:
      "Join us for an evening of networking and learning about the latest in Web3 development",
    longDescription:
      "Connect with fellow Web3 developers, designers, and enthusiasts in an evening dedicated to exploring the cutting edge of decentralized technology. This meetup features lightning talks from industry leaders, hands-on demos of the latest Web3 tools and frameworks, and plenty of time for networking. Whether you're building your first dApp or you're a seasoned blockchain developer, you'll find valuable insights and connections here.",
    date: "2025-10-25",
    time: "6:00 PM - 9:00 PM",
    location: "San Francisco, CA",
    venue: "TechHub SF, 123 Market Street",
    attendees: 45,
    maxAttendees: 100,
    category: "Networking",
    host: "Web3 Builders Community",
  },
  {
    id: 2,
    title: "Blockchain Workshop",
    description:
      "Hands-on workshop covering smart contract development and DeFi protocols",
    longDescription:
      "Dive deep into the world of smart contracts and DeFi in this intensive hands-on workshop. You'll learn how to write, test, and deploy your own smart contracts on Ethereum, explore common DeFi primitives like AMMs and lending protocols, and understand security best practices. By the end of the workshop, you'll have built and deployed a working DeFi application. Laptops required.",
    date: "2025-11-02",
    time: "10:00 AM - 4:00 PM",
    location: "New York, NY",
    venue: "Blockchain Academy, 456 Broadway",
    attendees: 32,
    maxAttendees: 50,
    category: "Workshop",
    host: "DeFi Education Network",
  },
  {
    id: 3,
    title: "NFT Art Exhibition",
    description:
      "Explore the intersection of digital art and blockchain technology",
    longDescription:
      "Experience the future of digital art at this exclusive NFT exhibition featuring works from renowned digital artists and emerging creators. The exhibition showcases diverse styles and mediums, from generative art to digital photography, all minted as NFTs. Attendees will have the opportunity to meet the artists, learn about their creative process, and even mint exclusive event NFTs. Light refreshments provided.",
    date: "2025-11-10",
    time: "2:00 PM - 8:00 PM",
    location: "Los Angeles, CA",
    venue: "Digital Arts Center, 789 Arts District",
    attendees: 78,
    maxAttendees: 150,
    category: "Exhibition",
    host: "NFT Collective LA",
  },
  {
    id: 4,
    title: "DeFi Summit 2025",
    description: "Annual summit bringing together DeFi leaders and innovators",
    longDescription:
      "The premier gathering for DeFi professionals, investors, and enthusiasts returns for its 2025 edition. This two-day summit features keynote presentations from DeFi pioneers, panel discussions on the latest trends and challenges, workshops on advanced DeFi strategies, and unparalleled networking opportunities. Topics include Layer 2 scaling solutions, real-world assets, regulatory compliance, and the future of decentralized finance. Full agenda available on the event website.",
    date: "2025-11-18",
    time: "9:00 AM - 6:00 PM",
    location: "Austin, TX",
    venue: "Austin Convention Center, Hall A",
    attendees: 120,
    maxAttendees: 500,
    category: "Conference",
    host: "Global DeFi Alliance",
  },
];

export default async function EventPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return <EventPageClient eventId={id} />;
}

function EventPageClient({ eventId }: { eventId: string }) {
  const router = useRouter();
  const { isAuthenticated } = useAuthCheck();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/");
    }
  }, [isAuthenticated, router]);

  const event = events.find((e) => e.id === parseInt(eventId));

  if (!event) {
    return (
      <div className="relative min-h-screen flex flex-col items-center justify-center p-6 bg-transparent overflow-hidden">
        <BackgroundGradient />
        <div className="relative z-10 text-center">
          <h1 className="text-4xl font-bold text-white/30 mb-4">
            Event Not Found
          </h1>
          <button
            onClick={() => router.push("/home")}
            className="text-white/60 hover:text-white/80 transition-colors"
          >
            Return to Events
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen flex flex-col p-4 sm:p-6 bg-transparent overflow-hidden">
      <BackgroundGradient />

      {/* Back button */}
      <button
        className="absolute top-4 sm:top-6 left-6 sm:left-8 z-20 text-white/40 hover:text-white/80 transition-colors flex items-center gap-2"
        type="button"
        onClick={() => router.push("/home")}
      >
        <ArrowLeft size={24} weight="regular" />
        <span className="hidden sm:inline text-sm">Back</span>
      </button>

      {/* Main content */}
      <div className="relative z-10 flex-1 pt-16 sm:pt-24 pb-24 max-w-3xl mx-auto w-full px-2 sm:px-4">
        {/* Category badge */}
        <div className="mb-4">
          <span className="text-xs sm:text-sm px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-white/50">
            {event.category}
          </span>
        </div>

        {/* Event title */}
        <h1 className="text-4xl sm:text-5xl md:text-6xl tracking-tighter font-bold text-white mb-6 sm:mb-8">
          {event.title}
        </h1>

        {/* Event info - Clean list */}
        <div className="space-y-4 sm:space-y-5 mb-8 sm:mb-12">
          <div className="flex items-start gap-3 sm:gap-4">
            <CalendarBlank
              size={20}
              weight="regular"
              className="text-white/40 mt-0.5 shrink-0"
            />
            <div>
              <p className="text-white text-base sm:text-lg">
                {new Date(event.date).toLocaleDateString("en-US", {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </p>
              <p className="text-white/50 text-sm sm:text-base mt-0.5">
                {event.time}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 sm:gap-4">
            <MapPin
              size={20}
              weight="regular"
              className="text-white/40 mt-0.5 shrink-0"
            />
            <div>
              <p className="text-white text-base sm:text-lg">{event.venue}</p>
              <p className="text-white/50 text-sm sm:text-base mt-0.5">
                {event.location}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 sm:gap-4">
            <Users
              size={20}
              weight="regular"
              className="text-white/40 mt-0.5 shrink-0"
            />
            <div>
              <p className="text-white text-base sm:text-lg">
                {event.attendees} attending
              </p>
              <p className="text-white/50 text-sm sm:text-base mt-0.5">
                Hosted by {event.host}
              </p>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="w-full h-px bg-white/10 mb-8 sm:mb-12" />

        {/* Description */}
        <div className="mb-8 sm:mb-12">
          <h2 className="text-xl sm:text-2xl font-semibold text-white/90 mb-4 sm:mb-5">
            About
          </h2>
          <p className="text-base sm:text-lg text-white/60 leading-relaxed">
            {event.longDescription}
          </p>
        </div>

        {/* Action button - Fixed at bottom on mobile */}
        <div className="fixed sm:relative bottom-0 left-0 right-0 px-6 py-4 sm:p-0 bg-gradient-to-t sm:bg-none from-gray-950 via-gray-950/90 to-transparent sm:from-transparent sm:via-transparent z-20">
          <button className="w-full bg-white text-gray-950 font-semibold py-3.5 sm:py-4 px-6 rounded-xl transition-all hover:bg-white/90 active:scale-[0.98] shadow-lg">
            Register for Event
          </button>
        </div>
      </div>
    </div>
  );
}
