import React, { useRef } from "react";
import { QRCodeSVG } from "qrcode.react";
import "../css/admin.css";

// Prints/downloads the QR code customers scan at the counter.
// It just points to this site's /order page — no app, no login needed.
const CounterQR = () => {
  const qrRef = useRef(null);
  const orderUrl = `${window.location.origin}/order`;

  const downloadQR = () => {
    const svg = qrRef.current.querySelector("svg");
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

  return (
    <div>
      <div className="admin-toolbar">
        <h1 style={{ marginBottom: 0 }}>Counter QR Code</h1>
      </div>

      <div className="admin-panel" style={{ padding: 32, maxWidth: 480 }}>
        <p style={{ marginBottom: 20, color: "var(--color-ink-soft)" }}>
          Print this and place it at the counter. Customers scan it with their phone camera —
          it opens your ordering page directly, no app needed. They add items, pay by cash or
          UPI, and get an order number to show you.
        </p>

        <div
          ref={qrRef}
          style={{
            display: "inline-flex",
            padding: 24,
            background: "#FFFDF9",
            border: "2px dashed rgba(107,30,35,0.25)",
            borderRadius: 16,
            marginBottom: 20,
          }}
        >
          <QRCodeSVG value={orderUrl} size={260} bgColor="#FFFDF9" fgColor="#2B1B14" />
        </div>

        <p style={{ fontFamily: "var(--font-utility)", fontWeight: 600, marginBottom: 20, wordBreak: "break-all" }}>
          {orderUrl}
        </p>

        <button className="btn btn-primary" onClick={downloadQR}>
          Download PNG (for printing)
        </button>
      </div>
    </div>
  );
};

export default CounterQR;
