"use client";

import { useState } from "react";
import { MapPin, ChevronDown, Check } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

type Location = {
  id: string;
  name: string;
  storeNumber?: string | null;
};

export function LocationSelector() {
  const [locations] = useState<Location[]>([
    { id: "1", name: "Main", storeNumber: "001" },
    { id: "2", name: "Downtown", storeNumber: "002" },
  ]);
  const [selectedId, setSelectedId] = useState(locations[0]?.id);

  const selected = locations.find((l) => l.id === selectedId);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm hover:bg-accent transition-colors"
      >
        <MapPin className="h-4 w-4 text-muted-foreground" />
        <span className="max-w-[120px] truncate">{selected?.name || "Select location"}</span>
        {selected?.storeNumber && (
          <span className="text-xs text-muted-foreground">#{selected.storeNumber}</span>
        )}
        <ChevronDown className="h-3 w-3 text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        {locations.map((loc) => (
          <DropdownMenuItem
            key={loc.id}
            onClick={() => setSelectedId(loc.id)}
            className="gap-2"
          >
            <Check
              className={cn("h-4 w-4", loc.id === selectedId ? "opacity-100" : "opacity-0")}
            />
            <span>{loc.name}</span>
            {loc.storeNumber && (
              <span className="ml-auto text-xs text-muted-foreground">#{loc.storeNumber}</span>
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
