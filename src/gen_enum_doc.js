/**
 * Generates doc comments for Rust enums.
 *
 * @param {string} line - The enum declaration line.
 * @returns {string|null} - The doc comment block.
 */
function generateEnumDoc(line) {
    line = line.replace(/\/\/.*$/, '').trim();
    const enumMatch = line.match(/enum\s+(\w+)(?:\s*<[^>]+>)?\s*\{([\s\S]+)\}/);
    if (!enumMatch) return null;

    const name = enumMatch[1];
    const body = enumMatch[2].trim();
    let currentTabStop = 2;
    const docLines = [`\${1:Describe this enum.}`, ``, `# Variants`, ``];

    const variants = splitEnumVariants(body);
    const exampleLines = [`match ${name.toLowerCase()} {`];

    for (const variant of variants) {
        const unitMatch = variant.match(/^(\w+)$/);
        const tupleMatch = variant.match(/^(\w+)\s*\((.+)\)$/);
        const fieldMatch = variant.match(/^(\w+)\s*\{(.+)\}$/);

        if (unitMatch) {
            const variantName = unitMatch[1];
            docLines.push(`- \`${variantName}\` - \${${currentTabStop++}:Describe this variant.}`);
            exampleLines.push(`    ${name}::${variantName} => \${${currentTabStop++}:handle_unit},`);
        } else if (tupleMatch) {
            const variantName = tupleMatch[1];
            const types = tupleMatch[2].split(',').map(t => t.trim());
            docLines.push(`- \`${variantName}(${types.join(', ')})\` - \${${currentTabStop++}:Describe this tuple variant.}`);
            const bindings = types.map((_, i) => `v${i}`).join(', ');
            exampleLines.push(`    ${name}::${variantName}(${bindings}) => \${${currentTabStop++}:handle_tuple},`);
        } else if (fieldMatch) {
            const variantName = fieldMatch[1];
            const fields = fieldMatch[2].split(',').map(f => f.trim()).filter(Boolean);
            const fieldNames = fields.map(f => f.split(':')[0].trim());
            const fieldLine = `- \`${variantName} { ${fieldNames.join(', ')} }\` - \${${currentTabStop++}:Describe this field variant.}`;
            docLines.push(fieldLine);
            exampleLines.push(`    ${name}::${variantName} { ${fieldNames.join(', ')} } => \${${currentTabStop++}:handle_fields},`);
        } else {
            docLines.push(`- \`${variant}\` - \${${currentTabStop++}:Describe this variant.}`);
            exampleLines.push(`    ${name}::${variant} => \${${currentTabStop++}:handle_unknown},`);
        }
    }

    const defaultVariant = variants[0].split(/[({]/)[0].trim();
    docLines.push(``, `# Examples`, ``, '```', `use crate::...;`, ``);
    docLines.push(`let ${name.toLowerCase()} = ${name}::${defaultVariant};`);
    docLines.push(...exampleLines);
    docLines.push('}');
    docLines.push('```');

    return [docLines[0], ...docLines.slice(1).map(line => `/// ${line}`)].join('\n');
}

function splitEnumVariants(body) {
    const variants = [];
    let current = '';
    let brace = 0, paren = 0;

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