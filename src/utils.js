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
    const signatureStartPattern = /^(pub\s+)?(fn|struct|enum|trait)\s+/;

    let signatureLines = [];
    let collecting = false;

    for (let i = startLine + 1; i < totalLines; i++) {
        const line = document.lineAt(i).text.trim();

        // Skip empty lines and attributes
        if (!collecting && (line === '' || line.startsWith('#['))) continue;

        // Start collecting once we match an item keyword
        if (!collecting && signatureStartPattern.test(line)) {
            collecting = true;
        }

        if (collecting) {
            signatureLines.push(line);

            // Stop at function or struct start (`{`, `;`, `=>`)
            if (line.endsWith('{') || line.endsWith(';') || line.endsWith('=>')) {
                break;
            }
        }
    }

    // Normalize and return the entire signature block
    return signatureLines.length > 0
        ? signatureLines.join(' ').replace(/\s+/g, ' ').trim()
        : null;
}

module.exports = { findNextSignatureBlock };