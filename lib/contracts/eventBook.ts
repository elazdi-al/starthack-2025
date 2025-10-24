// EventBook Smart Contract Configuration
// Contract deployed on Base

export const EVENT_BOOK_ADDRESS = process.env.NEXT_PUBLIC_EVENT_BOOK_ADDRESS as `0x${string}` ||
  '0x0000000000000000000000000000000000000000';

export const EVENT_BOOK_ABI = [
  {
    type: "function",
    name: "createEvent",
    inputs: [
      { name: "name", type: "string" },
      { name: "location", type: "string" },
      { name: "date", type: "uint256" },
      { name: "price", type: "uint256" },
      { name: "maxCapacity", type: "uint256" },
      { name: "imageURI", type: "string" },
      { name: "categories", type: "string[]" }
    ],
    outputs: [],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "buyTicket",
    inputs: [{ name: "eventId", type: "uint256" }],
    outputs: [],
    stateMutability: "payable"
  },
  {
    type: "function",
    name: "listTicketForSale",
    inputs: [
      { name: "tokenId", type: "uint256" },
      { name: "price", type: "uint256" }
    ],
    outputs: [],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "cancelListing",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "withdraw",
    inputs: [{ name: "eventId", type: "uint256" }],
    outputs: [],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "getNumberOfEvents",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "getEvent",
    inputs: [{ name: "eventId", type: "uint256" }],
    outputs: [
      { name: "name", type: "string" },
      { name: "location", type: "string" },
      { name: "date", type: "uint256" },
      { name: "price", type: "uint256" },
      { name: "revenueOwed", type: "uint256" },
      { name: "creator", type: "address" },
      { name: "ticketsSold", type: "uint256" },
      { name: "maxCapacity", type: "uint256" },
      { name: "imageURI", type: "string" },
      { name: "categories", type: "string[]" },
      { name: "isPrivate", type: "bool" },
      { name: "whitelistIsLocked", type: "bool" }
    ],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "getEvents",
    inputs: [
      { name: "offset", type: "uint256" },
      { name: "limit", type: "uint256" },
      { name: "searchQuery", type: "string" },
      { name: "categoryFilter", type: "string" },
      { name: "onlyUpcoming", type: "bool" }
    ],
    outputs: [
      { name: "eventIds", type: "uint256[]" },
      { name: "names", type: "string[]" },
      { name: "locations", type: "string[]" },
      { name: "dates", type: "uint256[]" },
      { name: "prices", type: "uint256[]" },
      { name: "creators", type: "address[]" },
      { name: "ticketsSoldArray", type: "uint256[]" },
      { name: "maxCapacities", type: "uint256[]" },
      { name: "imageURIs", type: "string[]" },
      { name: "categoriesArray", type: "string[]" },
      { name: "isPrivateArray", type: "bool[]" },
      { name: "total", type: "uint256" }
    ],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "events",
    inputs: [{ name: "", type: "uint256" }],
    outputs: [
      { name: "name", type: "string" },
      { name: "location", type: "string" },
      { name: "date", type: "uint256" },
      { name: "price", type: "uint256" },
      { name: "revenueOwed", type: "uint256" },
      { name: "creator", type: "address" },
      { name: "ticketsSold", type: "uint256" },
      { name: "maxCapacity", type: "uint256" },
      { name: "imageURI", type: "string" },
      { name: "categories", type: "string[]" },
      { name: "isPrivate", type: "bool" },
      { name: "whitelistIsLocked", type: "bool" }
    ],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "getUserTickets",
    inputs: [{ name: "user", type: "address" }],
    outputs: [{ name: "", type: "uint256[]" }],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "getActiveListings",
    inputs: [
      { name: "offset", type: "uint256" },
      { name: "limit", type: "uint256" }
    ],
    outputs: [
      { name: "tokenIds", type: "uint256[]" },
      { name: "sellers", type: "address[]" },
      { name: "prices", type: "uint256[]" },
      { name: "eventIds", type: "uint256[]" },
      { name: "eventNames", type: "string[]" },
      { name: "eventDates", type: "uint256[]" },
      { name: "total", type: "uint256" }
    ],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "getActiveListingsCount",
    inputs: [],
    outputs: [{ name: "count", type: "uint256" }],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "getListingsByEvent",
    inputs: [
      { name: "eventId", type: "uint256" },
      { name: "offset", type: "uint256" },
      { name: "limit", type: "uint256" }
    ],
    outputs: [
      { name: "tokenIds", type: "uint256[]" },
      { name: "sellers", type: "address[]" },
      { name: "prices", type: "uint256[]" },
      { name: "total", type: "uint256" }
    ],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "getListing",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [
      { name: "seller", type: "address" },
      { name: "price", type: "uint256" },
      { name: "active", type: "bool" }
    ],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "buyResaleTicket",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [],
    stateMutability: "payable"
  },
  {
    type: "function",
    name: "getLeaderboard",
    inputs: [{ name: "limit", type: "uint256" }],
    outputs: [
      { name: "users", type: "address[]" },
      { name: "eventCounts", type: "uint256[]" },
      { name: "total", type: "uint256" }
    ],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "getUserStats",
    inputs: [{ name: "user", type: "address" }],
    outputs: [
      { name: "totalEvents", type: "uint256" },
      { name: "monthlyEvents", type: "uint256" }
    ],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "getUserCategoryStats",
    inputs: [
      { name: "user", type: "address" },
      { name: "categories", type: "string[]" }
    ],
    outputs: [
      { name: "counts", type: "uint256[]" }
    ],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "userCategoryCount",
    inputs: [
      { name: "user", type: "address" },
      { name: "category", type: "string" }
    ],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "userTotalEvents",
    inputs: [{ name: "user", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "userMonthlyEvents",
    inputs: [{ name: "user", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "userLastActivity",
    inputs: [{ name: "user", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "getCurrentMonth",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "getUserMonthResetTime",
    inputs: [{ name: "user", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "getUserLeaderboardPosition",
    inputs: [{ name: "user", type: "address" }],
    outputs: [
      { name: "isInLeaderboard", type: "bool" },
      { name: "rank", type: "uint256" }
    ],
    stateMutability: "view"
  }
] as const;
