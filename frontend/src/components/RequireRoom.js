import React, { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { getSession, SESSION_EXPIRED_EVENT } from "../utils/session";

/**
 * Gate for the Files and Text tabs. The home page stays public; these need a
 * room token. The token isn't re-validated here — the tab's own requests do
 * that, and `authFetch` fires SESSION_EXPIRED_EVENT if the server rejects it,
 * which drops the user back to the room gate.
 */
const RequireRoom = ({ children }) => {
  const location = useLocation();
  const [session, setSession] = useState(getSession);

  useEffect(() => {
    const handleExpired = () => setSession(null);
    window.addEventListener(SESSION_EXPIRED_EVENT, handleExpired);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, handleExpired);
  }, []);

  if (!session) {
    // Remember where they were headed so the gate can send them back.
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  return children;
};

export default RequireRoom;
