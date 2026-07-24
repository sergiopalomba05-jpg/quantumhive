export interface N8NTemplateReference {
  id: number;
  name: string;
  url: string;
  category: string;
  usefulFor: string[];
  requiredServices: string[];
}

export const N8N_TEMPLATE_REFERENCES: N8NTemplateReference[] = [
  { id: 4827, name: 'AI WhatsApp Chatbot con RAG', url: 'https://n8n.io/workflows/4827', category: 'customer_support', usefulFor: ['WhatsApp', 'RAG', 'soporte'], requiredServices: ['WhatsApp Business API', 'MongoDB Atlas', 'OpenAI'] },
  { id: 4846, name: 'Generar videos AI y subir a YouTube', url: 'https://n8n.io/workflows/4846', category: 'content_creation', usefulFor: ['video', 'YouTube', 'Google Sheets'], requiredServices: ['Google Sheets', 'Google Drive', 'OpenAI', 'YouTube'] },
  { id: 4352, name: 'Automatizacion Social con Google Trends', url: 'https://n8n.io/workflows/4352', category: 'marketing', usefulFor: ['social media', 'trends', 'posts'], requiredServices: ['Google Trends', 'Perplexity', 'LinkedIn'] },
  { id: 5171, name: 'Tutorial interactivo de APIs', url: 'https://n8n.io/workflows/5171', category: 'education', usefulFor: ['aprendizaje', 'API', 'webhooks'], requiredServices: [] },
];
