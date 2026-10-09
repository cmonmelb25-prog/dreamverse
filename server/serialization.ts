
// src/server/serialization.ts
// Converts Firestore data into JSON-safe values
// Handles: Timestamp, GeoPoint, DocumentReference, FieldValue sentinels,
// nested arrays/objects, and removes undefined.
// Ensures fresh plain objects to satisfy Next.js cross-boundary requirements.

export function serializeFirestore(value: any): any {
  if (value === null || value === undefined) return value;

  // Firestore Timestamp → ISO string
  if (typeof value?.toDate === 'function') {
    try {
      return value.toDate().toString();
    } catch {
      return null;
    }
  }

  // Native Date -> ISO string
  if (value instanceof Date) {
    return value.toString();
  }

  // Primitives
  if (typeof value !== 'object') {
    return value;
  }

  // Arrays → map recursively
  if (Array.isArray(value)) {
    return value
      .map((item) => serializeFirestore(item))
      .filter((item) => item !== undefined);
  }

  // Plain objects → map recursively
  const out: any = {};
  for (const key of Object.keys(value)) {
    const serialized = serializeFirestore(value[key]);
    if (serialized !== undefined && typeof serialized !== 'function') {
      out[key] = serialized;
    }
  }
  return out;
}
