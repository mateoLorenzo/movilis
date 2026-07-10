import { create } from "zustand";

export type DevListVariant = "empty" | "one" | "many";

interface DevMocksState {
  hasNextTrip: boolean;
  favoritesVariant: DevListVariant;
  tripsVariant: DevListVariant;
  setHasNextTrip: (hasNextTrip: boolean) => void;
  setFavoritesVariant: (variant: DevListVariant) => void;
  setTripsVariant: (variant: DevListVariant) => void;
}

export const useDevMocksStore = create<DevMocksState>((set) => ({
  hasNextTrip: false,
  favoritesVariant: "empty",
  tripsVariant: "empty",
  setHasNextTrip: (hasNextTrip) => set({ hasNextTrip }),
  setFavoritesVariant: (favoritesVariant) => set({ favoritesVariant }),
  setTripsVariant: (tripsVariant) => set({ tripsVariant }),
}));
