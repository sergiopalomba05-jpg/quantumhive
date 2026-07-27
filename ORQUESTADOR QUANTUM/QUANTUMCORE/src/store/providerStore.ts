import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface CustomProvider {
  id: string;
  name: string;
  baseUrl: string;
  apiKey: string;
  models: { id: string; name: string; enabled: boolean }[];
}

interface ProviderState {
  customProviders: CustomProvider[];
  addCustomProvider: (provider: CustomProvider) => void;
  removeCustomProvider: (id: string) => void;
  updateCustomProvider: (id: string, provider: Partial<CustomProvider>) => void;
  toggleModel: (providerId: string, modelId: string) => void;
}

export const useProviderStore = create<ProviderState>()(
  persist(
    (set) => ({
      customProviders: [],
      addCustomProvider: (provider) =>
        set((state) => ({ customProviders: [...state.customProviders, provider] })),
      removeCustomProvider: (id) =>
        set((state) => ({
          customProviders: state.customProviders.filter((p) => p.id !== id),
        })),
      updateCustomProvider: (id, updatedFields) =>
        set((state) => ({
          customProviders: state.customProviders.map((p) =>
            p.id === id ? { ...p, ...updatedFields } : p
          ),
        })),
      toggleModel: (providerId, modelId) =>
        set((state) => ({
          customProviders: state.customProviders.map((p) => {
            if (p.id !== providerId) return p;
            return {
              ...p,
              models: p.models.map((m) =>
                m.id === modelId ? { ...m, enabled: !m.enabled } : m
              ),
            };
          }),
        })),
    }),
    {
      name: 'quantumcore-providers-storage',
    }
  )
);
