export interface InterestedPassenger {
  id: string;
  name: string;
  initials: string;
  rating?: string;
  tripsCount?: number;
  isNew?: boolean;
  assigned: boolean;
}
