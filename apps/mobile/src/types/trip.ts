export interface TripListing {
  id: string;
  from: string;
  to: string;
  datetime: string;
  seatsAvailable: number;
  driverName: string;
  driverInitials: string;
  rating: string;
  price: string;
  proximityKm?: number;
}
