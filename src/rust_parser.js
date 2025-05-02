// const vscode = require('vscode');
// const { generateDocComment } = require('./docgen');

// function activate(context) {
//     const provider = vscode.languages.registerCompletionItemProvider('rust', {
//         provideCompletionItems(document, position) {
//             const line = document.lineAt(position).text;
//             if (!line.trim().endsWith('///')) return;

//             const nextLine = document.lineAt(position.line + 1)?.text || "";
//             const doc = generateDocComment(nextLine);
//             if (!doc) return;

//             const item = new vscode.CompletionItem("Generate Rust Doc Comment");
//             item.insertText = new vscode.SnippetString(doc);
//             item.kind = vscode.CompletionItemKind.Snippet;

//             return [item];
//         }
//     }, '/');

//     context.subscriptions.push(provider);
// }

// function deactivate() {}

// module.exports = {
//     activate,
//     deactivate
// };
