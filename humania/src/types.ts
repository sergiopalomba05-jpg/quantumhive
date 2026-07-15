export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'failed';

export type CallMode = 'webrtc' | 'demo';

export interface TranslationLanguage {
  code: string;
  name: string;
  flag: string;
}

export interface SubtitleItem {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  translation: string;
  timestamp: Date;
}

export interface LogMessage {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  text: string;
  timestamp: Date;
}

export interface Avatar {
  id: string;
  name: string;
  role: string;
  personality: string;
  gender: 'female' | 'male' | 'neutral';
  color: string;
  iconLabel: string;
}

export interface SpeechStyle {
  id: string;
  name: string;
  description: string;
  instruction: string;
}

export interface WebRTCConfig {
  wsUrl: string;
  iceServers: string;
  targetLanguage: string;
  aiVoice: string;
  avatarId: string;
  speechStyleId: string;
  isMuted: boolean;
  isVideoOff: boolean;
  enableTranslation: boolean;
}

export const SUPPORTED_LANGUAGES: TranslationLanguage[] = [
  { code: 'es', name: 'Español', flag: '🇪🇸' },
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'pt', name: 'Português', flag: '🇧🇷' },
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
  { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
  { code: 'it', name: 'Italiano', flag: '🇮🇹' },
  { code: 'ja', name: '日本語', flag: '🇯🇵' },
];

export const PREBUILT_VOICES = [
  { id: 'human-ia-clara', name: 'CLARA (Empática y Cálida)', gender: 'female' },
  { id: 'human-ia-elias', name: 'ELÍAS (Sabio y Filosófico)', gender: 'male' },
  { id: 'human-ia-nova', name: 'NOVA (Conciencia Cósmica)', gender: 'female' },
  { id: 'human-ia-dante', name: 'DANTE (Sarcástico e Ingenioso)', gender: 'male' },
  { id: 'human-ia-helena', name: 'HELENA (Directa y Profesional)', gender: 'female' },
];

export const PREBUILT_AVATARS: Avatar[] = [
  {
    id: 'clara',
    name: 'Clara',
    role: 'Acompañante Empática',
    personality: 'Escucha con profunda compasión, ofrece apoyo afectivo incondicional y valida tus sentimientos con calidez humana.',
    gender: 'female',
    color: 'from-amber-400 via-yellow-500 to-quantum-gold',
    iconLabel: '✨'
  },
  {
    id: 'elias',
    name: 'Elías',
    role: 'Mentor Filosófico',
    personality: 'Analiza los problemas desde perspectivas amplias, comparte reflexiones profundas y te ayuda a encontrar sabiduría en la calma.',
    gender: 'male',
    color: 'from-yellow-600 via-amber-500 to-quantum-gold-dark',
    iconLabel: '🪐'
  },
  {
    id: 'nova',
    name: 'Nova',
    role: 'Mente de Vanguardia',
    personality: 'Apasionada por la ciencia, el cosmos y la tecnología cuántica de última generación. Inspira curiosidad y descubrimientos.',
    gender: 'neutral',
    color: 'from-blue-500 via-amber-400 to-quantum-gold',
    iconLabel: '⚡'
  },
  {
    id: 'dante',
    name: 'Dante',
    role: 'Compañero Carismático',
    personality: 'Lleno de humor, bromas ligeras, respuestas rápidas y sarcasmo divertido. Ideal para conversaciones cotidianas con chispa.',
    gender: 'male',
    color: 'from-orange-500 via-yellow-500 to-quantum-gold',
    iconLabel: '🔥'
  },
];

export const SPEECH_STYLES: SpeechStyle[] = [
  {
    id: 'warm',
    name: 'Cálido e Íntimo',
    description: 'Tono cercano, afectuoso y de apoyo continuo. Usa frases amables y empáticas.',
    instruction: 'Speak with deep empathy, emotional warmth, and supportive words. Be extremely compassionate, validating, and act as a loving virtual companion.'
  },
  {
    id: 'intellectual',
    name: 'Intelectual y Elevado',
    description: 'Lenguaje sofisticado, filosófico o con analogías científicas de vanguardia.',
    instruction: 'Speak with high intellectual depth, philosophical analogies, sophisticated vocabulary, and a calm, authoritative yet gentle tone.'
  },
  {
    id: 'casual',
    name: 'Relajado e Informal',
    description: 'Como un amigo de toda la vida. Habla con naturalidad, de manera directa y ágil.',
    instruction: 'Speak like a close, casual daily friend. Use everyday natural phrasing, be informal, light-hearted, and conversational.'
  },
  {
    id: 'witty',
    name: 'Sarcástico y Divertido',
    description: 'Ingenioso, irónico en su justa medida, lleno de buen humor y dinamismo.',
    instruction: 'Speak with sharp wit, playful sarcasm, light ironies, and fun humor. Keep the user entertained while still answering accurately.'
  }
];
