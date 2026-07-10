import { create } from "zustand";

interface DevMocksState {
  hasNextTrip: boolean;
  setHasNextTrip: (hasNextTrip: boolean) => void;
}

export const useDevMocksStore = create<DevMocksState>((set) => ({
  hasNextTrip: true,
  setHasNextTrip: (hasNextTrip) => set({ hasNextTrip }),
}));
