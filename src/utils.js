// @ts-nocheck
/**
 * Scans forward in a VSCode text document from a given line to locate and extract
 * the full signature block of the next Rust item (e.g., function, struct, or enum).
 * 
 * Structs and enums return with their full signature and body blocks.
 *
 * This utility supports multi-line declarations and properly handles:
 * - Leading attributes such as `#[derive(...)]`, `#[doc(hidden)]`, etc.
 * - Skipping over blank lines and comments
 * - Bracket/parenthesis balancing for collecting full signatures
 *
 * It begins scanning from the line *after* `startLine`, identifies the start of a
 * Rust item using a regular expression, and then collects lines until it reaches
 * the logical end of the signature (e.g., line ending in `{`, `;`, or `=>`), or the
 * closing of a balanced block.
 *
 * ### Example
 * Input:
 * ```rust
 * #[doc(hidden)]
 * pub fn example(
 *     arg1: i32,
 *     arg2: String,
 * ) -> Result<(), Box<dyn Error>> {
 * ```
 * Output:
 * ```text
 * "pub fn example( arg1: i32, arg2: String, ) -> Result<(), Box<dyn Error>> {"
 * ```
 *
 * @param {vscode.TextDocument} document - The VSCode text document to scan.
 * @param {number} startLine - The zero-based line number to begin scanning from.
 * @returns {string|null} A normalized, single-line signature string if found; otherwise, `null`.
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
    let insideAttribute = false;
    let bracketBalance = 0;

    for (let i = startLine + 1; i < totalLines; i++) {
        let line = document.lineAt(i).text.trim();

        // If this line is only closing a block and we’re not collecting yet, exit early
        if (!collecting && line === '}' && braceDepth === 0 || !collecting && line === '' || !collecting && line.startsWith("//")) {
            return null;
        }

        // Strip comments from line (ignores those inside strings)
        line = line.replace(/\/\/\/.*|\/\/.*$/, '').trim();

        // Track attribute bracket balance for skipping lines of attributes/decorators
        if (!collecting) {
            if (line.trim().startsWith('#[')) {
                insideAttribute = true; // Set flag for being in attribute/decorator
            }

            if (insideAttribute) {
                // Count brackets to detect end of attribute
                for (const char of line) {
                    if (char === '[') bracketBalance++;
                    else if (char === ']') bracketBalance--;
                }

                if (bracketBalance <= 0) {
                    insideAttribute = false;
                    bracketBalance = 0;
                }
                continue; // Skip attributes/decorator lines
            }
        }

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