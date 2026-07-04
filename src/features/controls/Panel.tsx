import { X } from 'lucide-react';
import { getPanel } from '@/extensions/panels/registry';
import { useEmbed } from '@/integrations/embed/embed-context';
import { togglePanelWithPolicy } from './panel-policy';

export interface PanelContainerProps {
  panelId: string;
  children: React.ReactNode;
  className?: string;
}

/** Shared chrome around a panel body: header, close button, scroll container. */
export default function Panel({ panelId, children, className = '' }: PanelContainerProps) {
  const embed = useEmbed();
  const definition = getPanel(panelId);
  if (!definition) return null;

  const Icon = definition.icon;
  const onToggle = () => togglePanelWithPolicy(panelId);

  if (embed.enabled) {
    return (
      <div className="fixed left-0 top-0 bottom-12 w-[260px] z-20 bg-white/50 backdrop-blur-xl border-r border-white/20 shadow-lg shadow-black/5">
        <div
          className="flex items-center gap-2 px-3 py-2 border-b border-white/20 cursor-pointer hover:bg-white/30 transition-colors duration-150"
          onClick={onToggle}
        >
          <span className="text-gray-500"><Icon className="h-4 w-4" /></span>
          <h2 className="text-xs font-extrabold text-gray-900 tracking-tight" style={{ fontFamily: 'var(--font-heading)' }}>{definition.title}</h2>
          <button
            className="ml-auto h-5 w-5 flex items-center justify-center rounded-md hover:bg-black/5 transition-colors duration-150"
            aria-label={`Close ${definition.title} panel`}
          >
            <X className="h-3 w-3 text-gray-400" />
          </button>
        </div>
        <div data-scroll-container className={`flex flex-col gap-1 text-left max-h-[calc(100vh-88px)] overflow-y-auto ${className}`}>
          {children}
        </div>
      </div>
    );
  }

  return (
    <div className="fixed left-0 bottom-[52px] sm:left-3 sm:bottom-16 w-full sm:w-[420px] max-h-[50vh] sm:max-h-[70vh] z-20 rounded-t-2xl sm:rounded-2xl bg-white/70 backdrop-blur-2xl border-t sm:border border-white/30 shadow-2xl shadow-black/10 flex flex-col">
      <div
        className="flex items-center gap-2 px-4 sm:px-3 py-3 sm:py-2.5 border-b border-white/30 cursor-pointer rounded-t-2xl hover:bg-white/40 transition-colors duration-150 shrink-0"
        onClick={onToggle}
      >
        <span className="text-gray-500"><Icon className="h-4 w-4" /></span>
        <h2 className="text-sm font-extrabold text-gray-900 tracking-tight" style={{ fontFamily: 'var(--font-heading)' }}>{definition.title}</h2>
        <button
          className="ml-auto h-7 w-7 sm:h-6 sm:w-6 flex items-center justify-center rounded-lg hover:bg-black/5 transition-colors duration-150"
          aria-label={`Close ${definition.title} panel`}
        >
          <X className="h-4 w-4 sm:h-3.5 sm:w-3.5 text-gray-400" />
        </button>
      </div>
      <div data-scroll-container className={`flex flex-col gap-2 text-left overflow-y-auto min-h-0 ${className}`}>
        {children}
      </div>
    </div>
  );
}
