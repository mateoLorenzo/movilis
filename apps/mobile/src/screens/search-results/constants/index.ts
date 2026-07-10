import type { TripListing } from "@/types/trip";

export const mockResultFilters = {
  dateLabel: "Sáb 20 jun",
  maxKm: 15,
} as const;

const baseResults: Omit<TripListing, "to">[] = [
  {
    id: "result-1",
    from: "Colegiales",
    datetime: "Sáb 20 jun, 09:00",
    seatsAvailable: 2,
    driverName: "Carlos Méndez",
    driverInitials: "CM",
    rating: "4.9",
    price: "$8.500",
  },
  {
    id: "result-2",
    from: "Lanús",
    datetime: "Sáb 20 jun, 10:30",
    seatsAvailable: 3,
    driverName: "Lucía Fernández",
    driverInitials: "LF",
    rating: "5.0",
    price: "$7.000",
    proximityKm: 8,
  },
  {
    id: "result-3",
    from: "Belgrano",
    datetime: "Sáb 20 jun, 14:00",
    seatsAvailable: 1,
    driverName: "Martín Rodríguez",
    driverInitials: "MR",
    rating: "4.2",
    price: "$9.500",
  },
];

export const buildMockResults = (destination: string): TripListing[] =>
  baseResults.map((result) => ({ ...result, to: destination }));
