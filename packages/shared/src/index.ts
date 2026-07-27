export interface ApiResponse<T> {
  data: T;
  message: string;
  success: boolean;
}

export * from './primitives/id.js'
export * from './primitives/pagination.js'
export * from './primitives/timestamp.js'
