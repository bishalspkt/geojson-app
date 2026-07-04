import { createContext, useContext } from 'react';
import { EmbedConfig } from './params';

export const EmbedContext = createContext<EmbedConfig | null>(null);

export function useEmbed(): EmbedConfig {
  const ctx = useContext(EmbedContext);
  if (!ctx) throw new Error('useEmbed must be used within EmbedProvider');
  return ctx;
}
