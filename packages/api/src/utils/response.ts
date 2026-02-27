export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export const success = <T>(data: T): ApiResponse<T> => ({
  success: true,
  data,
});

export const error = (message: string): ApiResponse => ({
  success: false,
  error: message,
});
