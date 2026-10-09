/**
 * @fileOverview Utility types for handling nullable and optional values.
 */

/**
 * A value that may be `T` or `null`.
 */
export type Nullable<T> = T | null;

/**
 * A value that may be `T`, `null`, or `undefined`.
 * Useful for optional fields that can also be explicitly set to null.
 */
export type OptionalNullable<T> = T | null | undefined;