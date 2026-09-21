import { useEffect, useRef } from "react";

const getApiBase = () => {
  const envUrl = import.meta.env.VITE_API_URL || "";
  if (!envUrl) {
    return import.meta.env.DEV ? "" : "https://my-shop-website-z6h7.onrender.com";
  }
  return envUrl;
};

const API_BASE = getApiBase();

const getStreamUrl = () => {
  const token = localStorage.getItem("admin_token");
  const baseUrl = API_BASE ? `${API_BASE}/api/orders/stream` : "/api/orders/stream";
  return token ? `${baseUrl}?token=${encodeURIComponent(token)}` : baseUrl;
};

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
    const streamUrl = getStreamUrl();
    const es = new EventSource(streamUrl);

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
