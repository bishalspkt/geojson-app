import React, { createContext, useContext, useMemo } from 'react';
import { EmbedConfig, parseEmbedParams } from '@/lib/embed-params';

const EmbedContext = createContext<EmbedConfig | null>(null);

export function EmbedProvider({ children }: { children: React.ReactNode }) {
  const config = useMemo(() => parseEmbedParams(), []);
  return (
    <EmbedContext.Provider value={config}>
      {children}
    </EmbedContext.Provider>
  );
}

export function useEmbed(): EmbedConfig {
  const ctx = useContext(EmbedContext);
  if (!ctx) throw new Error('useEmbed must be used within EmbedProvider');
  return ctx;
}
