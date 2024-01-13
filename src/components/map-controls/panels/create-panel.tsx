import { Circle, Diamond, MapPin, Pentagon, Triangle } from "lucide-react";
import { Button } from "../../ui/button";
import Panel from "./panel";
import { PanelType } from "../types";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTrigger } from "../../ui/dialog";
import { DialogClose, DialogDescription, DialogTitle } from "@radix-ui/react-dialog";

export default function CreatePanel({ togglePanel }: { togglePanel: (panel: PanelType) => void }) {
    return (<Panel type="create" onToggle={togglePanel} className="px-4 py-2">
        <p>Select a tool to begin editing</p>
        <p className="text-gray-600 text-sm">Add layers</p>
        <Dialog>
      <DialogTrigger asChild>
      <div className="py-2 mr-auto flex gap-4">
            <Button variant="secondary" size="icon"><MapPin /></Button>
            <Button variant="secondary" size="icon"><Triangle /></Button>
            <Button variant="secondary" size="icon"><Diamond /></Button>
            <Button variant="secondary" size="icon"><Pentagon /></Button>
            <Button variant="secondary" size="icon"><Circle /></Button>
        </div>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Not Currently Implemented</DialogTitle>
          <DialogDescription>
            Create is currently a planned feature. Please check back in a few weeks.
          </DialogDescription>
        </DialogHeader>
        <div className="flex items-center space-x-2">

        </div>
        <DialogFooter className="sm:justify-start">
          <DialogClose asChild>
            <Button type="button" variant="secondary">
              Okay
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
       
    </Panel>)
}