import React, { useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import "../css/login.css";

const Login = () => {
  const { login } = useAuth();
  const [phone, setPhone] = useState("7816096147");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!phone.trim()) {
      setError("Please enter the owner mobile number.");
      return;
    }

    if (!password) {
      setError("Please enter the owner password.");
      return;
    }

    setLoading(true);
    try {
      await login(phone, password);
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        err.message ||
        "Invalid phone number or password. Please try again.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-screen">
      <div className="login-card">
        <div className="login-header">
          <div className="login-crest">
            <span>CH</span>
          </div>
          <h1>Owner Dashboard</h1>
          <p className="login-subtitle">
            Chamundeshwari Home Sweets & Hots
          </p>
        </div>

        {error && (
          <div className="login-error-banner" role="alert">
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        <form className="login-form" onSubmit={handleSubmit}>
          <div className="login-field">
            <label className="login-label" htmlFor="admin-phone">
              Mobile Number
            </label>
            <div className="login-input-wrap">
              <span className="login-prefix">+91</span>
              <input
                id="admin-phone"
                type="tel"
                className="login-input with-prefix"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="7816096147"
                maxLength={10}
                required
                autoComplete="tel"
              />
            </div>
          </div>

          <div className="login-field">
            <label className="login-label" htmlFor="admin-password">
              Owner Password
            </label>
            <div className="login-input-wrap">
              <input
                id="admin-password"
                type={showPassword ? "text" : "password"}
                className="login-input with-eye"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                required
                autoComplete="current-password"
              />
              <button
                type="button"
                className="login-toggle-eye"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? "👁️" : "🔒"}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="login-submit-btn"
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="login-spinner" />
                <span>Authenticating...</span>
              </>
            ) : (
              <>
                <span>Sign In to Dashboard</span>
                <span>➜</span>
              </>
            )}
          </button>
        </form>

        <div className="login-footer-badge">
          <span>🛡️</span>
          <span>Secured with JWT Session Verification</span>
        </div>
      </div>
    </div>
  );
};

export default Login;
