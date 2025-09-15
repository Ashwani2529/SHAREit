import { useState } from "react";
import { useNavigate } from "react-router-dom";

const Login = () => {
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const navigate = useNavigate();

  async function onSubmit(e) {
    e.preventDefault();
    setErr("");
    //encrypt password before storing it in localStorage for better security
    const encryptedPassword = btoa(password);
    localStorage.setItem("privatePassword", encryptedPassword);
    // Optionally, you can test it immediately by hitting a protected route
    await fetch("https://multer-3w57.onrender.com/checkpassword", {
      method: "GET",
      headers: { "x-access-password": encryptedPassword }
    })
      .then(res => {
        if (!res.ok) throw new Error("Invalid password");
        navigate("/private");
      })
      .catch(() => setErr("Invalid password"));
  }

  return (
    <form onSubmit={onSubmit} style={{ marginTop: "10rem" }} className="card flex flex-col gap-1 align-center justify-center w-[30%] mx-auto p-4">
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