export function sanitizeForFirestore(obj: any): any {
  if (Array.isArray(obj)) {
    return obj.map(sanitizeForFirestore);
  } else if (obj !== null && typeof obj === 'object') {
    const sanitizedObj: any = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value === undefined) {
        sanitizedObj[key] = null;
      } else {
        sanitizedObj[key] = sanitizeForFirestore(value);
      }
    }
    return sanitizedObj;
  } else {
    return obj;
  }
}
