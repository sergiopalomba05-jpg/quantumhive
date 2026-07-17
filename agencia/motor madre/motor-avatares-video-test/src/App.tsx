import React, { useState, useEffect, useRef } from "react";
import { motion } from "motion/react";
import { menuData, getDishImage } from "./menuData";
import { MenuItem, MenuSection, CartItem, ChatMessage } from "./types";
import { 
  X, 
  Send, 
  Plus, 
  Minus, 
  Check, 
  Sparkles, 
  VolumeX, 
  Volume2,
  Phone,
  PhoneOff,
  Mic,
  MicOff,
  Square,
  Zap,
  Search,
  MessageSquare,
  Star
} from "lucide-react";

export const featuredDishes = [
  {
    id: "bbq_ribs",
    sectionId: "sec-carnes_y_cerdos",
    name: "Costillas BBQ 500gr",
    price: 42000,
    description: "Costillar de cerdo tierno, asado lentamente con nuestra salsa barbacoa secreta, acompañado con papas fritas crujientes."
  },
  {
    id: "rib_eye",
    sectionId: "sec-carnes_y_cerdos",
    name: "Ojo de Bife 400gr",
    price: 56700,
    description: "Espectacular bife ancho grillado a la leña, con el punto de cocción de tu preferencia, acompañado con papas fritas."
  },
  {
    id: "kansas_rolls",
    sectionId: "sec-entradas",
    name: "Arrolladitos Kansas",
    price: 27800,
    description: "Arrolladitos crocantes de pollo desmechado y verduras seleccionadas, servidos con aderezo picante suave."
  },
  {
    id: "argentinean_cheesecake",
    sectionId: "sec-postres",
    name: "Cheesecake de Dulce de Leche",
    price: 17000,
    description: "Suave cheesecake estilo americano con base de galletas húmedas, cubierto con generoso dulce de leche artesanal."
  }
];

const avatarVideoByKey: Record<string, string> = {
  connector_idle: "/avatar-videos/sol/v1/connector_idle_cut_1.webm",
  connector_idle_cut_1: "/avatar-videos/sol/v1/connector_idle_cut_1.webm",
  connector_idle_cut_hair: "/avatar-videos/sol/v1/connector_idle_cut_hair.webm",
  connector_idle_cut_3: "/avatar-videos/sol/v1/connector_idle_cut_3.webm",
  connector_idle_cut_4: "/avatar-videos/sol/v1/connector_idle_cut_4.webm",
  connector_idle_cut_wait: "/avatar-videos/sol/v1/connector_idle_cut_wait.webm",
  connector_look_left_cut: "/avatar-videos/sol/v1/connector_look_left_cut.webm",
  connector_look_right_cut: "/avatar-videos/sol/v1/connector_look_right_cut.webm",
  connector_taking_order_cut: "/avatar-videos/sol/v1/connector_taking_order_cut.webm",
  connector_welcome_cut: "/avatar-videos/sol/v1/connector_welcome_cut.webm",
  connector_farewell_cut: "/avatar-videos/sol/v1/connector_farewell_cut.webm",
  connector_welcome: "/avatar-videos/sol/v1/connector_welcome_cut.webm"
};

const entradasIntroText = "Excelente elección. Te recomiendo estas entradas. Arranquemos por esta primera opción.";

const idleAvatarVideo = avatarVideoByKey.connector_idle;
const idleAvatarVariants = [
  { key: "connector_idle_cut_hair", src: avatarVideoByKey.connector_idle_cut_hair },
  { key: "connector_idle_cut_3", src: avatarVideoByKey.connector_idle_cut_3 },
  { key: "connector_idle_cut_4", src: avatarVideoByKey.connector_idle_cut_4 },
  { key: "connector_idle_cut_wait", src: avatarVideoByKey.connector_idle_cut_wait }
];

const isIdleVariantKey = (key: string | null) => Boolean(key && idleAvatarVariants.some((variant) => variant.key === key));

const getDishAllergens = (it: any, sectionId: string): string[] => {
  const allergens: string[] = [];
  const name = it.name.toLowerCase();
  const desc = (it.description || "").toLowerCase();

  // Gluten / TACC
  if (
    sectionId === "sec-flatbreads" || 
    sectionId === "sec-pastas" || 
    name.includes("rebozado") || 
    name.includes("crocante") || 
    name.includes("pan") || 
    name.includes("sandwich") || 
    name.includes("hamburguesa") ||
    desc.includes("harina") ||
    desc.includes("crocante") ||
    desc.includes("tortilla") ||
    desc.includes("pan") ||
    desc.includes("arrolladitos") ||
    it.id.includes("tenders") ||
    it.id.includes("rolls") ||
    it.id.includes("nachos") ||
    it.id.includes("flatbread") ||
    it.id.includes("sandwich") ||
    it.id.includes("burger")
  ) {
    allergens.push("Gluten / TACC");
  }

  // Lácteos (Dairy)
  if (
    name.includes("queso") || 
    name.includes("crema") || 
    name.includes("flan") || 
    name.includes("dulce de leche") ||
    desc.includes("queso") || 
    desc.includes("crema") || 
    desc.includes("salsa blanca") ||
    desc.includes("cheddar") ||
    it.id.includes("dip") ||
    it.id.includes("flatbread") ||
    it.id.includes("burger") ||
    it.id.includes("caesar") ||
    it.id.includes("bistro") ||
    it.id.includes("mousse") ||
    it.id.includes("chocotorta") ||
    it.id.includes("volcan")
  ) {
    allergens.push("Lácteos");
  }

  // Huevo (Egg)
  if (
    name.includes("huevo") || 
    name.includes("flan") || 
    desc.includes("huevo") || 
    desc.includes("mayonesa") || 
    desc.includes("mousse") ||
    it.id.includes("caesar") ||
    it.id.includes("mousse") ||
    it.id.includes("volcan") ||
    it.id.includes("chocotorta")
  ) {
    allergens.push("Huevo");
  }

  // Frutos Secos (Nuts) / Maní
  if (
    name.includes("maní") || 
    name.includes("almendra") || 
    name.includes("nuez") || 
    name.includes("nueces") ||
    desc.includes("peanut") || 
    desc.includes("maní") || 
    desc.includes("almendra") || 
    desc.includes("nuez") || 
    desc.includes("nueces") ||
    it.id.includes("bistro") ||
    it.id.includes("grilled_chicken_salad")
  ) {
    allergens.push("Frutos Secos");
  }

  // Pescado (Fish)
  if (
    name.includes("salmón") || 
    name.includes("salmon") || 
    name.includes("pescado") ||
    desc.includes("salmón") || 
    desc.includes("salmon") || 
    desc.includes("pescado") ||
    it.id.includes("salmon")
  ) {
    allergens.push("Pescado");
  }

  // Mariscos (Shellfish)
  if (
    name.includes("camarón") || 
    name.includes("camaron") || 
    name.includes("langostino") ||
    desc.includes("camarón") || 
    desc.includes("camaron") || 
    desc.includes("langostino") ||
    it.id.includes("shrimp")
  ) {
    allergens.push("Mariscos");
  }

  return allergens;
};

const getDishMoreDetails = (it: any, sectionId: string): string[] => {
  const details: string[] = [];
  const nameLower = it.name.toLowerCase();
  const descLower = (it.description || "").toLowerCase();

  // Sharing surcharge rule
  const appliesToSharing = menuData.rules?.sharing_surcharge?.applies_to || [];
  const cleanSecId = sectionId.replace("sec-", "");
  if (appliesToSharing.includes(cleanSecId)) {
    details.push(`Apto para compartir: se aplica un adicional de $11.500 si se comparte.`);
  }

  // Kids menu rule
  if (cleanSecId === "kids") {
    details.push(menuData.rules?.kids_menu?.note || "Menú exclusivo para menores de 10 años.");
  }

  // Food safety notes
  if (
    nameLower.includes("bife") || nameLower.includes("ojo de bife") || nameLower.includes("hamburguesa") ||
    nameLower.includes("pollo") || nameLower.includes("tenders") || nameLower.includes("salmón") ||
    nameLower.includes("pescado") || nameLower.includes("camarón") || nameLower.includes("huevo") ||
    descLower.includes("carne") || descLower.includes("pollo") || descLower.includes("huevo")
  ) {
    details.push("Nota: Consumir carnes o huevos poco cocidos puede aumentar el riesgo de infecciones.");
  }

  // Drink volume rules
  if (cleanSecId.includes("vinos") || cleanSecId.includes("bebidas")) {
    details.push(`Medida de copa estándar: ${menuData.rules?.wine_copa_volume?.vinos || "250 cm3"}.`);
  }

  return details;
};

const extractJsonBlock = (str: string, startChar: "{" | "["): string | null => {
  const startIndex = str.indexOf(startChar);
  if (startIndex === -1) return null;
  
  let braceCount = 0;
  const endChar = startChar === "{" ? "}" : "]";
  
  for (let i = startIndex; i < str.length; i++) {
    if (str[i] === startChar) {
      braceCount++;
    } else if (str[i] === endChar) {
      braceCount--;
      if (braceCount === 0) {
        return str.substring(startIndex, i + 1);
      }
    }
  }
  return null;
};

// Helper to convert float32 to 16-bit PCM (little endian)
function floatTo16BitPCM(input: Float32Array): ArrayBuffer {
  const buffer = new ArrayBuffer(input.length * 2);
  const view = new DataView(buffer);
  let offset = 0;
  for (let i = 0; i < input.length; i++, offset += 2) {
    let s = Math.max(-1, Math.min(1, input[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
  }
  return buffer;
}

// Helper to encode ArrayBuffer to base64
function base64EncodeBuffer(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
};

// Silent buffer hack: abre el canal de salida físico en WebViews duras (Xiaomi/Huawei)
function warmUpOutput(ctx: AudioContext) {
  const buffer = ctx.createBuffer(1, 1, ctx.sampleRate);
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.connect(ctx.destination);
  source.start(0);
}

export default function App() {
  // --- STATE ---
  const [showSplash, setShowSplash] = useState(true);
  
  // Gemini additions (Low Latency & Live Call)
  const [lowLatency, setLowLatency] = useState(false);

  const [isLiveCalling, setIsLiveCalling] = useState(false);
  const [liveCallMuted, setLiveCallMuted] = useState(false);

  // Live Call references
  const liveWsRef = useRef<WebSocket | null>(null);
  const liveInputAudioCtxRef = useRef<AudioContext | null>(null);
  const liveOutputAudioCtxRef = useRef<AudioContext | null>(null);
  const liveMediaStreamRef = useRef<MediaStream | null>(null);
  const liveAudioProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const liveScheduledSourcesRef = useRef<AudioBufferSourceNode[]>([]);
  const liveNextStartTimeRef = useRef<number>(0);
  const liveCallMutedRef = useRef<boolean>(false);
  const liveHighlightTimeoutRef = useRef<any>(null);

  // Expanded dish card states
  const [expandedDishIds, setExpandedDishIds] = useState<Record<string, boolean>>({});



  // Calesita Scroll State
  const carouselRef = useRef<HTMLDivElement>(null);
  const carouselAutoplayPosRef = useRef<number>(0);


  // Setup visual viewport listener to fix keyboard overlapping on mobile
  useEffect(() => {
    const handleResize = () => {
      if (window.visualViewport) {
        const viewportHeight = window.visualViewport.height;
        const windowHeight = window.innerHeight;
        const keyboardHeight = windowHeight - viewportHeight;
        document.documentElement.style.setProperty('--kb', `${keyboardHeight > 0 ? keyboardHeight : 0}px`);
        if (keyboardHeight > 0) {
          document.body.classList.add('keyboard-open');
        } else {
          document.body.classList.remove('keyboard-open');
        }
      }
    };
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleResize);
      window.visualViewport.addEventListener('scroll', handleResize);
      handleResize();
    }
    return () => {
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', handleResize);
        window.visualViewport.removeEventListener('scroll', handleResize);
      }
    };
  }, []);

  useEffect(() => {
    if (showSplash) return;
    
    const timer = setTimeout(() => {
      const el = carouselRef.current;
      if (!el) return;
      
      const cardWidth = 210;
      const gap = 16;
      const step = cardWidth + gap; // 226px
      const singleSetWidth = 4 * step; // 904px
      
      // Center on start of the 3rd set (index 8)
      el.scrollLeft = 8 * step - (el.clientWidth / 2) + (cardWidth / 2);
      carouselAutoplayPosRef.current = el.scrollLeft;

      const handleScroll = () => {
        const scrollLeft = el.scrollLeft;
        
        // Endless wrapping jump checks
        if (scrollLeft >= singleSetWidth * 3) {
          el.scrollLeft = scrollLeft - singleSetWidth;
          carouselAutoplayPosRef.current = el.scrollLeft;
        } else if (scrollLeft <= singleSetWidth) {
          el.scrollLeft = scrollLeft + singleSetWidth;
          carouselAutoplayPosRef.current = el.scrollLeft;
        } else {
          carouselAutoplayPosRef.current = scrollLeft;
        }
      };

      el.addEventListener("scroll", handleScroll, { passive: true });
      return () => el.removeEventListener("scroll", handleScroll);
    }, 300);

    return () => clearTimeout(timer);
  }, [showSplash]);

  // Sync mute ref
  useEffect(() => {
    liveCallMutedRef.current = liveCallMuted;
  }, [liveCallMuted]);
  const [activeSection, setActiveSection] = useState("sec-entradas");
  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const stored = localStorage.getItem("cv_cart");
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });
  const [table, setTable] = useState(() => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const m = urlParams.get("mesa") || urlParams.get("m") || urlParams.get("table");
      if (m && /^[A-Za-z0-9\-]{1,12}$/.test(m)) {
        return m;
      }
      return localStorage.getItem("cv_table") || "";
    } catch {
      return "";
    }
  });
  const [tableLocked, setTableLocked] = useState(false);

  // Assistant & Chat
  const [history, setHistory] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [solState, setSolState] = useState<"idle" | "listening" | "thinking" | "speaking">("idle");
  const [speakingAvatarKey, setSpeakingAvatarKey] = useState<string | null>(null);
  const [speakingAvatarVideo, setSpeakingAvatarVideo] = useState<string | null>(null);
  const [speakingPlayId, setSpeakingPlayId] = useState(0);
  const [speakingVideoReady, setSpeakingVideoReady] = useState(false);
  const [idleAvatarKey, setIdleAvatarKey] = useState("connector_idle");
  const [currentIdleAvatarVideo, setCurrentIdleAvatarVideo] = useState(idleAvatarVideo);
  const [idleCycleNonce, setIdleCycleNonce] = useState(0);
  const idleAvatarVideoRef = useRef<HTMLVideoElement | null>(null);
  const speakingAvatarVideoRef = useRef<HTMLVideoElement | null>(null);
  const idleVariantIndexRef = useRef(0);
  const idleInactivityTimeoutRef = useRef<any>(null);
  const [contextChips, setContextChips] = useState<string[]>([
    "¿Cuál es la especialidad?",
    "¿Qué tenés para picar?",
    "Recomendame un vino",
    "¿Qué postre recomendás?"
  ]);
  const [guidedDishId, setGuidedDishId] = useState<string | null>(null);
  
  // Guided state machine (Autoguided tour)
  const [guidedStep, setGuidedStep] = useState<"start" | "entrada_recs" | "principal_recs" | "drink_recs" | "postre_recs" | "final_ask">("start");
  const [guidedAlternativeIndex, setGuidedAlternativeIndex] = useState(0);
  const [visibleChipsCount, setVisibleChipsCount] = useState(1);
  const [drinkAlcoholChoice, setDrinkAlcoholChoice] = useState<"with" | "without" | null>(null);
  const [drinkSubcategoryChoice, setDrinkSubcategoryChoice] = useState<string | null>(null);

  // Autoplay carousel interaction tracking
  const isUserInteractingRef = useRef(false);
  const interactionTimeoutRef = useRef<any>(null);

  const handleCarouselTouchStart = () => {
    isUserInteractingRef.current = true;
    if (interactionTimeoutRef.current) clearTimeout(interactionTimeoutRef.current);
  };

  const handleCarouselTouchEnd = () => {
    if (interactionTimeoutRef.current) clearTimeout(interactionTimeoutRef.current);
    interactionTimeoutRef.current = setTimeout(() => {
      isUserInteractingRef.current = false;
    }, 500);
  };

  const playAvatarClip = (key: string) => {
    const src = avatarVideoByKey[key];
    if (!src) return;
    setSolState("speaking");
    setSpeakingVideoReady(false);
    setSpeakingAvatarKey(key);
    setSpeakingAvatarVideo(src);
    setSpeakingPlayId((value) => value + 1);
  };

  const playGuidedChipLook = (side?: "left" | "right") => {
    if (side === "left") {
      playAvatarClip("connector_look_left_cut");
    } else if (side === "right") {
      playAvatarClip("connector_look_right_cut");
    }
  };

  const getGuidedFlowInfo = () => {
    // Helper to get short name with emoji
    const getEmojiForIndex = (index: number, rubro: string) => {
      const emojis: Record<string, string[]> = {
        entrada: ["🥖", "🍗", "🐟", "🧀", "🥗"],
        principal: ["🥩", "🥩", "🍝", "🍔", "🍗", "🍕", "🥗"],
        postre: ["🍰", "🍋", "🥕", "🍫", "🍪"],
        vino: ["🍷", "🥂", "🍷"],
        cerveza: ["🍺", "🍻", "🍺"],
        trago: ["🍸", "🍹", "🥃"],
        limonada: ["🍋", "🍹", "🍋"],
        gaseosa: ["🥤", "☕", "🥤"]
      };
      const list = emojis[rubro] || ["🍽"];
      return list[index % list.length];
    };

    const getShortName = (name: string) => {
      const parts = name.split(" ");
      const short = parts.slice(0, 2).join(" ");
      return short.length > 15 ? short.substring(0, 14) + "..." : short;
    };

    const renderPaginatedChips = (items: any[], emojiType: string, title: string, moreAction: string, endAction: string) => {
      const start = guidedAlternativeIndex * 3;
      const end = start + 3;
      const chips = items.slice(start, end).map((it, idx) => ({
        text: `${getShortName(it.name)} ${getEmojiForIndex(idx + start, emojiType)}`,
        action: `select_dish_${it.id}`,
        id: it.id,
        price: it.price_copa || it.price,
        name: it.name
      }));
      if (end < items.length) {
        chips.push({ text: "Más opciones ➔", action: moreAction, id: "", price: 0, name: "" });
      } else {
        chips.push({ text: "Volver ↺", action: endAction, id: "", price: 0, name: "" });
      }
      return { title, chips };
    };

    switch (guidedStep) {
      case "start":
        return {
          title: "Elegí por dónde empezar:",
          chips: [
            { text: "🥖 Entradas", action: "start_entradas" },
            { text: "🥩 Plato Principal", action: "start_principales" },
            { text: "🍹 Bebidas", action: "start_bebidas" },
            { text: "🍰 Postres", action: "start_postres" }
          ]
        };
      case "entrada_recs": {
        const section = menuData.menu.find(s => s.id === "entradas");
        const items = section ? section.items : [];
        return renderPaginatedChips(items, "entrada", "Recomendaciones de Entradas:", "more_entradas", "more_entradas_end");
      }
      case "principal_recs": {
        const mainSecIds = ["carnes", "hamburguesas", "pastas", "aves", "pescados", "flatbreads", "ensaladas"];
        const principalItems = menuData.menu
          .filter(s => mainSecIds.includes(s.id))
          .flatMap(s => s.items);

        return renderPaginatedChips(principalItems, "principal", `Recomendaciones de Platos Principales (${guidedAlternativeIndex + 1}/${Math.ceil(principalItems.length / 3)}):`, "more_principales", "more_principales_end");
      }
      case "drink_recs":
        if (drinkAlcoholChoice === null) {
          return {
            title: "¿Qué tipo de bebidas preferís?",
            chips: [
              { text: "🍷 Con Alcohol", action: "drink_choose_with" },
              { text: "🥤 Sin Alcohol", action: "drink_choose_without" },
              { text: "Volver ↺", action: "reset_flow" }
            ]
          };
        } else if (drinkSubcategoryChoice === null) {
          if (drinkAlcoholChoice === "with") {
            return {
              title: "Filtrar Bebidas Con Alcohol:",
              chips: [
                { text: "🍷 Vinos", action: "drink_sub_vinos" },
                { text: "🍺 Cervezas", action: "drink_sub_cervezas" },
                { text: "🍹 Tragos", action: "drink_sub_tragos" },
                { text: "Atrás ➔", action: "drink_back_alcohol" }
              ]
            };
          } else {
            return {
              title: "Filtrar Bebidas Sin Alcohol:",
              chips: [
                { text: "🍋 Limonadas", action: "drink_sub_limonadas" },
                { text: "🥤 Gaseosas", action: "drink_sub_gaseosas" },
                { text: "Atrás ➔", action: "drink_back_alcohol" }
              ]
            };
          }
        } else {
          if (drinkSubcategoryChoice === "vinos") {
            const vinosTintosItems = menuData.drinks
              .filter(d => d.id === "vinos_tintos")
              .flatMap(d => d.subcategories || [])
              .flatMap(sub => sub.items || []);
            const vinosBlancosItems = menuData.drinks
              .filter(d => d.id === "vinos_blancos")
              .flatMap(d => d.items || []);
            const allVinos = [...vinosTintosItems, ...vinosBlancosItems];

            return renderPaginatedChips(allVinos, "vino", "Nuestra Selección de Vinos:", "more_drink_vinos", "drink_back_sub");
          } else if (drinkSubcategoryChoice === "cervezas") {
            const cervezasItems = menuData.drinks
              .filter(d => d.id === "cervezas")
              .flatMap(d => d.items || []);

            return renderPaginatedChips(cervezasItems, "cerveza", "Nuestras Cervezas Bien Frías:", "more_drink_cervezas", "drink_back_sub");
          } else if (drinkSubcategoryChoice === "tragos") {
            const tragosItems = menuData.drinks
              .filter(d => d.id === "tragos")
              .flatMap(d => d.items || []);

            return renderPaginatedChips(tragosItems, "trago", "Tragos de Autor & Clásicos:", "more_drink_tragos", "drink_back_sub");
          } else if (drinkSubcategoryChoice === "limonadas") {
            const limonadasItems = menuData.drinks
              .filter(d => d.id === "bebidas")
              .flatMap(d => d.items || [])
              .filter(it => it.id.includes("limonada"));

            return renderPaginatedChips(limonadasItems, "limonada", "Limonadas Caseras:", "more_drink_limonadas", "drink_back_sub");
          } else if (drinkSubcategoryChoice === "gaseosas") {
            const gaseosasItems = menuData.drinks
              .filter(d => d.id === "bebidas")
              .flatMap(d => d.items || [])
              .filter(it => !it.id.includes("limonada"));

            return renderPaginatedChips(gaseosasItems, "gaseosa", "Gaseosas e Infusiones:", "more_drink_gaseosas", "drink_back_sub");
          }
        }
        return { title: "", chips: [] };
      case "postre_recs": {
        const section = menuData.menu.find(s => s.id === "postres");
        const items = section ? section.items : [];
        return renderPaginatedChips(items, "postre", "Recomendaciones de Postres:", "more_postres", "more_postres_end");
      }
      case "final_ask":
        return {
          title: "¡Listo! ¿Sumamos algo más?",
          chips: [
            { text: "Ver mi pedido 🛒", action: "go_to_order" },
            { text: "Volver a empezar ↺", action: "reset_flow" }
          ]
        };
      default:
        return { title: "", chips: [] };
    }
  };

  const isShowingIndividualDishes = () => {
    if (guidedStep === "entrada_recs") return true;
    if (guidedStep === "principal_recs") return true;
    if (guidedStep === "postre_recs") return true;
    if (guidedStep === "drink_recs" && drinkAlcoholChoice !== null && drinkSubcategoryChoice !== null) {
      return true;
    }
    return false;
  };

  // Reset chip counter and auto-spotlight the first chip's item when state changes
  useEffect(() => {
    const flow = getGuidedFlowInfo();
    if (isShowingIndividualDishes()) {
      setVisibleChipsCount(1);
    } else {
      setVisibleChipsCount(flow.chips.length);
    }
    
    const firstChip = flow.chips[0] as any;
    if (firstChip && firstChip.id) {
      scrollToDish(firstChip.id);
      setGuidedDishId(firstChip.id);
      
      if (liveHighlightTimeoutRef.current) {
        clearTimeout(liveHighlightTimeoutRef.current);
      }
      liveHighlightTimeoutRef.current = setTimeout(() => {
        setGuidedDishId(null);
      }, 6000);
    } else {
      setGuidedDishId(null);
    }
  }, [guidedStep, guidedAlternativeIndex, drinkAlcoholChoice, drinkSubcategoryChoice]);

  // Increment chip counter one-by-one with beautiful golden spotlight transitions
  useEffect(() => {
    if (!isShowingIndividualDishes()) return;

    const flow = getGuidedFlowInfo();
    const total = flow.chips.length;
    if (visibleChipsCount < total) {
      const timer = setTimeout(() => {
        const nextVal = visibleChipsCount + 1;
        setVisibleChipsCount(nextVal);
        
        // Spotlight the newly appeared chip's corresponding dish!
        const nextChip = flow.chips[nextVal - 1] as any;
        if (nextChip && nextChip.id) {
          scrollToDish(nextChip.id);
          setGuidedDishId(nextChip.id);
          
          if (liveHighlightTimeoutRef.current) {
            clearTimeout(liveHighlightTimeoutRef.current);
          }
          liveHighlightTimeoutRef.current = setTimeout(() => {
            setGuidedDishId(null);
          }, 6000);
        }
      }, 3500); // 3.5 seconds per chip for an elegant gradual layout buildup
      return () => clearTimeout(timer);
    }
  }, [visibleChipsCount, guidedStep, guidedAlternativeIndex, drinkAlcoholChoice, drinkSubcategoryChoice]);

  // Continuous Autoplay scroll effect for the featured carousel
  useEffect(() => {
    if (showSplash) return;

    let animFrameId: number;
    let lastTime = performance.now();

    const tick = (now: number) => {
      if (carouselRef.current) {
        const delta = now - lastTime;
        if (!isUserInteractingRef.current) {
          // Continuous smooth scroll increment (e.g. ~1.8 pixels per frame at 60fps)
          carouselAutoplayPosRef.current += 0.03 * delta;
          carouselRef.current.scrollLeft = carouselAutoplayPosRef.current;
        } else {
          // Sync with manual user scrolling
          carouselAutoplayPosRef.current = carouselRef.current.scrollLeft;
        }
      }
      lastTime = now;
      animFrameId = requestAnimationFrame(tick);
    };

    const startTimeout = setTimeout(() => {
      if (carouselRef.current) {
        carouselAutoplayPosRef.current = carouselRef.current.scrollLeft;
      }
      lastTime = performance.now();
      animFrameId = requestAnimationFrame(tick);
    }, 1500);

    return () => {
      clearTimeout(startTimeout);
      cancelAnimationFrame(animFrameId);
    };
  }, [showSplash]);

  const scrollCarouselToDish = (dishId: string) => {
    if (!carouselRef.current) return;
    const el = carouselRef.current;
    
    // Find card elements with this dish ID inside the carousel
    const cards = Array.from(el.querySelectorAll(`[data-dish-id="${dishId}"]`)) as HTMLElement[];
    if (cards.length === 0) return;
    
    // Choose the card closest to the middle of the scroll area to avoid jumpy scrolling
    const containerWidth = el.clientWidth;
    const currentScroll = el.scrollLeft;
    let closestCard = cards[0];
    let minDiff = Infinity;
    
    for (const card of cards) {
      const cardCenter = card.offsetLeft + card.clientWidth / 2;
      const viewportCenter = currentScroll + containerWidth / 2;
      const diff = Math.abs(cardCenter - viewportCenter);
      if (diff < minDiff) {
        minDiff = diff;
        closestCard = card;
      }
    }
    
    const cardCenter = closestCard.offsetLeft + closestCard.clientWidth / 2;
    const targetScrollLeft = cardCenter - containerWidth / 2;
    
    el.scrollTo({
      left: targetScrollLeft,
      behavior: "smooth"
    });
    
    // Pause autoplay temporarily so user can see it
    isUserInteractingRef.current = true;
    if (interactionTimeoutRef.current) clearTimeout(interactionTimeoutRef.current);
    interactionTimeoutRef.current = setTimeout(() => {
      isUserInteractingRef.current = false;
    }, 4000);
  };

  const scrollToDish = (dishId: string) => {
    // 1. Center in the featured carousel if it is a featured dish
    const isFeatured = featuredDishes.some(fd => fd.id === dishId);
    if (isFeatured) {
      scrollCarouselToDish(dishId);
    }

    // 2. Scroll the main menu list
    let targetSecId = "";
    const inMenu = menuData.menu.find(s => s.items.some(it => it.id === dishId));
    if (inMenu) {
      targetSecId = `sec-${inMenu.id}`;
    } else {
      const inDrinks = menuData.drinks.find(s => s.items && s.items.some(it => it.id === dishId));
      if (inDrinks) {
        targetSecId = `sec-${inDrinks.id}`;
      } else {
        for (const s of menuData.drinks) {
          if (s.subcategories) {
            const sub = s.subcategories.find(sub => sub.items.some(it => it.id === dishId));
            if (sub) {
              targetSecId = `sec-${s.id}-${sub.id}`;
              break;
            }
          }
        }
      }
    }

    if (targetSecId) {
      setActiveSection(targetSecId);
    }

    setTimeout(() => {
      const element = document.getElementById(`dish-${dishId}`);
      const container = document.getElementById("cartaBody");
      if (element && container) {
        const top = container.scrollTop + element.getBoundingClientRect().top - container.getBoundingClientRect().top - 80;
        container.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
      }
    }, 150);
  };

  const handleGuidedChipClick = (action: string, text: string, dishId?: string, price?: number, name?: string, chipSide?: "left" | "right") => {
    stopCurrentAudio();
    playGuidedChipLook(chipSide);
    const chipId = `${action}:${dishId || text}`;
    setSelectedGuidedChipId(chipId);
    setTimeout(() => {
      setSelectedGuidedChipId(current => current === chipId ? null : current);
    }, 1800);

    // 1. Handle Dish Recommendation Click
    if (dishId) {
      setTimeout(() => {
        setGuidedDishId(dishId);
        if (liveHighlightTimeoutRef.current) {
          clearTimeout(liveHighlightTimeoutRef.current);
        }
        liveHighlightTimeoutRef.current = setTimeout(() => {
          setGuidedDishId(null);
        }, 5000);

        scrollToDish(dishId);
        setExpandedDishIds(prev => ({ ...prev, [dishId]: true }));

        if (price != null && name) {
          addToCart(dishId, name, price, true);
          triggerToast(`¡Agregamos ${name} a tu pedido! 🛒`);
        }

        converse(`Contame sobre el plato ${name || text}`, false);
      }, 1250);
      return;
    }

    // 2. Handle Navigation / Flows
    if (action === "start_entradas") {
      setHistory(prev => [...prev, { role: "model", text: entradasIntroText }]);
      setTimeout(() => {
        setGuidedStep("entrada_recs");
        setGuidedAlternativeIndex(0);
        setDrinkAlcoholChoice(null);
        setDrinkSubcategoryChoice(null);
        setActiveSection("sec-entradas");
        const firstEntrada = menuData.menu.find(s => s.id === "entradas")?.items[0];
        if (firstEntrada?.id) scrollToDish(firstEntrada.id);
      }, 1600);
    } else if (action === "start_principales") {
      setTimeout(() => {
        converse("Para el plato principal tenemos opciones increíbles a la parrilla y pastas caseras.", false);
        setGuidedStep("principal_recs");
        setGuidedAlternativeIndex(0);
        setDrinkAlcoholChoice(null);
        setDrinkSubcategoryChoice(null);
        setActiveSection("sec-carnes");
        const container = document.getElementById("cartaBody");
        const element = document.getElementById("sec-carnes");
        if (container && element) {
          container.scrollTo({ top: element.offsetTop - 80, behavior: "smooth" });
        }
      }, 1250);
    } else if (action === "start_bebidas") {
      setTimeout(() => {
        converse("¿Qué te gustaría tomar hoy? Primero contame, ¿preferís con o sin alcohol?", false);
        setGuidedStep("drink_recs");
        setGuidedAlternativeIndex(0);
        setDrinkAlcoholChoice(null);
        setDrinkSubcategoryChoice(null);
        setActiveSection("sec-bebidas");
        const container = document.getElementById("cartaBody");
        const element = document.getElementById("sec-bebidas");
        if (container && element) {
          container.scrollTo({ top: element.offsetTop - 80, behavior: "smooth" });
        }
      }, 1250);
    } else if (action === "start_postres") {
      setTimeout(() => {
        converse("Para terminar de la mejor manera, te recomiendo nuestros postres artesanales.", false);
        setGuidedStep("postre_recs");
        setGuidedAlternativeIndex(0);
        setDrinkAlcoholChoice(null);
        setDrinkSubcategoryChoice(null);
        setActiveSection("sec-postres");
        const container = document.getElementById("cartaBody");
        const element = document.getElementById("sec-postres");
        if (container && element) {
          container.scrollTo({ top: element.offsetTop - 80, behavior: "smooth" });
        }
      }, 1250);
    } else if (action === "drink_choose_with") {
      converse("Te muestro nuestras opciones con alcohol: vinos, cervezas y tragos de autor.", false);
      setDrinkAlcoholChoice("with");
      setDrinkSubcategoryChoice(null);
    } else if (action === "drink_choose_without") {
      converse("Por acá tenés las opciones sin alcohol, ideales para refrescarte.", false);
      setDrinkAlcoholChoice("without");
      setDrinkSubcategoryChoice(null);
    } else if (action === "drink_back_alcohol") {
      converse("Volviendo al tipo de bebida.", false);
      setDrinkAlcoholChoice(null);
      setDrinkSubcategoryChoice(null);
    } else if (action === "drink_sub_vinos") {
      converse("Tenemos una hermosa carta de vinos tintos y blancos.", false);
      setDrinkSubcategoryChoice("vinos");
      setGuidedAlternativeIndex(0);
      setActiveSection("sec-vinos_tintos");
      setTimeout(() => {
        const container = document.getElementById("cartaBody");
        const element = document.getElementById("sec-vinos_tintos");
        if (container && element) {
          container.scrollTo({ top: element.offsetTop - 80, behavior: "smooth" });
        }
      }, 100);
    } else if (action === "drink_sub_cervezas") {
      converse("Nuestras cervezas son tiradas e industriales bien heladas.", false);
      setDrinkSubcategoryChoice("cervezas");
      setGuidedAlternativeIndex(0);
      setActiveSection("sec-cervezas");
      setTimeout(() => {
        const container = document.getElementById("cartaBody");
        const element = document.getElementById("sec-cervezas");
        if (container && element) {
          container.scrollTo({ top: element.offsetTop - 80, behavior: "smooth" });
        }
      }, 100);
    } else if (action === "drink_sub_tragos") {
      converse("Nuestros tragos de autor son perfectos para acompañar la cena.", false);
      setDrinkSubcategoryChoice("tragos");
      setGuidedAlternativeIndex(0);
      setActiveSection("sec-tragos");
      setTimeout(() => {
        const container = document.getElementById("cartaBody");
        const element = document.getElementById("sec-tragos");
        if (container && element) {
          container.scrollTo({ top: element.offsetTop - 80, behavior: "smooth" });
        }
      }, 100);
    } else if (action === "drink_sub_limonadas") {
      converse("Nuestras limonadas son naturales, preparadas en el momento.", false);
      setDrinkSubcategoryChoice("limonadas");
      setGuidedAlternativeIndex(0);
      setActiveSection("sec-bebidas");
      setTimeout(() => {
        const container = document.getElementById("cartaBody");
        const element = document.getElementById("sec-bebidas");
        if (container && element) {
          container.scrollTo({ top: element.offsetTop - 80, behavior: "smooth" });
        }
      }, 100);
    } else if (action === "drink_sub_gaseosas") {
      converse("Gaseosas línea Coca Cola e infusiones calientes.", false);
      setDrinkSubcategoryChoice("gaseosas");
      setGuidedAlternativeIndex(0);
      setActiveSection("sec-bebidas");
      setTimeout(() => {
        const container = document.getElementById("cartaBody");
        const element = document.getElementById("sec-bebidas");
        if (container && element) {
          container.scrollTo({ top: element.offsetTop - 80, behavior: "smooth" });
        }
      }, 100);
    } else if (action === "drink_back_sub") {
      converse("Volviendo a los filtros de bebidas.", false);
      setDrinkSubcategoryChoice(null);
      setGuidedAlternativeIndex(0);
    } else if (action === "more_entradas" || action === "more_principales" || action === "more_postres" || action.startsWith("more_drink_")) {
      setGuidedAlternativeIndex(prev => prev + 1);
    } else if (action === "more_entradas_end" || action === "more_principales_end" || action === "more_postres_end") {
      triggerToast("Volviendo al menú principal.");
      setGuidedStep("start");
      setGuidedAlternativeIndex(0);
    } else if (action === "go_to_order") {
      setActiveOverlay("order");
    } else if (action === "reset_flow") {
      setGuidedStep("start");
      setGuidedAlternativeIndex(0);
      setDrinkAlcoholChoice(null);
      setDrinkSubcategoryChoice(null);
    }
  };

  // Recording / Audio
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  // Layout / overlays
  const [showMenuDrop, setShowMenuDrop] = useState(false);
  const [activeOverlay, setActiveOverlay] = useState<null | "chat" | "order" | "rating" | "mesa">(null);
  
  // Search & Live Transcripts
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState("");
  const liveTextAccumulatorRef = useRef("");
  const [mozoCardOpen, setMozoCardOpen] = useState(false);
  const [confirmModal, setConfirmModal] = useState<{ show: boolean; title: string; text: string; onConfirm: () => void } | null>(null);
  const [rating, setRating] = useState({ mesera: 0, restaurante: 0, quantumhive: 0 });
  const [ratingComment, setRatingComment] = useState("");
  const [flashStarId, setFlashStarId] = useState<string | null>(null);

  const handleStarClick = (type: 'mesera' | 'restaurante' | 'quantumhive', value: number) => {
    setRating(prev => ({ ...prev, [type]: value }));
    const id = `${type}-${value}`;
    setFlashStarId(id);
    setTimeout(() => {
      setFlashStarId(current => current === id ? null : current);
    }, 400);
  };
  const [isMuted, setIsStreamingMuted] = useState(false);

  // Toasts
  const [toast, setToast] = useState<{ text: string; show: boolean }>({ text: "", show: false });
  const [selectedGuidedChipId, setSelectedGuidedChipId] = useState<string | null>(null);

  // Exit Confirmation State
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  // Refs for back button history handler
  const activeOverlayRef = useRef(activeOverlay);
  activeOverlayRef.current = activeOverlay;
  const showMenuDropRef = useRef(showMenuDrop);
  showMenuDropRef.current = showMenuDrop;
  const showSearchRef = useRef(showSearch);
  showSearchRef.current = showSearch;
  const expandedDishIdsRef = useRef(expandedDishIds);
  expandedDishIdsRef.current = expandedDishIds;
  const showExitConfirmRef = useRef(showExitConfirm);
  showExitConfirmRef.current = showExitConfirm;
  const isExitingRef = useRef(false);

  useEffect(() => {
    window.history.pushState({ appLayer: 'main' }, "");
    const handlePopState = (e) => {
      if (isExitingRef.current) return;
      window.history.pushState({ appLayer: 'main' }, "");

      if (showExitConfirmRef.current) {
        setShowExitConfirm(false);
        return;
      }
      if (activeOverlayRef.current !== null) {
        setActiveOverlay(null);
        return;
      }
      if (showMenuDropRef.current) {
        setShowMenuDrop(false);
        return;
      }
      if (showSearchRef.current) {
        setShowSearch(false);
        return;
      }
      const expandedIds = Object.keys(expandedDishIdsRef.current).filter(k => expandedDishIdsRef.current[k]);
      if (expandedIds.length > 0) {
        setExpandedDishIds({});
        return;
      }

      setShowExitConfirm(true);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Refs
  const cancelTokenRef = useRef(0);
  const speechUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const chatFeedEndRef = useRef<HTMLDivElement | null>(null);
  const historyListEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    Object.values(avatarVideoByKey).forEach((src) => {
      const video = document.createElement("video");
      video.src = src;
      video.muted = true;
      video.preload = "auto";
      video.playsInline = true;
      video.load();
    });
  }, []);

  useEffect(() => {
    const clearIdleTimeout = () => {
      if (idleInactivityTimeoutRef.current) {
        clearTimeout(idleInactivityTimeoutRef.current);
        idleInactivityTimeoutRef.current = null;
      }
    };

    const canPlayIdleVariant = !activeOverlay && !speakingAvatarVideo && solState !== "speaking";

    const scheduleIdleVariant = (delay = 6500) => {
      clearIdleTimeout();
      if (!canPlayIdleVariant) return;

      idleInactivityTimeoutRef.current = setTimeout(() => {
        const next = idleAvatarVariants[idleVariantIndexRef.current % idleAvatarVariants.length];
        idleVariantIndexRef.current += 1;
        playAvatarClip(next.key);
      }, delay);
    };

    const markActivity = () => {
      scheduleIdleVariant();
    };

    markActivity();

    const events = ["pointerdown", "keydown", "wheel", "touchstart"] as const;
    events.forEach((eventName) => window.addEventListener(eventName, markActivity, { passive: true }));

    return () => {
      clearIdleTimeout();
      events.forEach((eventName) => window.removeEventListener(eventName, markActivity));
    };
  }, [activeOverlay, speakingAvatarVideo, solState, idleCycleNonce]);

  // --- FLAT SECTIONS LIST FOR NAVIGATION ---
  const sectionsList: Array<{ id: string; name: string; items: MenuItem[]; note?: string }> = [];
  
  menuData.menu.forEach(s => {
    sectionsList.push({ id: `sec-${s.id}`, name: s.name, items: s.items, note: s.note });
  });

  menuData.drinks.forEach(s => {
    if (s.items) {
      sectionsList.push({ id: `sec-${s.id}`, name: s.name, items: s.items, note: s.note });
    }
    if (s.subcategories) {
      s.subcategories.forEach(sub => {
        sectionsList.push({
          id: `sec-${s.id}-${sub.id}`,
          name: `${sub.name} (${s.name.replace("Vinos ", "")})`,
          items: sub.items,
          note: s.note
        });
      });
    }
  });

  // --- FILTERED SECTIONS LIST FOR DISPLAY ---
  const displaySectionsList = searchQuery.trim() === ""
    ? sectionsList
    : sectionsList.map(sec => {
        const q = searchQuery.toLowerCase().trim();
        const secName = sec.name.toLowerCase();
        // Match category names, supporting singular/plural variations (e.g., carne/carnes, pescado/pescados)
        const secMatches = secName.includes(q) || 
                           q.includes(secName) ||
                           (q.endsWith("s") && secName.includes(q.slice(0, -1))) ||
                           (secName.endsWith("s") && secName.slice(0, -1).includes(q)) ||
                           (q === "carne" && secName.includes("carnes")) ||
                           (q === "pescado" && secName.includes("pescados"));

        return {
          ...sec,
          items: sec.items.filter(it => 
            secMatches ||
            it.name.toLowerCase().includes(q) || 
            (it.description && it.description.toLowerCase().includes(q))
          )
        };
      }).filter(sec => sec.items.length > 0);

  // Check URL table on mount
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const m = urlParams.get("mesa") || urlParams.get("m") || urlParams.get("table");
    if (m && /^[A-Za-z0-9\-]{1,12}$/.test(m)) {
      setTable(m);
      setTableLocked(true);
      localStorage.setItem("cv_table", m);
    }
  }, []);

  // Save cart to local storage
  useEffect(() => {
    localStorage.setItem("cv_cart", JSON.stringify(cart));
  }, [cart]);

  // Scroll Spy to highlight active tab and scroll to it
  useEffect(() => {
    const handleScroll = () => {
      const container = document.getElementById("cartaBody");
      if (!container) return;

      const line = container.getBoundingClientRect().top + 120;
      let currentId = "sec-destacados";

      const destEl = document.getElementById("sec-destacados");
      if (destEl) {
        const destRect = destEl.getBoundingClientRect();
        if (destRect.top <= line) {
          currentId = "sec-destacados";
        }
      }

      for (const sec of displaySectionsList) {
        const el = document.getElementById(sec.id);
        if (el) {
          const rect = el.getBoundingClientRect();
          if (rect.top <= line) {
            currentId = sec.id;
          }
        }
      }

      if (currentId) {
        setActiveSection(currentId);
        // Center the active tab in horizontal scroll
        const tabEl = document.getElementById(`tab-${currentId}`);
        const tabsContainer = document.getElementById("cartaTabs");
        if (tabEl && tabsContainer) {
          const offsetLeft = tabEl.offsetLeft - (tabsContainer.clientWidth - tabEl.offsetWidth) / 2;
          tabsContainer.scrollTo({ left: Math.max(0, offsetLeft), behavior: "smooth" });
        }
      }
    };

    const container = document.getElementById("cartaBody");
    if (container) {
      container.addEventListener("scroll", handleScroll, { passive: true });
    }
    return () => {
      if (container) {
        container.removeEventListener("scroll", handleScroll);
      }
    };
  }, [displaySectionsList]);

  // Autoscroll chat history
  useEffect(() => {
    if (historyListEndRef.current) {
      historyListEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
    if (chatFeedEndRef.current) {
      chatFeedEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [history, solState, activeOverlay]);

  // iOS / Browser audio unlocking gesture
  useEffect(() => {
    const unlockSpeech = () => {
      if (window.speechSynthesis) {
        window.speechSynthesis.speak(new SpeechSynthesisUtterance(" "));
        document.removeEventListener("pointerdown", unlockSpeech);
      }
    };
    document.addEventListener("pointerdown", unlockSpeech);
    return () => document.removeEventListener("pointerdown", unlockSpeech);
  }, []);

  // --- HELPERS ---
  const triggerToast = (text: string, duration: number = 3000) => {
    setToast({ text, show: true });
    setTimeout(() => {
      setToast(prev => ({ ...prev, show: false }));
    }, duration);
  };

  const fmtPrice = (price: number | null | undefined): string => {
    if (price === null || price === undefined) return "a confirmar";
    return `$${price.toLocaleString("es-AR")}`;
  };

  const stopCurrentAudio = () => {
    cancelTokenRef.current++;
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    speechUtteranceRef.current = null;
  };

  const playTTS = (text: string) => {
    // La voz fue removida temporalmente ya que se integrará con los videos del avatar.
    return;
  };

  // --- CART FUNCTIONS ---
  const cartCount = cart.reduce((sum, item) => sum + item.qty, 0);
  const cartTotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0);

  const addToCart = (id: string, name: string, price: number, forceAdd: boolean = false) => {
    const baseId = id.split("|")[0];
    setGuidedDishId(baseId);
    if (liveHighlightTimeoutRef.current) {
      clearTimeout(liveHighlightTimeoutRef.current);
    }
    liveHighlightTimeoutRef.current = setTimeout(() => {
      setGuidedDishId(null);
    }, 5000);

    const existing = cart.find(i => i.id === id);
    if (existing && !forceAdd) {
      setConfirmModal({
        show: true,
        title: "¿Sumar otro?",
        text: `Ya tenés ${name} en tu pedido. ¿Querés agregar uno más?`,
        onConfirm: () => {
          addToCart(id, name, price, true);
          setConfirmModal(null);
        }
      });
      return;
    }

    if (existing) {
      setCart(prev => prev.map(i => i.id === id ? { ...i, qty: i.qty + 1 } : i));
    } else {
      setCart(prev => [...prev, { id, name, price, qty: 1 }]);
    }
    triggerToast(`Sumado: ${name}`);

    stopCurrentAudio();
    playAvatarClip("connector_taking_order_cut");
    const isDrink = id.includes("bebidas") || id.includes("cervezas") || id.includes("cocktails") || id.includes("mocktails") || id.includes("champagne") || id.includes("vinos");
    const isDessert = id.includes("postres");
    
    let reply = `Excelente elección. Te sumé ${name} al pedido.`;
    let chips = ["¿Algo para tomar?", "Un postre", "Cerrar el pedido"];

    if (isDrink) {
      reply = `¡Salud! Te agregué ${name}. ¿Buscamos un plato principal o preferís pasar al postre?`;
      chips = ["Platos principales", "Un postre", "Cerrar el pedido"];
    } else if (isDessert) {
      reply = `Qué rico postre. Te sumé ${name}. ¿Buscás algo más o ya cerramos el pedido para mandarlo a la cocina?`;
      chips = ["Cerrar el pedido", "Algo más para tomar"];
    } else {
      reply = `Te sumé ${name} al pedido. ¿Le sumamos algo para tomar? ¿Con alcohol o sin alcohol?`;
      chips = ["Con alcohol", "Sin alcohol", "Un postre"];
    }

    setSolState("speaking");
    setContextChips(chips);
    playTTS(reply);
  };

  const changeQty = (id: string, delta: number) => {
    setCart(prev => {
      const existing = prev.find(i => i.id === id);
      if (!existing) return prev;
      const newQty = existing.qty + delta;
      if (newQty <= 0) {
        return prev.filter(i => i.id !== id);
      }
      return prev.map(i => i.id === id ? { ...i, qty: newQty } : i);
    });
  };

  // --- CHAT CONVERSE ENGINE ---
  const getSectionIdFromText = (text: string): string | null => {
    const t = text.toLowerCase();
    if (t.includes("picar") || t.includes("entrada") || t.includes("para empezar") || t.includes("picote")) return "sec-entradas";
    if (t.includes("vino") || t.includes("tinto") || t.includes("blanco") || t.includes("copa") || t.includes("botella")) return "sec-vinos_tintos";
    if (t.includes("postre") || t.includes("dulce")) return "sec-postres";
    if (t.includes("especialidad") || t.includes("principal") || t.includes("carne") || t.includes("cerdo") || t.includes("bife") || t.includes("ojo de bife")) return "sec-carnes";
    if (t.includes("tomar") || t.includes("bebida") || t.includes("gaseosa") || t.includes("sin alcohol") || t.includes("agua") || t.includes("limonada")) return "sec-bebidas";
    if (t.includes("cerveza")) return "sec-cervezas";
    if (t.includes("trago") || t.includes("cocktail") || t.includes("con alcohol") || t.includes("negroni") || t.includes("aperol")) return "sec-cocktails";
    if (t.includes("pescado") || t.includes("salmon") || t.includes("camaron")) return "sec-pescados";
    if (t.includes("pollo") || t.includes("ave")) return "sec-aves";
    if (t.includes("pasta")) return "sec-pastas";
    if (t.includes("niño") || t.includes("kids") || t.includes("infantil")) return "sec-kids";
    if (t.includes("té") || t.includes("infusion") || t.includes("café") || t.includes("blend")) return "sec-tes";
    return null;
  };

  const findMentionedDish = (text: string) => {
    const textLower = text.toLowerCase();
    
    // Normalize name to strip weights like "400gr", "500 gr", etc. so they match voice or chat mentions
    const normalizeName = (name: string) => {
      return name.toLowerCase()
        .replace(/\s*\d+\s*gr(am)?s?\b/gi, "") // removes "400gr", "500gr", "300 gr", etc.
        .replace(/\s*\d+\s*g\b/gi, "")        // removes "400g"
        .trim();
    };

    // Prioritize main courses, appetizers, pastas, and desserts over side dishes (acompañamientos) and drinks
    const prioritizedSections = [...sectionsList].sort((a, b) => {
      const isA_SideOrDrink = a.id.includes("acompanamentos") || a.id.includes("bebidas") || a.id.includes("vinos") || a.id.includes("cervezas") || a.id.includes("cocktails");
      const isB_SideOrDrink = b.id.includes("acompanamentos") || b.id.includes("bebidas") || b.id.includes("vinos") || b.id.includes("cervezas") || b.id.includes("cocktails");
      if (isA_SideOrDrink && !isB_SideOrDrink) return 1;
      if (!isA_SideOrDrink && isB_SideOrDrink) return -1;
      return 0;
    });

    // Try cleaned exact matches first
    for (const sec of prioritizedSections) {
      for (const item of sec.items) {
        const cleanedName = normalizeName(item.name);
        if (cleanedName.length >= 3 && textLower.includes(cleanedName)) {
          return { item, secId: sec.id };
        }
      }
    }

    // Try cleaned short words matches
    for (const sec of prioritizedSections) {
      for (const item of sec.items) {
        const cleanedName = normalizeName(item.name);
        const words = cleanedName.split(" ");
        const shortName = words.slice(0, Math.min(3, words.length)).join(" ");
        if (shortName.length > 5 && textLower.includes(shortName)) {
          return { item, secId: sec.id };
        }
      }
    }
    return null;
  };

  const handleContextChipClick = (text: string) => {
    stopCurrentAudio();
    if (text.toLowerCase().includes("picar") || text.toLowerCase().includes("entrada")) {
      playAvatarClip("connector_look_left_cut");
      setHistory(prev => [...prev, { role: "model", text: entradasIntroText }]);
      setGuidedStep("entrada_recs");
      setGuidedAlternativeIndex(0);
      setDrinkAlcoholChoice(null);
      setDrinkSubcategoryChoice(null);
      setActiveSection("sec-entradas");
      setTimeout(() => {
        const firstEntrada = menuData.menu.find(s => s.id === "entradas")?.items[0];
        if (firstEntrada?.id) scrollToDish(firstEntrada.id);
      }, 180);
      return;
    }
    
    // Auto-guide directly if matching section is found
    const secId = getSectionIdFromText(text);
    if (secId) {
      scrollToSection(secId);
    }

    // Special case: Cerrar el pedido
    if (text.toLowerCase().includes("cerrar el pedido") || text.toLowerCase().includes("cerrar pedido")) {
      setActiveOverlay("order");
      return;
    }

    // If active live call, route chip text directly to Live WS
    if (isLiveCalling && liveWsRef.current && liveWsRef.current.readyState === WebSocket.OPEN) {
      liveTextAccumulatorRef.current = "";
      setLiveTranscript("");
      stopLivePlayback();
      liveWsRef.current.send(JSON.stringify({ text }));
      setSolState("thinking");
      return;
    }

    // Call converse with openChat = false so the chat overlay stays closed
    converse(text, false);
  };

  const converse = async (messageText: string, openChat: boolean = true) => {
    if (!messageText.trim()) return;

    // Only open chat overlay if openChat is true
    if (openChat) {
      setActiveOverlay("chat");
    }

    const userMsg: ChatMessage = { role: "user", text: messageText };
    setHistory(prev => [...prev, userMsg]);
    setInputValue("");
    setSolState("thinking");
    setIsStreaming(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: messageText,
          history: history,
          cart: cart,
          lowLatency: lowLatency
        })
      });

      if (!response.ok) {
        throw new Error("Respuesta de red no válida");
      }

      // Add a placeholder message for the model response
      setHistory(prev => [...prev, { role: "model", text: "" }]);

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) throw new Error("No reader available");

      let accumulatedText = "";
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith("data: ")) {
            try {
              const dataStr = trimmed.slice(6);
              if (dataStr === "{}") continue;
              const parsed = JSON.parse(dataStr);
              if (parsed.text) {
                accumulatedText += parsed.text;

                // Update UI text but strip directives dynamically so they are never printed in real-time
                let cleanText = accumulatedText;
                const pedidoIdx = cleanText.indexOf("#PEDIDO#");
                if (pedidoIdx >= 0) {
                  cleanText = cleanText.slice(0, pedidoIdx);
                }
                const cardsIdx = cleanText.indexOf("#CARDS#");
                if (cardsIdx >= 0) {
                  cleanText = cleanText.slice(0, cardsIdx);
                }
                const chipsIdx = cleanText.indexOf("#CHIPS#");
                if (chipsIdx >= 0) {
                  cleanText = cleanText.slice(0, chipsIdx);
                }
                if (cleanText.includes("#CUENTA#")) {
                  cleanText = cleanText.replace("#CUENTA#", "");
                }
                cleanText = cleanText.trim();

                setHistory(prev => {
                  const copy = [...prev];
                  if (copy.length > 0 && copy[copy.length - 1].role === "model") {
                    copy[copy.length - 1] = { role: "model", text: cleanText };
                  }
                  return copy;
                });
              }
            } catch (e) {
              // ignore partial line parsing issues
            }
          }
        }
      }

      // After stream completes, perform parsing of directives
      let cleanReply = accumulatedText;

      // Extract #PEDIDO# directive
      const pedidoIdx = accumulatedText.indexOf("#PEDIDO#");
      if (pedidoIdx >= 0) {
        const jsonStr = extractJsonBlock(accumulatedText.slice(pedidoIdx + 8), "{");
        if (jsonStr) {
          try {
            const directive = JSON.parse(jsonStr);
            applyOrderDirective(directive);
          } catch (e) {
            console.error("No se pudo parsear la directiva de pedido", e);
          }
        }
        cleanReply = cleanReply.slice(0, pedidoIdx);
      }

      // Extract #CARDS# directive
      let parsedCards: string[] = [];
      const cardsIdx = accumulatedText.indexOf("#CARDS#");
      if (cardsIdx >= 0) {
        const jsonStr = extractJsonBlock(accumulatedText.slice(cardsIdx + 7), "[");
        if (jsonStr) {
          try {
            parsedCards = JSON.parse(jsonStr);
          } catch {}
        }
        cleanReply = cleanReply.slice(0, cardsIdx);
      }

      // Extract #CHIPS# directive
      let parsedChips: string[] = [];
      const chipsIdx = accumulatedText.indexOf("#CHIPS#");
      if (chipsIdx >= 0) {
        const jsonStr = extractJsonBlock(accumulatedText.slice(chipsIdx + 7), "[");
        if (jsonStr) {
          try {
            parsedChips = JSON.parse(jsonStr);
            setContextChips(parsedChips);
          } catch {}
        }
        cleanReply = cleanReply.slice(0, chipsIdx);
      }

      // Extract #CUENTA# directive
      if (accumulatedText.includes("#CUENTA#")) {
        cleanReply = cleanReply.replace("#CUENTA#", "");
        setTimeout(() => setActiveOverlay("order"), 2000);
      }

      cleanReply = cleanReply.trim();
      setHistory(prev => {
        const copy = [...prev];
        if (copy.length > 0 && copy[copy.length - 1].role === "model") {
          copy[copy.length - 1] = { role: "model", text: cleanReply, chips: parsedChips, cards: parsedCards };
        }
        return copy;
      });

      setIsStreaming(false);

      // Trigger autoguide highlighting if a dish is mentioned
      const match = findMentionedDish(cleanReply);
      if (match) {
        scrollToSection(match.secId);
        setGuidedDishId(match.item.id);
        // Clean highlight after 6 seconds
        setTimeout(() => {
          setGuidedDishId(null);
        }, 6000);
      }

      playTTS(cleanReply);

    } catch (error) {
      console.error("Error conversando con Sol:", error);
      triggerToast("Ocurrió un error al conectar con Sol.");
      setSolState("idle");
      setIsStreaming(false);
    }
  };

  const applyOrderDirective = (directive: any) => {
    if (directive.clear) {
      setCart([]);
    }

    if (directive.remove && Array.isArray(directive.remove)) {
      directive.remove.forEach((rem: any) => {
        const remName = typeof rem === "string" ? rem : rem.name;
        const match = sectionsList.flatMap(s => s.items).find(i => i.name.toLowerCase() === remName.toLowerCase());
        if (match) {
          setCart(prev => prev.filter(i => !i.id.includes(match.id)));
        }
      });
    }

    if (directive.add && Array.isArray(directive.add)) {
      const addedItems: string[] = [];
      directive.add.forEach((add: any) => {
        const addName = typeof add === "string" ? add : add.name;
        const qty = add.qty || 1;
        const variant = add.variant || "";

        const dish = sectionsList.flatMap(s => s.items).find(i => i.name.toLowerCase().includes(addName.toLowerCase()));
        if (dish) {
          let cartId = dish.id;
          let finalName = dish.name;
          let finalPrice = dish.price || 0;

          if (variant === "copa" && dish.price_copa) {
            cartId = `${dish.id}|copa`;
            finalName = `${dish.name} (Copa)`;
            finalPrice = dish.price_copa;
          } else if (variant === "botella" && dish.price_botella) {
            cartId = `${dish.id}|botella`;
            finalName = `${dish.name} (Botella)`;
            finalPrice = dish.price_botella;
          }

          setCart(prev => {
            const ex = prev.find(item => item.id === cartId);
            if (ex) {
              return prev.map(item => item.id === cartId ? { ...item, qty: item.qty + qty } : item);
            }
            return [...prev, { id: cartId, name: finalName, price: finalPrice, qty }];
          });

          addedItems.push(`${qty}x ${finalName}`);
        }
      });

      if (addedItems.length > 0) {
        triggerToast(`Agregado: ${addedItems.join(", ")}`);
      }
    }
  };

  // --- GEMINI LIVE API VOICE CALL HANDLERS ---
  const toggleLiveCallMute = () => {
    setLiveCallMuted(prev => !prev);
  };

  const stopLivePlayback = () => {
    liveScheduledSourcesRef.current.forEach(source => {
      try {
        source.stop();
      } catch (e) {}
    });
    liveScheduledSourcesRef.current = [];
    liveNextStartTimeRef.current = 0;
  };

  const playLiveAudioChunk = (base64Audio: string) => {
    const outputCtx = liveOutputAudioCtxRef.current;
    if (!outputCtx) return;

    try {
      const binaryString = atob(base64Audio);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      const int16Array = new Int16Array(bytes.buffer);
      const float32Array = new Float32Array(int16Array.length);
      for (let i = 0; i < int16Array.length; i++) {
        float32Array[i] = int16Array[i] / 32768.0;
      }

      const audioBuffer = outputCtx.createBuffer(1, float32Array.length, outputCtx.sampleRate);
      audioBuffer.copyToChannel(float32Array, 0);

      const source = outputCtx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(outputCtx.destination);

      const currentTime = outputCtx.currentTime;
      if (liveNextStartTimeRef.current < currentTime) {
        liveNextStartTimeRef.current = currentTime + 0.05;
      }

      source.start(liveNextStartTimeRef.current);
      liveNextStartTimeRef.current += audioBuffer.duration;

      liveScheduledSourcesRef.current.push(source);

      source.onended = () => {
        liveScheduledSourcesRef.current = liveScheduledSourcesRef.current.filter(s => s !== source);
        if (liveScheduledSourcesRef.current.length === 0) {
          setSolState("listening");
        }
      };
    } catch (e) {
      console.error("Error playing live audio chunk:", e);
    }
  };

  const startLiveCall = async () => {
    try {
      stopCurrentAudio();

      // Despertar audio DENTRO del gesto del click, antes de cualquier await
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const inputCtx = new AudioContextClass({ sampleRate: 16000 });
      const outputCtx = new AudioContextClass({ sampleRate: 24000 });
      liveInputAudioCtxRef.current = inputCtx;
      liveOutputAudioCtxRef.current = outputCtx;
      liveNextStartTimeRef.current = 0;
      if (inputCtx.state === 'suspended') await inputCtx.resume();
      if (outputCtx.state === 'suspended') await outputCtx.resume();
      warmUpOutput(outputCtx); // silent buffer hack para WebViews duras

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      liveMediaStreamRef.current = stream;

      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const host = window.location.host;
      const wsUrl = `${protocol}//${host}/api/live?table=${table}&cart=${encodeURIComponent(JSON.stringify(cart))}`;
      const ws = new WebSocket(wsUrl);
      liveWsRef.current = ws;

      setIsLiveCalling(true);
      setLiveCallMuted(false);
      setSolState("listening");
      setLiveTranscript("");
      liveTextAccumulatorRef.current = "";

      const source = inputCtx.createMediaStreamSource(stream);
      const processor = inputCtx.createScriptProcessor(4096, 1, 1);
      liveAudioProcessorRef.current = processor;

      source.connect(processor);
      processor.connect(inputCtx.destination);

      processor.onaudioprocess = (e) => {
        if (ws.readyState === WebSocket.OPEN && !liveCallMutedRef.current) {
          const channelData = e.inputBuffer.getChannelData(0);
          const pcmBuffer = floatTo16BitPCM(channelData);
          const base64 = base64EncodeBuffer(pcmBuffer);
          ws.send(JSON.stringify({ audio: base64 }));
        }
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.connected) {
            // Disparar el saludo de la IA: ella habla primero al entrar al live
            ws.send(JSON.stringify({ text: "Saludá al cliente diciendo exactamente: 'Hola, si te escucho'. Después preguntale en qué podés ayudarlo hoy." }));
            return;
          }
          if (msg.error) {
            triggerToast(msg.error === "Quota Exceeded" 
              ? "¡Límite de voz alcanzado hoy! Por chat Sol te sigue ayudando sin problemas." 
              : msg.error
            );
            endLiveCall();
            return;
          }
          if (msg.audio) {
            setSolState("speaking");
            playLiveAudioChunk(msg.audio);
          }
          if (msg.text) {
            setSolState("speaking");
            liveTextAccumulatorRef.current += msg.text;
            
            let cleanSubText = liveTextAccumulatorRef.current;
            const hashIdx = cleanSubText.indexOf("#");
            if (hashIdx >= 0) {
              cleanSubText = cleanSubText.slice(0, hashIdx);
            }
            setLiveTranscript(cleanSubText.trim());

            // Real-time autoguide highlighting while Sol is speaking
            const match = findMentionedDish(cleanSubText);
            if (match && guidedDishId !== match.item.id) {
              scrollToSection(match.secId);
              setGuidedDishId(match.item.id);
              if (liveHighlightTimeoutRef.current) {
                clearTimeout(liveHighlightTimeoutRef.current);
              }
              liveHighlightTimeoutRef.current = setTimeout(() => {
                setGuidedDishId(null);
              }, 7000);
            }
          }
          if (msg.turnComplete) {
            const rawReply = liveTextAccumulatorRef.current;
            let cleanReply = rawReply;

            // Extract #PEDIDO# directive
            const pedidoIdx = rawReply.indexOf("#PEDIDO#");
            if (pedidoIdx >= 0) {
              const jsonStr = extractJsonBlock(rawReply.slice(pedidoIdx + 8), "{");
              if (jsonStr) {
                try {
                  const directive = JSON.parse(jsonStr);
                  applyOrderDirective(directive);
                } catch (e) {
                  console.error("No se pudo parsear la directiva de pedido", e);
                }
              }
              cleanReply = cleanReply.slice(0, pedidoIdx);
            }

            // Extract #CHIPS# directive
            const chipsIdx = rawReply.indexOf("#CHIPS#");
            if (chipsIdx >= 0) {
              const jsonStr = extractJsonBlock(rawReply.slice(chipsIdx + 7), "[");
              if (jsonStr) {
                try {
                  const chips = JSON.parse(jsonStr);
                  setContextChips(chips);
                } catch {}
              }
              cleanReply = cleanReply.slice(0, chipsIdx);
            }

            // Extract #CUENTA# directive
            if (rawReply.includes("#CUENTA#")) {
              cleanReply = cleanReply.replace("#CUENTA#", "");
              setTimeout(() => setActiveOverlay("order"), 2000);
            }

            cleanReply = cleanReply.trim();

            if (cleanReply) {
              setHistory(prev => [...prev, { role: "model", text: cleanReply }]);
              
              const match = findMentionedDish(cleanReply);
              if (match) {
                scrollToSection(match.secId);
                setGuidedDishId(match.item.id);
                setTimeout(() => {
                  setGuidedDishId(null);
                }, 6000);
              }
            }

            liveTextAccumulatorRef.current = "";
          }
          if (msg.interrupted) {
            setSolState("listening");
            stopLivePlayback();
            setLiveTranscript("");
            liveTextAccumulatorRef.current = "";
          }
        } catch (e) {
          console.error("Error on Live WebSocket message:", e);
        }
      };

      ws.onclose = () => {
        console.log("Live WebSocket connection closed.");
        endLiveCall();
      };

      ws.onerror = (err) => {
        console.error("Live WebSocket error:", err);
        endLiveCall();
      };

    } catch (err) {
      console.error("Error starting voice live call:", err);
      triggerToast("No se pudo iniciar la llamada: asegurate de dar permisos al micrófono.");
      endLiveCall();
    }
  };

  const endLiveCall = () => {
    setIsLiveCalling(false);
    setSolState("idle");
    setLiveTranscript("");
    liveTextAccumulatorRef.current = "";

    if (liveWsRef.current) {
      try {
        if (liveWsRef.current.readyState === WebSocket.OPEN || liveWsRef.current.readyState === WebSocket.CONNECTING) {
          liveWsRef.current.close();
        }
      } catch (e) {}
      liveWsRef.current = null;
    }

    if (liveMediaStreamRef.current) {
      try {
        liveMediaStreamRef.current.getTracks().forEach(track => track.stop());
      } catch (e) {}
      liveMediaStreamRef.current = null;
    }

    if (liveAudioProcessorRef.current) {
      try {
        liveAudioProcessorRef.current.disconnect();
      } catch (e) {}
      liveAudioProcessorRef.current = null;
    }

    stopLivePlayback();

    if (liveInputAudioCtxRef.current) {
      try {
        liveInputAudioCtxRef.current.close();
      } catch (e) {}
      liveInputAudioCtxRef.current = null;
    }
    if (liveOutputAudioCtxRef.current) {
      try {
        liveOutputAudioCtxRef.current.close();
      } catch (e) {}
      liveOutputAudioCtxRef.current = null;
    }
  };

  // --- AUDIO STT RECORDING ---
  const handleOrbPress = async () => {
    if (solState === "speaking") {
      stopCurrentAudio();
      setSolState("idle");
      return;
    }

    if (isRecording) {
      setIsRecording(false);
      setSolState("thinking");
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
        mediaRecorderRef.current.stop();
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    } else {
      try {
        stopCurrentAudio();
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        streamRef.current = stream;
        mediaRecorderRef.current = new MediaRecorder(stream);
        audioChunksRef.current = [];

        mediaRecorderRef.current.ondataavailable = (event) => {
          if (event.data.size > 0) {
            audioChunksRef.current.push(event.data);
          }
        };

        mediaRecorderRef.current.onstop = async () => {
          const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
          const reader = new FileReader();
          reader.readAsDataURL(audioBlob);
          reader.onloadend = async () => {
            const base64Audio = reader.result?.toString().split(",")[1];
            if (!base64Audio) {
              setSolState("idle");
              return;
            }

            try {
              const res = await fetch("/api/stt", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  audio_base64: base64Audio,
                  mime_type: "audio/webm"
                })
              });
              const data = await res.json();
              if (data.text) {
                converse(data.text);
              } else {
                triggerToast("No te escuché bien, ¿lo repetís?");
                setSolState("idle");
              }
            } catch (err) {
              console.error("Error enviando STT:", err);
              triggerToast("Error de conexión al transcribir.");
              setSolState("idle");
            }
          };
        };

        mediaRecorderRef.current.start();
        setIsRecording(true);
        setSolState("listening");
      } catch (err) {
        console.error("Fallo de acceso al micrófono:", err);
        triggerToast("Por favor, permití el acceso al micrófono.");
      }
    }
  };

  // --- CHECKOUT & FEEDBACK SUBMISSION ---
  const sendOrderToKitchen = () => {
    if (cart.length === 0) return;
    
    // CRITICAL FIX: If table number is missing, instead of disabling the button,
    // open the table dialog directly to prompt them!
    if (!table.trim()) {
      triggerToast("Por favor, indicá tu número de mesa.");
      setActiveOverlay("mesa");
      return;
    }

    fetch("/api/order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        table,
        total: cartTotal,
        items: cart
      })
    });

    triggerToast("¡Tu pedido ya está en viaje a la cocina! 🍳", 4000);
    stopCurrentAudio();
    setActiveOverlay(null);
    playAvatarClip("connector_farewell_cut");
    playTTS("¡Perfecto! Ya le mandé tu pedido directo a la cocina. Que lo disfrutes mucho.");

    setTimeout(() => {
      setActiveOverlay("rating_restaurant");
    }, 9000);
  };

  const handleRatingSubmit = () => {
    if (rating.mesera === 0 && rating.restaurante === 0 && rating.quantumhive === 0) {
      triggerToast("Por favor, elegí alguna valoración antes de enviar.");
      return;
    }

    fetch("/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        stars_mesera: rating.mesera,
        stars_restaurante: rating.restaurante,
        stars_quantumhive: rating.quantumhive,
        comment: ratingComment,
        table
      })
    });

    triggerToast("¡Muchas gracias por tu opinión! 🙏");
    setCart([]);
    setRating({ mesera: 0, restaurante: 0, quantumhive: 0 });
    setRatingComment("");
    setActiveOverlay(null);
  };

  const handleEmbeddedRatingSubmit = () => {
    if (rating.quantumhive === 0) {
      triggerToast("Por favor, elegí cuántas estrellas darnos antes de enviar. ⭐");
      return;
    }

    fetch("/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        stars_mesera: rating.mesera || 5,
        stars_restaurante: rating.restaurante || 5,
        stars_quantumhive: rating.quantumhive,
        comment: ratingComment,
        table
      })
    });

    triggerToast("¡Muchas gracias por valorar la experiencia QuantumHive! 🚀");
    setRating({ mesera: 0, restaurante: 0, quantumhive: 0 });
    setRatingComment("");
  };

  const scrollToSection = (secId: string) => {
    setActiveSection(secId);
    setShowMenuDrop(false);
    const element = document.getElementById(secId);
    const container = document.getElementById("cartaBody");
    if (element && container) {
      const top = container.scrollTop + element.getBoundingClientRect().top - container.getBoundingClientRect().top - 4;
      container.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
    }
  };

  const currentGreetingMessage = (): string => {
    return menuData.assistant.greeting || "¡Hola! ¿En qué te puedo asesorar hoy?";
  };

  // Create four fixed/context chips to flank the mic orb
  const fallbackChips = [
    "¿Cuál es la especialidad?",
    "¿Qué tenés para picar?",
    "Recomendame un vino",
    "¿Qué postre recomendás?"
  ];
  const finalChips = [
    ...(contextChips || []),
    ...fallbackChips
  ].slice(0, 4);

  return (
    <div className="relative h-[100dvh] w-full select-none overflow-hidden bg-[#0E0A07] text-[#F4ECD8] antialiased">
      {/* --- SPLASH SCREEN --- */}
      {showSplash && (
        <div id="splash">
          <div className="splash-main">
            <h1 className="splash-mark">
              {menuData.restaurant.name}
            </h1>
            <div className="splash-rules">
              <span className="line"></span>
              <p className="splash-eyebrow">
                Carta Viva
              </p>
              <span className="line"></span>
            </div>

            <div className="splash-orb" aria-hidden="true" />

            <button
              onPointerDown={() => {
                playAvatarClip("connector_welcome");
              }}
              onClick={() => {
                setShowSplash(false);
                setHistory([{ role: "model", text: currentGreetingMessage() }]);
              }}
              className="splash-cta"
            >
              Tocá para empezar
            </button>

            <p className="splash-sub">
              Te atiende un <b>mozo virtual</b>
            </p>
          </div>

          {/* Legal Warning */}
          <div className="splash-legal">
            <span className="splash-legal-ic">!</span>
            <span>
              Tu mozo virtual es una <b>guía informativa</b> y puede equivocarse. Ante cualquier <b>alergia, intolerancia o condición médica</b>, confirmá siempre con el personal del restaurante antes de pedir. La composición final de cada plato es responsabilidad del restaurante.
            </span>
          </div>

          <div className="splash-brand">
            <b>QuantumHive</b>
            Multi-Agent Business Infrastructure · Powered by Gemini
          </div>
        </div>
      )}

      {/* --- TOAST NOTIFICATION --- */}
      <div className={`toast ${toast.show ? "show" : ""}`}>
        {toast.text}
      </div>

      {/* --- CORE LAYOUT --- */}
      <div id="app" className="ready">
        
        {/* --- TOPBAR --- */}
        <header className="topbar">
          <button 
            onClick={() => setShowMenuDrop(prev => !prev)}
            className={`menu-btn ${showMenuDrop ? "open" : ""}`}
          >
            <span className="mt-ic">☰</span> Menú
          </button>

          {showSearch ? (
            <div className="search-bar-container">
              <input
                type="text"
                placeholder="Buscar plato..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="search-input"
                autoFocus
              />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery("")} 
                  className="search-clear-btn"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
              <button 
                onClick={() => {
                  setSearchQuery("");
                  setShowSearch(false);
                }}
                className="search-close-btn"
              >
                Cerrar
              </button>
            </div>
          ) : (
            <div 
              className="brand cursor-pointer hover:opacity-90 flex flex-col items-center justify-center" 
              onClick={() => setShowSearch(true)}
              title="Click para buscar plato"
            >
              {menuData.restaurant.name}
              <small className="flex items-center gap-1 justify-center">
                Carta Viva <Search className="h-2 w-2 text-amber-500 inline" />
              </small>
            </div>
          )}

          <div className="topbar-actions">
            {!showSearch && (
              <button 
                onClick={() => setShowSearch(true)}
                className="search-toggle-btn"
                title="Buscar plato"
              >
                <Search className="h-4 w-4" />
              </button>
            )}

            <div 
              onClick={() => {
                if (tableLocked) {
                  triggerToast(`Mesa fija: ${table}`);
                } else {
                  setActiveOverlay("mesa");
                }
              }}
              className="table-chip"
            >
              <span className="tc-label">Mesa</span>
              <b>{table || "—"}</b>
            </div>

            <button 
              onClick={() => {
                if (!isLiveCalling) {
                  startLiveCall();
                } else {
                  endLiveCall();
                }
              }}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 sm:px-3 sm:py-1.5 rounded-full ${isLiveCalling ? "bg-amber-600 text-stone-900 animate-pulse border-amber-400" : "bg-[#1A120E] text-stone-300 border-[#C9A86A]/35 hover:bg-stone-800"} border transition-all shadow-md text-xs font-bold select-none cursor-pointer`}
              title="Llamada en vivo"
            >
              {isLiveCalling ? <Square className="h-3.5 w-3.5 fill-current" /> : <Phone className="h-3.5 w-3.5 text-amber-500" />}
              <span className="hidden sm:inline">{isLiveCalling ? "Llamando" : "Llamar"}</span>
            </button>
            <button 
              onClick={() => setActiveOverlay("chat")}
              className="flex items-center gap-1.5 px-2.5 py-1.5 sm:px-3 sm:py-1.5 rounded-full bg-[#8B1C2B] text-[#F4ECD8] border border-[#C9A86A]/35 hover:bg-[#6E1422] hover:border-amber-500/50 transition-all shadow-md text-xs font-bold select-none cursor-pointer"
              title="Abrir Chat con Sol"
            >
              <MessageSquare className="h-3.5 w-3.5 text-amber-300" />
              <span className="hidden sm:inline">Chat</span>
            </button>
          </div>
        </header>

        {/* --- CATEGORY HORIZONTAL TABS --- */}
        <nav id="cartaTabs" className="carta-tabs">
          <button
            id="tab-sec-destacados"
            onClick={() => {
              setActiveSection("sec-destacados");
              const container = document.getElementById("cartaBody");
              if (container) {
                container.scrollTo({ top: 0, behavior: "smooth" });
              }
            }}
            className={`tab ${activeSection === "sec-destacados" ? "active" : ""}`}
          >
            ★ Destacados
          </button>
          {displaySectionsList.map(sec => (
            <button
              key={sec.id}
              id={`tab-${sec.id}`}
              onClick={() => scrollToSection(sec.id)}
              className={`tab ${activeSection === sec.id ? "active" : ""}`}
            >
              {sec.name}
            </button>
          ))}
        </nav>

        {/* --- CARTA BODY (GRID WITH CARDS & IMAGES) --- */}
        <main id="cartaBody" className="carta-body">
          {searchQuery.trim() === "" && (
            <div id="sec-destacados" className="carta-section !mb-8">
              <div className="flex items-center justify-between mb-2 px-1">
                <h2 className="!mb-0 flex items-center gap-1.5 font-bold">
                  <Sparkles className="h-5 w-5 text-amber-500 animate-pulse" /> Destacados de la Casa
                </h2>
                <span className="text-[10px] text-[#9A8E78] font-bold tracking-wider uppercase animate-pulse">Deslizar ➔</span>
              </div>
              <div className="sep"></div>
              
              {/* Horizontal scrollable row of featured dish cards (with endless infinite loop) */}
              <motion.div 
                ref={carouselRef}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 1, ease: "easeOut", delay: 0.2 }}
                onTouchStart={handleCarouselTouchStart}
                onTouchEnd={handleCarouselTouchEnd}
                onMouseDown={handleCarouselTouchStart}
                onMouseUp={handleCarouselTouchEnd}
                onMouseLeave={handleCarouselTouchEnd}
                className="flex overflow-x-auto gap-4 pb-4 pt-2.5 px-4 scrollbar-none"
                style={{ 
                  perspective: "1200px", 
                  transformStyle: "preserve-3d"
                }}
              >
                {[
                  ...featuredDishes,
                  ...featuredDishes,
                  ...featuredDishes,
                  ...featuredDishes,
                  ...featuredDishes
                ].map((it, idx) => {
                  const imageSrc = getDishImage(it.id);
                  return (
                    <div 
                      key={`${it.id}-${idx}`}
                      data-dish-id={it.id}
                      onClick={() => {
                        scrollToDish(it.id);
                        setExpandedDishIds(prev => ({ ...prev, [it.id]: true }));
                        triggerToast(`¡Mirá nuestro destacado: ${it.name}! 🍽`);
                      }}
                      className={`flex-shrink-0 w-[210px] snap-center rounded-2xl bg-gradient-to-b from-[#1c1410] to-[#120b08] border p-3 shadow-xl hover:shadow-2xl hover:border-amber-500/40 cursor-pointer group flex flex-col justify-between transition-all duration-300 ${guidedDishId === it.id ? "dish-card spotlight-current" : "border-[#c9a86a]/20"}`}
                    >
                      <div>
                        {/* Beautiful card image with 3D-scaling zoom effect on hover */}
                        <div className="relative h-24 w-full rounded-xl overflow-hidden mb-2 shadow-inner bg-stone-900 border border-stone-800">
                          <img 
                            src={imageSrc} 
                            alt={it.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            referrerPolicy="no-referrer"
                          />
                          <div className="absolute top-1.5 right-1.5 bg-amber-600/90 text-stone-900 text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest shadow-sm">
                            ★ Destacado
                          </div>
                        </div>
                        
                        <h4 className="text-xs font-bold text-stone-100 group-hover:text-amber-400 transition-colors line-clamp-1 font-sans">
                          {it.name}
                        </h4>
                        <p className="text-[10px] text-stone-400 line-clamp-2 mt-0.5 leading-snug">
                          {it.description}
                        </p>
                      </div>
                      
                      <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-stone-800/60">
                        <span className="text-xs font-extrabold text-amber-500 font-mono">
                          ${it.price.toLocaleString("es-AR")}
                        </span>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            addToCart(it.id, it.name, it.price);
                            triggerToast(`¡Agregamos ${it.name} a tu pedido! 🛒`);
                          }}
                          className="text-[10px] font-bold px-3 py-1 bg-amber-600 hover:bg-amber-500 text-stone-950 rounded-lg active:scale-95 transition-all select-none cursor-pointer"
                        >
                          Agregar
                        </button>
                      </div>
                    </div>
                  );
                })}
              </motion.div>
            </div>
          )}

          {displaySectionsList.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-4 text-center w-full">
              <span className="text-4xl mb-4">🔍</span>
              <h3 className="text-lg font-medium text-stone-200">No encontramos ese plato</h3>
              <p className="text-sm text-stone-400 mt-1 max-w-xs mx-auto">
                Probá buscando con otro nombre, como "pizza", "carne" o "gaseosa".
              </p>
            </div>
          ) : (
            displaySectionsList.map(sec => (
            <div key={sec.id} id={sec.id} className="carta-section">
              <h2>{sec.name}</h2>
              <div className="sep"></div>
              
              {sec.note && (
                <div className="note">
                  {sec.note}
                </div>
              )}

              {/* Grid of Dish Cards with Images */}
              <div className="dish-card-grid">
                {sec.items.map((it, idx) => {
                  const imageSrc = getDishImage(it.id);
                  const isWines = it.price_copa != null || it.price_botella != null;
                  const isExpanded = !!expandedDishIds[it.id];
                  const toggleExpand = (e: React.MouseEvent) => {
                    const target = e.target as HTMLElement;
                    if (target.closest("button") || target.closest(".qty-ctl") || target.closest(".dish-add") || target.closest("a")) {
                      return;
                    }
                    setExpandedDishIds(prev => ({
                      ...prev,
                      [it.id]: !prev[it.id]
                    }));
                  };

                  return (
                    <motion.div 
                      key={it.id} 
                      id={`dish-${it.id}`}
                      onClick={toggleExpand}
                      className={`dish-card dish cursor-pointer transition-all duration-200 select-none hover:border-[#c9a86a]/40 ${isExpanded ? "border-[#c9a86a]/55 bg-[#130d0a] shadow-lg shadow-black/20" : ""} ${guidedDishId === it.id ? "guided spotlight-current" : ""}`}
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true, margin: "-10px" }}
                      transition={{ duration: 0.45, delay: Math.min(idx * 0.06, 0.6), ease: [0.215, 0.610, 0.355, 1.0] }}
                    >
                      {/* Image section */}
                      <div className="dish-card-img-wrap">
                        <img 
                          src={imageSrc} 
                          alt={it.name} 
                          referrerPolicy="no-referrer"
                          className="dish-card-img"
                        />
                        <div className="dish-card-gradient"></div>
                      </div>

                      {/* Content Section */}
                      <div className="dish-card-content">
                        <div className="dish-card-header flex justify-between items-start gap-2 w-full">
                          <h3 className="dish-card-title flex-1">
                            {it.name}
                          </h3>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              setExpandedDishIds(prev => ({
                                ...prev,
                                [it.id]: !prev[it.id]
                              }));
                            }}
                            className="text-[10px] text-[#c9a86a] border border-[#c9a86a]/30 rounded-full px-2 py-0.5 hover:bg-[#c9a86a]/15 transition-all font-sans tracking-wider uppercase flex items-center gap-1 font-medium select-none cursor-pointer flex-shrink-0"
                          >
                            {isExpanded ? "Cerrar ▲" : "Detalles ▾"}
                          </button>
                        </div>

                        {it.description && (
                          <p className="dish-card-desc">
                            {it.description}
                          </p>
                        )}
                        
                        {it.bodega && (
                          <span className="dish-card-meta">
                            {it.bodega}
                          </span>
                        )}

                        {/* Allergen badges */}
                        {getDishAllergens(it, sec.id).length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2 mb-1">
                            {getDishAllergens(it, sec.id).map((all, aIdx) => (
                              <span 
                                key={aIdx} 
                                className="inline-flex items-center rounded bg-red-950/40 px-1.5 py-0.5 text-[9px] font-medium text-red-300 border border-red-500/15"
                              >
                                ⚠️ {all}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Expanded Details Area */}
                        <motion.div
                          initial={false}
                          animate={isExpanded ? { height: "auto", opacity: 1, marginTop: 12 } : { height: 0, opacity: 0, marginTop: 0 }}
                          transition={{ duration: 0.25, ease: "easeInOut" }}
                          className="overflow-hidden border-[#C9A86A]/10 text-xs flex flex-col gap-3"
                          style={{ borderTopWidth: isExpanded ? "1px" : "0px" }}
                        >
                          {/* Ingredients and Details */}
                          <div className="pt-2">
                            <span className="text-[#c9a86a] font-semibold block mb-0.5 uppercase tracking-wider text-[9.5px]">✨ Detalles del Plato</span>
                            <p className="text-stone-300 leading-relaxed text-[11.5px]">
                              {it.description || "Ingredientes seleccionados de la más alta calidad y frescura de la casa."}
                            </p>
                          </div>

                          {/* Allergens detailed info */}
                          <div>
                            <span className="text-[#c9a86a] font-semibold block mb-1 uppercase tracking-wider text-[9.5px]">🚫 Alérgenos</span>
                            {getDishAllergens(it, sec.id).length > 0 ? (
                              <div className="flex flex-col gap-1">
                                <p className="text-[10px] text-stone-400">Este plato contiene o podría contener trazas de:</p>
                                <div className="flex flex-wrap gap-1">
                                  {getDishAllergens(it, sec.id).map((all, aIdx) => (
                                    <span key={aIdx} className="bg-red-950/35 text-red-300 border border-red-500/15 px-2 py-0.5 rounded font-medium text-[9px] uppercase tracking-wider">
                                      ⚠️ {all}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            ) : (
                              <p className="text-emerald-400/90 flex items-center gap-1 font-medium text-[11px]">
                                ✓ No contiene alérgenos comunes detectados.
                              </p>
                            )}
                          </div>

                          {/* Dynamic notes of the house */}
                          {getDishMoreDetails(it, sec.id).length > 0 && (
                            <div className="pb-1">
                              <span className="text-[#c9a86a] font-semibold block mb-1 uppercase tracking-wider text-[9.5px]">📌 Nota de la Casa</span>
                              <ul className="list-disc list-inside text-stone-400 flex flex-col gap-1 leading-relaxed text-[11px]">
                                {getDishMoreDetails(it, sec.id).map((detail, dIdx) => (
                                  <li key={dIdx}>{detail}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </motion.div>

                        <div className="dish-card-footer">
                          {isWines ? (
                            <div className="w-full flex flex-col gap-2.5">
                              {it.price_copa != null && (
                                <div className="flex items-center justify-between text-xs">
                                  <div className="flex flex-col">
                                    <span className="text-[#9A8E78] font-medium">Por Copa</span>
                                    <span className="text-[#8B1C2B] font-bold">{fmtPrice(it.price_copa)}</span>
                                  </div>
                                  {cart.some(item => item.id === `${it.id}|copa`) ? (
                                    <div className="qty-ctl">
                                      <button onClick={() => changeQty(`${it.id}|copa`, -1)}>-</button>
                                      <span className="qn">{cart.find(item => item.id === `${it.id}|copa`)?.qty}</span>
                                      <button onClick={() => changeQty(`${it.id}|copa`, 1)}>+</button>
                                    </div>
                                  ) : (
                                    <button 
                                      onClick={() => addToCart(`${it.id}|copa`, `${it.name} (Copa)`, it.price_copa || 0)}
                                      className="dish-add"
                                    >
                                      Pedir
                                    </button>
                                  )}
                                </div>
                              )}

                              {it.price_botella != null && (
                                <div className="flex items-center justify-between text-xs border-t border-[#C9A86A]/5 pt-2">
                                  <div className="flex flex-col">
                                    <span className="text-[#9A8E78] font-medium">Por Botella</span>
                                    <span className="text-[#8B1C2B] font-bold">{fmtPrice(it.price_botella)}</span>
                                  </div>
                                  {cart.some(item => item.id === `${it.id}|botella`) ? (
                                    <div className="qty-ctl">
                                      <button onClick={() => changeQty(`${it.id}|botella`, -1)}>-</button>
                                      <span className="qn">{cart.find(item => item.id === `${it.id}|botella`)?.qty}</span>
                                      <button onClick={() => changeQty(`${it.id}|botella`, 1)}>+</button>
                                    </div>
                                  ) : (
                                    <button 
                                      onClick={() => addToCart(`${it.id}|botella`, `${it.name} (Botella)`, it.price_botella || 0)}
                                      className="dish-add"
                                    >
                                      Pedir
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          ) : (
                            <>
                              <div className="dish-card-price-container">
                                <span className="dish-card-price">
                                  {it.price === null ? "a confirmar" : fmtPrice(it.price)}
                                </span>
                                <span className="dish-card-price-label">Porción</span>
                              </div>
                              {it.price !== null && (
                                cart.some(item => item.id === it.id) ? (
                                  <div className="qty-ctl">
                                    <button onClick={() => changeQty(it.id, -1)}>-</button>
                                    <span className="qn">{cart.find(item => item.id === it.id)?.qty}</span>
                                    <button onClick={() => changeQty(it.id, 1)}>+</button>
                                  </div>
                                ) : (
                                  <button
                                    onClick={() => addToCart(it.id, it.name, it.price || 0)}
                                    className="dish-add"
                                  >
                                    Agregar
                                  </button>
                                )
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          )))}

          {/* House Rules */}
          <div className="house-rules">
            <h3>La Casa</h3>
            <ul>
              {menuData.rules.sharing_surcharge && <li>{menuData.rules.sharing_surcharge.note}</li>}
              {menuData.rules.bread && <li>{menuData.rules.bread}</li>}
              {menuData.rules.side_salad_addon && <li>{menuData.rules.side_salad_addon.note}</li>}
              {menuData.rules.kids_menu && <li>{menuData.rules.kids_menu.note}</li>}
              {menuData.rules.happy_hour && <li>{menuData.rules.happy_hour.note}</li>}
              {menuData.rules.food_safety_note && <li>{menuData.rules.food_safety_note}</li>}
            </ul>
          </div>

          {/* Embedded QuantumHive Rating block */}
          <div className="quantumhive-embedded-rating">
            <div className="flex items-center justify-between mb-3 border-b border-amber-500/20 pb-2">
              <div className="flex items-center gap-2">
                <span className="text-xl">🚀</span>
                <div className="flex flex-col">
                  <h4 className="text-[10px] uppercase tracking-widest text-[#9A8E78] font-bold">Experiencia Digital</h4>
                  <span className="text-xs font-bold text-amber-500 font-sans tracking-tight">QuantumHive Menu</span>
                </div>
              </div>
              <div className="bg-amber-500/10 border border-amber-500/25 px-2 py-0.5 rounded text-[8px] font-extrabold uppercase tracking-widest text-amber-500">
                Calificanos
              </div>
            </div>

            <p className="text-stone-300 text-[11px] leading-relaxed mb-3">
              ¿Qué te pareció la velocidad, diseño y la asistente virtual para elegir tus platos? Dejanos tu valoración acá:
            </p>

            <div className="flex flex-col gap-3.5 bg-[#170F0B]/85 border border-[#C9A86A]/10 p-3 rounded-xl mb-4">
              <div className="flex items-center justify-between">
                <span className="text-stone-300 text-[11px] font-bold">Tu valoración:</span>
                <div className="flex gap-1.5">
                  {[1, 2, 3, 4, 5].map(v => (
                    <motion.button 
                      key={v}
                      type="button"
                      onClick={() => handleStarClick('quantumhive', v)}
                      whileTap={{ scale: 1.4 }}
                      transition={{ type: "spring", stiffness: 300 }}
                      className={`transition-all cursor-pointer ${flashStarId === `quantumhive-${v}` ? "star-flash-anim" : ""}`}
                    >
                      <Star 
                        className={`h-11 w-11 transition-all duration-200 ${
                          v <= rating.quantumhive 
                            ? "fill-[#C9A86A] text-[#C9A86A] drop-shadow-[0_0_15px_rgba(201,168,106,0.9)] scale-115" 
                            : "text-[#57453B] fill-transparent hover:text-stone-400"
                        }`}
                      />
                    </motion.button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-[9px] uppercase text-[#9A8E78] font-bold">Comentario opcional:</span>
                <input 
                  type="text"
                  value={ratingComment}
                  onChange={(e) => setRatingComment(e.target.value)}
                  placeholder="Ej: Excelente velocidad y muy fácil de usar..."
                  className="w-full bg-[#1A120E] border border-[#C9A86A]/20 rounded-lg px-2.5 py-1.5 text-xs text-stone-100 placeholder-stone-600 focus:outline-none focus:border-amber-500/60"
                />
              </div>

              <button
                type="button"
                onClick={handleEmbeddedRatingSubmit}
                className="w-full py-2 bg-gradient-to-r from-amber-600 to-amber-500 text-stone-950 font-black text-[11px] uppercase tracking-widest rounded-lg shadow-md active:scale-95 transition-all cursor-pointer"
              >
                Enviar Valoración
              </button>
            </div>

            <div className="text-center text-[10px] text-stone-500">
              Desarrollado con ♥ por <b>QuantumHive Systems</b>
            </div>
          </div>

          {/* Bottom spacing */}
          <div className="h-44"></div>
        </main>

        {/* --- FLOATING APP CONTROLS --- */}
        
        {/* CART FLOATING BAR (CENTRAL BUTTON JUST ABOVE THE ORB) */}
        <div 
          className={`cart-bar ${cartCount > 0 ? "show" : ""}`}
          onClick={() => setActiveOverlay("order")}
        >
          <span>Ver mi pedido</span>
          <span className="cart-count">{cartCount}</span>
        </div>

        {/* BURBUJAS BLANCAS DE AUTOGUIADO ACCESIBLE AL COSTADO DEL ORBE */}
        {!activeOverlay && (
          <div className="quick-actions">


            {/* Left Column (Even indexed chips) */}
            <div className="quick-col left">
              {getGuidedFlowInfo().chips.slice(0, visibleChipsCount).map((ch, idx) => {
                if (idx % 2 === 0) {
                  const item = ch as any;
                  return (
                    <button
                      key={idx}
                      onClick={() => handleGuidedChipClick(item.action, item.text, item.id, item.price, item.name, "left")}
                      className={`quick-chip guided-bubble ${selectedGuidedChipId === `${item.action}:${item.id || item.text}` ? "selected" : ""} ${item.action === "go_to_order" ? "action-btn" : ""}`}
                    >
                      {item.text}
                    </button>
                  );
                }
                return null;
              })}
            </div>

            {/* Right Column (Odd indexed chips) */}
            <div className="quick-col right">
              {getGuidedFlowInfo().chips.slice(0, visibleChipsCount).map((ch, idx) => {
                if (idx % 2 === 1) {
                  const item = ch as any;
                  return (
                    <button
                      key={idx}
                      onClick={() => handleGuidedChipClick(item.action, item.text, item.id, item.price, item.name, "right")}
                      className={`quick-chip guided-bubble ${selectedGuidedChipId === `${item.action}:${item.id || item.text}` ? "selected" : ""} ${item.action === "go_to_order" ? "action-btn" : ""}`}
                    >
                      {item.text}
                    </button>
                  );
                }
                return null;
              })}
            </div>
          </div>
        )}

        {/* THE AVATAR (DECORATIVE - live call only via phone icon) */}
        {!activeOverlay && (
          <div 
            className={`orb-float pointer-events-none ${speakingVideoReady ? "speaking-ready" : ""}`}
            data-clip={speakingAvatarKey || "connector_idle"}
            data-state={speakingAvatarVideo ? "speaking" : "idle"}
          >
            <video
              ref={idleAvatarVideoRef}
              key={idleAvatarKey}
              src={currentIdleAvatarVideo}
              className="avatar-alpha-video avatar-idle-video ready"
              playsInline
              muted
              loop={idleAvatarKey === "connector_idle"}
              controls={false}
              disablePictureInPicture
              preload="auto"
              autoPlay
              onEnded={() => {
                if (idleAvatarKey !== "connector_idle") {
                  setIdleAvatarKey("connector_idle");
                  setCurrentIdleAvatarVideo(idleAvatarVideo);
                  setIdleCycleNonce((value) => value + 1);
                }
              }}
              onError={() => {
                setIdleAvatarKey("connector_idle");
                setCurrentIdleAvatarVideo(idleAvatarVideo);
                setSolState("idle");
              }}
            />
            {speakingAvatarVideo && (
              <video
                ref={speakingAvatarVideoRef}
                key={`${speakingAvatarKey}-${speakingPlayId}`}
                src={speakingAvatarVideo}
                className={`avatar-alpha-video avatar-speaking-video ${speakingVideoReady ? "ready" : ""}`}
                playsInline
                controls={false}
                disablePictureInPicture
                preload="auto"
                onCanPlay={() => {
                  setSpeakingVideoReady(true);
                  speakingAvatarVideoRef.current?.play().catch(() => {
                    setSpeakingAvatarKey(null);
                    setSpeakingAvatarVideo(null);
                    setSpeakingVideoReady(false);
                    setSolState("idle");
                  });
                }}
                onError={() => {
                  setSpeakingAvatarKey(null);
                  setSpeakingAvatarVideo(null);
                  setSpeakingVideoReady(false);
                  setSolState("idle");
                }}
                onEnded={() => {
                  const shouldContinueIdleCycle = isIdleVariantKey(speakingAvatarKey);
                  setSpeakingVideoReady(false);
                  setTimeout(() => {
                    setSpeakingAvatarKey(null);
                    setSpeakingAvatarVideo(null);
                    setSolState("idle");
                    if (shouldContinueIdleCycle) {
                      setIdleCycleNonce((value) => value + 1);
                    }
                  }, 160);
                }}
              />
            )}
          </div>
        )}

        {/* --- MENU OVERLAY DROPDOWN --- */}
        {showMenuDrop && (
          <>
            <div 
              onClick={() => setShowMenuDrop(false)}
              className="menu-overlay open"
            ></div>
            <div className="menu-drop open">
              <div className="menu-drop-group">
                🍽 Secciones de la Carta
              </div>
              {displaySectionsList.map(sec => (
                <button
                  key={sec.id}
                  onClick={() => scrollToSection(sec.id)}
                  className={`menu-drop-item ${activeSection === sec.id ? "active" : ""}`}
                >
                  <span>{sec.name}</span>
                </button>
              ))}
            </div>
          </>
        )}

        {/* --- OVERLAY: CHAT HISTORY SLIDE-DOWN DRAWER --- */}
        {activeOverlay === "chat" && (
          <>
            <div onClick={() => setActiveOverlay(null)} className="history-overlay open"></div>
            <div className="history-panel open">
              <div className="history-head flex justify-between items-center w-full">
                <div className="flex flex-col items-start gap-1">
                  <h3>Tu charla con la mesera</h3>
                  <div 
                    onClick={() => setLowLatency(prev => !prev)}
                    className="flex items-center gap-1.5 cursor-pointer select-none py-0.5"
                  >
                    <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center transition-colors ${lowLatency ? "bg-amber-500 border-amber-600 text-stone-950" : "border-stone-600 bg-stone-900 text-transparent"}`}>
                      {lowLatency && <Check className="h-2.5 w-2.5 stroke-[3px]" />}
                    </div>
                    <span className="text-[10px] uppercase tracking-wider text-stone-400 font-mono flex items-center gap-1">
                      <Zap className={`h-3 w-3 ${lowLatency ? "text-amber-400 fill-amber-400 animate-pulse" : "text-stone-500"}`} /> 
                      Respuesta rápida
                    </span>
                  </div>
                </div>
                <button 
                  onClick={() => setActiveOverlay(null)}
                  className="history-close"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Chat list */}
              <div className="history-list">
                {history.length === 0 ? (
                  <div className="history-empty">
                    Preguntale lo que quieras: recomendaciones, ingredientes, vinos...
                  </div>
                ) : (
                  history.map((msg, idx) => (
                    <div 
                      key={idx} 
                      className={`msg ${msg.role === "user" ? "user" : "bot"}`}
                    >
                      {msg.role === "model" && (
                        <span className="who">Sol</span>
                      )}
                      <p>{msg.text}</p>
                      
                      {/* LLM Cards */}
                      {msg.cards && msg.cards.length > 0 && (
                        <div className="flex gap-2 overflow-x-auto py-2 mt-2 hide-scrollbar">
                          {msg.cards.map(cardId => {
                            const dish = [...menuData.menu.flatMap(s => s.items), ...menuData.drinks.flatMap(s => s.items || s.subcategories?.flatMap(sub => sub.items) || [])].find(it => it.id === cardId);
                            if (!dish) return null;
                            const img = getDishImage(dish.id);
                            return (
                              <div key={cardId} className="flex-shrink-0 w-[140px] rounded-xl bg-gradient-to-b from-[#1c1410] to-[#120b08] border border-[#c9a86a]/20 overflow-hidden cursor-pointer shadow-lg hover:border-amber-500/40 transition-all" onClick={() => { scrollToDish(dish.id); setActiveOverlay(null); }}>
                                <div className="h-[80px] w-full overflow-hidden relative">
                                  <img src={img} className="w-full h-full object-cover" />
                                </div>
                                <div className="p-2">
                                  <h4 className="text-[#F4ECD8] text-[11px] font-bold truncate">{dish.name}</h4>
                                  <p className="text-[#C9A86A] text-[10px]">${dish.price || dish.price_copa}</p>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                      
                      {/* LLM Chips */}
                      {msg.chips && msg.chips.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {msg.chips.map((chip, cIdx) => (
                            <button 
                              key={cIdx} 
                              onClick={() => converse(chip)}
                              className="quick-chip guided-bubble !w-auto !max-w-full !px-3 !py-1.5 !text-[11px] !bg-white/95 !text-[#120b08]"
                            >
                              {chip}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ))
                )}
                {isStreaming && (
                  <div className="msg bot">
                    <span className="who">Sol</span>
                    <p className="italic text-stone-400">Pensando…</p>
                  </div>
                )}
                <div ref={historyListEndRef}></div>
              </div>

              {/* Input docking at the bottom of panel */}
              <div className="panel-dock">
                <div className="dock-row">
                  <textarea 
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onFocus={(e) => {
                      setTimeout(() => {
                        e.target.scrollIntoView({ behavior: 'smooth', block: 'end' });
                      }, 300);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        converse(inputValue);
                      }
                    }}
                    rows={1}
                    placeholder="Escribí tu mensaje aquí…"
                  />
                  <button
                    onClick={() => {
                      if (!isLiveCalling) {
                        startLiveCall();
                      } else {
                        endLiveCall();
                      }
                    }}
                    title="Llamada en vivo"
                    className={`icon-btn ${isLiveCalling ? 'text-amber-500 animate-pulse' : 'text-stone-400'}`}
                  >
                    {isLiveCalling ? <Square className="h-4 w-4 fill-current" /> : <Mic className="h-4 w-4" />}
                  </button>
                  <button
                    onClick={() => converse(inputValue)}
                    disabled={!inputValue.trim()}
                    className="icon-btn send-btn"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <div className="history-handle"></div>
            </div>
          </>
        )}

        {/* --- OVERLAY: Tu Pedido (Tu Cuenta / Pedido Sheet) --- */}
        {activeOverlay === "order" && (
          <>
            <div onClick={() => setActiveOverlay(null)} className="sheet-overlay open"></div>
            <div className="sheet open">
              <div className="sheet-handle"></div>
              <div className="sheet-head">
                <h3>Tu pedido</h3>
                <button onClick={() => setActiveOverlay(null)} className="sheet-close">
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="sheet-body">
                {cart.length === 0 ? (
                  <div className="order-empty">
                    Tu pedido está vacío.<br />Agregá platos de la carta para empezar.
                  </div>
                ) : (
                  <>
                    {cart.map((item, idx) => (
                      <div key={idx} className="order-item">
                        <div className="flex flex-col">
                          <span className="oi-name">{item.name}</span>
                          <span className="oi-price">{fmtPrice(item.price)} c/u</span>
                        </div>
                        <div className="qty-stepper">
                          <button onClick={() => changeQty(item.id, -1)}>-</button>
                          <b>{item.qty}</b>
                          <button onClick={() => changeQty(item.id, 1)}>+</button>
                        </div>
                        <span className="oi-line">
                          {fmtPrice(item.price * item.qty)}
                        </span>
                      </div>
                    ))}

                    <div className="order-total">
                      <span>Total estimado</span>
                      <b>{fmtPrice(cartTotal)}</b>
                    </div>

                    <div className="field">
                      <label>Número de mesa</label>
                      <input 
                        type="number"
                        inputMode="numeric"
                        placeholder="Ej: 5"
                        value={table}
                        onChange={(e) => setTable(e.target.value)}
                        disabled={tableLocked}
                        className={tableLocked ? "locked" : ""}
                      />
                      <span className="hint">Lo encontrás impreso arriba del código QR en tu mesa.</span>
                    </div>

                    <div className="order-note">
                      📩 El pedido le llega directo al mozo. <b>(En la versión real se configura el número interno del restaurante.)</b>
                    </div>
                  </>
                )}
              </div>

              {cart.length > 0 && (
                <div className="sheet-foot">
                  {/* BUTTONS ARE ALWAYS CLICKABLE NOW TO REDUCE FRICTION */}
                  <button
                    onClick={sendOrderToKitchen}
                    className="btn-primary"
                  >
                    Realizar pedido
                  </button>
                  <button
                    onClick={() => setMozoCardOpen(true)}
                    className="btn-ghost"
                  >
                    Mostrar al mozo
                  </button>
                </div>
              )}
            </div>
          </>
        )}

        {/* --- MOZO SUMMARY (PANTALLA COMPLETA) --- */}
        {mozoCardOpen && (
          <div className="mozo-card open">
            <div className="mc-table">
              Mesa {table || "—"}
            </div>
            <h2>Resumen para el Mozo</h2>

            <div className="mc-list">
              {cart.map((item, idx) => (
                <div key={idx} className="mc-item">
                  <span>
                    <b className="q">{item.qty}x</b> {item.name}
                  </span>
                  <span>
                    {fmtPrice(item.price * item.qty)}
                  </span>
                </div>
              ))}
            </div>

            <div className="mc-total">
              <span>Total Estimado</span>
              <span>{fmtPrice(cartTotal)}</span>
            </div>

            <div className="mc-foot">
              <button
                onClick={() => {
                  setMozoCardOpen(false);
                  setCart([]);
                  setActiveOverlay("rating_restaurant");
                }}
                className="btn-primary"
              >
                Listo, pedido tomado
              </button>
            </div>
          </div>
        )}

        {/* --- OVERLAY: RATING 1 (RESTAURANT) --- */}
        {activeOverlay === "rating_restaurant" && (
          <div className="modal-overlay open" style={{ alignItems: 'flex-start', paddingTop: '10vh' }}>
            <div className="modal-card !max-w-md bg-gradient-to-b from-[#201712] to-[#0e0a07] border-2 border-[#C9A86A]/40 rounded-3xl p-6 shadow-[0_0_50px_rgba(201,168,106,0.15)] relative animate-fade-in text-stone-100">
              <button 
                onClick={() => setActiveOverlay(null)} 
                className="absolute top-4 right-4 w-8 h-8 rounded-full bg-stone-900/80 border border-[#C9A86A]/20 text-[#C9A86A] hover:bg-stone-800 hover:text-amber-400 flex items-center justify-center transition-all cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>

              <div className="text-center mb-5">
                <span className="text-4xl inline-block mb-2 drop-shadow-[0_0_15px_rgba(245,158,11,0.3)]">🎉🍳</span>
                <h3 className="font-sans font-semibold text-xl tracking-tight text-amber-500">¡Pedido en viaje a la cocina!</h3>
                <p className="text-xs text-stone-400 mt-1 max-w-xs mx-auto">
                  Tu pedido ya se está preparando. ¿Nos ayudás con tu opinión? (1/2)
                </p>
              </div>

              <div className="space-y-4 text-left mt-4">
                {/* Rating 1: Mesera */}
                <div>
                  <span className="block text-[11px] font-bold text-stone-300 uppercase tracking-wider mb-2 text-center">¿Cómo te atendió Sol (mesera virtual)?</span>
                  <div className="flex justify-center gap-2">
                    {[1, 2, 3, 4, 5].map(v => (
                      <motion.button 
                        key={v}
                        type="button"
                        onClick={() => handleStarClick('mesera', v)}
                        whileTap={{ scale: 1.4 }}
                        transition={{ type: "spring", stiffness: 300 }}
                        className={`transition-all cursor-pointer ${flashStarId === `mesera-${v}` ? "star-flash-anim" : ""}`}
                      >
                        <Star 
                          className={`h-10 w-10 sm:h-12 sm:w-12 transition-all duration-200 ${
                            v <= rating.mesera 
                              ? "fill-[#C9A86A] text-[#C9A86A] drop-shadow-[0_0_20px_rgba(201,168,106,0.95)] scale-115" 
                              : "text-[#57453B] fill-transparent hover:text-stone-400"
                          }`}
                        />
                      </motion.button>
                    ))}
                  </div>
                </div>

                {/* Rating 2: Restaurante */}
                <div className="pt-1">
                  <span className="block text-[11px] font-bold text-stone-300 uppercase tracking-wider mb-2 text-center">¿Qué tal la comida y el restaurante?</span>
                  <div className="flex justify-center gap-2">
                    {[1, 2, 3, 4, 5].map(v => (
                      <motion.button 
                        key={v}
                        type="button"
                        onClick={() => handleStarClick('restaurante', v)}
                        whileTap={{ scale: 1.4 }}
                        transition={{ type: "spring", stiffness: 300 }}
                        className={`transition-all cursor-pointer ${flashStarId === `restaurante-${v}` ? "star-flash-anim" : ""}`}
                      >
                        <Star 
                          className={`h-10 w-10 sm:h-12 sm:w-12 transition-all duration-200 ${
                            v <= rating.restaurante 
                              ? "fill-[#C9A86A] text-[#C9A86A] drop-shadow-[0_0_20px_rgba(201,168,106,0.95)] scale-115" 
                              : "text-[#57453B] fill-transparent hover:text-stone-400"
                          }`}
                        />
                      </motion.button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-8">
                <button
                  onClick={() => setActiveOverlay("rating_quantumhive")}
                  disabled={rating.mesera === 0 || rating.restaurante === 0}
                  className="w-full py-3.5 px-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 font-bold rounded-xl active:scale-98 transition-all shadow-lg shadow-amber-900/20 cursor-pointer text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Siguiente paso ➔
                </button>
              </div>
            </div>
          </div>
        )}

        {/* --- OVERLAY: RATING 2 (QUANTUMHIVE) --- */}
        {activeOverlay === "rating_quantumhive" && (
          <div className="modal-overlay open" style={{ alignItems: 'flex-start', paddingTop: '10vh' }}>
            <div className="modal-card !max-w-md bg-gradient-to-b from-[#201712] to-[#0e0a07] border-2 border-[#C9A86A]/40 rounded-3xl p-6 shadow-[0_0_50px_rgba(201,168,106,0.15)] relative animate-fade-in text-stone-100">
              <button 
                onClick={() => setActiveOverlay(null)} 
                className="absolute top-4 right-4 w-8 h-8 rounded-full bg-stone-900/80 border border-[#C9A86A]/20 text-[#C9A86A] hover:bg-stone-800 hover:text-amber-400 flex items-center justify-center transition-all cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>

              <div className="text-center mb-5">
                <span className="text-4xl inline-block mb-2 drop-shadow-[0_0_15px_rgba(245,158,11,0.3)]">🚀✨</span>
                <h3 className="font-sans font-semibold text-xl tracking-tight text-amber-500">Experiencia Digital</h3>
                <p className="text-xs text-stone-400 mt-1 max-w-xs mx-auto">
                  Paso final (2/2). Evaluá la tecnología de QuantumHive.
                </p>
              </div>

              <div className="space-y-5 text-left">
                {/* Rating 3: QuantumHive Experiencia Digital */}
                <div className="p-5 rounded-2xl bg-amber-500/5 border border-amber-500/20 shadow-inner relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>
                  <div className="flex flex-col items-center gap-1 mb-4 text-center">
                    <span className="block text-xs font-bold text-amber-400 uppercase tracking-widest">Tecnología Carta Inteligente</span>
                    <p className="text-[10.5px] text-stone-400 leading-snug">
                      ¿Qué te pareció usar esta carta para pedir y hablar con la mesera virtual?
                    </p>
                  </div>
                  <div className="flex justify-center gap-2">
                    {[1, 2, 3, 4, 5].map(v => (
                      <motion.button 
                        key={v}
                        type="button"
                        onClick={() => handleStarClick('quantumhive', v)}
                        whileTap={{ scale: 1.4 }}
                        transition={{ type: "spring", stiffness: 300 }}
                        className={`transition-all cursor-pointer ${flashStarId === `quantumhive-${v}` ? "star-flash-anim" : ""}`}
                      >
                        <Star 
                          className={`h-10 w-10 sm:h-12 sm:w-12 transition-all duration-200 ${
                            v <= rating.quantumhive 
                              ? "fill-[#C9A86A] text-[#C9A86A] drop-shadow-[0_0_20px_rgba(201,168,106,0.95)] scale-115" 
                              : "text-[#57453B] fill-transparent hover:text-stone-400"
                          }`}
                        />
                      </motion.button>
                    ))}
                  </div>
                </div>

                {/* Optional comment */}
                <div className="flex flex-col gap-2 mt-4">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-[#9A8E78] text-center">¿Sugerencias para la app? (Opcional)</label>
                  <input 
                    type="text"
                    value={ratingComment}
                    onChange={(e) => setRatingComment(e.target.value)}
                    placeholder="Ej: Sumar fotos de postres, anduvo genial, etc."
                    className="w-full bg-[#1A120E] border border-[#C9A86A]/30 rounded-xl px-4 py-3.5 text-[13px] text-stone-100 placeholder-stone-600 focus:outline-none focus:border-amber-500/80 focus:bg-[#2A1D15] transition-all shadow-inner"
                  />
                </div>
              </div>

              <div className="mt-8 flex gap-3">
                <button
                  onClick={() => setActiveOverlay("rating_restaurant")}
                  className="w-1/3 py-3 px-2 bg-stone-900 border border-stone-700 hover:bg-stone-800 text-stone-300 font-bold rounded-xl active:scale-98 transition-all cursor-pointer text-sm"
                >
                  Volver
                </button>
                <button
                  onClick={handleRatingSubmit}
                  disabled={rating.quantumhive === 0}
                  className="w-2/3 py-3 px-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 font-bold rounded-xl active:scale-98 transition-all shadow-lg shadow-amber-900/20 cursor-pointer text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Enviar y finalizar
                </button>
              </div>
            </div>
          </div>
        )} 
        {/* --- OVERLAY: TABLE NUMBER MANUATION DIALOG --- */}
        {activeOverlay === "mesa" && (
          <div className="modal-overlay open">
            <div className="modal-card">
              <h3>¿En qué mesa estás?</h3>
              <p>Lo encontrás impreso arriba del código QR, en tu mesa.</p>

              <input 
                type="number"
                inputMode="numeric"
                value={table}
                onChange={(e) => setTable(e.target.value)}
                placeholder="Número de mesa"
                className="w-full rounded-xl border border-[#C9A86A]/25 bg-black/40 px-4 py-2.5 text-center text-sm text-[#F4ECD8] placeholder-[#9A8E78] focus:border-[#8B1C2B] outline-none"
              />

              <div className="modal-actions mt-6">
                <button 
                  onClick={() => setActiveOverlay(null)}
                  className="leave"
                >
                  Cancelar
                </button>
                <button 
                  onClick={() => {
                    if (table.trim()) {
                      localStorage.setItem("cv_table", table);
                      setActiveOverlay(null);
                    } else {
                      triggerToast("Por favor, ingresá un número.");
                    }
                  }}
                  className="stay"
                >
                  Guardar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* --- DUPLICATE ITEM CONFIRMATION MODAL --- */}
        {confirmModal && (
          <div className="modal-overlay open">
            <div className="modal-card">
              <h3>{confirmModal.title}</h3>
              <p>{confirmModal.text}</p>
              <div className="modal-actions">
                <button 
                  onClick={() => setConfirmModal(null)}
                  className="leave"
                >
                  No
                </button>
                <button 
                  onClick={confirmModal.onConfirm}
                  className="stay"
                >
                  Sí, agregar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* --- EXIT CONFIRMATION MODAL --- */}
        {showExitConfirm && (
          <div className="modal-overlay open z-[999999]">
            <div className="modal-card bg-[#1A120E] border border-[#C9A86A]/30">
              <h3 className="text-[#C9A86A]">Salir de la aplicación</h3>
              <p className="text-stone-300">¿Estás seguro que querés salir de la carta?</p>
              <div className="modal-actions mt-4 flex gap-3">
                <button 
                  onClick={() => setShowExitConfirm(false)}
                  className="flex-1 py-2 rounded-lg font-bold uppercase text-[11px] tracking-widest bg-stone-800 text-stone-300 border border-stone-600 active:scale-95 transition-all"
                >
                  Me quedo
                </button>
                <button 
                  onClick={() => {
                    isExitingRef.current = true;
                    window.history.back();
                    setTimeout(() => window.close(), 100);
                  }}
                  className="flex-1 py-2 rounded-lg font-bold uppercase text-[11px] tracking-widest bg-red-900/40 text-red-400 border border-red-900 active:scale-95 transition-all"
                >
                  Sí, salir
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
