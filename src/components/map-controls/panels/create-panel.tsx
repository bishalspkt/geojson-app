import { Circle, Diamond, MapPin, Pentagon, Triangle } from "lucide-react";
import { Button } from "../../ui/button";
import Panel from "./panel";
import { PanelType } from "../types";

export default function CreatePanel({ togglePanel }: { togglePanel: (panel: PanelType) => void }) {
    return (<Panel type="create" onToggle={togglePanel} className="px-4 py-2">
        <p>Select a tool to begin editing</p>
        <p className="text-gray-600 text-sm">Add layers</p>
        <div className="py-2 mr-auto flex gap-4" onClick={() => alert("Create Features are not currently implemented")}>
            <Button variant="secondary" size="icon"><MapPin /></Button>
            <Button variant="secondary" size="icon"><Triangle /></Button>
            <Button variant="secondary" size="icon"><Diamond /></Button>
            <Button variant="secondary" size="icon"><Pentagon /></Button>
            <Button variant="secondary" size="icon"><Circle /></Button>
        </div>
    </Panel>)
}