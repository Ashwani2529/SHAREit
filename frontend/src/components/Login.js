// Login.jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";

const Login = () => {
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const navigate = useNavigate();

  async function onSubmit(e) {
    e.preventDefault();
    setErr("");
    const res = await fetch("https://multer-3w57.onrender.com/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      
      credentials: "include",
      body: JSON.stringify({ password }),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setErr(j.error || "Login failed");
      return;
    }
    navigate("/private");
  }

  return (
    <form onSubmit={onSubmit} style={{marginTop: "10rem"}} className="card flex flex-col gap-1 align-center justify-center w-[30%] mx-auto p-4">
      <h2>Enter Password</h2>
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Password"
      />
      {err && <div className="error text-white">{err}</div>}
      <button type="submit">Login</button>
    </form>
  );
};
export default Login;
