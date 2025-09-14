// RequireAuth.jsx
import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";

const RequireAuth = ({ children }) => {
  const [loading, setLoading] = useState(true);
  const [authed, setAuthed] = useState(false);

 useEffect(() => {
  let alive = true;

  (async () => {
    try {
      const res = await fetch("https://multer-3w57.onrender.com/api/me", {
        credentials: "include",
      });
      const { user } = await res.json();
      if (!alive) return;
      console.log("User auth status:", user);
      setAuthed(!!user); 
    } catch {
      if (!alive) return;
      setAuthed(false);
    } finally {
      if (alive) setLoading(false);
    }
  })();

  return () => { alive = false; };
}, []);


  if (loading) return <div className="page-center">Checking access…</div>;
  if (!authed) return <Navigate to="/login" />;
  return children;
}
export default RequireAuth;