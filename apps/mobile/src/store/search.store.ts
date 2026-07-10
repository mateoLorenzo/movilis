import { create } from "zustand";

interface SearchState {
  origin: string;
  destination: string | null;
  setOrigin: (origin: string) => void;
  setDestination: (destination: string | null) => void;
}

// Mock initial origin until location/API is in place
const mockOriginAddress = "Jorge Newbery 2484";

export const useSearchStore = create<SearchState>((set) => ({
  origin: mockOriginAddress,
  destination: null,
  setOrigin: (origin) => set({ origin }),
  setDestination: (destination) => set({ destination }),
}));
