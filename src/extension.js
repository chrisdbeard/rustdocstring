const vscode = require('vscode');
const { findNextSignatureBlock } = require('./utils');
const { generateDocComment } = require('./docgen');

function activate(context) {
    const provider = vscode.languages.registerCompletionItemProvider('rust', {
        provideCompletionItems(document, position) {
            const line = document.lineAt(position).text;
            if (!line.trim().endsWith('///')) return;

			const signature = findNextSignatureBlock(document, position.line);
            const config = vscode.workspace.getConfiguration('rustdocstring');
            const includeExamples = config.get('includeExamples', true);
            const examplesOnlyForPublicOrExtern = config.get('examplesOnlyForPublicOrExtern', false);
            const includeSafetyDetails = config.get('includeSafetyDetails', false);

			if (signature) {
				const doc = generateDocComment(signature, {
                    includeExamples,
                    examplesOnlyForPublicOrExtern,
                    includeSafetyDetails
                  });
				if (!doc) return;
				const item = new vscode.CompletionItem("Generate Rust Doc Comment");
				item.insertText = new vscode.SnippetString(doc);
				item.kind = vscode.CompletionItemKind.Snippet;

				return [item];
			}
        }
    }, '/');

    context.subscriptions.push(provider);
}

function deactivate() {}

module.exports = {
    activate,
    deactivate
};

