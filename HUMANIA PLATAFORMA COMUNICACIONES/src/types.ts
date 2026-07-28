export type PersonaId = string;

export interface Contact {
  id: PersonaId;
  name: string;
  avatar: string;
  role: string;
  tagline: string;
  statusText: string;
  isActive: boolean;
  unreadCount?: number;
  lastMessage?: string;
  lastMessageTime?: string;
  category?: string; // e.g. "psicologia", "astrologia", "yoga", "ventas", "legal", "matematicas", "creacion_contenido"
  personalityStyle?: string; // "friendly" | "analytical" | "mystical" | "assertive" | "empathic"
  voiceTone?: string; // "deep" | "medium" | "soft" | "energetic"
  avatarStyle?: string; // "classic" | "cyborg" | "neon" | "monochrome"
  hasMemory?: boolean; // toggle memory link status
}

export interface Message {
  id: string;
  sender: "user" | "assistant";
  content: string;
  timestamp: string;
}

export type CameraFilter = "normal" | "grayscale" | "sepia" | "cinematic" | "cyber" | "night";

export interface CallState {
  active: boolean;
  contact: Contact | null;
  isMuted: boolean;
  isVideoOff: boolean;
  cameraFilter: CameraFilter;
  duration: number;
}

export interface VmConfig {
  wsUrl: string;
  httpUrl: string;
  mode: "simulation" | "vm";
  latencyMs: number;
  audioQuality: "low" | "medium" | "high";
  isConnected: boolean;
  liveModelProvider?: "gemini-live" | "openai-realtime" | "groq-live" | "vertex-live";
  cameraVisionEnabled?: boolean;
  liveModelApiKey?: string;
  customPromptInstruction?: string;
}

export interface BillingPackage {
  id: string;
  minutes: number;
  price: number;
  title: string;
  description: string;
  badge?: string;
}

export interface ProfessionalServiceCategory {
  id: string;
  name: string;
  iconName: string;
  description: string;
  count: number;
}

export interface CalendarEvent {
  id: string;
  summary: string;
  description?: string;
  location?: string;
  start: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  end: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  htmlLink?: string;
}

export type ActiveTab = "chats" | "services" | "create" | "billing" | "calls" | "vm" | "ai" | "calendar" | "gmail" | "classroom" | "translate";
