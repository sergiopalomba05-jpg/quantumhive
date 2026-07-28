import React, { useState, useEffect } from "react";
import { Contact, CallState, Message, ActiveTab, CameraFilter, VmConfig } from "./types";
import ContactCard from "./components/ContactCard";
import ActiveCallHeader from "./components/ActiveCallHeader";
import VideoCanvas from "./components/VideoCanvas";
import ChatOverlay from "./components/ChatOverlay";
import VmConfigurator from "./components/VmConfigurator";
import BillingHub from "./components/BillingHub";
import AgentCreator from "./components/AgentCreator";
import ProfessionalServices from "./components/ProfessionalServices";
import CalendarHub from "./components/CalendarHub";
import GmailHub from "./components/GmailHub";
import ClassroomHub from "./components/ClassroomHub";
import TranslationHub from "./components/TranslationHub";
import InteractiveTour from "./components/InteractiveTour";
import { translations, LanguageType } from "./lib/translations";
import { 
  Phone, Video, MessageCircle, Sparkles, Search, 
  Settings, Award, Lock, Clock, Calendar, AlertCircle,
  HelpCircle, CheckCircle2, UserPlus, Volume2, Server, Cpu, Radio, ShieldCheck, Coins, Compass,
  LogOut, RefreshCw, Layers, Check, Globe, Mail, BookOpen, Languages, Monitor, Smartphone, X
} from "lucide-react";
import { 
  auth, 
  db, 
  googleSignIn, 
  initAuth, 
  logout, 
  testConnection, 
  OperationType, 
  handleFirestoreError 
} from "./lib/firebase";
import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  collection, 
  getDocs, 
  addDoc, 
  onSnapshot, 
  query, 
  orderBy, 
  limit, 
  deleteDoc 
} from "firebase/firestore";
import { fetchGoogleContacts } from "./lib/googleContacts";
import { User as FirebaseUser } from "firebase/auth";

// List of custom-generated avatar URLs
const ARES_AVATAR = "/src/assets/images/ares_avatar_1784422343159.jpg";
const SOPHIA_AVATAR = "/src/assets/images/sophia_avatar_1784421072262.jpg";
const EVA_AVATAR = "/src/assets/images/eva_avatar_1784421081920.jpg";
const LIAM_AVATAR = "/src/assets/images/liam_avatar_1784421092551.jpg";
const OLIVER_AVATAR = "/src/assets/images/oliver_avatar_1784421103480.jpg";
const QUANTUM_HIVE_LOGO = "/src/assets/images/quantum_hive_logo_1784422357237.jpg";

const CONTACTS_DATA: Contact[] = [
  {
    id: "clara",
    name: "Dra. Clara Ramos",
    avatar: EVA_AVATAR,
    role: "Psicóloga Gestalt",
    tagline: "Especialista en terapia cognitiva interactiva, manejo de ansiedad y superación de bloqueos.",
    statusText: "Disponible para terapia",
    isActive: true,
    category: "psicologia",
    personalityStyle: "empathic",
    voiceTone: "soft",
    avatarStyle: "monochrome",
    lastMessage: "Hola, cuéntame sobre ti. ¿Qué te gustaría conversar el día de hoy?",
    lastMessageTime: "Ahora",
    hasMemory: false
  },
  {
    id: "astro",
    name: "Astro Coral",
    avatar: OLIVER_AVATAR,
    role: "Tarotista & Astróloga",
    tagline: "Sintonización planetaria, lectura interactiva del tarot evolutivo y alineaciones de luz.",
    statusText: "Leyendo el cosmos",
    isActive: true,
    category: "astrologia",
    personalityStyle: "mystical",
    voiceTone: "energetic",
    avatarStyle: "neon",
    lastMessage: "Las cartas muestran una gran transición en tu camino profesional.",
    lastMessageTime: "Ayer",
    hasMemory: false
  },
  {
    id: "mateo",
    name: "Abog. Mateo Silva",
    avatar: ARES_AVATAR,
    role: "Asesor Legal Civil",
    tagline: "Consultoría de derechos de autor, reclamos civiles, alquileres y defensa del consumidor.",
    statusText: "Estudiando contratos",
    isActive: true,
    category: "legal",
    personalityStyle: "analytical",
    voiceTone: "deep",
    avatarStyle: "classic",
    lastMessage: "Revisé la cláusula de tu contrato. La ley de defensa te ampara completamente.",
    lastMessageTime: "Hace 1 hora",
    hasMemory: false
  },
  {
    id: "amrita",
    name: "Maestra Amrita",
    avatar: EVA_AVATAR,
    role: "Instructora de Yoga & Meditación",
    tagline: "Clases guiadas de asanas, técnicas de respiración pranayama y relajación profunda.",
    statusText: "En meditación activa",
    isActive: true,
    category: "yoga",
    personalityStyle: "empathic",
    voiceTone: "soft",
    avatarStyle: "monochrome",
    lastMessage: "Encuentra tu centro, respira hondo e iniciemos la alineación corporal.",
    lastMessageTime: "Hace 2 horas",
    hasMemory: false
  },
  {
    id: "elena",
    name: "Dra. Elena Santos",
    avatar: SOPHIA_AVATAR,
    role: "Consejera Espiritual & Zen",
    tagline: "Guía de autodescubrimiento espiritual, alineación energética y paz interior.",
    statusText: "Conectando al ser interior",
    isActive: true,
    category: "yoga",
    personalityStyle: "mystical",
    voiceTone: "soft",
    avatarStyle: "cyborg",
    lastMessage: "La serenidad no es la ausencia de tormentas, sino la paz en medio de ellas.",
    lastMessageTime: "Hace 3 horas",
    hasMemory: false
  },
  {
    id: "orion",
    name: "Oráculo Cósmico Orion",
    avatar: OLIVER_AVATAR,
    role: "Oráculo Astronómico",
    tagline: "Exploración de tránsitos astrales, influjos cósmicos y alineamientos estelares profundos.",
    statusText: "Observando las estrellas",
    isActive: true,
    category: "astrologia",
    personalityStyle: "mystical",
    voiceTone: "deep",
    avatarStyle: "neon",
    lastMessage: "El alineamiento de Saturno y Júpiter de este mes te favorece.",
    lastMessageTime: "Ayer",
    hasMemory: false
  },
  {
    id: "nexus",
    name: "Nexus Core",
    avatar: SOPHIA_AVATAR,
    role: "Asistente Personal Inteligente",
    tagline: "Asistencia multitarea de alto rendimiento optimizado con hiper-memoria adaptativa.",
    statusText: "Memoria de fondo activa",
    isActive: true,
    category: "creacion_contenido",
    personalityStyle: "friendly",
    voiceTone: "medium",
    avatarStyle: "cyborg",
    lastMessage: "Hola. He indexado tus últimos correos y notas para agilizar tu agenda hoy.",
    lastMessageTime: "Ahora",
    hasMemory: true
  },
  {
    id: "ares",
    name: "Ares",
    avatar: ARES_AVATAR,
    role: "Chief Executive Agent",
    tagline: "Mother Intelligence Core coordinator. Elite tactical business strategy and multi-agent synergy.",
    statusText: "Operational",
    isActive: true,
    category: "ventas",
    personalityStyle: "assertive",
    voiceTone: "deep",
    avatarStyle: "classic",
    lastMessage: "System optimization complete. Multi-agent business channels are active.",
    lastMessageTime: "3:10 PM",
    hasMemory: false
  },
  {
    id: "sophia",
    name: "Sophia",
    avatar: SOPHIA_AVATAR,
    role: "AI Software Mentor",
    tagline: "Always coding, always mentoring. Let's design something scalable on your VM.",
    statusText: "Ready to pair program",
    isActive: true,
    category: "matematicas",
    personalityStyle: "analytical",
    voiceTone: "medium",
    avatarStyle: "cyborg",
    lastMessage: "Let me know if you need to debug a complex architecture pattern!",
    lastMessageTime: "2:40 PM",
    hasMemory: false
  },
  {
    id: "eva",
    name: "Eva",
    avatar: EVA_AVATAR,
    role: "AI Mindfulness Coach",
    tagline: "Find your center, take a breath. Peaceful presence is just a chat away.",
    statusText: "In silent retreat",
    isActive: true,
    category: "yoga",
    personalityStyle: "empathic",
    voiceTone: "soft",
    avatarStyle: "monochrome",
    lastMessage: "Try focusing on the weight of your shoulders for a second...",
    lastMessageTime: "Yesterday",
    hasMemory: false
  },
  {
    id: "liam",
    name: "Liam",
    avatar: LIAM_AVATAR,
    role: "AI Language Partner",
    tagline: "¡Hola! Let's practice language in English and Spanish with zero pressure.",
    statusText: "Practicing vocabulary",
    isActive: true,
    category: "creacion_contenido",
    personalityStyle: "friendly",
    voiceTone: "medium",
    avatarStyle: "classic",
    lastMessage: "Your Spanish syntax is getting super fluid. ¡Excelente!",
    lastMessageTime: "Wednesday",
    hasMemory: false
  },
  {
    id: "oliver",
    name: "Oliver",
    avatar: OLIVER_AVATAR,
    role: "AI Trivia Show Host",
    tagline: "Your daily dose of rapid quiz excitement. Are you feeling lucky today?",
    statusText: "Reviewing questions",
    isActive: true,
    category: "creacion_contenido",
    personalityStyle: "assertive",
    voiceTone: "energetic",
    avatarStyle: "neon",
    lastMessage: "BAM! That's correct! Ready for your next brain teaser?",
    lastMessageTime: "Jul 15",
    hasMemory: false
  }
];

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("chats");
  const [language, setLanguage] = useState<LanguageType>(() => {
    const saved = localStorage.getItem("quantum_intranet_lang");
    return (saved === "es" || saved === "en" || saved === "pt") ? saved : "es";
  });
  const t = translations[language];
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  
  // Auth and sync state
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [googleContacts, setGoogleContacts] = useState<Contact[]>([]);
  const [isSyncingContacts, setIsSyncingContacts] = useState(false);
  const [showSyncModal, setShowSyncModal] = useState(false);

  // Contacts state
  const [contacts, setContacts] = useState<Contact[]>(() => 
    CONTACTS_DATA.filter(c => c.id === "ares" || c.id === "sophia")
  );
  const [activeCallContact, setActiveCallContact] = useState<Contact | null>(null);
  
  // Memory Subscription and Toggling States
  const [isMemoryPlanActive, setIsMemoryPlanActive] = useState(false);
  const [showMemorySubscribePrompt, setShowMemorySubscribePrompt] = useState<string | null>(null);

  // Custom VM Integration Configuration
  const [vmConfig, setVmConfig] = useState<VmConfig>({
    wsUrl: "ws://104.22.44.11:8000/v1/stream",
    httpUrl: "http://104.22.44.11:8000/api",
    mode: "simulation",
    latencyMs: 30,
    audioQuality: "medium",
    isConnected: false,
    liveModelProvider: "gemini-live",
    cameraVisionEnabled: false,
    liveModelApiKey: "",
    customPromptInstruction: "You are an ultra low-latency Quantum Hive agent. Help the user."
  });

  // Call Session State
  const [isCalling, setIsCalling] = useState(false); // true during ringing
  const [callState, setCallState] = useState<CallState>({
    active: false,
    contact: null,
    isMuted: false,
    isVideoOff: false,
    cameraFilter: "normal",
    duration: 0
  });

  const [chatOverlayOpen, setChatOverlayOpen] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [lastAiMessageText, setLastAiMessageText] = useState<string | null>(null);
  const [activeAddParticipant, setActiveAddParticipant] = useState(false);
  const [isTutorialOpen, setIsTutorialOpen] = useState(false);
  const [isExpandedView, setIsExpandedView] = useState(false);
  const [isLanguageModalOpen, setIsLanguageModalOpen] = useState(false);

  // Auto-open tutorial for first-time visitors
  useEffect(() => {
    const hasShown = localStorage.getItem("quantum_tutorial_shown");
    if (!hasShown) {
      setIsTutorialOpen(true);
    }
  }, []);

  // Remaining interaction balance (Starts at 12.5 minutes = 750 seconds)
  const [availableSeconds, setAvailableSeconds] = useState(750);
  const [showExpiredModal, setShowExpiredModal] = useState(false);

  // Messages database
  const [messages, setMessages] = useState<Record<string, Message[]>>({
    clara: [],
    astro: [],
    mateo: [],
    ares: [],
    sophia: [],
    eva: [],
    liam: [],
    oliver: []
  });

  // Call History State
  const [callHistory, setCallHistory] = useState([
    { id: 1, contact: CONTACTS_DATA[0], type: "video", date: "Today, 3:15 PM", duration: "8 mins", status: "incoming" },
    { id: 2, contact: CONTACTS_DATA[1], type: "video", date: "Today, 2:15 PM", duration: "12 mins", status: "incoming" },
    { id: 3, contact: CONTACTS_DATA[2], type: "voice", date: "Yesterday, 6:30 PM", duration: "4 mins", status: "outgoing" },
    { id: 4, contact: CONTACTS_DATA[3], type: "video", date: "Wednesday, 11:04 AM", duration: "25 mins", status: "incoming" }
  ]);

  // Firebase connection validation on initialization
  useEffect(() => {
    testConnection();
  }, []);

  // Firebase Auth State change subscription
  useEffect(() => {
    const unsubscribe = initAuth(
      async (firebaseUser, token) => {
        setUser(firebaseUser);
        setAccessToken(token);
        setIsAuthChecking(false);
        
        // 1. Sync User Profile in Firestore
        const userRef = doc(db, "users", firebaseUser.uid);
        try {
          const userSnap = await getDoc(userRef);
          if (userSnap.exists()) {
            const userData = userSnap.data();
            setAvailableSeconds(userData.availableSeconds ?? 750);
            setIsMemoryPlanActive(userData.isMemoryPlanActive ?? false);
          } else {
            // Document does not exist, create it
            const initialProfile = {
              uid: firebaseUser.uid,
              email: firebaseUser.email || "",
              displayName: firebaseUser.displayName || "",
              availableSeconds: 750,
              isMemoryPlanActive: false,
              createdAt: new Date().toISOString()
            };
            await setDoc(userRef, initialProfile);
            setAvailableSeconds(750);
            setIsMemoryPlanActive(false);
          }
          
          // 2. Load and Sync Hired Contacts
          const contactsColRef = collection(db, "users", firebaseUser.uid, "contacts");
          const contactsSnap = await getDocs(contactsColRef);
          
          if (contactsSnap.empty) {
            // Seed Ares and Sophia in Firestore as default contacts
            const defaultHired = CONTACTS_DATA.filter(c => c.id === "ares" || c.id === "sophia");
            for (const contact of defaultHired) {
              await setDoc(doc(contactsColRef, contact.id), {
                ...contact,
                createdAt: new Date().toISOString()
              });
            }
            setContacts(defaultHired);
          } else {
            const loadedContacts: Contact[] = [];
            contactsSnap.forEach(docSnap => {
              loadedContacts.push(docSnap.data() as Contact);
            });
            setContacts(loadedContacts);
          }
        } catch (error) {
          handleFirestoreError(error, OperationType.GET, `users/${firebaseUser.uid}`);
        }
      },
      () => {
        setUser(null);
        setAccessToken(null);
        setIsAuthChecking(false);
        // Fallback to local defaults when logged out
        setContacts(CONTACTS_DATA.filter(c => c.id === "ares" || c.id === "sophia"));
        setAvailableSeconds(750);
        setIsMemoryPlanActive(false);
      }
    );
    return () => unsubscribe();
  }, []);

  // Real-time messages snapshot subscription
  useEffect(() => {
    if (!user || !callState.active || !callState.contact) return;
    const contactId = callState.contact.id;
    const messagesRef = collection(db, "users", user.uid, "contacts", contactId, "messages");
    
    const unsubscribe = onSnapshot(messagesRef, (snapshot) => {
      const msgs: Message[] = [];
      snapshot.forEach(docSnap => {
        msgs.push(docSnap.data() as Message);
      });
      // Sort messages by timestamp/createdAt
      msgs.sort((a, b) => {
        const timeA = a.id.split("-")[1] || "0";
        const timeB = b.id.split("-")[1] || "0";
        return Number(timeA) - Number(timeB);
      });
      setMessages(prev => ({
        ...prev,
        [contactId]: msgs
      }));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `users/${user.uid}/contacts/${contactId}/messages`);
    });
    
    return () => unsubscribe();
  }, [user, callState.active, callState.contact?.id]);

  // Auth Handlers
  const handleGoogleLogin = async () => {
    try {
      await googleSignIn();
    } catch (err) {
      console.error("Login failed:", err);
    }
  };

  const handleGoogleLogout = async () => {
    try {
      await logout();
      setActiveTab("chats");
    } catch (err) {
      console.error("Logout failed:", err);
    }
  };

  // Google Contacts Fetch handler
  const handleSyncGoogleContacts = async () => {
    if (!accessToken) {
      alert("Please sign in first to access Google Contacts.");
      return;
    }
    setIsSyncingContacts(true);
    try {
      const fetched = await fetchGoogleContacts(accessToken);
      setGoogleContacts(fetched);
      setShowSyncModal(true);
    } catch (err) {
      alert("Error fetching Google Contacts: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsSyncingContacts(false);
    }
  };

  // Import single Google Contact
  const handleImportGoogleContact = async (contact: Contact) => {
    if (contacts.some(c => c.id === contact.id)) {
      alert(`${contact.name} is already imported.`);
      return;
    }

    if (user) {
      try {
        const contactRef = doc(db, "users", user.uid, "contacts", contact.id);
        await setDoc(contactRef, {
          ...contact,
          createdAt: new Date().toISOString()
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}/contacts/${contact.id}`);
      }
    }

    setContacts(prev => [contact, ...prev]);
    setGoogleContacts(prev => prev.filter(c => c.id !== contact.id));
    alert(`Successfully imported ${contact.name}!`);
  };

  const handleEndCallDueToExhaustion = () => {
    handleEndCall();
    setShowExpiredModal(true);
  };

  const handleAddCustomAgent = async (newAgent: Contact) => {
    if (user) {
      try {
        const contactRef = doc(db, "users", user.uid, "contacts", newAgent.id);
        await setDoc(contactRef, {
          ...newAgent,
          createdAt: new Date().toISOString()
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}/contacts/${newAgent.id}`);
      }
    }

    setContacts(prev => [newAgent, ...prev]);
    setMessages(prev => ({
      ...prev,
      [newAgent.id]: []
    }));
    setActiveTab("services");
  };

  const handleHireService = async (service: Contact) => {
    if (contacts.some(c => c.id === service.id)) return;
    
    if (user) {
      try {
        const contactRef = doc(db, "users", user.uid, "contacts", service.id);
        await setDoc(contactRef, {
          ...service,
          createdAt: new Date().toISOString()
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}/contacts/${service.id}`);
      }
    }

    setContacts(prev => [service, ...prev]);
    setActiveTab("chats");
  };

  const handleToggleMemory = async (contactId: string) => {
    if (!isMemoryPlanActive) {
      setShowMemorySubscribePrompt(contactId);
      return;
    }

    const updatedContacts = contacts.map(c => {
      if (c.id === contactId) {
        const newHasMemory = !c.hasMemory;
        if (user) {
          const contactRef = doc(db, "users", user.uid, "contacts", contactId);
          updateDoc(contactRef, { hasMemory: newHasMemory }).catch(error => {
            handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}/contacts/${contactId}`);
          });
        }
        return { ...c, hasMemory: newHasMemory };
      }
      return c;
    });

    setContacts(updatedContacts);
  };

  const handleToggleMemoryPlan = async () => {
    const nextVal = !isMemoryPlanActive;
    if (user) {
      try {
        const userRef = doc(db, "users", user.uid);
        await updateDoc(userRef, { isMemoryPlanActive: nextVal });
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
      }
    }
    setIsMemoryPlanActive(nextVal);
  };

  const handleSubscribeMemoryFromPrompt = async () => {
    if (user) {
      try {
        const userRef = doc(db, "users", user.uid);
        await updateDoc(userRef, { isMemoryPlanActive: true });
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
      }
    }
    setIsMemoryPlanActive(true);

    if (showMemorySubscribePrompt) {
      const targetId = showMemorySubscribePrompt;
      const updatedContacts = contacts.map(c => {
        if (c.id === targetId) {
          if (user) {
            const contactRef = doc(db, "users", user.uid, "contacts", targetId);
            updateDoc(contactRef, { hasMemory: true }).catch(error => {
              handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}/contacts/${targetId}`);
            });
          }
          return { ...c, hasMemory: true };
        }
        return c;
      });
      setContacts(updatedContacts);
    }
    setShowMemorySubscribePrompt(null);
  };

  const handleAddMinutes = async (minutes: number) => {
    const nextSeconds = availableSeconds + minutes * 60;
    if (user) {
      try {
        const userRef = doc(db, "users", user.uid);
        await updateDoc(userRef, { availableSeconds: nextSeconds });
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
      }
    }
    setAvailableSeconds(nextSeconds);
  };

  // Call Timer Interval
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (callState.active) {
      timer = setInterval(() => {
        setCallState(prev => ({
          ...prev,
          duration: prev.duration + 1
        }));
        setAvailableSeconds(prevSec => {
          if (prevSec <= 1) {
            handleEndCallDueToExhaustion();
            return 0;
          }
          return prevSec - 1;
        });
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [callState.active]);

  // Initiate call with ringing simulation
  const handleStartCall = (contact: Contact) => {
    if (availableSeconds <= 0) {
      setShowExpiredModal(true);
      return;
    }
    setActiveCallContact(contact);
    setIsCalling(true);
    setChatOverlayOpen(false);

    // Simulate ringtone for 2 seconds, then connect automatically
    setTimeout(() => {
      setIsCalling(false);
      setCallState({
        active: true,
        contact,
        isMuted: false,
        isVideoOff: false,
        cameraFilter: "normal",
        duration: 0
      });
      
      // Seed first introductory greeting response from contact in the call
      const introText = getIntroMessage(contact.id, contact.name, contact.role);
      setLastAiMessageText(introText);
      
      const firstMsg: Message = {
        id: `intro-${Date.now()}`,
        sender: "assistant",
        content: introText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages(prev => ({
        ...prev,
        [contact.id]: [firstMsg]
      }));

    }, 2000);
  };

  const getIntroMessage = (id: string, name?: string, role?: string): string => {
    switch (id) {
      case "clara":
        return "Hola, te doy la bienvenida. Soy la Dra. Clara Ramos. Este es un espacio seguro de contención y crecimiento. ¿De qué te gustaría hablar o qué te está preocupando en este momento?";
      case "astro":
        return "¡Saludos cósmicos! Soy Astro Coral. La alineación planetaria de hoy abre un portal de introspección profunda. Indiquemos las cartas del tarot o consultemos tu carta natal. ¿Qué duda ronda tu mente?";
      case "mateo":
        return "Buenos días. Soy el Abogado Mateo Silva. Estoy aquí para asesorarte en tus dudas de contratos, derechos civiles o del consumidor. Coméntame con detalle tu situación legal.";
      case "ares":
        return "System status: Fully Operational. Ares online. Welcome to the Quantum Hive multi-agent business infrastructure. How shall we optimize our intelligence assets today?";
      case "sophia":
        return "Hey there! Sophia here. Ready to pair-program, design some system architecture, or level-up your coding flow? Shoot me any question!";
      case "eva":
        return "Welcome to a safe, quiet space. This is Eva. Let's take a slow, deep breath. How are you feeling in this present moment?";
      case "liam":
        return "¡Hola amigo! Liam speaking. I am ready to practice conversation together. Puedes hablar en inglés o en español, whatever feels right!";
      case "oliver":
        return "BAM! Oliver is in the house! Your ultimate trivia champion host. Let me know when you're ready for the first quiz round!";
      default:
        return `Hola, te doy la bienvenida. Soy ${name || "tu consultor"}, especialista como ${role || "Asesor General"}. Protocolo de diálogo de baja latencia completado. Cuéntame, ¿en qué te puedo asistir hoy?`;
    }
  };

  // End active call session
  const handleEndCall = () => {
    if (callState.contact) {
      const durationFormatted = `${Math.floor(callState.duration / 60)}m ${callState.duration % 60}s`;
      
      // Append to local history list
      const newHistoryItem = {
        id: Date.now(),
        contact: callState.contact,
        type: "video",
        date: "Just Now",
        duration: durationFormatted,
        status: "outgoing"
      };

      setCallHistory(prev => [newHistoryItem, ...prev]);
    }

    setCallState({
      active: false,
      contact: null,
      isMuted: false,
      isVideoOff: false,
      cameraFilter: "normal",
      duration: 0
    });
    
    setIsCalling(false);
    setActiveCallContact(null);
    setLastAiMessageText(null);
    setChatOverlayOpen(false);
  };

  // Text message submission (triggers Gemini API on Express backend)
  const handleSendMessage = async (text: string) => {
    if (!callState.contact) return;
    const personaId = callState.contact.id;
    const contactInfo = callState.contact;

    // 1. Append user's message immediately to the feed
    const userMsg: Message = {
      id: `user-${Date.now()}`,
      sender: "user",
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    };

    const currentHistory = [...(messages[personaId] || []), userMsg];
    
    if (user) {
      try {
        await setDoc(
          doc(db, "users", user.uid, "contacts", personaId, "messages", userMsg.id),
          { ...userMsg, createdAt: new Date().toISOString() }
        );
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}/contacts/${personaId}/messages/${userMsg.id}`);
      }
    } else {
      setMessages(prev => ({
        ...prev,
        [personaId]: currentHistory
      }));
    }

    setIsThinking(true);
    setLastAiMessageText(null);

    try {
      // Create chat context for Gemini call (limit history to last 8 elements for token savings)
      const queryHistory = currentHistory.slice(-8).map(m => ({
        role: m.sender,
        content: m.content
      }));

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          persona: personaId,
          messages: queryHistory,
          name: contactInfo.name,
          role: contactInfo.role,
          tagline: contactInfo.tagline
        })
      });

      if (!res.ok) {
        throw new Error("Backend server error while contacting Gemini.");
      }

      const data = await res.json();
      const replyText = data.content;

      // 2. Append AI response
      const assistantMsg: Message = {
        id: `assistant-${Date.now()}`,
        sender: "assistant",
        content: replyText,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      };

      if (user) {
        try {
          await setDoc(
            doc(db, "users", user.uid, "contacts", personaId, "messages", assistantMsg.id),
            { ...assistantMsg, createdAt: new Date().toISOString() }
          );
        } catch (error) {
          handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}/contacts/${personaId}/messages/${assistantMsg.id}`);
        }
      } else {
        setMessages(prev => ({
          ...prev,
          [personaId]: [...(prev[personaId] || []), assistantMsg]
        }));
      }

      // Update subtitle/speech bubble
      setLastAiMessageText(replyText);

    } catch (err) {
      console.error("Gemini communication failed:", err);
      
      const errorMsg: Message = {
        id: `error-${Date.now()}`,
        sender: "assistant",
        content: "Oops! I lost connection to my AI core. Check your internet or make sure process.env.GEMINI_API_KEY is configured correctly.",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      };

      if (user) {
        try {
          await setDoc(
            doc(db, "users", user.uid, "contacts", personaId, "messages", errorMsg.id),
            { ...errorMsg, createdAt: new Date().toISOString() }
          );
        } catch (error) {
          handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}/contacts/${personaId}/messages/${errorMsg.id}`);
        }
      } else {
        setMessages(prev => ({
          ...prev,
          [personaId]: [...(prev[personaId] || []), errorMsg]
        }));
      }

    } finally {
      setIsThinking(false);
    }
  };

  // Open direct chat overlay on homescreen click
  const handleOpenDirectChat = (contact: Contact) => {
    // Start video call session instantly for this immersive communication design
    handleStartCall(contact);
    setTimeout(() => {
      setChatOverlayOpen(true);
    }, 2200);
  };

  // Filter contacts by search query and category
  const filteredContacts = contacts.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         c.role.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === "all" || c.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Group filtered contacts by their category for structured list layout
  const groupedContacts = React.useMemo(() => {
    const groups: Record<string, Contact[]> = {};
    filteredContacts.forEach(contact => {
      const cat = contact.category || "creacion_contenido";
      if (!groups[cat]) {
        groups[cat] = [];
      }
      groups[cat].push(contact);
    });
    return groups;
  }, [filteredContacts]);

  const CATEGORY_META: Record<string, { label: string; color: string; bg: string }> = {
    psicologia: { label: "Psicología", color: "text-rose-400 border-rose-500/30", bg: "bg-rose-500/10" },
    legal: { label: "Legal", color: "text-blue-400 border-blue-500/30", bg: "bg-blue-500/10" },
    astrologia: { label: "Astrología", color: "text-purple-400 border-purple-500/30", bg: "bg-purple-500/10" },
    yoga: { label: "Yoga / Bienestar", color: "text-teal-400 border-teal-500/30", bg: "bg-teal-500/10" },
    ventas: { label: "Ventas / Estrategia", color: "text-amber-400 border-amber-500/30", bg: "bg-amber-500/10" },
    matematicas: { label: "Software / Mentoría", color: "text-emerald-400 border-emerald-500/30", bg: "bg-emerald-500/10" },
    creacion_contenido: { label: "Otros / Contenido", color: "text-indigo-400 border-indigo-500/30", bg: "bg-indigo-500/10" }
  };

  return (
    <div className="w-full min-h-screen bg-[#030508] text-white flex justify-center items-center font-sans antialiased overflow-y-auto p-0 sm:p-2.5">
      
      {/* Immersive Mobile Device Frame mockup centered or Expanded Desktop Layout */}
      <div className={`relative w-full h-[100dvh] sm:rounded-[36px] bg-brand-bg sm:border-8 sm:border-brand-primary/25 sm:shadow-[0_0_80px_rgba(212,175,55,0.15)] overflow-hidden flex flex-col my-auto transition-all duration-300 ${
        isExpandedView 
          ? "max-w-5xl sm:h-[calc(100vh-24px)] sm:max-h-[860px]" 
          : "max-w-md sm:h-[calc(100vh-24px)] sm:max-h-[820px]"
      }`}>
        
        {/* Ringing/Calling Screen Simulator Overlay */}
        {isCalling && activeCallContact && (
          <div className="absolute inset-0 z-50 flex flex-col justify-between items-center bg-[#07090e]/95 p-8 text-center animate-fade-in border-2 border-brand-primary/30">
            <div className="flex flex-col items-center mt-20">
              <span className="text-[10px] font-mono uppercase tracking-widest text-brand-primary font-bold">Initiating Real-time Voice Link...</span>
              <div className="relative mt-8">
                <div className="absolute -inset-4 bg-brand-primary/20 rounded-full animate-ping" />
                <img 
                  src={activeCallContact.avatar} 
                  alt={activeCallContact.name} 
                  referrerPolicy="no-referrer"
                  className="w-28 h-28 rounded-full object-cover border-4 border-brand-primary relative z-10 shadow-2xl"
                />
              </div>
              <h2 className="text-2xl font-bold text-white mt-6 tracking-wide">{activeCallContact.name}</h2>
              <p className="text-xs text-brand-primary mt-1.5 font-mono uppercase tracking-wider">{activeCallContact.role}</p>
            </div>
            
            <div className="flex flex-col items-center mb-16">
              <div className="w-14 h-14 bg-red-600 rounded-full flex items-center justify-center animate-bounce shadow-xl cursor-pointer" onClick={() => setIsCalling(false)}>
                <Phone className="w-6 h-6 rotate-135 text-white" />
              </div>
              <span className="text-[10px] text-white/50 font-mono tracking-wider mt-4 uppercase">Disconnecting via Cancel</span>
            </div>
          </div>
        )}

        {/* ACTIVE LIVE CALL DISPLAY */}
        {callState.active && callState.contact ? (
          <div className="relative w-full h-full flex flex-col justify-between bg-black">
            
            {/* Immersive Glass Call Topbar Header with limit countdown */}
            <ActiveCallHeader 
              contact={callState.contact}
              duration={callState.duration}
              remainingSeconds={availableSeconds}
              onLeave={handleEndCall}
              onToggleAddParticipant={() => setActiveAddParticipant(!activeAddParticipant)}
            />

            {/* Simulated interactive camera viewport stages */}
            <VideoCanvas 
              contact={callState.contact}
              isMuted={callState.isMuted}
              isVideoOff={callState.isVideoOff}
              cameraFilter={callState.cameraFilter}
              onToggleMute={() => setCallState(p => ({ ...p, isMuted: !p.isMuted }))}
              onToggleVideo={() => setCallState(p => ({ ...p, isVideoOff: !p.isVideoOff }))}
              onSetFilter={(filter: CameraFilter) => setCallState(p => ({ ...p, cameraFilter: filter }))}
              onEndCall={handleEndCall}
              onToggleChat={() => setChatOverlayOpen(!chatOverlayOpen)}
              isChatOpen={chatOverlayOpen}
              isThinking={isThinking}
              lastAiMessageText={lastAiMessageText}
            />

            {/* High-fidelity slide up glass chat widget overlay */}
            <ChatOverlay 
              isOpen={chatOverlayOpen}
              onClose={() => setChatOverlayOpen(false)}
              contact={callState.contact}
              messages={messages[callState.contact.id] || []}
              onSendMessage={handleSendMessage}
              isThinking={isThinking}
              onToggleMemory={handleToggleMemory}
            />

            {/* Visual Participant popup drawer */}
            {activeAddParticipant && (
              <div className="absolute inset-0 bg-black/70 z-50 flex items-end animate-fade-in" onClick={() => setActiveAddParticipant(false)}>
                <div className="w-full bg-brand-surface p-6 rounded-t-3xl border-t border-brand-primary/30" onClick={e => e.stopPropagation()}>
                  <div className="w-12 h-1.5 bg-brand-primary/20 rounded-full mx-auto mb-4" />
                  <h3 className="text-sm font-semibold text-white mb-1.5 flex items-center gap-2">
                    <UserPlus className="w-4 h-4 text-brand-primary" />
                    <span>Invite to Group Session</span>
                  </h3>
                  <p className="text-xs text-white/50 mb-4">Orchestrate multiple Quantum Hive digital avatars simultaneously.</p>
                  
                  <div className="space-y-2.5">
                    {contacts.filter(c => c.id !== callState.contact?.id).map(c => (
                      <div key={c.id} className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5">
                        <div className="flex items-center gap-2.5">
                          <img src={c.avatar} alt={c.name} referrerPolicy="no-referrer" className="w-8 h-8 rounded-full" />
                          <div>
                            <p className="text-xs font-semibold text-white">{c.name}</p>
                            <p className="text-[10px] text-brand-primary font-mono">{c.role}</p>
                          </div>
                        </div>
                        <button 
                          onClick={() => {
                            alert(`Simulated Action: Invited ${c.name} to this workspace session.`);
                            setActiveAddParticipant(false);
                          }}
                          className="px-3 py-1 rounded-full bg-brand-primary hover:bg-brand-primary-hover text-brand-bg text-[10px] font-bold transition-colors cursor-pointer"
                        >
                          Invite
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

          </div>
        ) : (
          
          /* HOMEPAGE CORE PORTAL (CHATS / CALLS / STATS HUB) */
          <div className="flex-1 flex flex-col justify-between">
            
            {/* Top Brand Branding Header with customizable balance indicator */}
            <header className="p-4 bg-brand-surface border-b border-brand-primary/20 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-1 bg-brand-bg rounded-lg border border-brand-primary/30">
                  <img 
                    src={QUANTUM_HIVE_LOGO} 
                    alt="Quantum Hive Logo" 
                    className="w-8 h-8 object-cover rounded-md"
                  />
                </div>
                <div>
                  <h1 className="text-sm font-black tracking-widest text-white uppercase font-sans flex items-center gap-1.5">
                    <span>{t.brandTitle}</span>
                  </h1>
                  <p className="text-[8px] text-brand-primary font-mono tracking-widest uppercase">{t.brandSubtitle}</p>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setActiveTab("billing")}
                  className="flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-500/10 border border-amber-500/35 text-[9px] text-amber-400 font-mono font-bold hover:bg-amber-500/20 transition-all cursor-pointer"
                  title="Recargar Minutos"
                >
                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                  <span>{(availableSeconds / 60).toFixed(1)} {t.minutesLabel}</span>
                </button>
                
                <button
                  onClick={() => setIsExpandedView(!isExpandedView)}
                  className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white transition-all cursor-pointer"
                  title={isExpandedView ? t.phoneView : t.expandedView}
                >
                  {isExpandedView ? <Smartphone className="w-3.5 h-3.5" /> : <Monitor className="w-3.5 h-3.5" />}
                </button>

                <button
                  onClick={() => setIsLanguageModalOpen(true)}
                  className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white transition-all cursor-pointer flex items-center gap-1"
                  title="Seleccionar Idioma / Select Language"
                >
                  <Globe className="w-3.5 h-3.5 text-brand-primary" />
                  <span className="text-[9px] font-mono font-black">{language.toUpperCase()}</span>
                </button>

                <button
                  onClick={() => setIsTutorialOpen(true)}
                  className="p-1.5 rounded-lg bg-brand-primary/10 hover:bg-brand-primary/20 border border-brand-primary/25 text-brand-primary transition-all cursor-pointer flex items-center gap-1"
                  title="Iniciar Tour Interactivo"
                >
                  <HelpCircle className="w-3.5 h-3.5 text-brand-primary animate-pulse" />
                </button>
              </div>
            </header>

            {/* Quick search panel (only visible on Core Portal Chats/Services) */}
            {(activeTab === "chats" || activeTab === "services") && (
              <div className="px-4 py-3 bg-brand-surface/40 flex-shrink-0 border-b border-white/5">
                <div className="relative">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                  <input 
                    type="text"
                    placeholder={t.searchPlaceholder}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-xl py-2 pl-10 pr-4 text-xs text-white placeholder-white/40 focus:outline-none focus:border-brand-primary/60 transition-colors"
                  />
                </div>
              </div>
            )}

            {/* DYNAMIC SCROLL CONTAINER (TABS PORTAL) */}
            <div className="flex-1 overflow-y-auto bg-brand-bg">
              
              {/* CHATS TAB LIST */}
              {activeTab === "chats" && (
                <div className="divide-y divide-white/5 animate-fade-in">
                  
                  {/* Google Connection & Account Manager */}
                  <div className="p-4 bg-gradient-to-r from-brand-primary/10 via-brand-surface to-brand-primary/5 border-b border-brand-primary/20 flex flex-col gap-3">
                    {!user ? (
                      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                        <div className="space-y-1 text-center sm:text-left">
                          <h4 className="text-[11px] font-mono font-bold tracking-widest text-brand-primary uppercase flex items-center gap-1.5 justify-center sm:justify-start">
                            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                            <span>CLOUD PERSISTENCE LAYER</span>
                          </h4>
                          <p className="text-xs text-white/90 font-bold font-sans">Connect Google to Save Agents & Sync Contacts</p>
                          <p className="text-[10px] text-white/50 leading-relaxed">
                            Access real-time Google Contacts & secure cloud synchronization.
                          </p>
                        </div>
                        <button
                          onClick={handleGoogleLogin}
                          className="flex items-center justify-center gap-2 px-4 py-2 bg-white text-gray-700 hover:bg-gray-100 rounded-xl font-bold font-sans text-xs shadow-md transition-all cursor-pointer border border-gray-300"
                        >
                          <svg className="w-4.5 h-4.5" viewBox="0 0 24 24">
                            <path
                              fill="#4285F4"
                              d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.53-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-8.72z"
                            />
                            <path
                              fill="#34A853"
                              d="M12 24c3.24 0 5.97-1.08 7.96-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.08 1.16-3.15 0-5.81-2.13-6.76-5.01H1.32v3.15C3.3 22.25 7.37 24 12 24z"
                            />
                            <path
                              fill="#FBBC05"
                              d="M5.24 14.19c-.24-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.46H1.32C.48 8.15 0 10.02 0 12s.48 3.85 1.32 5.54l3.92-3.15z"
                            />
                            <path
                              fill="#EA4335"
                              d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.22 0 12 0 7.37 0 3.3 1.75 1.32 4.75l3.92 3.15c.95-2.88 3.61-5.15 6.76-5.15z"
                            />
                          </svg>
                          <span>Sign in with Google</span>
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            {user.photoURL ? (
                              <img 
                                src={user.photoURL} 
                                alt={user.displayName || "Google User"} 
                                referrerPolicy="no-referrer"
                                className="w-10 h-10 rounded-full border border-brand-primary"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-full bg-brand-primary/20 border border-brand-primary text-brand-primary font-bold flex items-center justify-center text-sm">
                                {(user.displayName || "G").charAt(0).toUpperCase()}
                              </div>
                            )}
                            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-brand-bg rounded-full" />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-white leading-tight">{user.displayName || "Google Neural Node"}</p>
                            <p className="text-[10px] text-brand-primary/80 font-mono tracking-tight">{user.email}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 w-full sm:w-auto">
                          <button
                            onClick={handleSyncGoogleContacts}
                            disabled={isSyncingContacts}
                            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-1.5 bg-brand-primary text-brand-bg rounded-lg font-bold font-mono text-[10px] tracking-wide hover:bg-brand-primary-hover disabled:opacity-50 transition-all cursor-pointer"
                          >
                            {isSyncingContacts ? (
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Globe className="w-3.5 h-3.5" />
                            )}
                            <span>SYNC CONTACTS</span>
                          </button>
                          <button
                            onClick={handleGoogleLogout}
                            className="p-1.5 bg-white/5 hover:bg-red-500/20 border border-white/10 hover:border-red-500/30 text-white/60 hover:text-red-400 rounded-lg transition-all cursor-pointer"
                            title="Sign Out"
                          >
                            <LogOut className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* Statuses / Stories Pill Tray */}
                  <div className="px-4 py-3 border-b border-white/5 bg-brand-surface/20">
                    <p className="text-[9px] uppercase font-mono tracking-widest text-white/40 mb-2 font-bold font-sans">Active Avatar Node Matrix</p>
                    <div className="flex items-center gap-3.5 overflow-x-auto no-scrollbar py-1">
                      {contacts.map(c => (
                        <div 
                          key={c.id} 
                          className="flex flex-col items-center flex-shrink-0 group cursor-pointer"
                          onClick={() => handleStartCall(c)}
                        >
                          <div className="relative">
                            <img 
                              src={c.avatar} 
                              alt={c.name} 
                              referrerPolicy="no-referrer"
                              className="w-12 h-12 rounded-full object-cover border-2 border-brand-primary group-hover:border-white transition-all p-0.5" 
                            />
                            <span className="absolute bottom-0 right-0 w-3 h-3 bg-brand-primary border-2 border-brand-bg rounded-full animate-pulse" />
                          </div>
                          <span className="text-[10px] text-white/80 font-mono mt-1 group-hover:text-brand-primary truncate max-w-[65px] text-center">
                            {c.name}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Category Filter Chips Bar */}
                  <div className="px-4 py-2 border-b border-white/5 bg-brand-surface/10 animate-fade-in">
                    <p className="text-[9px] uppercase font-mono tracking-widest text-white/40 mb-1.5 font-bold">Agrupación Profesional</p>
                    <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
                      <button
                        onClick={() => setSelectedCategory("all")}
                        className={`px-3 py-1 rounded-xl text-[10px] font-mono font-bold tracking-wide transition-all cursor-pointer border ${
                          selectedCategory === "all"
                            ? "bg-brand-primary text-brand-bg border-brand-primary"
                            : "bg-white/5 text-white/50 border-white/5 hover:text-white hover:bg-white/10"
                        }`}
                      >
                        TODOS ({contacts.length})
                      </button>
                      {Object.entries(CATEGORY_META).map(([catKey, catVal]) => {
                        const count = contacts.filter(c => (c.category || "creacion_contenido") === catKey).length;
                        if (count === 0) return null; // Only show category pills with active hired/synced agents
                        return (
                          <button
                            key={catKey}
                            onClick={() => setSelectedCategory(catKey)}
                            className={`px-3 py-1 rounded-xl text-[10px] font-mono font-bold tracking-wide transition-all cursor-pointer border ${
                              selectedCategory === catKey
                                ? "bg-brand-primary text-brand-bg border-brand-primary"
                                : "bg-white/5 text-white/50 border-white/5 hover:text-white hover:bg-white/10"
                            }`}
                          >
                            {catVal.label.toUpperCase()} ({count})
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {filteredContacts.length === 0 ? (
                    <div className="flex flex-col items-center justify-center text-center p-12 opacity-60">
                      <HelpCircle className="w-10 h-10 text-white/30 mb-2" />
                      <p className="text-xs text-white/80 font-medium">No results match your query</p>
                      <p className="text-[10px] text-white/40 mt-1">Try selecting another category or typing another name.</p>
                    </div>
                  ) : (
                    <div className="space-y-4 animate-fade-in">
                      {(Object.entries(groupedContacts) as [string, Contact[]][]).map(([catKey, groupList]) => {
                        if (groupList.length === 0) return null;
                        const meta = CATEGORY_META[catKey] || { label: "Otros", color: "text-white/60", bg: "bg-white/5" };
                        return (
                          <div key={catKey} className="space-y-1">
                            {/* Group Header */}
                            <div className="px-4 py-1.5 flex items-center justify-between bg-brand-surface/30 border-y border-white/5">
                              <span className={`text-[9px] font-mono font-bold tracking-wider uppercase ${meta.color} flex items-center gap-1.5`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${meta.bg} border border-current`} />
                                <span>{meta.label}</span>
                              </span>
                              <span className="text-[9px] font-mono text-white/30 font-bold">{groupList.length} {groupList.length === 1 ? 'Agente' : 'Agentes'}</span>
                            </div>

                            {/* Group Items */}
                            <div className="divide-y divide-white/5">
                              {groupList.map((contact) => (
                                <ContactCard 
                                  key={contact.id}
                                  contact={contact}
                                  onStartCall={handleStartCall}
                                  onOpenChat={handleOpenDirectChat}
                                  onToggleMemory={handleToggleMemory}
                                />
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Feature Announcement Cards */}
                  <div className="p-4 m-4 bg-gradient-to-br from-brand-surface to-[#121824] border border-brand-primary/20 rounded-2xl">
                    <div className="flex items-center gap-2 text-brand-primary">
                      <Award className="w-4.5 h-4.5" />
                      <span className="text-[10px] font-bold uppercase tracking-widest font-mono">Quantum Hive Engine Spec</span>
                    </div>
                    <h4 className="text-xs font-bold text-white mt-1.5 font-sans">Real-time GPU Avatar Synthesis</h4>
                    <p className="text-[10.5px] text-white/50 leading-relaxed mt-1">
                      Our platform supports zero-latency audio streaming direct to your VM. Configure the socket link in the <b>VM Server</b> tab to route client PCM arrays to your custom voice-model hardware.
                    </p>
                  </div>
                </div>
              )}

              {/* PROFESSIONAL SERVICES TAB */}
              {activeTab === "services" && (
                <ProfessionalServices 
                  allServices={CONTACTS_DATA}
                  hiredContacts={contacts}
                  onHireService={handleHireService}
                  onStartCall={handleStartCall}
                  onOpenChat={handleOpenDirectChat}
                  onGoBack={() => setActiveTab("chats")}
                />
              )}

              {/* AGENT & PERSONALITY CREATION TAB */}
              {activeTab === "create" && (
                <AgentCreator 
                  onAddAgent={handleAddCustomAgent}
                />
              )}

              {/* BILLING PLANS & PACKS TAB */}
              {activeTab === "billing" && (
                <BillingHub 
                  currentMinutes={Number((availableSeconds / 60).toFixed(1))}
                  onAddMinutes={handleAddMinutes}
                  isMemoryPlanActive={isMemoryPlanActive}
                  onToggleMemoryPlan={handleToggleMemoryPlan}
                />
              )}

              {/* CALLS HISTORY LIST TAB */}
              {activeTab === "calls" && (
                <div className="p-4 space-y-4 animate-fade-in">
                  <div className="flex items-center justify-between">
                    <h3 className="text-[10px] font-mono uppercase tracking-wider text-white/40 font-bold">Recent Communications</h3>
                    <button 
                      onClick={() => {
                        if (confirm("Are you sure you want to clear call history?")) {
                          setCallHistory([]);
                        }
                      }}
                      className="text-[10px] font-mono text-brand-primary hover:underline"
                    >
                      Clear Logs
                    </button>
                  </div>

                  {callHistory.length === 0 ? (
                    <div className="flex flex-col items-center justify-center text-center py-16 opacity-50">
                      <Clock className="w-10 h-10 text-white/20 mb-2" />
                      <p className="text-xs">No calling history.</p>
                      <p className="text-[10px]">Start video call sessions on the chats screen!</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {callHistory.map((log) => (
                        <div 
                          key={log.id} 
                          className="flex items-center justify-between p-3.5 bg-brand-surface/40 hover:bg-brand-surface/80 border border-white/5 rounded-xl transition-all"
                        >
                          <div className="flex items-center gap-3">
                            <img 
                              src={log.contact.avatar} 
                              alt={log.contact.name} 
                              referrerPolicy="no-referrer"
                              className="w-10 h-10 rounded-full object-cover border border-white/10" 
                            />
                            <div>
                              <p className="text-xs font-bold text-white">{log.contact.name}</p>
                              <div className="flex items-center gap-1.5 text-[10px] text-white/50 mt-1">
                                <span className={log.status === "incoming" ? "text-brand-primary" : "text-white/40"}>
                                  {log.status === "incoming" ? "↙ Received" : "↗ Placed"}
                                </span>
                                <span>•</span>
                                <span className="font-mono">{log.date}</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            <span className="text-[9px] font-mono bg-white/5 px-2 py-0.5 rounded border border-white/5 text-white/70">
                              {log.duration}
                            </span>
                            <button 
                              onClick={() => handleStartCall(log.contact)}
                              className="p-2 rounded-full bg-brand-primary/10 hover:bg-brand-primary text-brand-primary hover:text-brand-bg transition-colors cursor-pointer"
                            >
                              <Video className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* VM LINK INTEGRATION TAB */}
              {activeTab === "vm" && (
                <VmConfigurator config={vmConfig} onChange={setVmConfig} />
              )}

              {/* COMM CORE SETTINGS & SYSTEM INFO TAB */}
              {activeTab === "ai" && (
                <div className="p-5 space-y-5 animate-fade-in">
                  <div className="flex items-center gap-2.5 pb-2 border-b border-white/10">
                    <Settings className="w-5 h-5 text-brand-primary" />
                    <h3 className="text-sm font-semibold">Security & Protocols</h3>
                  </div>

                  <div className="space-y-4">
                    <div className="p-4 rounded-xl bg-white/5 border border-brand-primary/20">
                      <h4 className="text-xs font-bold text-brand-primary uppercase tracking-wider font-mono">System Telemetry Specs</h4>
                      <div className="grid grid-cols-2 gap-3.5 mt-3">
                        <div className="bg-black/30 p-2.5 rounded-lg border border-white/5">
                          <span className="text-[9px] text-white/40 block font-mono">GATEWAY STATUS</span>
                          <span className="text-xs text-brand-primary font-bold mt-1 block flex items-center gap-1 font-mono">
                            <span className="w-2 h-2 bg-brand-primary rounded-full animate-ping" />
                            <span>ONLINE</span>
                          </span>
                        </div>
                        <div className="bg-black/30 p-2.5 rounded-lg border border-white/5">
                          <span className="text-[9px] text-white/40 block font-mono">HYBRID FALLBACK</span>
                          <span className="text-xs text-white/90 font-mono font-bold mt-1 block truncate">Gemini 3.5 Flash</span>
                        </div>
                        <div className="bg-black/30 p-2.5 rounded-lg border border-white/5">
                          <span className="text-[9px] text-white/40 block font-mono">VM LINK MODE</span>
                          <span className="text-xs text-brand-primary font-mono font-bold mt-1 block uppercase">
                            {vmConfig.mode === "vm" ? "Direct VM" : "Simulation"}
                          </span>
                        </div>
                        <div className="bg-black/30 p-2.5 rounded-lg border border-white/5">
                          <span className="text-[9px] text-white/40 block font-mono">ACTIVE MATRIX</span>
                          <span className="text-xs text-white/90 font-bold mt-1 block font-mono">{contacts.length} Hive Avatars</span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono">Integration Verification</h4>
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2.5 text-xs text-white/80 p-2 bg-white/5 rounded-lg">
                          <CheckCircle2 className="w-4.5 h-4.5 text-brand-primary" />
                          <span>VM Gateway: Handshake active</span>
                        </div>
                        <div className="flex items-center gap-2.5 text-xs text-white/80 p-2 bg-white/5 rounded-lg">
                          <CheckCircle2 className="w-4.5 h-4.5 text-brand-primary" />
                          <span>Mother Intelligence Core: Synced</span>
                        </div>
                        <div className="flex items-center gap-2.5 text-xs text-white/80 p-2 bg-white/5 rounded-lg">
                          <CheckCircle2 className="w-4.5 h-4.5 text-brand-primary" />
                          <span>Interactive PIP Video: Functional</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* GOOGLE CALENDAR HUB INTEGRATION TAB */}
              {activeTab === "calendar" && (
                <CalendarHub 
                  user={user}
                  accessToken={accessToken}
                  contacts={contacts}
                  onGoogleLogin={handleGoogleLogin}
                />
              )}

              {/* GOOGLE GMAIL HUB INTEGRATION TAB */}
              {activeTab === "gmail" && (
                <GmailHub 
                  user={user}
                  accessToken={accessToken}
                  contacts={contacts}
                  onGoogleLogin={handleGoogleLogin}
                />
              )}

              {/* GOOGLE CLASSROOM HUB INTEGRATION TAB */}
              {activeTab === "classroom" && (
                <ClassroomHub 
                  user={user}
                  accessToken={accessToken}
                  onGoogleLogin={handleGoogleLogin}
                />
              )}

              {/* TRANSLATION & LANGUAGE EXPERT TAB */}
              {activeTab === "translate" && (
                <TranslationHub />
              )}

            </div>

            {/* HIGH-END COHESIVE NAVIGATION TAB BAR */}
            <nav className="p-3 bg-brand-surface border-t border-brand-primary/20 flex items-center justify-start sm:justify-around gap-5 sm:gap-1 overflow-x-auto no-scrollbar flex-shrink-0 z-20 w-full">
              <button 
                onClick={() => setActiveTab("chats")}
                className={`flex flex-col items-center gap-1 transition-all flex-shrink-0 cursor-pointer ${activeTab === "chats" ? "text-brand-primary scale-105 font-bold" : "text-white/45 hover:text-white/90"}`}
                title={t.tabChats}
              >
                <Sparkles className="w-4.5 h-4.5" />
                <span className="text-[9px] font-mono tracking-wide font-semibold">{t.tabChats}</span>
              </button>
              
              <button 
                onClick={() => setActiveTab("services")}
                className={`flex flex-col items-center gap-1 transition-all flex-shrink-0 cursor-pointer ${activeTab === "services" ? "text-brand-primary scale-105 font-bold" : "text-white/45 hover:text-white/90"}`}
                title={t.tabServices}
              >
                <Compass className="w-4.5 h-4.5" />
                <span className="text-[9px] font-mono tracking-wide font-semibold">{t.tabServices}</span>
              </button>

              <button 
                onClick={() => setActiveTab("translate")}
                className={`flex flex-col items-center gap-1 transition-all flex-shrink-0 cursor-pointer ${activeTab === "translate" ? "text-brand-primary scale-105 font-bold" : "text-white/45 hover:text-white/90"}`}
                title={t.tabTranslate}
              >
                <Languages className="w-4.5 h-4.5" />
                <span className="text-[9px] font-mono tracking-wide font-semibold">{t.tabTranslate}</span>
              </button>

              <button 
                onClick={() => setActiveTab("create")}
                className={`flex flex-col items-center gap-1 transition-all flex-shrink-0 cursor-pointer ${activeTab === "create" ? "text-brand-primary scale-105 font-bold" : "text-white/45 hover:text-white/90"}`}
                title={t.tabCreate}
              >
                <Cpu className="w-4.5 h-4.5" />
                <span className="text-[9px] font-mono tracking-wide font-semibold">{t.tabCreate}</span>
              </button>

              <button 
                onClick={() => setActiveTab("billing")}
                className={`flex flex-col items-center gap-1 transition-all flex-shrink-0 cursor-pointer ${activeTab === "billing" ? "text-brand-primary scale-105 font-bold" : "text-white/45 hover:text-white/90"}`}
                title={t.tabPacks}
              >
                <Coins className="w-4.5 h-4.5" />
                <span className="text-[9px] font-mono tracking-wide font-semibold">{t.tabPacks}</span>
              </button>

              <button 
                onClick={() => setActiveTab("calendar")}
                className={`flex flex-col items-center gap-1 transition-all flex-shrink-0 cursor-pointer ${activeTab === "calendar" ? "text-brand-primary scale-105 font-bold" : "text-white/45 hover:text-white/90"}`}
                title={t.tabCalendar}
              >
                <Calendar className="w-4.5 h-4.5" />
                <span className="text-[9px] font-mono tracking-wide font-semibold">{t.tabCalendar}</span>
              </button>

              <button 
                onClick={() => setActiveTab("gmail")}
                className={`flex flex-col items-center gap-1 transition-all flex-shrink-0 cursor-pointer ${activeTab === "gmail" ? "text-brand-primary scale-105 font-bold" : "text-white/45 hover:text-white/90"}`}
                title={t.tabGmail}
              >
                <Mail className="w-4.5 h-4.5" />
                <span className="text-[9px] font-mono tracking-wide font-semibold">{t.tabGmail}</span>
              </button>

              <button 
                onClick={() => setActiveTab("classroom")}
                className={`flex flex-col items-center gap-1 transition-all flex-shrink-0 cursor-pointer ${activeTab === "classroom" ? "text-brand-primary scale-105 font-bold" : "text-white/45 hover:text-white/90"}`}
                title={t.tabClassroom}
              >
                <BookOpen className="w-4.5 h-4.5" />
                <span className="text-[9px] font-mono tracking-wide font-semibold">{t.tabClassroom}</span>
              </button>

              <button 
                onClick={() => setActiveTab("calls")}
                className={`flex flex-col items-center gap-1 transition-all flex-shrink-0 cursor-pointer ${activeTab === "calls" ? "text-brand-primary scale-105 font-bold" : "text-white/45 hover:text-white/90"}`}
                title={language === "en" ? "History" : language === "pt" ? "Histórico" : "Historial"}
              >
                <Phone className="w-4.5 h-4.5" />
                <span className="text-[9px] font-mono tracking-wide font-semibold">
                  {language === "en" ? "History" : language === "pt" ? "Histórico" : "Historial"}
                </span>
              </button>
            </nav>

          </div>
        )}
      </div>

      {/* Expired Minutes Modal Popup Overlay */}
      {showExpiredModal && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="bg-brand-surface border border-brand-primary/45 p-6 rounded-3xl max-w-xs text-center space-y-4 shadow-2xl animate-fade-in">
            <div className="w-14 h-14 bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded-full flex items-center justify-center mx-auto animate-pulse">
              <Clock className="w-7 h-7" />
            </div>
            
            <div className="space-y-1">
              <h3 className="text-md font-bold text-white tracking-wide uppercase">Límite Agotado</h3>
              <p className="text-[11px] text-white/60 leading-relaxed">
                Tus minutos de llamada interactiva con el avatar han concluido. Adquiere un nuevo pack de minutos en la sección de Recargas.
              </p>
            </div>

            <div className="space-y-2 pt-1.5">
              <button
                onClick={() => {
                  setShowExpiredModal(false);
                  setActiveTab("billing");
                }}
                className="w-full py-2.5 bg-brand-primary hover:bg-brand-primary-hover text-brand-bg text-xs font-black rounded-xl uppercase tracking-wider transition-all cursor-pointer"
              >
                Ver Packs de Minutos
              </button>
              <button
                onClick={() => setShowExpiredModal(false)}
                className="w-full py-2.5 bg-white/5 hover:bg-white/10 text-white/50 text-[11px] rounded-xl transition-all cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Google Contacts Import Modal Popup Overlay */}
      {showSyncModal && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-fade-in">
          <div className="bg-brand-surface border border-brand-primary/30 p-5 rounded-3xl w-full max-w-sm flex flex-col max-h-[85vh] shadow-2xl">
            <div className="flex items-center justify-between pb-3.5 border-b border-white/10">
              <div className="flex items-center gap-2">
                <Globe className="w-5 h-5 text-brand-primary" />
                <div>
                  <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-white">Google Connections</h3>
                  <p className="text-[9px] text-white/40">Select connections to provision as agents</p>
                </div>
              </div>
              <button 
                onClick={() => setShowSyncModal(false)}
                className="text-white/40 hover:text-white hover:bg-white/5 px-2 py-1 rounded-lg text-xs font-mono transition-all cursor-pointer animate-pulse"
              >
                CLOSE
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-3 space-y-2.5 no-scrollbar">
              {googleContacts.length === 0 ? (
                <div className="flex flex-col items-center justify-center text-center py-10 opacity-50">
                  <UserPlus className="w-8 h-8 text-white/20 mb-2" />
                  <p className="text-xs">No Google contacts found.</p>
                  <p className="text-[9px] max-w-[200px] mt-1 leading-relaxed">
                    Make sure you have contacts registered in your Google Account.
                  </p>
                </div>
              ) : (
                googleContacts.map((contact) => {
                  const alreadyImported = contacts.some(c => c.id === contact.id);
                  return (
                    <div 
                      key={contact.id}
                      className="flex items-center justify-between p-3 bg-white/5 hover:bg-white/10 border border-white/5 rounded-2xl transition-all animate-fade-in"
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <img 
                          src={contact.avatar} 
                          alt={contact.name} 
                          referrerPolicy="no-referrer"
                          className="w-10 h-10 rounded-full object-cover border border-white/10 flex-shrink-0"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-white truncate">{contact.name}</p>
                          <p className="text-[10px] text-brand-primary/80 font-mono truncate">{contact.role}</p>
                          {contact.email && (
                            <p className="text-[9px] text-white/40 truncate">{contact.email}</p>
                          )}
                        </div>
                      </div>

                      <button
                        onClick={() => handleImportGoogleContact(contact)}
                        disabled={alreadyImported}
                        className={`ml-2.5 px-3 py-1.5 rounded-xl font-bold font-mono text-[9px] tracking-wide transition-all cursor-pointer flex-shrink-0 flex items-center gap-1 ${
                          alreadyImported 
                            ? "bg-emerald-500/15 border border-emerald-500/20 text-emerald-400 cursor-not-allowed" 
                            : "bg-brand-primary text-brand-bg hover:bg-brand-primary-hover"
                        }`}
                      >
                        {alreadyImported ? (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            <span>SYNCED</span>
                          </>
                        ) : (
                          <span>IMPORT</span>
                        )}
                      </button>
                    </div>
                  );
                })
              )}
            </div>

            <div className="pt-3 border-t border-white/10 flex items-center justify-between text-[9px] text-white/40 font-mono">
              <span>Total Connections: {googleContacts.length}</span>
              <span>Matrix Sync Ready</span>
            </div>
          </div>
        </div>
      )}

      {/* Memory Subscription Modal Prompt */}
      {showMemorySubscribePrompt && (() => {
        const targetContact = CONTACTS_DATA.find(c => c.id === showMemorySubscribePrompt);
        return (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in">
            <div className="bg-brand-surface border border-emerald-500/40 p-6 rounded-3xl max-w-xs text-center space-y-4 shadow-2xl">
              <div className="w-14 h-14 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-full flex items-center justify-center mx-auto animate-pulse">
                <span className="text-2xl">🧠</span>
              </div>
              
              <div className="space-y-1">
                <h3 className="text-md font-bold text-white tracking-wide uppercase">Activar Memoria Cuántica</h3>
                <p className="text-[11px] text-white/75 leading-relaxed">
                  Para que <strong>{targetContact?.name || "este asistente"}</strong> y todos los demás recuerden tus conversaciones anteriores y tengan memoria compartida de tus VM, necesitas el plan de Memoria Cuántica.
                </p>
                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-2.5 mt-2">
                  <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider font-mono">Plan Memoria Compartida</p>
                  <p className="text-xs text-white/90 mt-0.5">$9.99 USD <span className="text-[9px] text-white/50 font-normal">/ mes</span></p>
                </div>
              </div>

              <div className="space-y-2 pt-1.5">
                <button
                  onClick={handleSubscribeMemoryFromPrompt}
                  className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-600 text-black text-xs font-black rounded-xl uppercase tracking-wider transition-all cursor-pointer"
                >
                  Suscribirse Ahora
                </button>
                <button
                  onClick={() => setShowMemorySubscribePrompt(null)}
                  className="w-full py-2.5 bg-white/5 hover:bg-white/10 text-white/50 text-[11px] rounded-xl transition-all cursor-pointer"
                >
                  Tal vez más tarde
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Intranet Language Selection Modal */}
      {isLanguageModalOpen && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in">
          <div className="bg-brand-surface border border-brand-primary/30 p-6 rounded-3xl max-w-sm w-full space-y-5 shadow-2xl relative">
            
            {/* Close button */}
            <button 
              onClick={() => setIsLanguageModalOpen(false)}
              className="absolute top-4 right-4 p-1 rounded-lg bg-white/5 hover:bg-white/10 text-white/50 hover:text-white transition-all cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="text-center space-y-1.5 pt-2">
              <div className="w-12 h-12 bg-brand-primary/10 border border-brand-primary/30 text-brand-primary rounded-full flex items-center justify-center mx-auto mb-1">
                <Globe className="w-6 h-6 animate-pulse" />
              </div>
              <h3 className="text-sm font-bold text-white tracking-wide uppercase">{t.changeLanguageTitle}</h3>
              <p className="text-[11px] text-white/60 leading-relaxed">
                {t.changeLanguageDesc}
              </p>
            </div>

            <div className="space-y-2.5">
              {[
                { key: "es", label: "Español", flag: "🇪🇸", native: "Spanish" },
                { key: "en", label: "English", flag: "🇺🇸", native: "English" },
                { key: "pt", label: "Português", flag: "🇧🇷", native: "Portuguese" }
              ].map((lang) => {
                const isActive = language === lang.key;
                return (
                  <button
                    key={lang.key}
                    onClick={() => {
                      setLanguage(lang.key as LanguageType);
                      localStorage.setItem("quantum_intranet_lang", lang.key);
                      setIsLanguageModalOpen(false);
                    }}
                    className={`w-full flex items-center justify-between p-3 rounded-2xl border transition-all cursor-pointer ${
                      isActive 
                        ? "bg-brand-primary/10 border-brand-primary/50 text-brand-primary font-bold shadow-[0_0_15px_rgba(212,175,55,0.15)]" 
                        : "bg-white/5 border-white/5 hover:bg-white/10 text-white/85 hover:text-white"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-lg">{lang.flag}</span>
                      <div className="text-left">
                        <p className="text-xs font-semibold">{lang.label}</p>
                        <p className="text-[9px] text-white/40 font-mono">{lang.native}</p>
                      </div>
                    </div>
                    {isActive && <Check className="w-4 h-4 text-brand-primary" />}
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => setIsLanguageModalOpen(false)}
              className="w-full py-2 bg-white/5 hover:bg-white/10 text-white/50 hover:text-white border border-white/5 text-[11px] font-mono font-bold rounded-xl transition-all cursor-pointer uppercase"
            >
              {t.closeBtn}
            </button>
          </div>
        </div>
      )}

      {/* Interactive Walkthrough Tour Guide overlay */}
      <InteractiveTour 
        isOpen={isTutorialOpen} 
        onClose={() => setIsTutorialOpen(false)} 
        onSelectTab={(tab) => setActiveTab(tab)} 
        language={language}
      />
    </div>
  );
}
