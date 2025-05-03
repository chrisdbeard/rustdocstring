const { generateFunctionDoc } = require('./gen_fn_doc.js');
const { generateStructDoc } = require('./gen_struct_doc.js');
const { generateEnumDoc } = require('./gen_enum_doc.js');

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
        // case 'trait': // TODO
        //     return generateTraitDoc(line);
        // case 'union': // TODO
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
    // if (/trait\s+\w+/.test(line)) return 'trait'; // TODO
    // if (/union\s+\w+/.test(line)) return 'union'; // TODO
    return null;
}

module.exports = { generateDocComment };