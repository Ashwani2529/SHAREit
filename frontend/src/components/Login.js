import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import Page from "./Page";
import { TopProgressBar } from "./Loader";
import { API_BASE, saveSession } from "../utils/session";

/**
 * Room gate for the Files and Text tabs. A room number that doesn't exist yet
 * is created with the PIN entered here, so the first visit doubles as sign-up.
 * The PIN is base64 encoded (btoa) before it leaves the browser; the backend
 * stores only a bcrypt hash of it.
 *
 * Class names here deliberately avoid `input-group`, `text-muted` and friends:
 * index.html pulls in Bootstrap, which claims those names and fights the app's
 * own styles.
 */
const Login = () => {
  const [roomNumber, setRoomNumber] = useState("");
  const [pin, setPin] = useState("");
  const [err, setErr] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // Where the guard bounced them from, so we can put them back.
  const destination = location.state?.from || "/files";

  async function onSubmit(e) {
    e.preventDefault();
    setErr("");
    setIsSubmitting(true);

    try {
      const response = await fetch(`${API_BASE}/room/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomNumber: roomNumber.trim(),
          pin: btoa(pin),
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || "Couldn't enter the room");
      }

      saveSession(data);
      toast.success(
        data.created
          ? `Room ${data.roomNumber} created`
          : `Welcome back to room ${data.roomNumber}`
      );
      navigate(destination, { replace: true });
    } catch (error) {
      setErr(error.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <TopProgressBar active={isSubmitting} />
      <Page />
      <main className="main-content">
        <div className="container">
          <form onSubmit={onSubmit} className="room-gate card">
            <h2 className="room-gate-title">
              <i className="bx bx-lock-open"></i>
              Enter your room
            </h2>
            <p className="room-gate-hint">
              Your files and texts live in your room. New room number? It's
              created with the PIN you set here.
            </p>

            <div className="room-gate-field">
              <label htmlFor="room-number" className="room-gate-label">
                Room number
              </label>
              <input
                id="room-number"
                type="text"
                value={roomNumber}
                onChange={(e) => setRoomNumber(e.target.value.toUpperCase())}
                placeholder="e.g. ABC1234"
                className="room-gate-input"
                autoComplete="off"
                autoCapitalize="characters"
                spellCheck="false"
              />
            </div>

            <div className="room-gate-field">
              <label htmlFor="room-pin" className="room-gate-label">
                PIN
              </label>
              <input
                id="room-pin"
                type="password"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="At least 4 characters"
                className="room-gate-input"
                autoComplete="current-password"
              />
            </div>

            {err && (
              <div className="room-gate-error">
                <i className="bx bx-error-circle"></i>
                {err}
              </div>
            )}

            <button
              type="submit"
              disabled={!roomNumber.trim() || !pin || isSubmitting}
              className={`btn btn-primary ${isSubmitting ? "loading" : ""}`}
            >
              {isSubmitting ? (
                <>
                  <span className="spinner"></span>
                  Entering...
                </>
              ) : (
                <>
                  <i className="bx bx-log-in"></i>
                  Enter Room
                </>
              )}
            </button>

            <p className="room-gate-footnote">
              You'll stay signed in on this device for 30 days.
            </p>
          </form>
        </div>
      </main>
    </>
  );
};

export default Login;
