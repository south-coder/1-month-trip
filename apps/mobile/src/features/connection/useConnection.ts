import { useCallback, useEffect, useRef, useState } from "react";
import { Platform } from "react-native";
import { checkHealth, type Connection } from "./api";

function apiBase(): string | null {
  if (process.env.EXPO_PUBLIC_API_URL) return process.env.EXPO_PUBLIC_API_URL;
  if (Platform.OS !== "web") return "http://localhost:8000";
  if (!/^https?:$/.test(window.location.protocol)) return null;
  return `${window.location.protocol}//${window.location.hostname}:8000`;
}
export function useConnection() {
  const [connection, setConnection] = useState<Connection>("loading");
  const request = useRef(0);
  const connect = useCallback(async () => {
    const current = ++request.current;
    const base = apiBase();
    if (!base) {
      setConnection("error");
      return;
    }
    setConnection("loading");
    const result = await checkHealth(base);
    if (request.current === current) setConnection(result);
  }, []);
  useEffect(() => {
    void connect();
    return () => {
      request.current++;
    };
  }, [connect]);
  return { connection, connect };
}
