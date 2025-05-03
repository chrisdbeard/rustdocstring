/**
 * Dispatcher for generating Rust doc comments based on the type of code item.
 * Supports functions, structs, enums, and traits. Delegates to specialized handlers.
 *
 * @param {string} line - The normalized line of Rust code (a signature).
 * @returns {string|null} - The formatted doc comment, or null if unsupported.
 */
function generateDocComment(line) {
    const itemType = getRustItemType(line);
    if (!itemType) return null;

    switch (itemType) {
        case 'function':
            return generateFunctionDoc(line);
        case 'struct':
            return generateStructDoc(line);
        case 'enum':
            return generateEnumDoc(line);
        // case 'trait':
        //     return generateTraitDoc(line);
        // case 'union':
        //     return generateUnionDoc(line);
        default:
            return null;
    }
}

/**
 * Determines the type of Rust item from a signature line.
 *
 * @param {string} line - A line of Rust code.
 * @returns {"function"|"struct"|"enum"|null} - The detected item type.
 */
function getRustItemType(line) {
    if (/fn\s+\w+\s*\(/.test(line)) return 'function';
    if (/struct\s+\w+/.test(line)) return 'struct';
    if (/enum\s+\w+/.test(line)) return 'enum';
    // if (/trait\s+\w+/.test(line)) return 'trait';
    // if (/union\s+\w+/.test(line)) return 'union';
    return null;
}

/**
 * Generates doc comments for Rust functions.
 *
 * @param {string} line - The normalized function signature.
 * @returns {string|null} - The doc comment block.
 */
function generateFunctionDoc(line) {
    // Strip pub, pub(crate), pub(in ...), pub(self), pub(super)
    const cleanLine = line.replace(/pub(\s*\([^)]*\)|\s+self|\s+super)?\s+/, '');

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
    docLines.push('```');
    docLines.push(`use crate::\${${currentTabStop++}:...};`, ``);
    docLines.push(`let x = ${name}();`); // Put the function here
    docLines.push('```');

    // Prefix all lines with Rust doc syntax (`///`) and return as a snippet string
    return [
        docLines[0], // First line is already preceded by `///` in the editor, skip it
        ...docLines.slice(1).map(line => `/// ${line}`)
    ].join('\n');
}

/**
 * Generates doc comments for Rust structs.
 *
 * @param {string} line - The struct declaration and block in a single line.
 * @returns {string|null} - The doc comment block.
 */
function generateStructDoc(line) {
    // Reject unit structs (single struct no fields)
    if (/struct\s+\w+\s*(;|\{\})/.test(line)) return null; // Struct ends with ';' or '{}'

     // Remove visibility modifier (pub, pub(...))
     const cleanLine = line.replace(/pub(\s*\([^)]*\))?\s+/g, '');

    // Match struct name and optional body: {}, (), or unit
    const structMatch = cleanLine.match(/struct\s+(\w+)\s*(\([^)]*\)|\{[\s\S]*\})/);
    if (!structMatch) return null;

    const name = structMatch[1];
    const body = structMatch[2]?.trim() || '';
    let currentTabStop = 2;
    const docLines = [` \${1:Describe this struct.}`];

    const fields = [];

    // Find all fields for the structure can be a Field struct or a Tuple struct -- "struct Temp {" or "struct Temp("
    if (body.startsWith('{')) {
        // Field struct
        const fieldList = body.slice(1, -1).split(',').map(f => f.trim()).filter(Boolean);
        for (const field of fieldList) {
            const cleanedField = field.replace(/pub(\s*\([^)]*\))?\s+/, '').trim(); // Remove 'pub' from field
            const [fieldName, fieldType] = cleanedField.split(':').map(s => s.trim());
            if (fieldName && fieldType) {
                fields.push(`- \`${fieldName}\` (\`${fieldType}\`) - \${${currentTabStop++}:Describe this field.}`);
            }
        }
    } else if (body.startsWith('(')) {
        // Tuple struct
        const types = body.slice(1, -1).split(',').map(t => t.trim()).filter(Boolean);
        for (let i = 0; i < types.length; i++) {
            fields.push(`- \`field_${i}\` (\`${types[i]}\`) - \${${currentTabStop++}:Describe this tuple field.}`);
        }
    }

    // Struct Fields section
    if (fields.length > 0) {
        docLines.push(``, `# Fields`, ``, ...fields);
    }

    // Examples section
    docLines.push(``, `# Examples`, ``, '```', `use crate::...;`, ``);

    if (body.startsWith('{')) {
        // Field-style struct
        docLines.push(`let s = ${name} {`);
        for (const field of fields) {
            const fieldName = field.match(/`([^`]+)`/)[1]; // extract field name
            docLines.push(`    ${fieldName}: value,`);
        }
        docLines.push(`};`);
    } else if (body.startsWith('(')) {
        // Tuple-style struct
        const types = body.slice(1, -1).split(',').map(t => t.trim()).filter(Boolean);
        const tupleArgs = types.map(() => `value`).join(', ');
        docLines.push(`let s = ${name}(${tupleArgs});`);
    }

    docLines.push('```');

    return [docLines[0], ...docLines.slice(1).map(line => `/// ${line}`)].join('\n');
}

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

module.exports = { generateDocComment };