"use client";

import { createContext, useContext, useEffect, useState } from "react";

type Location = {
  id: string;
  name: string;
  storeNumber?: string | null;
};

type LocationContextType = {
  selectedLocationId: string | null;
  setSelectedLocationId: (id: string | null) => void;
  locations: Location[];
  loading: boolean;
  effectiveLocationId: (fallbackToFirst?: boolean) => string | null;
};

const LocationContext = createContext<LocationContextType>({
  selectedLocationId: null,
  setSelectedLocationId: () => {},
  locations: [],
  loading: true,
  effectiveLocationId: () => null,
});

export function LocationProvider({ children }: { children: React.ReactNode }) {
  const [locations, setLocations] = useState<Location[]>([]);
  const [selectedLocationId, setSelectedLocationIdState] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    fetch("/api/v1/locations")
      .then((r) => r.json())
      .then((data) => {
        const locs = data?.data || [];
        setLocations(locs);

        const saved = localStorage.getItem("wtf_selected_location");
        if (saved && locs.some((l: Location) => l.id === saved)) {
          setSelectedLocationIdState(saved);
        } else if (locs.length === 1) {
          setSelectedLocationIdState(locs[0].id);
        }

        setInitialized(true);
      })
      .finally(() => setLoading(false));
  }, []);

  function setSelectedLocationId(id: string | null) {
    setSelectedLocationIdState(id);
    if (id) {
      localStorage.setItem("wtf_selected_location", id);
    } else {
      localStorage.removeItem("wtf_selected_location");
    }
  }

  function effectiveLocationId(fallbackToFirst = false): string | null {
    if (selectedLocationId) return selectedLocationId;
    if (fallbackToFirst && locations.length > 0) return locations[0].id;
    return null;
  }

  if (!initialized) {
    return <>{children}</>;
  }

  return (
    <LocationContext.Provider
      value={{ selectedLocationId, setSelectedLocationId, locations, loading, effectiveLocationId }}
    >
      {children}
    </LocationContext.Provider>
  );
}

export function useLocation() {
  return useContext(LocationContext);
}
