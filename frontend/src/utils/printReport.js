export function printFraudReport(report) {
  const printWindow = window.open("", "_blank", "width=850,height=950");
  if (!printWindow) {
    console.warn("Popup blocked: could not open print window.");
    return;
  }

  const rows = [
    ["Report ID", report.id],
    ["Type", report.type],
    ["Generated Date", report.generatedDate],
    ["Author", report.author],
    ["Cases Included", report.cases],
    ["File Size", report.fileSize],
    ["Status", report.status],
  ]
    .map(
      ([label, value]) => `
        <tr>
          <td class="label">${label}</td>
          <td class="value">${value}</td>
        </tr>`
    )
    .join("");

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>${report.name} — AFCIP</title>
        <meta charset="utf-8" />
        <style>
          * { box-sizing: border-box; }
          body {
            font-family: -apple-system, Segoe UI, Arial, sans-serif;
            color: #0f172a;
            padding: 48px;
          }
          .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            border-bottom: 3px solid #2563eb;
            padding-bottom: 16px;
            margin-bottom: 28px;
          }
          .brand { font-size: 13px; font-weight: 700; color: #2563eb; letter-spacing: 0.06em; text-transform: uppercase; }
          h1 { font-size: 22px; margin: 6px 0 0; }
          .stamp { text-align: right; font-size: 12px; color: #64748b; }
          table { width: 100%; border-collapse: collapse; margin-top: 8px; }
          td { padding: 12px 0; border-bottom: 1px solid #e2e8f0; font-size: 14px; }
          td.label { color: #64748b; width: 220px; }
          td.value { font-weight: 600; color: #0f172a; }
          .footer { margin-top: 40px; font-size: 11px; color: #94a3b8; }
          @media print {
            body { padding: 24px; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="brand">AFCIP &middot; Compliance Report</div>
            <h1>${report.name}</h1>
          </div>
          <div class="stamp">Generated for print<br/>${new Date().toLocaleString()}</div>
        </div>
        <table>${rows}</table>
        <div class="footer">Advanced Financial Crime Intelligence Platform — auto-generated document.</div>
      </body>
    </html>
  `);

  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => printWindow.print(), 250);
}