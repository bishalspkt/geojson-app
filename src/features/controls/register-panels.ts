import { BookOpen, Code2, Import, Layers, Ruler } from 'lucide-react';
import { lazyPanel, registerPanel } from '@/extensions/panels/registry';
import { useLayersStore } from '@/state/layers-store';
import { useStoryStore } from '@/state/story-store';
import { useEmbed } from '@/integrations/embed/embed-context';

/** Layers the user brought (story layers and search pins don't count). */
function useUserLayerCount(): number | null {
  return useLayersStore((s) => s.layers.filter((l) => l.origin !== 'story' && l.origin !== 'search' && l.features.length > 0).length);
}

/** Embeds show the Stories button only once a story is open. */
function useStoryButtonHidden(): boolean {
  const embed = useEmbed();
  const idle = useStoryStore((s) => s.status === 'idle');
  return embed.enabled && idle;
}

/** Built-in control-bar panels. Order values leave room for extensions in between. */
export function registerBuiltinPanels(): void {
  registerPanel({
    id: 'upload',
    title: 'Import',
    icon: Import,
    order: 10,
    ...lazyPanel(() => import('./panels/UploadPanel')),
  });
  registerPanel({
    id: 'layers',
    title: 'Layers',
    icon: Layers,
    order: 20,
    embedVisible: true,
    useBadge: useUserLayerCount,
    ...lazyPanel(() => import('./panels/LayersPanel')),
  });
  registerPanel({
    id: 'story',
    title: 'Stories',
    icon: BookOpen,
    order: 30,
    embedVisible: true,
    useHidden: useStoryButtonHidden,
    ...lazyPanel(() => import('@/features/story/StoryPanel')),
  });
  registerPanel({
    id: 'measure',
    title: 'Measure',
    icon: Ruler,
    order: 40,
    ...lazyPanel(() => import('./panels/MeasurePanel')),
  });
  registerPanel({
    id: 'developers',
    title: 'Embed',
    icon: Code2,
    order: 50,
    mobileVisible: false,
    ...lazyPanel(() => import('./panels/DevelopersPanel')),
  });
}
