export type ProfileTripRole = "driver" | "passenger";

export interface ProfileTrip {
  id: string;
  from: string;
  to: string;
  dateLabel: string;
  role: ProfileTripRole;
}
