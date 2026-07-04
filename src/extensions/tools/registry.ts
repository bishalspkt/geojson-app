import { MapTool } from '@/core/tools';

const tools = new Map<string, MapTool>();

export function registerTool(tool: MapTool): void {
  tools.set(tool.id, tool);
}

export function unregisterTool(id: string): void {
  tools.delete(id);
}

export function getTool(id: string): MapTool | undefined {
  return tools.get(id);
}

export function listTools(): MapTool[] {
  return Array.from(tools.values());
}
