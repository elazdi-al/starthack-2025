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
      { "name": "maxCapacity", "type": "uint256" }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "hasTicket",
    "inputs": [
      { "name": "", "type": "uint256" },
      { "name": "", "type": "address" }
    ],
    "outputs": [
      { "name": "", "type": "bool" }
    ],
    "stateMutability": "view"
  }
] as const;

