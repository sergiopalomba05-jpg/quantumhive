export interface MenuItem {
  id: string;
  name: string;
  description?: string;
  price: number | null;
  bodega?: string;
  options?: string[];
  extras?: Array<{ name: string; price: number }>;
  price_copa?: number;
  price_botella?: number;
}

export interface Category {
  id: string;
  name: string;
  sharing_surcharge?: boolean;
  note?: string;
  items: MenuItem[];
}

export interface CartItem {
  id: string; // can be regular item id, or "id|copa", "id|botella" for drinks
  name: string;
  price: number;
  qty: number;
  variant?: "copa" | "botella";
}

export interface ChatMessage {
  role: "user" | "model";
  text: string;
  isStreaming?: boolean;
}

export interface RestaurantConfig {
  name: string;
  tagline: string;
  currency: string;
  currency_symbol: string;
}

export interface AssistantConfig {
  name: string;
  voice_gender: string;
  language: string;
  personality: string;
  greeting: string;
}

export interface MenuData {
  restaurant: RestaurantConfig;
  assistant: AssistantConfig;
  rules: Record<string, any>;
  menu: Category[];
  drinks: Category[];
}
