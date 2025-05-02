/**
 * Generates a Rust doc comment template for a function definition.
 * The output follows idiomatic Rust documentation style, with sections
 * for description, arguments, return value, examples, and errors.
 *
 * The result includes VSCode snippet placeholders (${1}, ${2}, ...) to allow
 * tabbing through the editable fields when inserted.
 *
 * @param {string} line - The line of Rust code to parse (expected to be a `fn` signature).
 * @returns {string|null} - A formatted multiline doc comment, or null if not a valid function.
 */
function generateDocComment(line) {
    // Attempt to match a Rust function signature.
    const fnMatch = line.match(/fn\s+(\w+)\s*\(([^)]*)\)\s*(?:->\s*([^;{]+))?/);
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

    // TODO Make editable configuration to include example sections as a checkbox in the settings.

    // Examples section
    docLines.push(``, `# Examples`, ``);
    docLines.push('```');
    docLines.push(`use crate::...;`, ``);
    docLines.push(`${name}();`); // Put the function here
    docLines.push('```');

    // TODO Make editable configuration to include errors sections as a checkbox in the settings.

    // Check if rust functions return type is Result
    const isFallible = /Result\s*<.+>/.test(cleanedReturn || '');

    // Errors section
    if (isFallible) {
        docLines.push(``, `# Errors`, ``);
        docLines.push(`\${${currentTabStop++}:Describe possible errors.}`);
    }

    // Prefix all lines with Rust doc syntax (`///`) and return as a snippet string
    return [
        docLines[0], // First line is already preceded by `///` in the editor, skip it
        ...docLines.slice(1).map(line => `/// ${line}`)
    ].join('\n');
}

module.exports = { generateDocComment };