type Cell = string | number | null | undefined;

export function csvText(columns: string[], rows: Cell[][]) {
  const escape = (value: Cell) => {
    let text = value == null ? '' : String(value);
    if (typeof value === 'string' && /^[\s]*[=+\-@]/.test(text)) text = `'${text}`;
    return `"${text.replaceAll('"', '""')}"`;
  };
  return '\uFEFF' + [columns, ...rows].map(row => row.map(escape).join(',')).join('\r\n');
}

export function downloadCsv(filename: string, columns: string[], rows: Cell[][]) {
  const url = URL.createObjectURL(new Blob([csvText(columns, rows)], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a'); link.href = url; link.download = filename;
  document.body.appendChild(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function reportHtml(title: string, details: string[], columns: string[], rows: Cell[][]) {
  const escape = (value: Cell) => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!);
  return `<!doctype html><html><head><meta charset="utf-8"><title>${escape(title)}</title><style>
    @page { size: A4; margin: 16mm; } body { font: 12px system-ui,sans-serif; color:#111; }
    h1 { font-size:22px; } p { white-space:pre-wrap; } table { border-collapse:collapse; width:100%; }
    th,td { border:1px solid #bbb; padding:8px; text-align:left; overflow-wrap:anywhere; white-space:pre-wrap; }
    th { background:#eee; } tr { break-inside:avoid; } thead { display:table-header-group; }
    footer { margin-top:18px; font-size:10px; color:#555; }
    </style></head><body><h1>${escape(title)}</h1>${details.map(detail => `<p>${escape(detail)}</p>`).join('')}
    <table><thead><tr>${columns.map(column => `<th>${escape(column)}</th>`).join('')}</tr></thead><tbody>
    ${rows.map(row => `<tr>${row.map(cell => `<td>${escape(cell)}</td>`).join('')}</tr>`).join('')}</tbody></table>
    <footer>Smart Exam Evaluation · ${escape(new Date().toLocaleString())}</footer></body></html>`;
}

export function printReport(title: string, details: string[], columns: string[], rows: Cell[][]) {
  const frame = document.createElement('iframe'); frame.title = 'Printable result report';
  frame.style.cssText = 'position:fixed;width:0;height:0;border:0;';
  frame.onload = () => {
    const view = frame.contentWindow;
    if (!view) { frame.remove(); return; }
    view.onafterprint = () => frame.remove(); view.focus(); view.print();
  };
  frame.srcdoc = reportHtml(title, details, columns, rows); document.body.appendChild(frame);
  setTimeout(() => frame.remove(), 60000);
}
