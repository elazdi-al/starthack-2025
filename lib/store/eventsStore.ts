export interface FarcasterProfile {
  fid: number;
  username: string | null;
  display_name: string | null;
  pfp_url: string | null;
  profile: {
    bio: {
      text: string;
    };
  } | null;
  follower_count: number;
  following_count: number;
}

export interface AttendeeWithProfile {
  address: string;
  farcasterProfile: FarcasterProfile | null;
}

export interface Event {
  id: number;
  name: string;
  location: string;
  date: number;
  price: string;
  creator: string;
  ticketsSold: number;
  maxCapacity: number;
  isPast: boolean;
  isFull: boolean;
  imageURI: string;
  imageCid?: string | null;
  isPrivate: boolean;
  whitelistIsLocked: boolean;
}

export interface Ticket {
  id: string;
  eventId: number;
  eventTitle: string;
  date: string;
  time: string;
  location: string;
  venue: string;
  ticketType: string;
  purchaseDate: string;
  qrData: string;
  isValid: boolean;
  status: 'owned' | 'listed' | 'sold';
}
