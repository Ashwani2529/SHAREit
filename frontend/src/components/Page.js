import React, { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import "../App.css";
import { endSession, getSession, SESSION_EXPIRED_EVENT } from "../utils/session";

const Page = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [session, setSession] = useState(getSession);
  const location = useLocation();
  const navigate = useNavigate();

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const isActive = (path) => {
    return location.pathname === path;
  };

  useEffect(() => {
    const handleExpired = () => setSession(null);
    window.addEventListener(SESSION_EXPIRED_EVENT, handleExpired);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, handleExpired);
  }, []);

  const handleLeave = () => {
    setIsMenuOpen(false);
    // Leave the guarded page first, so its own guard doesn't race us to /login.
    navigate("/");
    endSession();
    setSession(null);
    toast.info("You've left the room");
  };

  return (
    <>
      {/* Navigation Header */}
      <header className="nav-header">
        <nav className="nav-container">
          <Link to="/" className="nav-brand">
            <i className="bx bx-cloud-upload"></i>
            SHAREit
          </Link>

          <button
            className="nav-toggle"
            onClick={toggleMenu}
            aria-label="Toggle navigation menu"
          >
            <i className={`bx ${isMenuOpen ? 'bx-x' : 'bx-menu'}`}></i>
          </button>

          <ul className={`nav-menu ${isMenuOpen ? 'open' : ''}`}>
            <li>
              <Link
                to="/"
                className={`nav-link ${isActive('/') ? 'active' : ''}`}
                onClick={() => setIsMenuOpen(false)}
              >
                <i className="bx bx-home"></i>
                Home
              </Link>
            </li>
            <li>
              <Link
                to="/files"
                className={`nav-link ${isActive('/files') ? 'active' : ''}`}
                onClick={() => setIsMenuOpen(false)}
              >
                <i className="bx bx-file"></i>
                Files
              </Link>
            </li>
            <li>
              <Link
                to="/text"
                className={`nav-link ${isActive('/text') ? 'active' : ''}`}
                onClick={() => setIsMenuOpen(false)}
              >
                <i className="bx bx-text"></i>
                Text
              </Link>
            </li>
            {/* Status pill, not a tab: shows the room you're in and leaves it. */}
            {session && (
              <li className="nav-room">
                <button
                  type="button"
                  className="nav-room-chip"
                  onClick={handleLeave}
                  title={`Leave room ${session.roomNumber}`}
                >
                  <i className="bx bx-log-out"></i>
                  {session.roomNumber || "Leave room"}
                </button>
              </li>
            )}
          </ul>
        </nav>
      </header>

      {/* Hero Section - Only show on home page */}
      {location.pathname === '/' && (
        <section className="hero-section">
          <div className="container">
            <h1 className="hero-title">Welcome to SHAREit</h1>
            <p className="hero-subtitle">
              Share files and text snippets effortlessly with our modern, secure platform.
              Upload your files, manage your text content, and access them from anywhere.
            </p>
            <div className="hero-actions">
              <Link to="/files" className="btn btn-primary">
                <i className="bx bx-upload"></i>
                Upload Files
              </Link>
              <Link to="/text" className="btn btn-outline">
                <i className="bx bx-text"></i>
                Manage Text
              </Link>
            </div>
          </div>
        </section>
      )}
    </>
  );
};

export default Page;
