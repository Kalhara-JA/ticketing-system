/**
 * Escapes HTML special characters to prevent XSS when persisting user input.
 * Store escaped text; render with plain text to avoid double-escaping risks.
 */
export function escapeHtml(input: string): string {
    return input
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

/**
 * Produces a safe filename: strips control chars, normalizes spaces, keeps extension, limits length.
 */
export function sanitizeFilename(filename: string, options?: { maxLength?: number }): string {
    const maxLength = options?.maxLength ?? 120;
    // Remove path separators and control chars
    const noPath = filename.replace(/[\\\/]+/g, "-").replace(/[\u0000-\u001F\u007F]+/g, "");
    // Trim and collapse whitespace
    const trimmed = noPath.trim().replace(/\s+/g, " ");
    // Split name and extension
    const dot = trimmed.lastIndexOf(".");
    const name = dot > 0 ? trimmed.slice(0, dot) : trimmed;
    const ext = dot > 0 ? trimmed.slice(dot + 1) : "";
    // Replace disallowed chars in name
    const safeName = name.replace(/[^A-Za-z0-9._ -]+/g, "-").replace(/-{2,}/g, "-");
    // Recombine and limit length (preserve extension)
    const base = safeName.slice(0, Math.max(1, maxLength - (ext ? ext.length + 1 : 0)));
    return ext ? `${base}.${ext.toLowerCase()}` : base;
}


