import { mockTrips } from "@/screens/home/constants";
import { buildMockResults } from "@/screens/search-results/constants";
import type { InterestedPassenger } from "@/screens/trip-detail/interfaces";
import type { TripListing } from "@/types/trip";

// Mock data until the API layer is in place
export const mockTripExtras = {
  seatsTotal: 3,
  driverTripsCount: 23,
  dateLong: "Sábado 20 de junio · 09:00",
  notes:
    "No se llevan mascotas. Lugar para equipaje chico. Salimos puntual desde la plaza principal.",
} as const;

export const mockDriverTrip = {
  from: "Colegiales",
  to: "Capital Federal",
  dateLong: "Sábado 20 de junio · 09:00",
  price: "$8.500",
  seatsTotal: 3,
} as const;

export const mockInterestedPassengers: InterestedPassenger[] = [
  {
    id: "interested-1",
    name: "Sofía García",
    initials: "SG",
    rating: "4.8",
    tripsCount: 12,
    assigned: true,
  },
  {
    id: "interested-2",
    name: "Diego López",
    initials: "DL",
    rating: "4.6",
    tripsCount: 5,
    assigned: false,
  },
  {
    id: "interested-3",
    name: "Martín Ruiz",
    initials: "MR",
    isNew: true,
    assigned: false,
  },
];

export const findMockTrip = (
  id: string | undefined,
  destination: string,
): TripListing => {
  const allTrips = [...buildMockResults(destination), ...mockTrips];
  return allTrips.find((trip) => trip.id === id) ?? allTrips[0];
};
