import { Circle, Diamond, MapPin, Pentagon, Triangle } from "lucide-react";
import { Button } from "../../ui/button";
import Panel from "./panel";
import { PanelType } from "@/types";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTrigger } from "../../ui/dialog";
import { DialogClose, DialogDescription, DialogTitle } from "@radix-ui/react-dialog";

export default function CreatePanel({ togglePanel }: { togglePanel: (panel: PanelType) => void }) {
    return (<Panel type="create" onToggle={togglePanel} className="px-4 py-3">
        <p className="text-sm font-semibold text-gray-800">Select a tool to begin</p>
        <p className="text-gray-400 text-xs">Add geometry layers</p>
        <Dialog>
      <DialogTrigger asChild>
      <div className="py-2 mr-auto flex gap-2">
            <Button variant="outline" size="icon" className="rounded-xl h-9 w-9"><MapPin className="h-4 w-4" /></Button>
            <Button variant="outline" size="icon" className="rounded-xl h-9 w-9"><Triangle className="h-4 w-4" /></Button>
            <Button variant="outline" size="icon" className="rounded-xl h-9 w-9"><Diamond className="h-4 w-4" /></Button>
            <Button variant="outline" size="icon" className="rounded-xl h-9 w-9"><Pentagon className="h-4 w-4" /></Button>
            <Button variant="outline" size="icon" className="rounded-xl h-9 w-9"><Circle className="h-4 w-4" /></Button>
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