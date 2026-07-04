import { EmbedConfig } from './params';
import { EmbedContext } from './embed-context';

export function EmbedProvider({
  config,
  children,
}: {
  config: EmbedConfig;
  children: React.ReactNode;
}) {
  return <EmbedContext.Provider value={config}>{children}</EmbedContext.Provider>;
}
