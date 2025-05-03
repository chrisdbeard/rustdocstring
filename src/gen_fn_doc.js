/**
 * Generates doc comments for Rust functions.
 *
 * @param {string} line - The normalized function signature.
 * @returns {string|null} - The doc comment block.
 */
function generateFunctionDoc(line) {
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

    // Check if rust functions return type is Result
    const isFallible = /Result\s*<.+>/.test(cleanedReturn || '');

    // Errors section
    if (isFallible) {
        docLines.push(``, `# Errors`, ``);
        docLines.push(`\${${currentTabStop++}:Describe possible errors.}`);
    }

    // TODO Make editable configuration to include example sections as a checkbox in the settings.

    // Examples section
    docLines.push(``, `# Examples`, ``);

    // Check if async or unsafe
    // if (hasAsync || hasUnsafe) 

    docLines.push('```');
    docLines.push(`use crate::\${${currentTabStop++}:...};`, ``);
    docLines.push(`let _ = ${name}();`); // Put the function here
    docLines.push('```');

    // Prefix all lines with Rust doc syntax (`///`) and return as a snippet string
    return [
        docLines[0], // First line is already preceded by `///` in the editor, skip it
        ...docLines.slice(1).map(line => `/// ${line}`)
    ].join('\n');
}

module.exports = { generateFunctionDoc };