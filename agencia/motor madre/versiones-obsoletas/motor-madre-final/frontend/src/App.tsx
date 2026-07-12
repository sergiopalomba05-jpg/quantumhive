import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  MessageSquare, 
  ShoppingBag, 
  Menu, 
  ChevronRight, 
  MapPin, 
  Volume2, 
  VolumeX, 
  Mic, 
  Heart, 
  Sparkles, 
  CheckCircle,
  HelpCircle,
  Clock
} from "lucide-react";

import { MenuItem, Category, CartItem, ChatMessage, MenuData } from "./types";
import { MenuCard } from "./components/MenuCard";
import { VideoAvatar } from "./components/VideoAvatar";
import { useLiveAudio } from "./hooks/useLiveAudio";
import { OrderSheet } from "./components/OrderSheet";
import { RatingModal } from "./components/RatingModal";

const solAvatarUrl = "/src/assets/images/sol_3d_avatar_1783115354185.jpg";

export default function App() {
  // App States
  const [menuData, setMenuData] = useState<MenuData | null>(null);
  const [loading, setLoading] = useState(true);
  const [splashVisible, setSplashVisible] = useState(true);
  const [activeTab, setActiveTab] = useState<string>("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [table, setTable] = useState("");
  const [tableLocked, setTableLocked] = useState(false);
  const [currentTime, setCurrentTime] = useState("");

  // Dialog / Drawer States
  const [isOrderOpen, setIsOrderOpen] = useState(false);
  const [isRatingOpen, setIsRatingOpen] = useState(false);
  const [isCategoriesMenuOpen, setIsCategoriesMenuOpen] = useState(false);
  const [isTableModalOpen, setIsTableModalOpen] = useState(false);
  const [isWaitressOpen, setIsWaitressOpen] = useState(false);

  // Sol Waitress Assistant States
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [waitressState, setWaitressState] = useState<"idle" | "listening" | "thinking" | "speaking">("idle");
  const [chips, setChips] = useState<string[]>([
    "🔥 Especialidad de la casa",
    "🍢 ¿Qué hay para picar?",
    "🍷 Recomendame un vino",
    "🍰 ¿Qué postre va bien?"
  ]);
  const [isVoiceMuted, setIsVoiceMuted] = useState(false);
  const [spotlightDishId, setSpotlightDishId] = useState<string | null>(null);
  const [currentSubtitle, setCurrentSubtitle] = useState<string>("");
  const [orbTilt, setOrbTilt] = useState({ x: 0, y: 0 });

  const { isConnected, isSpeaking, isMicMuted, connect, disconnect, sendTextMessage, toggleMic, analyserNode } = useLiveAudio({
    onAudioStart: () => {
      setCurrentSubtitle("");
      setWaitressState("speaking");
    },
    onAudioStop: () => setWaitressState("idle"),
    onTextChunk: (text) => {
      setCurrentSubtitle((prev) => {
        const next = prev + text;
        return next
          .replace(/#PEDIDO#[\s\S]*$/, "")
          .replace(/#CHIPS#[\s\S]*$/, "")
          .replace(/#CUENTA#[\s\S]*$/, "")
          .trim();
      });
    },
    onTextFinal: (text) => {
      const cleaned = text
        .replace(/#PEDIDO#[\s\S]*$/, "")
        .replace(/#CHIPS#[\s\S]*$/, "")
        .replace(/#CUENTA#[\s\S]*$/, "")
        .trim();
      
      setChatHistory((prev) => [
        ...prev,
        { role: "model", text: cleaned }
      ]);
      
      parseTechnicalDirectives(text);
    }
  });
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  // Start Mic Recording
  const startRecording = async () => {
    try {
      setWaitressState("listening");
      setIsRecording(true);

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
      });

      let mimeType = "audio/webm;codecs=opus";
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = "audio/webm";
        if (!MediaRecorder.isTypeSupported(mimeType)) {
          mimeType = "audio/mp4";
        }
      }

      audioChunksRef.current = [];
      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        setIsRecording(false);
        setWaitressState("thinking");
        stream.getTracks().forEach((track) => track.stop());

        const audioBlob = new Blob(audioChunksRef.current || [], { type: mimeType });
        if (audioBlob.size === 0) {
          setWaitressState("idle");
          return;
        }

        try {
          const reader = new FileReader();
          reader.readAsDataURL(audioBlob);
          reader.onloadend = async () => {
            const base64Data = (reader.result as string).split(",")[1];
            
            const response = await fetch("/stt", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ audio_base64: base64Data, mime_type: mimeType }),
            });

            if (!response.ok) throw new Error("Transmision fallida");

            const data = await response.json();
            const text = (data.text || "").trim();

            if (text) {
              await handleSendMessage(text, !isVoiceMuted);
            } else {
              setWaitressState("idle");
            }
          };
        } catch (error) {
          console.error("Transcription Error:", error);
          setWaitressState("idle");
        }
      };

      mediaRecorder.start();
    } catch (error) {
      console.error("Mic Access Error:", error);
      setIsRecording(false);
      setWaitressState("idle");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
    }
  };

  const handleVoiceToggle = () => {
    if (isConnected) {
      toggleMic();
    } else {
      if (isRecording) stopRecording();
      else startRecording();
    }
  };

  // Load menu and check search query for locked table numbers
  useEffect(() => {
    const fetchMenu = async () => {
      try {
        const res = await fetch("/menu.json");
        const data = await res.json();
        setMenuData(data);
        
        // Default to first food category
        if (data.menu && data.menu.length > 0) {
          setActiveTab(data.menu[0].id);
        }
        setLoading(false);
      } catch (err) {
        console.error("Error loading menu:", err);
        setLoading(false);
      }
    };

    fetchMenu();

    // Check URL parameters for table number (e.g. ?mesa=4 or ?m=4)
    const params = new URLSearchParams(window.location.search);
    const mesaParam = params.get("mesa") || params.get("m") || params.get("table");
    if (mesaParam) {
      setTable(mesaParam);
      setTableLocked(true);
    } else {
      const savedTable = localStorage.getItem("cv_table");
      if (savedTable) setTable(savedTable);
    }

    // Load saved cart
    const savedCart = localStorage.getItem("cv_cart");
    if (savedCart) {
      try {
        setCart(JSON.parse(savedCart));
      } catch {
        // ignore
      }
    }
  }, []);

  // Update clock
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const hrs = String(now.getHours()).padStart(2, '0');
      const mins = String(now.getMinutes()).padStart(2, '0');
      setCurrentTime(`${hrs}:${mins}`);
    };
    updateTime();
    const interval = setInterval(updateTime, 60000);
    return () => clearInterval(interval);
  }, []);

  // Save cart changes
  useEffect(() => {
    localStorage.setItem("cv_cart", JSON.stringify(cart));
  }, [cart]);

  // Save table changes
  useEffect(() => {
    if (table) {
      localStorage.setItem("cv_table", table);
    } else {
      localStorage.removeItem("cv_table");
    }
  }, [table]);

  // handle entering the application (triggered by clicking starting button in splash)
  const handleEnterApp = () => {
    setSplashVisible(false);

    // Activar audio context conectándose a Gemini Live y reproduciendo el saludo inicial
    connect(
      "Eres Sol, una mesera virtual argentina del restaurante La Escaloneta. Sos cálida, entusiasta y experta en el menú. Respondé siempre en español argentino de manera concisa y natural. Cuando el usuario te pregunte algo, respondé con voz natural y recomendá platos.",
      "Saluda cordialmente al usuario que acaba de entrar a la aplicación de La Escaloneta. Preséntate como Sol y dales una cálida bienvenida a la carta digital del restaurante, invitándolos a ordenar o pedir recomendaciones."
    );
  };

  // Cart operations
  const handleAddToCart = (item: MenuItem, variant?: "copa" | "botella") => {
    const cartId = variant ? `${item.id}|${variant}` : item.id;
    const finalPrice = variant === "copa" && item.price_copa ? item.price_copa : (variant === "botella" && item.price_botella ? item.price_botella : (item.price || 0));
    const finalName = variant ? `${item.name} (${variant === "copa" ? "Copa" : "Botella"})` : item.name;

    setCart((prev) => {
      const existing = prev.find((x) => x.id === cartId);
      if (existing) {
        return prev.map((x) => (x.id === cartId ? { ...x, qty: x.qty + 1 } : x));
      }
      return [...prev, { id: cartId, name: finalName, price: finalPrice, qty: 1, variant }];
    });

    // Speak a helpful follow-up
    handleAddToCartVoiceResponse(item);
  };

  const handleDecreaseQty = (cartId: string) => {
    setCart((prev) => {
      const existing = prev.find((x) => x.id === cartId);
      if (existing && existing.qty > 1) {
        return prev.map((x) => (x.id === cartId ? { ...x, qty: x.qty - 1 } : x));
      }
      return prev.filter((x) => x.id !== cartId);
    });
  };

  const handleIncreaseQty = (cartId: string) => {
    setCart((prev) => prev.map((x) => (x.id === cartId ? { ...x, qty: x.qty + 1 } : x)));
  };

  const handleRemoveFromCart = (cartId: string) => {
    setCart((prev) => prev.filter((x) => x.id !== cartId));
  };

  // Determine standard vocal followup based on category added to cart
  const handleAddToCartVoiceResponse = (item: MenuItem) => {
    if (waitressState === "speaking" || waitressState === "thinking") return;

    let text = `¡Excelente elección! Te sumé ${item.name} al pedido.`;
    let nextChips = ["¿Algo para tomar?", "Un postre rico", "Así está bien"];

    const isDessert = item.id.includes("cake") || item.id.includes("pie") || item.id.includes("banana") || item.id.includes("sundae");
    const isDrink = item.id.includes("coca") || item.id.includes("villa") || item.id.includes("limonada") || item.id.includes("beer") || item.id.includes("wine") || item.id.includes("gin");
    const isAppetizer = item.id.includes("dip") || item.id.includes("tender") || item.id.includes("nachos") || item.id.includes("rolls");

    if (isDessert) {
      text += " ¿Le sumamos un rico cafecito o infusión para acompañar?";
      nextChips = ["Un Café", "Un Capuchino", "Así está bien"];
    } else if (isDrink) {
      text += " ¿Vamos eligiendo un plato principal o preferís picar algo primero?";
      nextChips = ["Un bife de chorizo", "Costillas BBQ", "¿Qué hay para picar?"];
    } else if (isAppetizer) {
      text += " ¡Riquísimo! ¿Qué plato principal te gustaría de segundo paso?";
      nextChips = ["Un ojo de bife", "Un salmón grillado", "¿Algo para tomar?"];
    } else {
      text += " ¿Con qué te gustaría tomarlo? Tengo cervezas bien frías, gaseosas o excelentes vinos.";
      nextChips = ["Con alcohol", "Sin alcohol", "Ver mi pedido"];
    }

    setChips(nextChips);
    if (!isVoiceMuted) {
      playSpeechResponse(text);
    }
  };

  // Synthesize and play speech on client
  const playSpeechResponse = async (text: string) => {
    if (isConnected) {
      sendTextMessage(`Léelo textualmente con tu voz natural en español de Argentina: "${text}"`);
      return;
    }

    try {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }

      setWaitressState("speaking");

      const res = await fetch("/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });

      if (!res.ok) throw new Error("TTS call failed");

      const contentType = res.headers.get("content-type") || "";
      if (contentType.includes("application/json")) {
        const json = await res.json();
        if (json.useBrowserTTS) {
          speakBrowserSpeech(json.text);
          return;
        }
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audioRef.current = audio;

      audio.onended = () => {
        setWaitressState("idle");
        setSpotlightDishId(null);
        setCurrentSubtitle("");
      };
      audio.onerror = () => {
        setWaitressState("idle");
        setSpotlightDishId(null);
        setCurrentSubtitle("");
      };

      await audio.play();
    } catch (error) {
      console.error("Audio playback error:", error);
      speakBrowserSpeech(text); // fallback
    }
  };

  // Browser speech synthesis fallback
  const speakBrowserSpeech = (text: string) => {
    if (!window.speechSynthesis) {
      setWaitressState("idle");
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "es-AR";
    utterance.rate = 1.05;

    utterance.onend = () => {
      setWaitressState("idle");
      setSpotlightDishId(null);
      setCurrentSubtitle("");
    };
    utterance.onerror = () => {
      setWaitressState("idle");
      setSpotlightDishId(null);
      setCurrentSubtitle("");
    };

    setWaitressState("speaking");
    window.speechSynthesis.speak(utterance);
  };

  // Play pre-recorded guided Flows ($0 cost / instant fallback)
  const playGuidedFlow = async (flowKey: string) => {
    // Stop any current audio
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    setWaitressState("speaking");
     // Close drawer to show scrolling and spotlighting!
    setSpotlightDishId(null);
    setCurrentSubtitle("");

    const normalizedKey = flowKey.replace(/[🔥🍢🍷🍰]/g, "").trim();

    const flows: Record<string, any> = {
      "Especialidad de la casa": {
        items: [
          { text: "Te recomiendo dos especialidades que salen de nuestra parrilla a leña.", type: "bridge" },
          { id: "bbq_ribs", text: "Primero, las Costillas BBQ de quinientos gramos. Es un tierno costillar de cerdo asado a fuego lento con salsa barbacoa de la casa, acompañado con papas fritas y ensalada de repollo. Cuarenta y dos mil pesos.", type: "dish" },
          { text: "Y si buscás un corte premium argentino, tenés que mirar este.", type: "bridge" },
          { id: "rib_eye", text: "El Ojo de Bife de cuatrocientos gramos, grillado a la leña a la perfección, acompañado con papas fritas crujientes. Cincuenta y seis mil setecientos pesos.", type: "dish" },
          { text: "¿Con cuál te tienta empezar?", type: "bridge" }
        ],
        chips: ["Costillas BBQ 500gr", "Ojo de Bife 400gr", "¿Algo para tomar?", "Más opciones"]
      },
      "¿Qué hay para picar?": {
        items: [
          { text: "Para arrancar la mesa, estas son las opciones que más salen.", type: "bridge" },
          { id: "spinach_dip", text: "El Dip de Espinaca y Queso. Es una salsa blanca súper cremosa con queso gratinado, acompañado con tortilla chips, salsa picante y queso crema para dipear. Veintisiete mil trescientos pesos.", type: "dish" },
          { text: "Y otra entrada riquísima y crujiente para compartir son estos rolls.", type: "bridge" },
          { id: "kansas_rolls", text: "Los Arrolladitos de Pollo y Verduras. Arrolladitos crocantes de pollo y vegetales, bien condimentados, servidos con salsa picante y queso. Veintiocho mil ochocientos pesos.", type: "dish" },
          { text: "¿Te sumo alguno de entrada?", type: "bridge" }
        ],
        chips: ["Dip de Espinaca", "Arrolladitos de Pollo", "Mini Nachos", "Más opciones"]
      },
      "Recomendame un vino": {
        items: [
          { text: "Para acompañar tus carnes o pastas, tengo dos recomendaciones excelentes.", type: "bridge" },
          { id: "baron_b", text: "El Baron Bé Cuvée Spéciale. Un espumante espectacular con notas frutadas, ideal para celebrar. Copa a ocho mil doscientos pesos, o la botella a cincuenta y ocho mil ochocientos.", type: "dish" },
          { text: "Y si preferís un vino blanco fresco y ligero, mirá este.", type: "bridge" },
          { id: "santa_julia_sauv", text: "El Santa Julia Sauvignon Blanc. Copa a ocho mil pesos o la botella a veintitrés mil cien pesos.", type: "dish" },
          { text: "¿Querés que veamos otras bebidas con o sin alcohol?", type: "bridge" }
        ],
        chips: ["Baron B", "Santa Julia Blanco", "Con alcohol", "Sin alcohol"]
      },
      "¿Qué postre va bien?": {
        items: [
          { text: "¡Llegó la mejor parte! Te recomiendo dos clásicos de La Escaloneta.", type: "bridge" },
          { id: "kansas_cheesecake", text: "El Cheesecake de la casa. Un cheesecake clásico estilo New York, súper cremoso con base crujiente, crema batida, chocolate blanco y salsa de frambuesas. Veinticuatro mil pesos.", type: "dish" },
          { text: "Y si querés algo bien goloso con mucho dulce de leche argentino, tenés este.", type: "bridge" },
          { id: "going_bananas", text: "El Banana Split. Torta tibia de banana con cobertura de crema de avellanas, bañado en salsa de dulce de leche y helado de vainilla. Veintitrés mil quinientos pesos.", type: "dish" },
          { text: "¿Con cuál cerramos?", type: "bridge" }
        ],
        chips: ["Cheesecake", "Banana Split", "Sundae de Chocolate", "Así está bien"]
      }
    };

    const flow = flows[normalizedKey];
    if (!flow) {
      // Fallback: send text to LLM directly if no guided flow matches
      await handleSendMessage(flowKey, !isVoiceMuted);
      return;
    }

    // Set history & dialog state
    setChatHistory((prev) => [...prev, { role: "user", text: flowKey }]);
    
    // Accumulate the texts into a single waitress response bubble
    const fullText = flow.items.map((it: any) => it.text).join(" ");
    setChatHistory((prev) => [...prev, { role: "model", text: fullText }]);

    // Play flow blocks in series
    for (const step of flow.items) {
      if (step.type === "dish") {
        setSpotlightDishId(step.id);
        const catId = findCategoryByDishId(step.id);
        if (catId) {
          setActiveTab(catId);
        }
        const el = document.getElementById(`dish-${step.id}`);
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
          // Settle delay to let the screen smooth scroll finish beautifully
          await new Promise((resolve) => setTimeout(resolve, 400));
        }
      } else {
        setSpotlightDishId(null);
      }

      setCurrentSubtitle(step.text);

      await new Promise<void>((resolve) => {
        const playChunk = async () => {
          try {
            const response = await fetch("/tts", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ text: step.text }),
            });
            if (response.ok) {
              const contentType = response.headers.get("content-type") || "";
              if (contentType.includes("application/json")) {
                const json = await response.json();
                if (json.useBrowserTTS) {
                  const utterance = new SpeechSynthesisUtterance(json.text);
                  utterance.lang = "es-AR";
                  utterance.rate = 1.05;
                  utterance.onend = () => resolve();
                  utterance.onerror = () => resolve();
                  window.speechSynthesis.speak(utterance);
                  return;
                }
              }

              const blob = await response.blob();
              const url = URL.createObjectURL(blob);
              const audio = new Audio(url);
              audioRef.current = audio;
              audio.onended = () => resolve();
              audio.onerror = () => resolve();
              await audio.play();
            } else {
              resolve();
            }
          } catch {
            resolve();
          }
        };
        playChunk();
      });
    }

    setSpotlightDishId(null);
    setCurrentSubtitle("");
    setWaitressState("idle");
    setChips(flow.chips);
  };

  // Send message to Gemini Server-Side Chat Stream
  const handleSendMessage = async (text: string, withVoice: boolean) => {
    try {
      setWaitressState("thinking");
      
      setSpotlightDishId(null);
      setCurrentSubtitle("");

      // Append user text
      setChatHistory((prev) => [...prev, { role: "user", text }]);

      const response = await fetch("/chat/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          history: chatHistory.map((h) => ({ role: h.role, text: h.text })),
          cart: cart.map((c) => ({ name: c.name, qty: c.qty })),
        }),
      });

      if (!response.ok) {
        throw new Error("Chat call failed");
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let fullReply = "";
      let visibleText = "";

      if (!reader) throw new Error("No readable stream");

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const blocks = chunk.split("\n\n");

        for (const block of blocks) {
          if (!block.trim() || !block.startsWith("data:")) continue;
          const dataStr = block.slice(5).trim();
          try {
            const dataObj = JSON.parse(dataStr);
            const piece = dataObj.text || "";
            if (piece) {
              fullReply += piece;
              
              // Filter out order/chips commands from visible text
              visibleText = fullReply
                .replace(/#PEDIDO#[\s\S]*$/, "")
                .replace(/#CHIPS#[\s\S]*$/, "")
                .replace(/#CUENTA#[\s\S]*$/, "")
                .replace(/#NOTA#[\s\S]*$/, "")
                .trim();
              
              // Set subtitles as the text streams in
              setCurrentSubtitle(visibleText);
            }
          } catch {
            // ignore partial json fails
          }
        }
      }

      // Add model's response to history
      setChatHistory((prev) => [...prev, { role: "model", text: visibleText }]);

      // Parse technical instructions
      parseTechnicalDirectives(fullReply);

      // Play vocal response if enabled
      if (withVoice && visibleText) {
        await playSpeechResponse(visibleText);
      } else {
        setWaitressState("idle");
        // Safe clear for subtitle & spotlight when muted so it doesn't linger forever
        setTimeout(() => {
          setCurrentSubtitle("");
          setSpotlightDishId(null);
        }, 8000);
      }
    } catch (error) {
      console.error("Chat error:", error);
      setWaitressState("idle");
      setChatHistory((prev) => [
        ...prev,
        { role: "model", text: "Perdoná, estoy con mucha gente en este momento y no llego a responderte bien. ¿Me lo repetís, dale?" },
      ]);
    }
  };

  // Parse custom directives returned by Gemini: #PEDIDO# / #CHIPS# / #CUENTA#
  const parseTechnicalDirectives = (raw: string) => {
    // 1. Order Directives: #PEDIDO# {...}
    const orderMatch = raw.match(/#PEDIDO#\s*(\{[\s\S]*?\})/);
    if (orderMatch) {
      try {
        const orderObj = JSON.parse(orderMatch[1]);
        if (orderObj.clear) {
          setCart([]);
        }

        // Apply removals
        if (orderObj.remove && Array.isArray(orderObj.remove)) {
          for (const item of orderObj.remove) {
            setCart((prev) => prev.filter((x) => x.name.toLowerCase() !== item.name.toLowerCase()));
          }
        }

        // Apply additions
        if (orderObj.add && Array.isArray(orderObj.add)) {
          for (const addItem of orderObj.add) {
            // Find item in local menu JSON
            const resolvedItem = resolveMenuItemByName(addItem.name);
            if (resolvedItem) {
              const qty = addItem.qty || 1;
              const variant = addItem.variant; // 'copa' or 'botella'
              const cartId = variant ? `${resolvedItem.id}|${variant}` : resolvedItem.id;
              const finalPrice = variant === "copa" && resolvedItem.price_copa ? resolvedItem.price_copa : (variant === "botella" && resolvedItem.price_botella ? resolvedItem.price_botella : (resolvedItem.price || 0));
              const finalName = variant ? `${resolvedItem.name} (${variant === "copa" ? "Copa" : "Botella"})` : resolvedItem.name;

              setCart((prev) => {
                const existing = prev.find((x) => x.id === cartId);
                if (existing) {
                  return prev.map((x) => (x.id === cartId ? { ...x, qty: x.qty + qty } : x));
                }
                return [...prev, { id: cartId, name: finalName, price: finalPrice, qty, variant }];
              });
            }
          }
        }
      } catch (err) {
        console.error("Error parsing order directive:", err);
      }
    }

    // 2. Chips Directives: #CHIPS# [...]
    const chipsMatch = raw.match(/#CHIPS#\s*(\[[\s\S]*?\])/);
    if (chipsMatch) {
      try {
        const chipsArr = JSON.parse(chipsMatch[1]);
        if (Array.isArray(chipsArr)) {
          setChips(chipsArr.slice(0, 4));
        }
      } catch (err) {
        console.error("Error parsing chips directive:", err);
      }
    }

    // 3. Checkout Directives: #CUENTA#
    if (raw.includes("#CUENTA#")) {
      setTimeout(() => {
        
        setIsOrderOpen(true);
      }, 1500);
    }
  };

  // Lookup menu item by name in our data
  const resolveMenuItemByName = (name: string): MenuItem | null => {
    if (!menuData) return null;
    const searchName = name.toLowerCase().trim();
    
    // Check menu sections
    for (const cat of menuData.menu) {
      const match = cat.items.find((item) => item.name.toLowerCase().trim() === searchName);
      if (match) return match;
    }
    // Check drinks sections
    for (const cat of menuData.drinks) {
      const match = cat.items?.find((item) => item.name.toLowerCase().trim() === searchName);
      if (match) return match;

      if (cat.subcategories) {
        for (const sub of cat.subcategories) {
          const subMatch = sub.items.find((item) => item.name.toLowerCase().trim() === searchName);
          if (subMatch) return subMatch;
        }
      }
    }
    return null;
  };

  // Lookup menu category by dish ID
  const findCategoryByDishId = (dishId: string): string | null => {
    if (!menuData) return null;
    for (const cat of menuData.menu) {
      if (cat.items.some((item) => item.id === dishId)) {
        return cat.id;
      }
    }
    for (const cat of menuData.drinks) {
      if (cat.items?.some((item) => item.id === dishId)) {
        return cat.id;
      }
      if (cat.subcategories) {
        for (const sub of cat.subcategories) {
          if (sub.items.some((item) => item.id === dishId)) {
            return sub.id;
          }
        }
      }
    }
    return null;
  };

  // Perform a robust substring and fuzzy mapping check to resolve chip names to specific dishes
  const findMenuItemByString = (text: string): { item: MenuItem; categoryId: string } | null => {
    if (!menuData) return null;
    const cleanText = text.toLowerCase().trim();
    
    const keyMappings: Record<string, string> = {
      "costillas bbq 500gr": "bbq_ribs",
      "costillas bbq": "bbq_ribs",
      "ojo de bife 400gr": "rib_eye",
      "ojo de bife": "rib_eye",
      "dip de espinaca": "spinach_dip",
      "arrolladitos de pollo": "kansas_rolls",
      "baron b": "baron_b",
      "santa julia blanco": "santa_julia_sauv",
      "cheesecake": "kansas_cheesecake",
      "banana split": "going_bananas"
    };

    const mappedId = keyMappings[cleanText];
    if (mappedId) {
      for (const cat of menuData.menu) {
        const found = cat.items.find(i => i.id === mappedId);
        if (found) return { item: found, categoryId: cat.id };
      }
      for (const cat of menuData.drinks) {
        const found = cat.items?.find(i => i.id === mappedId);
        if (found) return { item: found, categoryId: cat.id };
        if (cat.subcategories) {
          for (const sub of cat.subcategories) {
            const foundSub = sub.items.find(i => i.id === mappedId);
            if (foundSub) return { item: foundSub, categoryId: sub.id };
          }
        }
      }
    }

    // Try substring matching
    for (const cat of menuData.menu) {
      for (const item of cat.items) {
        const itemName = item.name.toLowerCase();
        if (cleanText.includes(itemName) || itemName.includes(cleanText)) {
          return { item, categoryId: cat.id };
        }
      }
    }
    
    for (const cat of menuData.drinks) {
      if (cat.items) {
        for (const item of cat.items) {
          const itemName = item.name.toLowerCase();
          if (cleanText.includes(itemName) || itemName.includes(cleanText)) {
            return { item, categoryId: cat.id };
          }
        }
      }
      if (cat.subcategories) {
        for (const sub of cat.subcategories) {
          for (const item of sub.items) {
            const itemName = item.name.toLowerCase();
            if (cleanText.includes(itemName) || itemName.includes(cleanText)) {
              return { item, categoryId: sub.id };
            }
          }
        }
      }
    }

    return null;
  };

  const handleChipClick = (chip: string) => {
    setCurrentSubtitle("");
    const promptContext = `El usuario acaba de seleccionar la opción: "${chip}". Háblale sobre esto, recomienda algún plato si aplica, y sé entusiasta.`;
    
    if (!isConnected) {
      setWaitressState("listening");
      connect(
        "Eres Sol, una mesera virtual argentina del restaurante La Escaloneta. Sos cálida, entusiasta y experta en el menú. Respondé siempre en español argentino. Cuando el usuario te pregunte algo, respondé con voz natural y recomendá platos.",
        promptContext
      );
    } else {
      setWaitressState("thinking");
      sendTextMessage(promptContext);
      // Safe fallback: reset thinking state if no audio response plays after 5 seconds
      setTimeout(() => {
        setWaitressState((prev) => (prev === "thinking" ? "idle" : prev));
      }, 5000);
    }

    // Scroll al plato si coincide
    const matched = findMenuItemByString(chip);
    if (matched) {
      setSpotlightDishId(matched.item.id);
      setActiveTab(matched.categoryId);
      setTimeout(() => {
        const el = document.getElementById(`dish-${matched.item.id}`);
        if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 150);
    }
  };

  const handleOrbMouseMove = (e: React.MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    setOrbTilt({ x: x * 35, y: -y * 35 });
  };

  const handleOrbMouseLeave = () => {
    setOrbTilt({ x: 0, y: 0 });
  };

  // Handle final Order Checkout from OrderSheet
  const handleCheckoutOrder = async () => {
    setIsOrderOpen(false);
    
    // Play a delightful thank you speech from Sol
    await playSpeechResponse("¡Listo! Tu pedido fue enviado directo a la cocina. Muchas gracias de mi parte y del equipo de La Escaloneta.");
    
    // Trigger rating modal
    setIsRatingOpen(true);
  };

  const handleRatingSubmit = (ratings: any) => {
    // Send feedback data to backend endpoint
    fetch("/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(ratings),
    }).catch(console.error);

    // Empty cart and reset variables
    setCart([]);
    setChatHistory([]);
    setChips([
      "🔥 Especialidad de la casa",
      "🍢 ¿Qué hay para picar?",
      "🍷 Recomendame un vino",
      "🍰 ¿Qué postre va bien?"
    ]);
  };

  // Category navigation scroll trigger
  const handleScrollToSection = (secId: string) => {
    setIsCategoriesMenuOpen(false);
    setActiveTab(secId);
    const element = document.getElementById(secId);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  if (loading || !menuData) {
    return (
      <div className="min-h-screen bg-[#0E0A07] flex flex-col items-center justify-center text-gold">
        <div className="relative w-16 h-16 mb-4">
          <div className="absolute inset-0 rounded-full border-4 border-gold/15" />
          <div className="absolute inset-0 rounded-full border-4 border-gold border-t-transparent animate-spin" />
        </div>
        <p className="font-serif italic font-medium tracking-wide">Despertando cocina...</p>
      </div>
    );
  }

  const allSections = [
    ...menuData.menu,
    ...menuData.drinks.map((cat) => {
      if (cat.subcategories) {
        return cat.subcategories.map((sub) => ({
          ...sub,
          parentName: cat.name,
        }));
      }
      return [cat];
    }).flat(),
  ];

  return (
    <div className="min-h-screen bg-[#0E0A07] text-[#F4ECD8] selection:bg-accent selection:text-[#F4ECD8] relative overflow-x-hidden">
      
      {/* ========================================================
          SPLASH LAUNCH SCREEN (Touch gesture unlock)
          ======================================================== */}
      <AnimatePresence>
        {splashVisible && (
          <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            transition={{ duration: 0.6 }}
            className="fixed inset-0 bg-[#0E0A07] z-90 flex flex-col items-center justify-between text-center px-6 py-12 select-none"
          >
            {/* Soft Ambient Lights */}
            <div className="absolute inset-0 bg-radial-gradient(ellipse 80% 60% at 50% 30%, rgba(255,140,63,0.06), transparent 60%), radial-gradient(ellipse 60% 50% at 50% 90%, rgba(139,28,43,0.10), transparent 60%) pointer-events-none" />

            <div className="flex-grow flex flex-col items-center justify-center">
              <motion.h1 
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="font-serif font-light text-5xl sm:text-7xl leading-none text-[#F4ECD8] tracking-tight mb-2 drop-shadow-lg"
              >
                {menuData.restaurant.name}
              </motion.h1>

              {/* Gold Divider */}
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: 100 }}
                transition={{ delay: 0.4 }}
                className="h-[1.5px] bg-gold opacity-60 mb-4"
              />

              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.8 }}
                transition={{ delay: 0.6 }}
                className="font-sans font-medium text-xs tracking-[0.42em] uppercase text-gold"
              >
                Carta Viva
              </motion.span>

              {/* Big Pulsing Central Orbe */}
              <div className="relative w-40 h-40 my-10 flex items-center justify-center">
                <motion.div
                  animate={{ scale: [1, 1.05, 1] }}
                  transition={{ duration: 4.8, repeat: Infinity, ease: "easeInOut" }}
                  className="absolute inset-0 rounded-full bg-radial-gradient(circle at 50% 45%, var(--color-gold) 0%, var(--color-accent) 45%, var(--color-accent-dark) 75%, transparent 85%) opacity-60 filter blur-xs"
                />
                <motion.div
                  animate={{ scale: [1, 1.08, 1], rotate: [0, 180, 360] }}
                  transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
                  className="absolute inset-4 rounded-full border border-gold/30 border-dashed"
                />
              </div>

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleEnterApp}
                className="relative z-10 px-8 py-3.5 border border-gold/45 hover:border-gold hover:text-gold bg-black/40 rounded-full font-sans font-bold text-xs uppercase tracking-[0.22em] text-white shadow-lg backdrop-blur-md cursor-pointer transition-all duration-300"
              >
                Tocá para empezar
              </motion.button>

              <p className="mt-5 text-[#9a8e78] text-xs font-sans tracking-wide">
                Te asiste Sol, tu <strong>mesera virtual</strong>
              </p>
            </div>

            {/* Disclaimer Footer */}
            <div className="max-w-md w-full p-4 rounded-2xl border border-gold/15 bg-black/35 backdrop-blur-xs flex gap-3 text-left">
              <span className="w-5 h-5 flex-shrink-0 bg-accent text-[#F4ECD8] rounded-full flex items-center justify-center font-bold text-xs leading-none">!</span>
              <p className="text-[10px] text-[#9a8e78] leading-relaxed">
                Tu mesera virtual es una <strong>guía interactiva</strong>. Ante cualquier <strong>alergia o intolerancia médica</strong>, confirmá con el personal de mesa antes de ordenar.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ========================================================
          TOP NAVIGATION BAR
          ======================================================== */}
      <header className="fixed top-0 inset-x-0 h-16 bg-gradient-to-b from-[#181210] to-[#0e0a07] border-b border-gold/10 px-4 flex items-center justify-between z-30 shadow-md">
        {/* Categories trigger */}
        <button
          onClick={() => setIsCategoriesMenuOpen(true)}
          className="h-10 px-4 bg-accent/20 hover:bg-accent/40 border border-gold/15 hover:border-gold/30 rounded-full flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-gold cursor-pointer transition-colors"
        >
          <Menu className="w-4 h-4" />
          <span className="hidden md:inline">Menú</span>
        </button>

        {/* Brand details */}
        <div className="text-center flex flex-col items-center">
          <h2 className="font-serif font-semibold text-lg sm:text-2xl text-white leading-tight tracking-tight">
            {menuData.restaurant.name}
          </h2>
          <span className="text-[8px] sm:text-[9px] uppercase tracking-[0.4em] font-bold text-gold opacity-80 leading-none">
            Carta Viva
          </span>
        </div>

        {/* Top actions */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => {
              if (tableLocked) return;
              setIsTableModalOpen(true);
            }}
            className="flex flex-col items-center justify-center px-3 py-1 bg-black/35 border border-gold/15 rounded-xl hover:border-gold/30 cursor-pointer min-w-14"
          >
            <span className="text-[7.5px] uppercase tracking-wider font-bold text-gold/80 leading-none mb-0.5">Mesa</span>
            <span className="font-sans font-extrabold text-sm text-[#F4ECD8] leading-none">
              {table || "—"}
            </span>
          </button>

          {/* Chat with Sol trigger */}
          <button
            onClick={() => setIsWaitressOpen(true)}
            className="h-10 px-4 sm:px-5 bg-gold hover:bg-gold/90 text-[#0e0a07] rounded-full flex items-center gap-2 text-xs font-bold uppercase tracking-wider cursor-pointer shadow-md shadow-gold/10 transition-colors"
          >
            <MessageSquare className="w-4 h-4 fill-[#0e0a07]/10" />
            <span>Chat</span>
          </button>
        </div>
      </header>

      {/* ========================================================
          HORIZONTAL NAVIGATION TABS (SCROLL SPY)
          ======================================================== */}
      <nav className="fixed top-16 inset-x-0 h-12 bg-[#0E0A07] border-b border-gold/10 overflow-x-auto flex items-center gap-2 px-4 z-20 scrollbar-none">
        {allSections.map((sec) => (
          <button
            key={sec.id}
            onClick={() => handleScrollToSection(sec.id)}
            className={`px-4 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wider whitespace-nowrap cursor-pointer transition-colors ${
              activeTab === sec.id
                ? "bg-accent text-[#F4ECD8] shadow-md shadow-accent/20"
                : "text-[#9a8e78] hover:text-white hover:bg-white/5"
            }`}
          >
            {sec.name}
          </button>
        ))}
      </nav>

      {/* ========================================================
          MAIN DISHES CONTAINER
          ======================================================== */}
      <main className="pt-32 pb-32 max-w-7xl mx-auto px-4 md:px-6">
        
        {/* Intro Tagline */}
        <div className="text-center py-6 max-w-lg mx-auto">
          <p className="font-serif italic text-gold text-lg mb-1">
            "{menuData.restaurant.tagline}"
          </p>
          <div className="flex items-center justify-center gap-2 text-[10px] uppercase tracking-widest text-[#9a8e78] font-bold">
            <Clock className="w-3 h-3 text-gold" />
            <span>Abierto · Cocina a la leña · {currentTime}</span>
          </div>
        </div>

        {/* Section categories */}
        <div className="space-y-16 mt-6">
          {/* Main Menu Groups */}
          {menuData.menu.map((sec) => (
            <section key={sec.id} id={sec.id} className="scroll-mt-32">
              <div className="mb-6">
                <h2 className="font-serif font-black text-3xl sm:text-4xl text-gold leading-tight">
                  {sec.name}
                </h2>
                {/* Visual Accent Divider */}
                <div className="h-[2px] w-full max-w-xs bg-gradient-to-r from-gold via-accent to-transparent mt-1" />
                {sec.sharing_surcharge && (
                  <p className="text-xs text-[#9a8e78] italic mt-1.5 pl-3 border-l border-gold">
                    Los platos que se compartan tienen un adicional de $11.500
                  </p>
                )}
              </div>

              {/* Grid cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
                {sec.items.map((item) => {
                  const cartItem = cart.find((c) => c.id === item.id);
                  return (
                    <MenuCard
                      key={item.id}
                      item={item}
                      categoryId={sec.id}
                      qty={cartItem ? cartItem.qty : 0}
                      onAdd={() => handleAddToCart(item)}
                      onDecrease={() => handleDecreaseQty(item.id)}
                      onIncrease={() => handleIncreaseQty(item.id)}
                      isSpotlight={spotlightDishId === item.id}
                    />
                  );
                })}
              </div>
            </section>
          ))}

          {/* Drinks Groups */}
          {menuData.drinks.map((cat) => {
            if (cat.subcategories) {
              return cat.subcategories.map((sub) => {
                const subId = sub.id;
                return (
                  <section key={subId} id={subId} className="scroll-mt-32">
                    <div className="mb-6">
                      <h2 className="font-serif font-black text-3xl sm:text-4xl text-gold leading-tight">
                        {sub.name} <span className="text-xs font-sans tracking-widest text-[#9a8e78] uppercase font-bold block sm:inline sm:ml-2">({cat.name})</span>
                      </h2>
                      <div className="h-[2px] w-full max-w-xs bg-gradient-to-r from-gold via-accent to-transparent mt-1" />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
                      {sub.items.map((item) => {
                        const cartItem = cart.find((c) => c.id === item.id);
                        return (
                          <MenuCard
                            key={item.id}
                            item={item}
                            categoryId={subId}
                            qty={cartItem ? cartItem.qty : 0}
                            onAdd={() => handleAddToCart(item)}
                            onDecrease={() => handleDecreaseQty(item.id)}
                            onIncrease={() => handleIncreaseQty(item.id)}
                            isSpotlight={spotlightDishId === item.id}
                          />
                        );
                      })}
                    </div>
                  </section>
                );
              });
            }

            return (
              <section key={cat.id} id={cat.id} className="scroll-mt-32">
                <div className="mb-6">
                  <h2 className="font-serif font-black text-3xl sm:text-4xl text-gold leading-tight">
                    {cat.name}
                  </h2>
                  <div className="h-[2px] w-full max-w-xs bg-gradient-to-r from-gold via-accent to-transparent mt-1" />
                  {cat.note && (
                    <p className="text-xs text-[#9a8e78] italic mt-1.5 pl-3 border-l border-gold">
                      {cat.note}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
                  {(cat.items || []).map((item) => {
                    const cartItem = cart.find((c) => c.id === item.id);
                    return (
                      <MenuCard
                        key={item.id}
                        item={item}
                        categoryId={cat.id}
                        qty={cartItem ? cartItem.qty : 0}
                        onAdd={() => handleAddToCart(item)}
                        onDecrease={() => handleDecreaseQty(item.id)}
                        onIncrease={() => handleIncreaseQty(item.id)}
                        isSpotlight={spotlightDishId === item.id}
                      />
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      </main>

      {/* ========================================================
          FLOATING PERSISTENT CONTROLS (ORBE + CHIPS SHORTCUT)
          ======================================================== */}
      {/* Visual Chips surrounding the Orbe button (bottom background) */}
      <div className="fixed bottom-6 inset-x-0 h-16 pointer-events-none flex items-center justify-between px-4 sm:px-12 z-30">
        
        {/* Left column chips */}
        <div className="flex flex-col gap-2 max-w-[150px] pointer-events-auto">
          {chips.slice(0, 2).map((chip, idx) => (
            <motion.button
              key={chip + idx}
              whileHover={{ scale: 1.05, x: 2 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleChipClick(chip)}
              className="px-3 py-1.5 bg-[#181210]/95 hover:bg-gold/10 hover:text-gold border border-gold/15 text-[#e9e0c7] text-[10.5px] font-bold rounded-xl cursor-pointer shadow-md backdrop-blur-md text-left truncate transition-all duration-150"
            >
              {chip}
            </motion.button>
          ))}
        </div>

        <VideoAvatar 
          waitressState={
            waitressState === "thinking"
              ? "thinking"
              : isConnected
              ? (isSpeaking ? "speaking" : (isMicMuted ? "idle" : "listening"))
              : waitressState
          } 
          currentSubtitle={currentSubtitle} 
          onClick={handleVoiceToggle} 
          analyserNode={analyserNode}
        />

        {/* Right column chips */}
        <div className="flex flex-col items-end gap-2 max-w-[150px] pointer-events-auto">
          {chips.slice(2, 4).map((chip, idx) => (
            <motion.button
              key={chip + idx}
              whileHover={{ scale: 1.05, x: -2 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleChipClick(chip)}
              className="px-3 py-1.5 bg-[#181210]/95 hover:bg-gold/10 hover:text-gold border border-gold/15 text-[#e9e0c7] text-[10.5px] font-bold rounded-xl cursor-pointer shadow-md backdrop-blur-md text-right truncate transition-all duration-150"
            >
              {chip}
            </motion.button>
          ))}
        </div>
      </div>

      {/* ========================================================
          FLOATING BOUNCY CHECKOUT BAR
          ======================================================== */}
      <AnimatePresence>
        {cart.length > 0 && !isOrderOpen && (
          <motion.div
            initial={{ y: 50, x: "-50%", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 50, opacity: 0 }}
            transition={{ type: "spring", damping: 20, stiffness: 250 }}
            className="fixed bottom-28 left-1/2 -translate-x-1/2 z-30 w-11/12 max-w-sm"
          >
            <button
              onClick={() => setIsOrderOpen(true)}
              className="w-full h-14 bg-gradient-to-r from-accent to-accent-dark hover:from-accent-dark hover:to-accent text-[#F4ECD8] rounded-full border border-gold/30 shadow-xl shadow-accent/30 hover:shadow-accent/45 flex items-center justify-between px-5 cursor-pointer select-none active:scale-[0.98] transition-all"
            >
              <div className="flex items-center gap-3">
                <span className="w-6 h-6 rounded-full bg-white text-accent font-black text-xs flex items-center justify-center shadow-md">
                  {cart.reduce((sum, item) => sum + item.qty, 0)}
                </span>
                <span className="text-xs font-bold uppercase tracking-wider">Ver mi pedido</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="font-serif font-black text-sm text-gold">
                  ${cart.reduce((sum, item) => sum + item.price * item.qty, 0).toLocaleString("es-AR")}
                </span>
                <ChevronRight className="w-4 h-4 text-gold" />
              </div>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ========================================================
          INDEX OF CATEGORIES (☰ Menú OVERLAY)
          ======================================================== */}
      <AnimatePresence>
        {isCategoriesMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCategoriesMenuOpen(false)}
              className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 cursor-pointer"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="fixed inset-x-6 top-20 max-h-[70vh] bg-gradient-to-b from-[#1b1411] to-[#0e0a07] border border-gold/25 rounded-2xl p-4 overflow-y-auto z-50 shadow-2xl max-w-md mx-auto"
            >
              <div className="flex items-center justify-between pb-3 border-b border-gold/10 mb-3">
                <span className="font-serif font-bold text-lg text-gold">Categorías</span>
                <button
                  onClick={() => setIsCategoriesMenuOpen(false)}
                  className="p-1 rounded-full bg-white/5 hover:bg-white/10 text-white"
                >
                  ✕
                </button>
              </div>

              <div className="flex flex-col gap-1">
                {/* Comida title */}
                <span className="text-[10px] font-bold text-gold/60 uppercase tracking-widest px-3 py-1 mt-2">
                  🍽 Comida
                </span>
                {menuData.menu.map((sec) => (
                  <button
                    key={sec.id}
                    onClick={() => handleScrollToSection(sec.id)}
                    className="w-full text-left px-4 py-2.5 rounded-xl hover:bg-white/5 text-[#F4ECD8] font-serif text-base transition-colors"
                  >
                    {sec.name}
                  </button>
                ))}

                {/* Bebidas title */}
                <span className="text-[10px] font-bold text-gold/60 uppercase tracking-widest px-3 py-1 mt-4">
                  🍷 Bebidas
                </span>
                {menuData.drinks.map((cat) => {
                  if (cat.subcategories) {
                    return cat.subcategories.map((sub) => (
                      <button
                        key={sub.id}
                        onClick={() => handleScrollToSection(sub.id)}
                        className="w-full text-left px-4 py-2.5 rounded-xl hover:bg-white/5 text-[#F4ECD8] font-serif text-base transition-colors pl-6"
                      >
                        {sub.name} <span className="text-xs opacity-60">({cat.name})</span>
                      </button>
                    ));
                  }
                  return (
                    <button
                      key={cat.id}
                      onClick={() => handleScrollToSection(cat.id)}
                      className="w-full text-left px-4 py-2.5 rounded-xl hover:bg-white/5 text-[#F4ECD8] font-serif text-base transition-colors"
                    >
                      {cat.name}
                    </button>
                  );
                })}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ========================================================
          MANUAL TABLE SELECTION DIALOG (FALLBACK MODAL)
          ======================================================== */}
      <AnimatePresence>
        {isTableModalOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsTableModalOpen(false)}
              className="fixed inset-0 bg-black/75 backdrop-blur-xs z-50 flex items-center justify-center p-4 cursor-pointer"
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0, y: 10 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 10 }}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-xs bg-gradient-to-b from-[#201712] to-[#14100d] border border-gold/25 rounded-2xl p-5 text-center shadow-2xl"
              >
                <h3 className="font-serif font-black text-xl text-white mb-1">
                  ¿En qué mesa estás?
                </h3>
                <p className="font-sans text-[11px] text-[#9a8e78] mb-4 leading-relaxed">
                  Lo encontrás impreso arriba del código QR en tu mesa física.
                </p>

                <div className="flex flex-col gap-4">
                  <input
                    type="number"
                    pattern="[0-9]*"
                    inputMode="numeric"
                    placeholder="Número de mesa"
                    value={table}
                    onChange={(e) => setTable(e.target.value.replace(/\D/g, "").slice(0, 4))}
                    className="w-full h-12 text-center bg-black/45 border border-gold/25 rounded-xl text-lg font-bold text-white placeholder-gold/20 focus:border-gold outline-none"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => setIsTableModalOpen(false)}
                      className="flex-1 h-11 border border-[#9a8e78]/30 hover:bg-white/5 text-[#9a8e78] text-xs font-bold uppercase rounded-xl cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={() => setIsTableModalOpen(false)}
                      className="flex-1 h-11 bg-gold hover:bg-gold/90 text-[#0e0a07] text-xs font-bold uppercase rounded-xl cursor-pointer"
                    >
                      Guardar
                    </button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ========================================================
          REAL-TIME CHAT/GUIDE SUBTITLES (CLOSED DRAWER PEEK)
          ======================================================== */}
      <AnimatePresence>
        {currentSubtitle && (
          <motion.div
            initial={{ opacity: 0, y: 15, x: "-50%" }}
            animate={{ opacity: 1, y: 0, x: "-50%" }}
            exit={{ opacity: 0, y: 15, x: "-50%" }}
            transition={{ type: "spring", damping: 25, stiffness: 220 }}
            className={`fixed left-1/2 -translate-x-1/2 z-40 w-11/12 max-w-md bg-[#181210]/95 border border-gold/30 rounded-2xl p-4 shadow-xl backdrop-blur-md flex gap-3 items-start transition-all duration-300 ${
              cart.length > 0 ? "bottom-44 sm:bottom-48" : "bottom-32 sm:bottom-36"
            }`}
          >
            {/* Miniature Sol Avatar */}
            <div className="w-8 h-8 rounded-full bg-radial-gradient(circle at 50% 45%, var(--color-gold) 0%, var(--color-accent) 70%) flex items-center justify-center font-serif font-black text-[10px] text-white shadow-inner flex-shrink-0 mt-0.5">
              SOL
            </div>
            <div className="flex-grow">
              <div className="flex items-center justify-between mb-1">
                <span className="font-serif font-bold italic text-xs text-gold uppercase tracking-wider">Sol está hablando...</span>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => setIsWaitressOpen(true)}
                    className="px-2 py-0.5 bg-gold/15 text-gold hover:bg-gold hover:text-[#0e0a07] rounded text-[9px] font-bold uppercase tracking-wider transition-all cursor-pointer"
                  >
                    Ver Chat
                  </button>
                  <button 
                    onClick={() => setCurrentSubtitle("")} 
                    className="text-gold/50 hover:text-gold text-xs px-1 cursor-pointer"
                  >
                    ✕
                  </button>
                </div>
              </div>
              <p className="font-sans text-xs text-[#F4ECD8] leading-relaxed">
                {currentSubtitle}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>


      {/* ========================================================
          SHOPPING CART CHECKOUT DRAWER
          ======================================================== */}
      <OrderSheet
        isOpen={isOrderOpen}
        onClose={() => setIsOrderOpen(false)}
        cart={cart}
        onDecrease={handleDecreaseQty}
        onIncrease={handleIncreaseQty}
        onRemove={handleRemoveFromCart}
        table={table}
        setTable={setTable}
        tableLocked={tableLocked}
        onSendOrder={handleCheckoutOrder}
      />

      {/* ========================================================
          FEEDBACK AND RATING MODAL (POST CHECKOUT)
          ======================================================== */}
      <RatingModal
        isOpen={isRatingOpen}
        onClose={() => setIsRatingOpen(false)}
        onSubmit={handleRatingSubmit}
      />
    </div>
  );
}
