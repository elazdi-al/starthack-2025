import EventPageClient from "./EventPageClient";

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
  const event = events.find((e) => e.id === Number.parseInt(id));

  return <EventPageClient event={event} />;
}
