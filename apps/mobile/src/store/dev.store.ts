import { create } from "zustand";

export type DevListVariant = "empty" | "one" | "many";

interface DevMocksState {
  hasNextTrip: boolean;
  favoritesVariant: DevListVariant;
  tripsVariant: DevListVariant;
  resultsVariant: DevListVariant;
  showPassengerReview: boolean;
  showDriverReview: boolean;
  driverTripView: boolean;
  setHasNextTrip: (hasNextTrip: boolean) => void;
  setFavoritesVariant: (variant: DevListVariant) => void;
  setTripsVariant: (variant: DevListVariant) => void;
  setResultsVariant: (variant: DevListVariant) => void;
  setShowPassengerReview: (show: boolean) => void;
  setShowDriverReview: (show: boolean) => void;
  setDriverTripView: (driver: boolean) => void;
}

export const useDevMocksStore = create<DevMocksState>((set) => ({
  hasNextTrip: false,
  favoritesVariant: "empty",
  tripsVariant: "empty",
  resultsVariant: "empty",
  showPassengerReview: false,
  showDriverReview: false,
  driverTripView: false,
  setHasNextTrip: (hasNextTrip) => set({ hasNextTrip }),
  setFavoritesVariant: (favoritesVariant) => set({ favoritesVariant }),
  setTripsVariant: (tripsVariant) => set({ tripsVariant }),
  setResultsVariant: (resultsVariant) => set({ resultsVariant }),
  setShowPassengerReview: (showPassengerReview) =>
    set({ showPassengerReview }),
  setShowDriverReview: (showDriverReview) => set({ showDriverReview }),
  setDriverTripView: (driverTripView) => set({ driverTripView }),
}));
