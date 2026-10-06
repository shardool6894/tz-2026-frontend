import { API_URL } from "../../config";

// fetch helper that sends the saved login token. Returns { res, data }.
export const authFetch = async (path, options = {}) => {
  let token = "";
  try {
    token = localStorage.getItem("token") || "";
  } catch {
    /* storage blocked */
  }
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    },
  });
  let data = {};
  try {
    data = await res.json();
  } catch {
    /* non-JSON body */
  }
  return { res, data };
};
