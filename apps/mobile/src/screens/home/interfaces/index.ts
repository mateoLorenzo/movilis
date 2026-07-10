export interface NextTrip {
  from: string;
  to: string;
  datetime: string;
  driverName: string;
  driverInitials: string;
  rating: string;
}

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
