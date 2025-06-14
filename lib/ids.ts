export const isConvexId = (id?: string) =>
  typeof id === 'string' && /^[a-z0-9]{24,32}$/i.test(id);
