// eslint-disable-next-line no-unused-vars
const vscode = require('vscode');

/**
 * Scans forward in a VSCode document from a given starting line to locate and
 * extract the full signature block of the next Rust item (e.g., function,
 * struct, enum, or trait).
 *
 * This function supports multi-line declarations and skips over attribute
 * annotations (e.g., `#[doc(hidden)]`) and blank lines. It collects lines
 * starting from the detected Rust item until it reaches a likely signature
 * terminator, such as `{`, `;`, or `=>`, then normalizes and returns it as a
 * single-line string.
 *
 * Example:
 * ```rust
 * #[doc(hidden)]
 * pub fn example(
 *     arg1: i32,
 *     arg2: String,
 * ) -> Result<(), Box<dyn Error>> {
 * ```
 * Returns:
 * ```
 * "pub fn example( arg1: i32, arg2: String, ) -> Result<(), Box<dyn Error>> {"
 * ```
 *
 * @param {vscode.TextDocument} document - The VSCode text document to search within.
 * @param {number} startLine - The zero-based line index to begin searching from.
 * @returns {string|null} A normalized, single-line Rust signature string if found, or null if no valid item is detected.
 */
function findNextSignatureBlock(document, startLine) {
    const totalLines = document.lineCount;

    // Match `pub`, `async`, `unsafe`, `const`, `extern`, then `fn`, `struct`, or `enum`
    const signatureStartPattern = new RegExp(
        String.raw`^(?:pub(?:\s*\([^)]*\)|\s+super|\s+self|\s+in\s+[^\s]+)?\s+)?(?:const\s+)?(?:async\s+)?(?:unsafe\s+)?(?:extern\s*(?:"[^"]*")?\s*)?(fn|struct|enum)\s+`
    );

    let signatureLines = [];
    let collecting = false;
    let braceDepth = 0;
    let parentDepth = 0;
    let itemType = null;

    for (let i = startLine + 1; i < totalLines; i++) {
        let line = document.lineAt(i).text.trim();

        // Strip comments from line (ignores those inside strings)
        line = line.replace(/\/\/\/.*|\/\/.*$/, '').trim();

        // Skip empty lines and attributes
        if (!collecting && (line === '' || line.startsWith('#['))) continue;

        const match = signatureStartPattern.exec(line);
        if (!collecting && match) {
            itemType = match[1]; // 'fn', 'struct', etc..
            collecting = true;
        }

        if (collecting) {
            signatureLines.push(line);

            if (itemType === 'fn') {
                // Stop at function or struct start (`{`, `;`, `=>`)
                if (line.endsWith('{') || line.endsWith(';') || line.endsWith('=>')) {
                    break;
                }
            } else {
                // Track braces and parens for body parsing. This is the logic to find the body boundary
                for (const char of line) {
                    if (char === '{') braceDepth++;
                    if (char === '}') braceDepth--;
                    if (char === '(') parentDepth++;
                    if (char === ')') parentDepth--;
                }

                // Stop collecting when body is fully closed or ends with semicolon
                if ((braceDepth === 0 && parentDepth === 0 && (line.endsWith('}') || line.endsWith(';')))) {
                    break;
                }
            }
        }
    }

    // Normalize and return the entire signature block
    return signatureLines.length > 0
        ? signatureLines.join(' ').replace(/\s+/g, ' ').trim()
        : null;
}

module.exports = { findNextSignatureBlock };