import React from "react";
import "../css/gramselector.css";

// Reusable gram stepper: increments/decrements by `step` (default 50g),
// clamped between `min` and `max`.
const GramSelector = ({ grams, onChange, step = 50, min = 50, max = 1000 }) => {
  const dec = () => onChange(Math.max(min, grams - step));
  const inc = () => onChange(Math.min(max, grams + step));

  const label = grams >= 1000 ? `${(grams / 1000).toFixed(grams % 1000 === 0 ? 0 : 2)} kg` : `${grams} g`;

  return (
    <div className="gram-selector">
      <button type="button" className="gram-btn" onClick={dec} disabled={grams <= min} aria-label="Decrease quantity">
        −
      </button>
      <span className="gram-value">{label}</span>
      <button type="button" className="gram-btn" onClick={inc} disabled={grams >= max} aria-label="Increase quantity">
        +
      </button>
    </div>
  );
};

export default GramSelector;
