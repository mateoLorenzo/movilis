import type { NextTrip, TripListing } from "@/screens/home/interfaces";

// Mock data until the API layer is in place
export const mockUser = {
  name: "Mateo",
  initials: "M",
} as const;

export const mockNextTrip: NextTrip = {
  from: "Colegiales",
  to: "Mar del Plata",
  datetime: "Sábado 14 de junio · 09:00",
  driverName: "Juan Pereyra",
  driverInitials: "JP",
  rating: "4.8",
};

export const mockFavoriteDestinations = [
  "Mar del Plata",
  "Córdoba",
  "Rosario",
  "Bariloche",
];

export const mockTrips: TripListing[] = [
  {
    id: "trip-1",
    from: "Colegiales",
    to: "Mar del Plata",
    datetime: "Sáb 14 jun, 09:00",
    seatsAvailable: 2,
    driverName: "Carlos Méndez",
    driverInitials: "CM",
    rating: "4.9",
    price: "$8.500",
  },
  {
    id: "trip-2",
    from: "Palermo",
    to: "Mar del Plata",
    datetime: "Dom 15 jun, 07:30",
    seatsAvailable: 3,
    driverName: "Lucía Fernández",
    driverInitials: "LF",
    rating: "5.0",
    price: "$9.000",
    proximityKm: 4,
  },
];
