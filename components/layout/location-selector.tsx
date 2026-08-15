"use client";

import { MapPin, ChevronDown, Check, Building2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useLocation } from "./location-context";

export function LocationSelector() {
  const { selectedLocationId, setSelectedLocationId, locations, loading } = useLocation();

  if (loading || locations.length === 0) return null;

  const selected = locations.find((l) => l.id === selectedLocationId);
  const showAllOption = locations.length > 1;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm hover:bg-accent transition-colors"
      >
        <MapPin className="h-4 w-4 text-muted-foreground" />
        <span className="max-w-[120px] truncate">
          {selected ? selected.name : "All Stores"}
        </span>
        {selected?.storeNumber && (
          <span className="text-xs text-muted-foreground">#{selected.storeNumber}</span>
        )}
        <ChevronDown className="h-3 w-3 text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        {showAllOption && (
          <>
            <DropdownMenuItem
              onClick={() => setSelectedLocationId(null)}
              className="gap-2"
            >
              <Check
                className={cn("h-4 w-4", !selectedLocationId ? "opacity-100" : "opacity-0")}
              />
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <span>All Stores</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        )}
        {locations.map((loc) => (
          <DropdownMenuItem
            key={loc.id}
            onClick={() => setSelectedLocationId(loc.id)}
            className="gap-2"
          >
            <Check
              className={cn("h-4 w-4", loc.id === selectedLocationId ? "opacity-100" : "opacity-0")}
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
