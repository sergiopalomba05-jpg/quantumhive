export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'failed'
export type CompanionState = 'idle' | 'listening' | 'thinking' | 'speaking'

export interface SubtitleItem {
  id: string
  sender: 'user' | 'ai'
  text: string
  translation?: string
  timestamp: number
}

export interface Avatar {
  id: string
  name: string
  role: string
  personality: string
  color: string
  iconLabel: string
  imageUrl?: string
}

export interface SpeechStyle {
  id: string
  name: string
  description: string
  instruction: string
}

export const SUPPORTED_LANGUAGES = [
  { code: 'es', name: 'Espanol', flag: 'AR' },
  { code: 'en', name: 'English', flag: 'US' },
  { code: 'pt', name: 'Portugues', flag: 'BR' },
] as const

export const DOMINUS_AVATARS: Avatar[] = [
  {
    id: 'dominus-serio',
    name: 'Dominus',
    role: 'Asistente Virtual',
    personality: 'Autoritario, confiable, inteligente. Habla con seguridad y premium tech.',
    color: '#d4af37',
    iconLabel: 'D',
    imageUrl: '/avatar/dominus_primer_plano_serio_v01.png',
  },
  {
    id: 'dominus-confiado',
    name: 'Dominus',
    role: 'Companion Virtual',
    personality: 'Amigable, cercano, positivo. Sonrisa confiada y trato personal.',
    color: '#f0d060',
    iconLabel: 'D',
    imageUrl: '/avatar/dominus_primer_plano_sonrisa_confiada_v01.png',
  },
]

export const SPEECH_STYLES: SpeechStyle[] = [
  {
    id: 'warm',
    name: 'Amigable y cercano',
    description: 'Habla como un amigo de confianza',
    instruction: 'Sos un amigo cercano. Hablá de forma natural, cálida y empática. Usá un tono relajado.',
  },
  {
    id: 'advisor',
    name: 'Asesor profesional',
    description: 'Responde con autoridad y conocimiento',
    instruction: 'Sos un asesor experto. Respondé con precisión, autoridad y confianza. Sé directo y útil.',
  },
  {
    id: 'casual',
    name: 'Casual',
    description: 'Conversación relajada y sin formalismos',
    instruction: 'Hablá como si fueras un amigo relajado. Usá modismos, se corta y es directo.',
  },
  {
    id: 'motivational',
    name: 'Motivador',
    description: 'Inspira y motiva con energía',
    instruction: 'Sos un coach motivador. Hablá con energía, pasión y ganas de impulsar a la persona.',
  },
]

export const DEFAULT_CONFIG = {
  targetLanguage: 'es',
  avatarId: 'dominus-serio',
  speechStyleId: 'warm',
  isMuted: false,
}
