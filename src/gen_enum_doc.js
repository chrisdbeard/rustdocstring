/**
 * Generates a Rust-style documentation block for an `enum` declaration.
 *
 * The generated block includes:
 * - A general description template.
 * - A `# Variants` section that lists all enum variants with tab stops.
 * - A `# Examples` section that demonstrates pattern matching.
 *
 * Supports unit variants, tuple variants, and struct variants.
 *
 * @param {string} line - The line containing the Rust `enum` declaration with its body.
 * @returns {string|null} A formatted doc comment block or null if parsing fails.
 */
function generateEnumDoc(line, includeExamples, examplesOnlyForPublicOrExtern) {
    // Check if enum is public or externed.
    const isPublicOrExtern = /\b(pub(\s*\([^)]*\)|\s+self|\s+super)?|extern(\s*"[^"]*")?)\b/.test(line);

    // Remove trailing comments and trim whitespace
    line = line.replace(/\/\/.*$/, '').trim();

    // Match the enum name and body
    const enumMatch = line.match(/enum\s+(\w+)(?:\s*<[^>]+>)?\s*\{([\s\S]+)\}/);
    if (!enumMatch) return null;

    const name = enumMatch[1];
    const body = enumMatch[2].trim();
    let currentTabStop = 2;

    // Documentation start and Variants section
    const docLines = [` \${1:Describe this enum.}`, ``, `# Variants`, ``];

    const variants = splitEnumVariants(body);
    const exampleLines = [`match ${name.toLowerCase()} {`];

    // Generate a documentation line and match arm for each variant
    for (const variant of variants) {
        const unitMatch = variant.match(/^(\w+)$/);
        const tupleMatch = variant.match(/^(\w+)\s*\((.+)\)$/);
        const fieldMatch = variant.match(/^(\w+)\s*\{(.+)\}$/);

        if (unitMatch) {
            const variantName = unitMatch[1];
            docLines.push(`- \`${variantName}\` - \${${currentTabStop++}:Describe this variant.}`);
            exampleLines.push(`    ${name}::${variantName} => handle_unit,`);
        } else if (tupleMatch) {
            const variantName = tupleMatch[1];
            const types = tupleMatch[2].split(',').map(t => t.trim());
            docLines.push(`- \`${variantName}(${types.join(', ')})\` - \${${currentTabStop++}:Describe this tuple variant.}`);
            const bindings = types.map((_, i) => `v${i}`).join(', ');
            exampleLines.push(`    ${name}::${variantName}(${bindings}) => handle_tuple,`);
        } else if (fieldMatch) {
            const variantName = fieldMatch[1];
            const fields = fieldMatch[2].split(',').map(f => f.trim()).filter(Boolean);
            const fieldNames = fields.map(f => f.split(':')[0].trim());
            const fieldLine = `- \`${variantName} { ${fieldNames.join(', ')} }\` - \${${currentTabStop++}:Describe this field variant.}`;
            docLines.push(fieldLine);
            exampleLines.push(`    ${name}::${variantName} { ${fieldNames.join(', ')} } => handle_fields,`);
        } else {
            docLines.push(`- \`${variant}\` - \${${currentTabStop++}:Describe this variant.}`);
            exampleLines.push(`    ${name}::${variant} => handle_unknown,`);
        }
    }

    const defaultVariant = variants[0].split(/[({]/)[0].trim();

    if (includeExamples && (!examplesOnlyForPublicOrExtern || isPublicOrExtern)) {
        // Examples section
        docLines.push(``, `# Examples`, ``, '```', `use crate::\${${currentTabStop++}:...};`, ``);
        docLines.push(`let ${name.toLowerCase()} = ${name}::${defaultVariant};`); // Add function name.
        docLines.push(...exampleLines);
        docLines.push('}');
        docLines.push('```'); // End the example section markdown code block
    }

    // Format as Rust doc comment block
    return [docLines[0], ...docLines.slice(1).map(line => `/// ${line}`)].join('\n');
}

/**
 * Splits an enum body string into individual variant strings,
 * accounting for nested braces `{}` and parentheses `()`.
 *
 * This function ensures variants like:
 *   - `A`
 *   - `B(u8)`
 *   - `C { x: u32 }`
 * are split correctly even when commas appear inside tuple or struct bodies.
 *
 * @param {string} body - The enum body string, e.g., `"A, B(u8), C { x: u32 }"`.
 * @returns {string[]} An array of cleaned variant strings.
 */
function splitEnumVariants(body) {
    const variants = [];
    let current = '';
    let brace = 0, paren = 0;

    // If not inside nested structures, use commas to split
    for (let i = 0; i < body.length; i++) {
        const char = body[i];
        if (char === '{') brace++;
        if (char === '}') brace--;
        if (char === '(') paren++;
        if (char === ')') paren--;

        if (char === ',' && brace === 0 && paren === 0) {
            variants.push(current.trim());
            current = '';
        } else {
            current += char;
        }
    }

    if (current.trim()) {
        variants.push(current.trim());
    }

    return variants;
}

module.exports = { generateEnumDoc };