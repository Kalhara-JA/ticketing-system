export function renderAuthEmail(opts: {
    title: string;
    intro?: string;
    body?: string;
    cta?: { label: string; url: string };
    footer?: string;
}) {
    const { title, intro, body, cta, footer } = opts;
    return /* html */ `<!doctype html>
  <html>
    <body style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;line-height:1.5">
      <div style="max-width:560px;margin:24px auto;padding:24px;border:1px solid #eee;border-radius:12px">
        <h1 style="font-size:20px;margin:0 0 12px">${escapeHtml(title)}</h1>
        ${intro ? `<p>${escapeHtml(intro)}</p>` : ""}
        ${body ? `<p>${escapeHtml(body)}</p>` : ""}
        ${cta
            ? `<p style="margin:24px 0">
                 <a href="${cta.url}" style="display:inline-block;padding:10px 16px;border-radius:8px;background:#111;color:#fff;text-decoration:none">
                   ${escapeHtml(cta.label)}
                 </a>
               </p>`
            : ""
        }
        ${footer ? `<p style="color:#666;font-size:12px">${escapeHtml(footer)}</p>` : ""}
      </div>
    </body>
  </html>`;
}

function escapeHtml(s: string) {
    return s.replace(/[&<>"']/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]!));
}
