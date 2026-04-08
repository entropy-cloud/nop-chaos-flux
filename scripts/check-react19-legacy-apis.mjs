import { readdir, readFile } from 'fs/promises';
import path from 'path';
import process from 'process';
import ts from 'typescript';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const rootDir = path.join(__dirname, '..');
const scanRoots = ['apps', 'packages', 'tests'];
const scanExtensions = new Set(['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs']);
const ignoreDirectoryNames = new Set([
  '.git',
  '.turbo',
  'coverage',
  'dist',
  'node_modules',
  'temp',
  'test-results'
]);

const legacyReactDomImports = new Set(['findDOMNode', 'hydrate', 'render', 'unmountComponentAtNode']);
const forbiddenModules = new Map([
  ['react-dom/test-utils', 'Use @testing-library/react instead of react-dom/test-utils.'],
  ['react-test-renderer', 'Do not reintroduce react-test-renderer into the React 19 baseline.'],
  ['react-test-renderer/shallow', 'Shallow rendering is legacy. Use @testing-library/react instead.']
]);

function toPosixPath(filePath) {
  return path.relative(rootDir, filePath).split(path.sep).join('/');
}

async function collectSourceFiles(dir) {
  const files = [];
  const entries = await readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    if (ignoreDirectoryNames.has(entry.name)) {
      continue;
    }

    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...await collectSourceFiles(fullPath));
      continue;
    }

    if (!entry.isFile()) {
      continue;
    }

    if (scanExtensions.has(path.extname(entry.name))) {
      files.push(fullPath);
    }
  }

  return files;
}

function createIssue(sourceFile, node, message) {
  const { line, character } = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
  return {
    filePath: toPosixPath(sourceFile.fileName),
    line: line + 1,
    column: character + 1,
    message
  };
}

function isUppercaseComponentName(name) {
  return /^[A-Z]/.test(name);
}

function getAssignmentTarget(node) {
  if (!ts.isExpressionStatement(node) || !ts.isBinaryExpression(node.expression)) {
    return null;
  }

  if (node.expression.operatorToken.kind !== ts.SyntaxKind.EqualsToken) {
    return null;
  }

  return node.expression.left;
}

function getRefAttributeName(node) {
  if (ts.isJsxAttribute(node.name)) {
    return node.name.text;
  }

  return node.name.text;
}

function scanSourceFile(sourceFile) {
  const issues = [];

  function visit(node) {
    if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) {
      const moduleName = node.moduleSpecifier.text;
      const importClause = node.importClause;

      if (forbiddenModules.has(moduleName)) {
        issues.push(createIssue(sourceFile, node.moduleSpecifier, forbiddenModules.get(moduleName)));
      }

      if (moduleName === 'react-dom' && importClause?.namedBindings && ts.isNamedImports(importClause.namedBindings)) {
        for (const element of importClause.namedBindings.elements) {
          const importName = (element.propertyName ?? element.name).text;
          if (legacyReactDomImports.has(importName)) {
            issues.push(createIssue(sourceFile, element.name, `Legacy react-dom import '${importName}' is not allowed in the React 19 baseline.`));
          }
        }
      }

      if (moduleName === 'react' && importClause?.namedBindings && ts.isNamedImports(importClause.namedBindings)) {
        for (const element of importClause.namedBindings.elements) {
          const importName = (element.propertyName ?? element.name).text;
          if (importName === 'createFactory') {
            issues.push(createIssue(sourceFile, element.name, 'createFactory is legacy and unsupported in the React 19 baseline.'));
          }
        }
      }
    }

    if (ts.isPropertyAccessExpression(node)) {
      if (ts.isIdentifier(node.expression) && node.expression.text === 'ReactDOM') {
        if (legacyReactDomImports.has(node.name.text)) {
          issues.push(createIssue(sourceFile, node.name, `ReactDOM.${node.name.text} is legacy and unsupported in the React 19 baseline.`));
        }
      }

      if (ts.isIdentifier(node.expression) && node.expression.text === 'React' && node.name.text === 'createFactory') {
        issues.push(createIssue(sourceFile, node.name, 'React.createFactory is legacy and unsupported in the React 19 baseline.'));
      }

      if (ts.isIdentifier(node.expression) && node.expression.text === 'element' && node.name.text === 'ref') {
        issues.push(createIssue(sourceFile, node.name, 'element.ref should not be read directly in the React 19 baseline.'));
      }
    }

    if (ts.isPropertyDeclaration(node) || ts.isMethodDeclaration(node)) {
      const name = node.name && ts.isIdentifier(node.name) ? node.name.text : null;
      if (name === 'contextTypes' || name === 'childContextTypes' || name === 'getChildContext') {
        issues.push(createIssue(sourceFile, node.name, `${name} is part of the legacy context API and is not allowed in the React 19 baseline.`));
      }
    }

    if (ts.isExpressionStatement(node)) {
      const assignmentTarget = getAssignmentTarget(node);
      if (assignmentTarget && ts.isPropertyAccessExpression(assignmentTarget) && ts.isIdentifier(assignmentTarget.expression)) {
        const ownerName = assignmentTarget.expression.text;
        const propertyName = assignmentTarget.name.text;
        if ((propertyName === 'propTypes' || propertyName === 'defaultProps') && isUppercaseComponentName(ownerName)) {
          issues.push(createIssue(sourceFile, assignmentTarget.name, `${ownerName}.${propertyName} is legacy and should not be added back into the React 19 baseline.`));
        }
        if ((propertyName === 'contextTypes' || propertyName === 'childContextTypes') && isUppercaseComponentName(ownerName)) {
          issues.push(createIssue(sourceFile, assignmentTarget.name, `${ownerName}.${propertyName} is part of the legacy context API and is not allowed.`));
        }
      }
    }

    if (ts.isJsxAttribute(node)) {
      const attributeName = getRefAttributeName(node);
      if (attributeName === 'ref') {
        if (node.initializer && ts.isStringLiteral(node.initializer)) {
          issues.push(createIssue(sourceFile, node.initializer, 'String refs are legacy and unsupported in the React 19 baseline.'));
        }

        if (
          node.initializer &&
          ts.isJsxExpression(node.initializer) &&
          node.initializer.expression &&
          ts.isArrowFunction(node.initializer.expression) &&
          !ts.isBlock(node.initializer.expression.body)
        ) {
          issues.push(createIssue(sourceFile, node.initializer.expression, 'Ref callbacks must use a block body or explicit void return to avoid implicit cleanup returns.'));
        }
      }
    }

    if (ts.isPropertyAssignment(node) || ts.isShorthandPropertyAssignment(node) || ts.isMethodDeclaration(node)) {
      const name = node.name && ts.isIdentifier(node.name) ? node.name.text : null;
      if (name === 'contextTypes' || name === 'childContextTypes' || name === 'getChildContext') {
        issues.push(createIssue(sourceFile, node.name, `${name} is part of the legacy context API and is not allowed in the React 19 baseline.`));
      }
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return issues;
}

async function main() {
  const files = [];
  for (const scanRoot of scanRoots) {
    const fullRoot = path.join(rootDir, scanRoot);
    files.push(...await collectSourceFiles(fullRoot));
  }

  const issues = [];

  for (const filePath of files) {
    const content = await readFile(filePath, 'utf8');
    const sourceFile = ts.createSourceFile(filePath, content, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    issues.push(...scanSourceFile(sourceFile));
  }

  if (issues.length > 0) {
    console.error('[check-react19] Found React 19 legacy API violations:');
    for (const issue of issues) {
      console.error(`  - ${issue.filePath}:${issue.line}:${issue.column} ${issue.message}`);
    }
    process.exit(1);
  }

  console.log('[check-react19] No React 19 legacy API violations found');
}

main().catch((error) => {
  console.error('[check-react19] failed', error);
  process.exit(1);
});