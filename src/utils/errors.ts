export class ServiceError extends Error {
  constructor(
    message: string,
    public code: string,
    public status: number = 400,
  ) {
    super(message);
    this.name = 'ServiceError';
  }
}

export function handleDatabaseError(error: any): never {
  // Handle common database errors
  if (error.code === '23505') {
    // Unique violation
    throw new ServiceError('Resource already exists', 'DUPLICATE_RESOURCE', 409);
  }
  if (error.code === '23503') {
    // Foreign key violation
    throw new ServiceError('Referenced resource not found', 'REFERENCE_ERROR', 404);
  }

  // Generic error
  throw new ServiceError(error.message || 'An unexpected error occurred', 'INTERNAL_ERROR', 500);
}
