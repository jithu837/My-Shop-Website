// Prints a compact 80mm thermal-receipt style bill for an order.
// Uses a hidden iframe so only the receipt is sent to the printer —
// not the surrounding page (admin dashboard, success page, etc.).

const SHOP_NAME = "Chamundeshwari Home Sweets & Hots";
const SHOP_TAGLINE = "Homemade sweets & savouries";

const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "<").replace(/>/g, ">");

const money = (n) => `₹${Number(n || 0).toFixed(2)}`;

const buildBillHTML = (order) => {
  const items = (order.items || [])
    .map(
      (item) => `
      <tr>
        <td class="item-name">${esc(item.name)}</td>
        <td class="item-qty">${esc(item.grams)}g</td>
        <td class="item-amount">${money(item.lineTotal)}</td>
      </tr>
      <tr><td class="item-rate" colspan="3">@ ${money(item.pricePerKg)}/kg</td></tr>`
    )
    .join("");

  const discountRow =
    order.discount > 0
      ? `<div class="tl"><span>Discount${order.couponCode ? ` (${esc(order.couponCode)})` : ""}</span><span>−${money(order.discount)}</span></div>`
      : "";

  const typeLabel = order.orderType === "Counter" ? "COUNTER PICKUP" : "HOME DELIVERY";
  const address = order.customerAddress
    ? `<div class="bill-line">${esc(order.customerAddress)}</div>`
    : "";

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<title>Bill ${esc(order.orderNumber)}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    width: 80mm;
    margin: 0 auto;
    font-family: "Courier New", Courier, monospace;
    font-size: 11px;
    line-height: 1.35;
    color: #000;
    background: #fff;
  }
  .center { text-align: center; }
  .shop-name { font-size: 15px; font-weight: 700; letter-spacing: 0.5px; }
  .muted { color: #444; }
  .dashed { border-top: 1px dashed #000; margin: 6px 0; }
  .solid { border-top: 1px solid #000; margin: 6px 0; }
  .bill-line { margin: 2px 0; }
  .meta-row { display: flex; justify-content: space-between; }
  table { width: 100%; border-collapse: collapse; }
  th { text-align: left; font-size: 11px; border-bottom: 1px dashed #000; padding: 2px 0; }
  th.amt, td.amt { text-align: right; }
  th.qty, td.qty { text-align: center; }
  td { padding: 2px 0; vertical-align: top; }
  .item-name { padding-right: 4px; }
  .item-qty { text-align: center; white-space: nowrap; }
  .item-amount { text-align: right; white-space: nowrap; }
  .item-rate { font-size: 9px; color: #333; padding-bottom: 4px; }
  .totals { margin-top: 4px; }
  .tl { display: flex; justify-content: space-between; padding: 1px 0; }
  .grand { font-weight: 700; font-size: 13px; border-top: 1px solid #000; margin-top: 3px; padding-top: 4px; }
  .footer { margin-top: 8px; text-align: center; font-size: 10px; }
  .footer .thanks { font-size: 11px; font-weight: 700; }
</style>
</head>
<body>
  <div class="center">
    <div class="shop-name">${esc(SHOP_NAME)}</div>
    <div class="muted">${esc(SHOP_TAGLINE)}</div>
    <div class="dashed"></div>
    <div class="meta-row"><span><strong>Bill No:</strong> ${esc(order.orderNumber)}</span><span><strong>${typeLabel}</strong></span></div>
    <div class="meta-row"><span><strong>Date:</strong></span><span>${new Date(order.createdAt).toLocaleString("en-IN")}</span></div>
    <div class="meta-row"><span><strong>Payment:</strong></span><span>${esc(order.paymentMethod)} · ${esc(order.paymentStatus)}</span></div>
    <div class="dashed"></div>
  </div>

  <div class="bill-line"><strong>Customer:</strong> ${esc(order.customerName)}</div>
  <div class="bill-line">${esc(order.customerPhone)}</div>
  ${address}

  <div class="solid"></div>
  <table>
    <thead>
      <tr>
        <th>ITEM</th>
        <th class="qty">QTY</th>
        <th class="amt">AMOUNT</th>
      </tr>
    </thead>
    <tbody>
      ${items}
    </tbody>
  </table>
  <div class="solid"></div>

  <div class="totals">
    <div class="tl"><span>Subtotal</span><span>${money(order.subtotal)}</span></div>
    ${discountRow}
    <div class="tl grand"><span>TOTAL</span><span>${money(order.total)}</span></div>
  </div>

  <div class="dashed"></div>
  <div class="footer">
    <div class="thanks">Thank you, visit again!</div>
    <div class="muted">${esc(SHOP_NAME)}</div>
  </div>
</body>
</html>`;
};

// Public API: print a single order as a compact thermal bill.
const printBill = (order) => {
  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  document.body.appendChild(iframe);
  const doc = iframe.contentWindow.document;
  doc.open();
  doc.write(buildBillHTML(order));
  doc.close();

  // Guard so onload and the setTimeout fallback don't both fire print().
  let printed = false;
  const doPrint = () => {
    if (printed) return;
    printed = true;
    iframe.contentWindow.focus();
    iframe.contentWindow.print();
    setTimeout(() => {
      if (document.body.contains(iframe)) document.body.removeChild(iframe);
    }, 500);
  };

  iframe.onload = doPrint;
  // Fallback: some browsers don't fire onload for srcdoc/write content.
  setTimeout(doPrint, 300);
};

export default printBill;
