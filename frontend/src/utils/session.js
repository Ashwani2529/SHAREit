/**
 * Room session handling.
 *
 * A room is the only identity in the app: the user types a room number and a
 * PIN, the backend returns a 30-day token, and every Files/Text request carries
 * it. The token is the single source of truth — we keep the room number and
 * expiry alongside it only so the UI can label the room and stop using a token
 * the server would reject anyway.
 */

export const API_BASE =
  process.env.REACT_APP_API_URL || "https://multer-3w57.onrender.com";

const TOKEN_KEY = "roomToken";
const ROOM_KEY = "roomNumber";
const EXPIRY_KEY = "roomTokenExpiresAt";

// Lets the route guard react the moment a request comes back unauthorized,
// instead of waiting for the next navigation.
export const SESSION_EXPIRED_EVENT = "shareit:session-expired";

export class SessionExpiredError extends Error {
  constructor() {
    super("Your room session has expired. Please enter your room again.");
    this.name = "SessionExpiredError";
  }
}

export const clearSession = () => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(ROOM_KEY);
  localStorage.removeItem(EXPIRY_KEY);
};

export const getSession = () => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (!token) return null;

  const expiresAt = localStorage.getItem(EXPIRY_KEY);
  if (expiresAt && Date.parse(expiresAt) <= Date.now()) {
    clearSession();
    return null;
  }

  return {
    token,
    roomNumber: localStorage.getItem(ROOM_KEY) || "",
    expiresAt,
  };
};

export const saveSession = ({ token, roomNumber, expiresAt }) => {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(ROOM_KEY, roomNumber);
  if (expiresAt) localStorage.setItem(EXPIRY_KEY, expiresAt);
};

const notifyExpired = () => {
  window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
};

export const endSession = () => {
  clearSession();
  notifyExpired();
};

/**
 * `fetch` against the API with the room token attached. Throws
 * SessionExpiredError (after clearing the session) when the server rejects the
 * token, so callers can skip their own error toast in that case.
 */
export const authFetch = async (path, options = {}) => {
  const session = getSession();
  if (!session) {
    notifyExpired();
    throw new SessionExpiredError();
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
      Authorization: `Bearer ${session.token}`,
    },
  });

  if (response.status === 401) {
    clearSession();
    notifyExpired();
    throw new SessionExpiredError();
  }

  return response;
};
