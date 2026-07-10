export interface MenuItem {
  id: string;
  name: string;
  description?: string;
  price?: number | null;
  bodega?: string;
  options?: string[];
  extras?: Array<{ name: string; price: number }>;
  price_copa?: number | null;
  price_botella?: number | null;
  format?: string;
  happy_hour_price?: number;
}

export interface MenuSection {
  id: string;
  name: string;
  sharing_surcharge?: boolean | string;
  side_salad_available?: boolean;
  note?: string;
  items?: MenuItem[];
  subcategories?: Array<{
    id: string;
    name: string;
    items: MenuItem[];
  }>;
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

export interface RulesConfig {
  sharing_surcharge?: {
    amount: number;
    note: string;
    applies_to: string[];
    bar_exception?: string;
  };
  bread?: string;
  side_salad_addon?: {
    price: number;
    options: string[];
    note: string;
  };
  single_dish_surcharge?: {
    amount: number;
    note: string;
  };
  kids_menu?: {
    age_limit: number;
    note: string;
  };
  wine_copa_volume?: {
    vinos: string;
    champagne_y_espumantes: string;
  };
  food_safety_note?: string;
  happy_hour?: {
    note: string;
  };
}

export interface RestaurantMenu {
  restaurant: {
    name: string;
    tagline: string;
    currency: string;
    currency_symbol: string;
  };
  assistant: {
    name: string;
    voice_gender: string;
    language: string;
    personality: string;
    greeting: string;
  };
  rules: RulesConfig;
  menu: MenuSection[];
  drinks: MenuSection[];
}

export interface CartItem {
  id: string;
  name: string;
  price: number;
  qty: number;
}

export interface ChatMessage {
  role: "user" | "model";
  text: string;
  isTyping?: boolean;
  chips?: string[];
  cards?: string[];
}
