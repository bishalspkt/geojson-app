import { Code2, Import, Layers, Ruler } from 'lucide-react';
import { registerPanel } from '@/extensions/panels/registry';
import UploadPanel from './panels/UploadPanel';
import LayersPanel from './panels/LayersPanel';
import MeasurePanel from './panels/MeasurePanel';
import DevelopersPanel from './panels/DevelopersPanel';

/** Built-in control-bar panels. Order values leave room for extensions in between. */
export function registerBuiltinPanels(): void {
  registerPanel({
    id: 'upload',
    title: 'Import',
    icon: Import,
    component: UploadPanel,
    order: 10,
  });
  registerPanel({
    id: 'layers',
    title: 'Layers',
    icon: Layers,
    component: LayersPanel,
    order: 20,
    embedVisible: true,
  });
  registerPanel({
    id: 'measure',
    title: 'Measure',
    icon: Ruler,
    component: MeasurePanel,
    order: 30,
  });
  registerPanel({
    id: 'developers',
    title: 'Embed',
    icon: Code2,
    component: DevelopersPanel,
    order: 40,
  });
}
