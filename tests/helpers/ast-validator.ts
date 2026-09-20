import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

/**
 * Loads and parses a TypeScript/TSX file into an AST SourceFile.
 */
export function parseSourceFile(filePath: string): ts.SourceFile {
  const fullPath = path.isAbsolute(filePath) ? filePath : path.resolve(process.cwd(), filePath);
  if (!fs.existsSync(fullPath)) {
    throw new Error(`File not found for AST parsing: ${fullPath}`);
  }
  const fileContent = fs.readFileSync(fullPath, 'utf8');
  return ts.createSourceFile(
    path.basename(fullPath),
    fileContent,
    ts.ScriptTarget.Latest,
    true,
    filePath.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS
  );
}

/**
 * Reads raw content of a file relative to project root.
 */
export function readProjectFile(relativePath: string): string {
  const fullPath = path.resolve(process.cwd(), relativePath);
  if (!fs.existsSync(fullPath)) {
    throw new Error(`Project file does not exist: ${relativePath}`);
  }
  return fs.readFileSync(fullPath, 'utf8');
}

/**
 * Checks if a file exists relative to project root.
 */
export function projectFileExists(relativePath: string): boolean {
  const fullPath = path.resolve(process.cwd(), relativePath);
  return fs.existsSync(fullPath);
}

/**
 * Traverses an AST tree and finds all nodes matching a predicate.
 */
export function findAstNodes(node: ts.Node, predicate: (n: ts.Node) => boolean): ts.Node[] {
  const results: ts.Node[] = [];
  function visit(n: ts.Node) {
    if (predicate(n)) {
      results.push(n);
    }
    ts.forEachChild(n, visit);
  }
  visit(node);
  return results;
}

/**
 * Checks if a specific module/package is imported in a file.
 */
export function hasImport(sourceFile: ts.SourceFile, moduleName: string): boolean {
  let found = false;
  ts.forEachChild(sourceFile, (node) => {
    if (ts.isImportDeclaration(node)) {
      const moduleSpecifier = node.moduleSpecifier.getText(sourceFile).replace(/['"]/g, '');
      if (moduleSpecifier === moduleName || moduleSpecifier.startsWith(moduleName)) {
        found = true;
      }
    }
  });
  return found;
}

/**
 * Checks if a specific method is called on an identifier (e.g., posthog.capture or posthog.init).
 */
export function findMethodCalls(
  sourceFile: ts.SourceFile,
  objectName: string,
  methodName: string
): ts.CallExpression[] {
  const calls: ts.CallExpression[] = [];
  function visit(node: ts.Node) {
    if (ts.isCallExpression(node)) {
      const expr = node.expression;
      if (ts.isPropertyAccessExpression(expr)) {
        if (expr.expression.getText(sourceFile) === objectName && expr.name.text === methodName) {
          calls.push(node);
        }
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(sourceFile);
  return calls;
}

/**
 * Finds all JSX elements/attributes with a given tag or attribute name.
 */
export interface JsxElementInfo {
  tagName: string;
  attributes: Record<string, string | boolean | undefined>;
  textSnippet: string;
}

export function findJsxElements(sourceFile: ts.SourceFile, tagName?: string): JsxElementInfo[] {
  const elements: JsxElementInfo[] = [];

  function visit(node: ts.Node) {
    if (ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node)) {
      const opening = ts.isJsxElement(node) ? node.openingElement : node;
      const currentTagName = opening.tagName.getText(sourceFile);

      if (!tagName || currentTagName === tagName) {
        const attributes: Record<string, string | boolean | undefined> = {};
        for (const prop of opening.attributes.properties) {
          if (ts.isJsxAttribute(prop)) {
            const attrName = prop.name.getText(sourceFile);
            if (!prop.initializer) {
              attributes[attrName] = true;
            } else if (ts.isStringLiteral(prop.initializer)) {
              attributes[attrName] = prop.initializer.text;
            } else if (ts.isJsxExpression(prop.initializer) && prop.initializer.expression) {
              attributes[attrName] = prop.initializer.expression.getText(sourceFile);
            }
          }
        }

        elements.push({
          tagName: currentTagName,
          attributes,
          textSnippet: node.getText(sourceFile),
        });
      }
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return elements;
}

/**
 * Parses package.json and returns its JSON object.
 */
export function getPackageJson(): Record<string, any> {
  const content = readProjectFile('package.json');
  return JSON.parse(content);
}
