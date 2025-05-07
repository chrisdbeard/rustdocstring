/**
 * Generates a Rust-style documentation block for a function signature.
 *
 * This function parses a normalized Rust `fn` line and dynamically creates a formatted doc comment
 * that includes:
 * - A general description placeholder
 * - Parameter list (`# Arguments`) with per-argument placeholders
 * - Return type section (`# Returns`) if applicable
 * - Safety contract (`# Safety`) if the function is marked as `unsafe` or `extern`
 * - Error documentation (`# Errors`) for functions returning `Result<T, E>`
 * - An example usage block with async/unsafe awareness
 *
 * Tab stops (e.g., `${2:...}`) are included to support editor snippet expansion.
 *
 * @param {string} line - The normalized function signature, stripped of leading comments or extra lines.
 * @returns {string|null} The formatted Rust doc comment block as a string, or `null` if the input is not a valid function signature.
 */
function generateFunctionDoc(line, includeExamples, examplesOnlyForPublicOrExtern, includeSafetyDetails) {
    // Check if function is public or externed.
    const isPublicOrExtern = /\b(pub(\s*\([^)]*\)|\s+self|\s+super)?|extern(\s*"[^"]*")?)\b/.test(line);

    // Strip pub, pub(crate), pub(in ...), pub(self), pub(super)
    const cleanLine = line.replace(/pub(\s*\([^)]*\)|\s+self|\s+super)?\s+/, '');

    // Check for async, unsafe, extern modifiers before `fn`
    const modifierMatch = cleanLine.match(/\b(async)?\s*(unsafe)?\s*(extern\s*"[^"]*")?\s*fn/);
    // Bool for determining if function has 'async' modifier
    const hasAsync = !!modifierMatch?.[1];
    // Bool for determining if function has 'unsafe' modifier
    const hasUnsafe = !!modifierMatch?.[2];
    // Bool for determining if function has 'extern' modifier
    const hasExtern = !!modifierMatch?.[3];

    // Attempt to match a Rust function signature.
    const fnMatch = cleanLine.match(/fn\s+(\w+)\s*\(([^)]*)\)\s*(?:->\s*([^;{]+))?/);
    if (!fnMatch) return null; // If no match, return nothing (unsupported line)

    // Destructure the match results: function name, arguments, and optional return type.
    const [, name, args, returnType] = fnMatch;

    // Gets the return type.
    const cleanedReturn = returnType ? returnType.trim() : null;

    // Sets the tab stop count for the parameter. Description is always 1.
    let currentTabStop = 2;

    // Parse and format each function argument into a markdown line with snippet placeholder.
    const params = args
        .split(',')
        .map(p => p.trim())
        .filter(Boolean) // Remove empty strings
        .map(param => {
            const [argName, argType] = param.split(':').map(s => s.trim());
            return `- \`${argName}\` (\`${argType}\`) - \${${currentTabStop++}:Describe this parameter.}`;
        });

    // Build the full documentation block line by line.
    const docLines = [];
    
    // Description line.
    docLines.push(` \${1:Describe this function.}`); // General function description

    // Arguments section (only if there are parameters)
    if (params.length > 0) {
        docLines.push(``, `# Arguments`, ``);
        docLines.push(...params);
    }

    // Return section (only if return type exists)
    if (cleanedReturn) {
        docLines.push(``, `# Returns`, ``);
        docLines.push(`- \`${cleanedReturn}\` - \${${currentTabStop++}:Describe the return value.}`);
    }

    // Safety section (only if function has unsafe or extern or both) The section is modified depending on the keyword
    if (hasUnsafe || hasExtern) {
        // Check if unsafe and extern
        docLines.push(``, `# Safety`, ``);

        if (includeSafetyDetails) {
            docLines.push(`- **The caller must ensure that:**`);
            docLines.push(`  - Any internal state or memory accessed by this function is in a valid state.`);
            docLines.push(`  - Preconditions specific to this function's logic are satisfied.`);
            docLines.push(`  - This function is only called in the correct program state to avoid UB.`);
        }

        if (hasUnsafe) {
            // Check if also unsafe
            docLines.push(`- **This function is \`unsafe\` because:**`);
            docLines.push(`  - \${${currentTabStop++}:Describe unsafe behavior.}`);
        }
    }

    // Check if rust functions return type is Result
    const isFallible = /Result\s*<.+>/.test(cleanedReturn || '');

    // Errors section
    if (isFallible) {
        docLines.push(``, `# Errors`, ``);
        docLines.push(`\${${currentTabStop++}:Describe possible errors.}`);
    }

    if (includeExamples && (!examplesOnlyForPublicOrExtern || isPublicOrExtern)) {
        // Examples section
        const { exampleLines, nextTabStop } = createExampleSection(name, currentTabStop, hasAsync, hasUnsafe);
        docLines.push(...exampleLines); // add example section
        currentTabStop = nextTabStop; // Update counter
    }

    // Prefix all lines with Rust doc syntax (`///`) and return as a snippet string
    return [
        docLines[0], // First line is already preceded by `///` in the editor, skip it
        ...docLines.slice(1).map(line => `/// ${line}`)
    ].join('\n');
}

/**
 * Generates the Rust documentation example section based on the function's modifiers.
 *
 * This function builds a `# Examples` section for a Rust doc comment, showing how the function
 * should be used in realistic scenarios, including `async`, `unsafe`, and combined `async unsafe` use.
 *
 * It will:
 * - Wrap `async` functions in an `async` block with `.await`.
 * - Wrap `unsafe` functions in an `unsafe` block with a `SAFETY:` comment.
 * - Combine both properly if the function is `async unsafe`.
 * - Fallback to a plain call if no modifiers are present.
 *
 * @param {string} name - The name of the function (used in the example call).
 * @param {number} currentTabStop - The tab stop counter for snippet placeholders. This will be incremented for crate usage.
 * @param {boolean} hasAsync - Whether the function is marked as `async`.
 * @param {boolean} hasUnsafe - Whether the function is marked as `unsafe`.
 * @returns {{ exampleLines: string[], nextTabStop: number }} An object containing:
 *   - `exampleLines`: The list of formatted doc lines for the example section (including the code block).
 *   - `nextTabStop`: The updated tab stop counter after placeholder usage.
 */
function createExampleSection(name, currentTabStop, hasAsync, hasUnsafe) {
    const exampleLines = [];
    exampleLines.push(``, `# Examples`, ``);

    let exampleContent = [];

    // Check if async and unsafe
    if (hasAsync && hasUnsafe) {
        // Check if function has both async and unsafe
        // Add the async and unsafe sections for the examples
        exampleContent.push(`async {`);
        exampleContent.push(`  // SAFETY: The Caller guarantees all invariants are met.`);
        exampleContent.push(`  let result = unsafe { ${name}().await };`); // Function name
        exampleContent.push(`};`);
    } else if (hasAsync) {
        // Check if only async
        // Add the async sections for the examples
        exampleContent.push(`async {`);
        exampleContent.push(`  let result = ${name}().await;`); // Function name
        exampleContent.push(`};`);
    } else if (hasUnsafe) {
        // Check if only unsafe
        // Add the unsafe section for the examples
        exampleContent.push(`// SAFETY: The Caller guarantees all invariants are met.`);
        exampleContent.push(`unsafe {`);
        exampleContent.push(`  let _ = ${name}();`); // Function name
        exampleContent.push(`}`);
    } else {
        /// Use normal example output
        exampleContent.push(`let _ = ${name}();`); // Place function name here
    }

    // Add no_run to the markdown code block if async or unsafe
    exampleLines.push(hasAsync || hasUnsafe ? '```no_run' : '```');
    exampleLines.push(`use crate::\${${currentTabStop++}:...};`, ``);
    exampleLines.push(...exampleContent);
    exampleLines.push('```'); // Always end the Examples markdown code section

    return { exampleLines, nextTabStop: currentTabStop };
}

module.exports = { generateFunctionDoc };