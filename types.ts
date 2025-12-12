
// Data Models

export type TabType = 'itinerary' | 'bookings' | 'expense' | 'planning';

export interface Member {
  id: string;
  name: string;
  avatarUrl?: string; // URL from Firebase Storage
  email?: string;
}

// --- Bookings ---
export type BookingType = 'flight' | 'hotel' | 'car' | 'ticket';

export interface Booking {
  id: string;
  type: BookingType;
  title: string; // e.g., "Flight to Seoul"
  referenceNo?: string;
  date: string; // ISO date string
  details: {
    // Common fields
    location?: string;
    startTime?: string;
    endTime?: string;
    // Flight specific
    fromCode?: string;
    toCode?: string;
    airline?: string;
    // Hotel specific
    address?: string;
    checkIn?: string;
    checkOut?: string;
    // Car specific
    pickupLocation?: string;
    dropoffLocation?: string;
  };
  attachments: string[]; // URLs to PDF/Images
  cost: number;
  currency: string;
  paidByMemberId: string;
}

// --- Expenses ---
export type ExpenseType = 'public' | 'private';

export interface Expense {
  id: string;
  date: string;
  description: string;
  amount: number;
  currency: string;
  exchangeRateToBase: number; // e.g., KRW to HKD
  paidByMemberId: string;
  splitBetweenMemberIds: string[]; // IDs of people sharing this cost
  type: ExpenseType;
  category: 'food' | 'transport' | 'shopping' | 'accommodation' | 'other';
}

// --- Planning ---
export type ChecklistType = 'todo' | 'shopping' | 'packing';

export interface ChecklistItem {
  id: string;
  text: string;
  isCompleted: boolean;
  type: ChecklistType;
  assignedToMemberId?: string; // Optional assignment
}

// --- Itinerary ---
export interface ItineraryItem {
  id: string;
  date: string;
  time: string;
  type: 'activity' | 'flight' | 'transport';
  city: string;
  title: string;
  location?: string;
  lat?: number;
  lng?: number;
  icon?: string;
  travelMode?: 'subway' | 'walk' | 'car' | 'bus' | 'taxi';
  travelTimeMinutes?: number;
}

// --- Journal ---
export interface JournalEntry {
  id: string;
  date: string;
  authorId: string;
  content: string;
  photos: string[];
  likes: string[];
}