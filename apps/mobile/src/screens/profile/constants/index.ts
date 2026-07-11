import type { ProfileTrip } from "@/screens/profile/interfaces";

// Mock data until the API layer is in place
export const mockProfile = {
  name: "Mateo Lorenzo",
  initials: "ML",
  phone: "+54 11 4039-2404",
  rating: "4.9",
  tripsCount: 12,
} as const;

export const mockCompletedTrips: ProfileTrip[] = [
  {
    id: "completed-1",
    from: "Colegiales",
    to: "Mar del Plata",
    dateLabel: "Sáb 14 jun",
    role: "passenger",
  },
  {
    id: "completed-2",
    from: "Palermo",
    to: "Córdoba",
    dateLabel: "Dom 25 may",
    role: "driver",
  },
];

export const mockPublishedTrips: ProfileTrip[] = [
  {
    id: "published-1",
    from: "Colegiales",
    to: "Mar del Plata",
    dateLabel: "Sáb 20 jun",
    role: "driver",
  },
];
