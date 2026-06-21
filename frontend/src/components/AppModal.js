import React, { useEffect } from "react";

/**
 * Lightweight, accessible modal built entirely on the app's design tokens.
 *
 * Replaces react-bootstrap's <Modal>, which rendered unstyled (and therefore
 * tiny/broken) because Bootstrap's CSS is not imported in this project. This
 * version is large, centered, blurs the backdrop, traps Escape, locks body
 * scroll, and closes on backdrop click.
 */
const AppModal = ({ show, onClose, title, icon, children, footer }) => {
  useEffect(() => {
    if (!show) return undefined;

    const handleKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);

    // Lock background scroll while the modal is open.
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [show, onClose]);

  if (!show) return null;

  return (
    <div className="app-modal-overlay" onMouseDown={onClose}>
      <div
        className="app-modal"
        role="dialog"
        aria-modal="true"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="app-modal-header">
          <h3 className="app-modal-title">
            {icon}
            {title}
          </h3>
          <button
            type="button"
            className="app-modal-close"
            onClick={onClose}
            aria-label="Close dialog"
          >
            <i className="bx bx-x"></i>
          </button>
        </div>

        <div className="app-modal-body">{children}</div>

        {footer && <div className="app-modal-footer">{footer}</div>}
      </div>
    </div>
  );
};

export default AppModal;