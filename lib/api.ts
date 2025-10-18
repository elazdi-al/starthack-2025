// API client utilities for making requests to backend

export class APIError extends Error {
  constructor(
    message: string,
    public status: number,
    public data?: unknown
  ) {
    super(message);
    this.name = 'APIError';
  }
}

async function apiRequest<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  try {
    const response = await fetch(endpoint, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new APIError(
        data.error || 'Request failed',
        response.status,
        data
      );
    }

    return data;
  } catch (error) {
    if (error instanceof APIError) {
      throw error;
    }
    throw new APIError(
      error instanceof Error ? error.message : 'Unknown error',
      500
    );
  }
}

// Events API
export const eventsAPI = {
  getAll: () => apiRequest<{
    success: boolean;
    events: Array<{
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
      isPrivate: boolean;
      whitelistIsLocked: boolean;
    }>;
    count: number;
  }>('/api/events'),

  getById: (id: number) => apiRequest<{
    success: boolean;
    event: {
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
      isPrivate: boolean;
      whitelistIsLocked: boolean;
    };
  }>(`/api/events/${id}`),

  create: (data: {
    name: string;
    location: string;
    date: number;
    price: string;
    maxCapacity: number;
  }) => apiRequest<{
    success: boolean;
    message: string;
    data: {
      name: string;
      location: string;
      timestamp: number;
      price: string;
      maxCapacity: number;
    };
  }>('/api/events', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
};

// Tickets API
export const ticketsAPI = {
  getByAddress: (address: string) => apiRequest<{
    success: boolean;
    tickets: Array<{
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
    }>;
    count: number;
  }>(`/api/tickets?address=${address}`),

  validatePurchase: (eventId: number, address: string) => apiRequest<{
    success: boolean;
    message: string;
    data: {
      eventId: number;
      eventName: string;
      price: string;
      contractAddress: string;
    };
  }>('/api/tickets/buy', {
    method: 'POST',
    body: JSON.stringify({ eventId, address }),
  }),
};

// Marketplace API
export const marketplaceAPI = {
  getAll: () => apiRequest<{
    success: boolean;
    listings: Array<{
      id: string;
      eventId: number;
      eventTitle: string;
      date: string;
      location: string;
      ticketType: string;
      price: string;
      sellerAddress: string;
      listedAt: number;
    }>;
    count: number;
  }>('/api/marketplace'),

  create: (data: {
    ticketId: string;
    eventId: number;
    seller: string;
    price: string;
  }) => apiRequest<{
    success: boolean;
    message: string;
    listing: {
      id: string;
      eventId: number;
      price: string;
      listedAt: number;
    };
  }>('/api/marketplace', {
    method: 'POST',
    body: JSON.stringify(data),
  }),

  cancel: (listingId: string, seller: string) => apiRequest<{
    success: boolean;
    message: string;
  }>(`/api/marketplace/${listingId}?seller=${seller}`, {
    method: 'DELETE',
  }),

  buy: (data: {
    listingId: string;
    buyer: string;
    paymentId?: string;
  }) => apiRequest<{
    success: boolean;
    message: string;
    data: {
      listingId: string;
      buyer: string;
      paymentId?: string;
    };
  }>('/api/marketplace/buy', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
};

// Wallet API
export const walletAPI = {
  getBalance: (address: string) => apiRequest<{
    success: boolean;
    balance: {
      wei: string;
      eth: string;
      formatted: string;
    };
  }>(`/api/wallet/balance?address=${address}`),
};
