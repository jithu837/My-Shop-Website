import React, { useState, useRef, useEffect, useCallback } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Html5Qrcode } from "html5-qrcode";
import "../css/admin.css";

// Helper to play a crisp success beep using standard Web Audio API
const playBeep = () => {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(880, ctx.currentTime); // A5 note
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.16);
  } catch {
    // AudioContext might be blocked until user interaction
  }
};

const CounterQR = () => {
  const [activeTab, setActiveTab] = useState("display"); // 'display' | 'scanner'
  const qrRef = useRef(null);
  const [copied, setCopied] = useState(false);

  // Scanner state
  const [isScanning, setIsScanning] = useState(false);
  const [scannedResult, setScannedResult] = useState(null);
  const [scanError, setScanError] = useState("");
  const [autoOpen, setAutoOpen] = useState(true);
  const [facingMode, setFacingMode] = useState("environment"); // 'environment' (back) | 'user' (front)
  const scannerInstanceRef = useRef(null);
  const fileInputRef = useRef(null);

  // Determine client URL
  const rawSiteUrl = import.meta.env.VITE_PUBLIC_SITE_URL || "";
  const baseSiteUrl =
    !rawSiteUrl || rawSiteUrl.includes("your-site-name")
      ? "https://my-shop-website-5bzd.vercel.app"
      : rawSiteUrl;
  const siteUrl = `${baseSiteUrl.replace(/\/$/, "")}/order`;

  // ── QR Download Handler ──────────────────────────────────────────────────
  const downloadQR = () => {
    if (!qrRef.current) return;
    const svg = qrRef.current.querySelector("svg");
    if (!svg) return;
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement("canvas");
    const size = 1000; // high-res for printing
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    const img = new Image();
    const svgBlob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(svgBlob);

    img.onload = () => {
      ctx.fillStyle = "#FFFDF9";
      ctx.fillRect(0, 0, size, size);
      ctx.drawImage(img, 0, 0, size, size);
      URL.revokeObjectURL(url);
      const pngUrl = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.download = "chamundeshwari-counter-qr.png";
      link.href = pngUrl;
      link.click();
    };
    img.src = url;
  };

  const copyUrl = () => {
    navigator.clipboard?.writeText(siteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // ── Scanner Logic ────────────────────────────────────────────────────────
  const stopScanner = useCallback(async () => {
    if (scannerInstanceRef.current) {
      try {
        if (scannerInstanceRef.current.isScanning) {
          await scannerInstanceRef.current.stop();
        }
        await scannerInstanceRef.current.clear();
      } catch (err) {
        console.warn("Scanner stop error:", err);
      }
      scannerInstanceRef.current = null;
    }
    setIsScanning(false);
  }, []);

  const handleScanSuccess = useCallback(
    (decodedText) => {
      playBeep();
      setScannedResult(decodedText);
      setScanError("");
      stopScanner();

      if (autoOpen) {
        // If it's a URL, open it in new tab
        if (decodedText.startsWith("http://") || decodedText.startsWith("https://")) {
          window.open(decodedText, "_blank", "noopener,noreferrer");
        }
      }
    },
    [autoOpen, stopScanner]
  );

  const startScanner = useCallback(
    async (mode = facingMode) => {
      setScanError("");
      setScannedResult(null);

      try {
        await stopScanner();

        const html5Qr = new Html5Qrcode("qr-reader-region");
        scannerInstanceRef.current = html5Qr;

        await html5Qr.start(
          { facingMode: mode },
          {
            fps: 10,
            qrbox: { width: 260, height: 260 },
            aspectRatio: 1.0,
          },
          (decodedText) => handleScanSuccess(decodedText),
          () => {
            // Ignore normal frame misses
          }
        );
        setIsScanning(true);
      } catch (err) {
        console.error("Camera start error:", err);
        setScanError(
          err?.message?.includes("Permission")
            ? "Camera permission denied. Please allow camera access in your browser settings."
            : "Could not access camera. You can also upload a QR image below."
        );
        setIsScanning(false);
      }
    },
    [facingMode, handleScanSuccess, stopScanner]
  );

  // Switch facing mode (front/back camera)
  const toggleFacingMode = () => {
    const nextMode = facingMode === "environment" ? "user" : "environment";
    setFacingMode(nextMode);
    if (isScanning) {
      startScanner(nextMode);
    }
  };

  // Scan from uploaded file
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setScanError("");
    try {
      await stopScanner();
      const html5Qr = new Html5Qrcode("qr-reader-region");
      scannerInstanceRef.current = html5Qr;
      const decodedText = await html5Qr.scanFile(file, true);
      handleScanSuccess(decodedText);
    } catch (err) {
      console.error("File scan error:", err);
      setScanError("No valid QR code found in the uploaded image.");
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // Cleanup on unmount or tab switch
  useEffect(() => {
    return () => {
      stopScanner();
    };
  }, [stopScanner]);

  return (
    <div>
      <div className="admin-toolbar" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1 style={{ marginBottom: 4 }}>Counter QR & Scanner</h1>
          <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--color-ink-soft)" }}>
            Generate counter QR codes for customers and scan QR codes to test or open orders
          </p>
        </div>

        {/* Tab Switcher */}
        <div
          style={{
            display: "inline-flex",
            background: "rgba(107,30,35,0.08)",
            padding: 4,
            borderRadius: "var(--radius-sm)",
            gap: 4,
          }}
        >
          <button
            type="button"
            onClick={() => {
              stopScanner();
              setActiveTab("display");
            }}
            style={{
              padding: "8px 16px",
              border: "none",
              borderRadius: 6,
              fontFamily: "var(--font-utility)",
              fontWeight: 700,
              fontSize: "0.85rem",
              cursor: "pointer",
              background: activeTab === "display" ? "var(--color-maroon-deep)" : "transparent",
              color: activeTab === "display" ? "var(--color-cream)" : "var(--color-ink-deep)",
              transition: "all 0.15s ease",
            }}
          >
            🔳 Counter QR Code
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("scanner")}
            style={{
              padding: "8px 16px",
              border: "none",
              borderRadius: 6,
              fontFamily: "var(--font-utility)",
              fontWeight: 700,
              fontSize: "0.85rem",
              cursor: "pointer",
              background: activeTab === "scanner" ? "var(--color-maroon-deep)" : "transparent",
              color: activeTab === "scanner" ? "var(--color-cream)" : "var(--color-ink-deep)",
              transition: "all 0.15s ease",
            }}
          >
            📷 QR Scanner
          </button>
        </div>
      </div>

      {/* ── TAB 1: COUNTER QR DISPLAY & PRINT ─────────────────────────── */}
      {activeTab === "display" && (
        <div style={{ display: "grid", gridTemplateColumns: "minmax(320px, 460px) 1fr", gap: 24, alignItems: "start" }}>
          <div className="admin-panel" style={{ padding: 28, textAlign: "center" }}>
            <div
              ref={qrRef}
              style={{
                display: "inline-flex",
                padding: 20,
                background: "#FFFDF9",
                border: "2px dashed rgba(107,30,35,0.25)",
                borderRadius: 16,
                marginBottom: 16,
                boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
              }}
            >
              <QRCodeSVG value={siteUrl} size={260} bgColor="#FFFDF9" fgColor="#2B1B14" level="H" includeMargin />
            </div>

            <div
              style={{
                fontFamily: "var(--font-utility)",
                fontWeight: 700,
                fontSize: "1rem",
                textTransform: "uppercase",
                letterSpacing: 0.5,
                color: "var(--color-ink-deep)",
                marginBottom: 6,
              }}
            >
              Chamundeshwari Sweets
            </div>
            <div style={{ fontSize: "0.8rem", color: "var(--color-ink-soft)", marginBottom: 16 }}>
              Scan with phone camera to browse & order
            </div>

            <div
              style={{
                background: "rgba(107,30,35,0.04)",
                padding: "8px 12px",
                borderRadius: 8,
                fontSize: "0.8rem",
                wordBreak: "break-all",
                color: "var(--color-ink-deep)",
                marginBottom: 18,
                fontFamily: "monospace",
              }}
            >
              {siteUrl}
            </div>

            <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
              <button className="btn btn-primary" onClick={downloadQR} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                📥 Download PNG
              </button>
              <button className="btn btn-secondary" onClick={copyUrl} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                {copied ? "✓ Copied!" : "📋 Copy Link"}
              </button>
              <a
                href={siteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-secondary"
                style={{ display: "inline-flex", alignItems: "center", gap: 6, textDecoration: "none" }}
              >
                🌐 Visit Shop
              </a>
            </div>
          </div>

          <div className="admin-panel" style={{ padding: 28 }}>
            <h3 style={{ marginTop: 0, marginBottom: 12 }}>How Counter QR Ordering Works</h3>
            <ul style={{ paddingLeft: 20, lineHeight: 1.7, color: "var(--color-ink-deep)", fontSize: "0.95rem" }}>
              <li>
                <strong>Place at Counter:</strong> Print and place this QR code at your checkout or entrance counter.
              </li>
              <li>
                <strong>No App Required:</strong> Customers scan it with their phone camera (Google Lens, iPhone Camera, Paytm/GPay scanner).
              </li>
              <li>
                <strong>Direct Ordering:</strong> Scans instantly open your live shop:
                <br />
                <code style={{ color: "var(--color-maroon-deep)" }}>{siteUrl}</code>
              </li>
              <li>
                <strong>Live Sound Notifications:</strong> When a customer places an order, your Admin Panel speaks the order details out loud and queues it in real time!
              </li>
            </ul>

            <div style={{ marginTop: 24, padding: 16, background: "rgba(201,138,44,0.1)", borderRadius: 10, border: "1px solid rgba(201,138,44,0.3)" }}>
              <strong style={{ color: "var(--color-maroon-deep)", display: "block", marginBottom: 6 }}>💡 Want to test it right now?</strong>
              <span style={{ fontSize: "0.9rem", color: "var(--color-ink-deep)" }}>
                Click the <strong>📷 QR Scanner</strong> tab above to scan this QR code directly using your device webcam or by uploading a photo!
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 2: LIVE QR SCANNER ───────────────────────────────────── */}
      {activeTab === "scanner" && (
        <div style={{ display: "grid", gridTemplateColumns: "minmax(320px, 480px) 1fr", gap: 24, alignItems: "start" }}>
          <div className="admin-panel" style={{ padding: 28 }}>
            <h3 style={{ marginTop: 0, marginBottom: 14, display: "flex", alignItems: "center", gap: 8 }}>
              📷 Live Camera Scanner
            </h3>

            {/* Viewfinder Container */}
            <div
              style={{
                position: "relative",
                width: "100%",
                maxWidth: 420,
                minHeight: 280,
                background: "#1E140F",
                borderRadius: 14,
                overflow: "hidden",
                margin: "0 auto 16px auto",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "inset 0 0 20px rgba(0,0,0,0.5)",
              }}
            >
              <div id="qr-reader-region" style={{ width: "100%" }} />

              {!isScanning && (
                <div style={{ padding: 24, textAlign: "center", color: "rgba(255,255,255,0.85)" }}>
                  <div style={{ fontSize: "2.5rem", marginBottom: 8 }}>📷</div>
                  <div style={{ fontWeight: 600, marginBottom: 4 }}>Camera is inactive</div>
                  <div style={{ fontSize: "0.8rem", opacity: 0.75, marginBottom: 16 }}>
                    Click "Start Camera" to scan a customer's QR or test your counter QR
                  </div>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => startScanner()}
                    style={{ padding: "10px 20px" }}
                  >
                    ▶ Start Camera
                  </button>
                </div>
              )}
            </div>

            {/* Scanner Controls */}
            {isScanning && (
              <div style={{ display: "flex", gap: 10, justifyContent: "center", marginBottom: 16 }}>
                <button type="button" className="btn btn-secondary" onClick={stopScanner}>
                  ⏹ Stop Camera
                </button>
                <button type="button" className="btn btn-secondary" onClick={toggleFacingMode}>
                  🔄 Flip Camera ({facingMode === "environment" ? "Back" : "Front"})
                </button>
              </div>
            )}

            {/* Error banner */}
            {scanError && (
              <div
                style={{
                  background: "#FEE2E2",
                  color: "#991B1B",
                  padding: "10px 14px",
                  borderRadius: 8,
                  fontSize: "0.85rem",
                  marginBottom: 16,
                  border: "1px solid #FCA5A5",
                }}
              >
                ⚠️ {scanError}
              </div>
            )}

            {/* Alternative file upload scan */}
            <div style={{ borderTop: "1px solid rgba(0,0,0,0.08)", paddingTop: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--color-ink-deep)" }}>
                  Or upload a QR code image:
                </span>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                style={{ fontSize: "0.85rem" }}
              />
            </div>

            {/* Auto-open toggle */}
            <div style={{ marginTop: 14, display: "flex", alignItems: "center", gap: 8 }}>
              <input
                type="checkbox"
                id="autoOpenShop"
                checked={autoOpen}
                onChange={(e) => setAutoOpen(e.target.checked)}
                style={{ width: 16, height: 16, cursor: "pointer" }}
              />
              <label htmlFor="autoOpenShop" style={{ fontSize: "0.85rem", cursor: "pointer", color: "var(--color-ink-deep)" }}>
                Automatically open shop page in new tab when scanned
              </label>
            </div>
          </div>

          {/* Scanned Result Card */}
          <div className="admin-panel" style={{ padding: 28 }}>
            <h3 style={{ marginTop: 0, marginBottom: 16 }}>Scan Result</h3>

            {scannedResult ? (
              <div
                style={{
                  background: "#F0FDF4",
                  border: "1px solid #86EFAC",
                  borderRadius: 12,
                  padding: 20,
                  boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10, color: "#166534", marginBottom: 12 }}>
                  <span style={{ fontSize: "1.4rem" }}>✅</span>
                  <strong style={{ fontSize: "1.05rem" }}>QR Code Scanned Successfully!</strong>
                </div>

                <div
                  style={{
                    background: "#FFFFFF",
                    padding: 12,
                    borderRadius: 8,
                    border: "1px solid #DCFCE7",
                    fontSize: "0.85rem",
                    wordBreak: "break-all",
                    fontFamily: "monospace",
                    color: "var(--color-ink-deep)",
                    marginBottom: 16,
                  }}
                >
                  {scannedResult}
                </div>

                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  {(scannedResult.startsWith("http://") || scannedResult.startsWith("https://")) && (
                    <a
                      href={scannedResult}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-primary"
                      style={{ textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 6 }}
                    >
                      🛍️ Open Shop & Order Now ➔
                    </a>
                  )}

                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => {
                      setScannedResult(null);
                      startScanner();
                    }}
                  >
                    🔄 Scan Another Code
                  </button>
                </div>
              </div>
            ) : (
              <div
                style={{
                  padding: 32,
                  textAlign: "center",
                  background: "rgba(107,30,35,0.03)",
                  borderRadius: 12,
                  border: "1px dashed rgba(107,30,35,0.2)",
                  color: "var(--color-ink-soft)",
                }}
              >
                <div style={{ fontSize: "2rem", marginBottom: 8 }}>🎯</div>
                <div style={{ fontWeight: 600, marginBottom: 4, color: "var(--color-ink-deep)" }}>
                  No QR Code Scanned Yet
                </div>
                <div style={{ fontSize: "0.85rem" }}>
                  Point your camera at a QR code, or click "Start Camera" on the left to begin scanning.
                </div>
              </div>
            )}

            {/* Quick Test Links */}
            <div style={{ marginTop: 24, borderTop: "1px solid rgba(0,0,0,0.08)", paddingTop: 20 }}>
              <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--color-ink-deep)", marginBottom: 8 }}>
                Current Client Shop Target:
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <code style={{ fontSize: "0.8rem", color: "var(--color-maroon-deep)", background: "rgba(107,30,35,0.06)", padding: "4px 8px", borderRadius: 4 }}>
                  {siteUrl}
                </code>
                <a
                  href={siteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ fontSize: "0.85rem", color: "var(--color-brass)", fontWeight: 600 }}
                >
                  Open ↗
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CounterQR;
