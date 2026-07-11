import { mockTrips } from "@/screens/home/constants";
import { buildMockResults } from "@/screens/search-results/constants";
import type { TripListing } from "@/types/trip";

// Mock data until the API layer is in place
export const mockTripExtras = {
  seatsTotal: 3,
  driverTripsCount: 23,
  dateLong: "Sábado 20 de junio · 09:00",
  notes:
    "No se llevan mascotas. Lugar para equipaje chico. Salimos puntual desde la plaza principal.",
} as const;

export const findMockTrip = (
  id: string | undefined,
  destination: string,
): TripListing => {
  const allTrips = [...buildMockResults(destination), ...mockTrips];
  return allTrips.find((trip) => trip.id === id) ?? allTrips[0];
};
