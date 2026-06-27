




export enum Language {
  ENGLISH = 'en',
  HINDI = 'hi',
  MARATHI = 'mr',
  TELUGU = 'te',
  TAMIL = 'ta',
  KANNADA = 'kn',
  MALAYALAM = 'ml'
}

export interface CropHistory {
  id: string;
  name: string;
  season: string;
  year: string;
  area: string;
  areaUnit: string;
  yieldAmount: string;
  yieldUnit: string;
  chemicals: string; // Fertilizer / Pesticide Used
}

export interface FarmDetails {
  location: {
    address: string;
    lat: number;
    lng: number;
  };
  size: string;
  unit: string;
  soilType: string;
  irrigation: string; // Added Irrigation Field
  crops: CropHistory[];
}

export interface SoilHealthCardData {
  data: string; // Base64 string
  fileName: string;
  mimeType: string;
  uploadedAt: string;
  analysis?: string; // AI Generated Summary
}

export interface Appointment {
  id: string;
  date: string;
  time: string;
  status: string; // 'Pending' | 'Confirmed' | 'Completed' | 'Cancelled'
  timestamp: number;
}

export interface TaskProgress {
  day: number;
  eventIndex: number;
  completedAt: number;
}

export interface TimelineEvent {
  day: number;
  endDay?: number; // For tasks spanning multiple days or repeating daily
  time: string; // Precision timing e.g., "07:00 AM"
  stage: string; // e.g., "Sowing", "Vegetative", "Flowering"
  activity: string;
  description: string;
}

export interface CropRecommendation {
  cropName: string;
  suitabilityScore: number;
  reason: string;
  durationDays: number;
  timeline: TimelineEvent[];
}

export interface ActiveCropCycle extends CropRecommendation {
  id: string;
  startDate: string;
  progress: TaskProgress[];
}

export interface PestReport {
  id: string;
  cropName: string;
  diagnosis: string;
  image: string; // Base64
  timestamp: number;
}

export interface UserProfile {
  name: string;
  phone: string;
  language: Language;
  location: {
    lat: number;
    lng: number;
    city: string;
  };
  farmDetails?: FarmDetails;
  soilHealthCard?: SoilHealthCardData;
  appointments?: Appointment[];
  activeCrops?: ActiveCropCycle[];
  pestReports?: PestReport[]; // Added for saving pest diagnosis history
  hasSeenTour?: boolean; // Track if user has completed onboarding tour
}

export interface HourlyForecast {
  time: string;
  temperature: number;
  precipitationProbability: number;
  windSpeed: number;
}

export interface DailyForecast {
  date: string;
  maxTemp: number;
  minTemp: number;
  precipitationProbability: number;
  condition: string;
}

export interface WeatherData {
  temperature: number;
  condition: string;
  humidity: number;
  windSpeed: number;
  isRainy: boolean;
  hourly: HourlyForecast[];
  daily: DailyForecast[];
}

export interface Message {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
  audioUrl?: string; // Simulated for voice response
}

export interface CropPrice {
  crop: string;
  price: number; // Modal Price
  minPrice?: number;
  maxPrice?: number;
  trend: 'up' | 'down' | 'stable';
  market: string;
}

export interface PestDiagnosis {
  name: string;
  confidence: number;
  remedy: string;
  isHealthy: boolean;
}

export interface AppNotification {
  id: string;
  title: string;
  time: string;
  isUnread: boolean;
  content: any; // ReactNode usually, but using any to avoid type issues in simple setup
}

export type ViewState = 'onboarding' | 'dashboard' | 'chat' | 'pest-doctor' | 'mandi' | 'profile' | 'soil-health' | 'recommendations';

// --- OFFLINE CHATBOT TYPES ---

export interface OfflineNode {
  id: string;
  label: Record<Language, string>;
  children?: OfflineNode[];
  answer?: {
    text: Record<Language, string>;
    organic?: Record<Language, string>;
    chemical?: Record<Language, string>;
    safety?: Record<Language, string>;
  };
}

export interface OfflineInteraction {
  id: string;
  timestamp: number;
  path: string[]; // IDs of selected nodes
  question: string; // Label of the leaf node
  synced: boolean;
}