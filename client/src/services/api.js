import axios from "axios";

const api = axios.create({ baseURL: "/api" });

export const imageUrl = (filename) =>
  filename ? `/uploads/${filename}` : "/placeholder-sweet.svg";

export default api;
