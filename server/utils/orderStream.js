// Maintains the set of connected SSE admin clients.
// Simple in-memory Set — works perfectly for single-instance deployments (Render free tier).
// If you ever scale to multiple dynos, swap this for Redis Pub/Sub.

const clients = new Set();

export const addClient = (res) => clients.add(res);
export const removeClient = (res) => clients.delete(res);

/** Push a new-order event to every connected admin browser tab. */
export const emitNewOrder = (order) => {
  const payload = `data: ${JSON.stringify(order)}\n\n`;
  for (const res of clients) {
    try {
      res.write(payload);
    } catch {
      // Client disconnected mid-write — clean up silently.
      clients.delete(res);
    }
  }
};
