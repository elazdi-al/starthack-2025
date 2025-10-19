// EventBook Smart Contract Configuration
// Contract deployed on Base Mainnet

export const EVENT_BOOK_ADDRESS = process.env.NEXT_PUBLIC_EVENT_BOOK_ADDRESS as `0x${string}` || '0x0000000000000000000000000000000000000000' as `0x${string}`;

export const EVENT_BOOK_ABI = [
  {
    "type": "function",
    "name": "createEvent",
    "inputs": [
      { "name": "name", "type": "string" },
      { "name": "location", "type": "string" },
      { "name": "date", "type": "uint256" },
      { "name": "price", "type": "uint256" },
      { "name": "maxCapacity", "type": "uint256" }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "buyTicket",
    "inputs": [
      { "name": "eventId", "type": "uint256" }
    ],
    "outputs": [],
    "stateMutability": "payable"
  },
  {
    "type": "function",
    "name": "listTicketForSale",
    "inputs": [
      { "name": "tokenId", "type": "uint256" },
      { "name": "price", "type": "uint256" }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "withdraw",
    "inputs": [
      { "name": "eventId", "type": "uint256" }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "getNumberOfEvents",
    "inputs": [],
    "outputs": [
      { "name": "", "type": "uint256" }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "events",
    "inputs": [
      { "name": "", "type": "uint256" }
    ],
    "outputs": [
      { "name": "name", "type": "string" },
      { "name": "location", "type": "string" },
      { "name": "date", "type": "uint256" },
      { "name": "price", "type": "uint256" },
      { "name": "revenueOwed", "type": "uint256" },
      { "name": "creator", "type": "address" },
      { "name": "ticketsSold", "type": "uint256" },
      { "name": "maxCapacity", "type": "uint256" },
      { "name": "imageURI", "type": "string" },
      { "name": "isPrivate", "type": "bool" },
      { "name": "whitelistIsLocked", "type": "bool" }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getUserTickets",
    "inputs": [
      { "name": "user", "type": "address" }
    ],
    "outputs": [
      { "name": "", "type": "uint256[]" }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getActiveListings",
    "inputs": [
      { "name": "offset", "type": "uint256" },
      { "name": "limit", "type": "uint256" }
    ],
    "outputs": [
      { "name": "tokenIds", "type": "uint256[]" },
      { "name": "sellers", "type": "address[]" },
      { "name": "prices", "type": "uint256[]" },
      { "name": "eventIds", "type": "uint256[]" },
      { "name": "eventNames", "type": "string[]" },
      { "name": "eventDates", "type": "uint256[]" },
      { "name": "total", "type": "uint256" }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getActiveListingsCount",
    "inputs": [],
    "outputs": [
      { "name": "count", "type": "uint256" }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getListingsByEvent",
    "inputs": [
      { "name": "eventId", "type": "uint256" },
      { "name": "offset", "type": "uint256" },
      { "name": "limit", "type": "uint256" }
    ],
    "outputs": [
      { "name": "tokenIds", "type": "uint256[]" },
      { "name": "sellers", "type": "address[]" },
      { "name": "prices", "type": "uint256[]" },
      { "name": "total", "type": "uint256" }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getListing",
    "inputs": [
      { "name": "tokenId", "type": "uint256" }
    ],
    "outputs": [
      { "name": "seller", "type": "address" },
      { "name": "price", "type": "uint256" },
      { "name": "active", "type": "bool" }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "buyResaleTicket",
    "inputs": [
      { "name": "tokenId", "type": "uint256" }
    ],
    "outputs": [],
    "stateMutability": "payable"
  }
] as const;
