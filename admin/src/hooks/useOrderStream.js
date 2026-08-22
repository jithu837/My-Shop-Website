import { useEffect, useRef } from "react";

const getApiBase = () => {
  const envUrl = import.meta.env.VITE_API_URL || "";
  if (!envUrl || envUrl.includes("elkf") || envUrl.includes("5pfw")) {
    return import.meta.env.DEV ? "" : "https://my-shop-website-g1pl.onrender.com";
  }
  return envUrl;
};

const API_BASE = getApiBase();
const STREAM_URL = API_BASE ? `${API_BASE}/api/orders/stream` : "/api/orders/stream";

/**
 * Subscribes to the server's SSE order stream.
 * Calls `onNewOrder(order)` whenever a new order is placed by a customer.
 * The EventSource auto-reconnects on network drops — no manual retry needed.
 *
 * @param {(order: object) => void} onNewOrder  stable callback (wrap in useCallback)
 */
const useOrderStream = (onNewOrder) => {
  // Store the latest callback in a ref so the effect doesn't need to re-run
  // when the caller re-renders (avoids closing/reopening the SSE connection).
  const cbRef = useRef(onNewOrder);
  useEffect(() => {
    cbRef.current = onNewOrder;
  }, [onNewOrder]);

  useEffect(() => {
    const es = new EventSource(STREAM_URL);

    es.onmessage = (e) => {
      try {
        const order = JSON.parse(e.data);
        cbRef.current?.(order);
      } catch {
        // Ignore heartbeat comments or malformed data.
      }
    };

    es.onerror = () => {
      // EventSource automatically retries — nothing to do here.
    };

    return () => es.close();
  }, []); // Only runs once — connection is stable for the lifetime of the admin tab.
};

export default useOrderStream;
