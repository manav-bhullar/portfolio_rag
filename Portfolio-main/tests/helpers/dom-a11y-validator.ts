import { parseSourceFile, findJsxElements, JsxElementInfo, readProjectFile } from './ast-validator';

export interface AccessibilityAuditResult {
  passed: boolean;
  element: string;
  expectedAttribute: string;
  actualAttributes: Record<string, string | boolean | undefined>;
  details: string;
}

/**
 * Validates ARIA attributes on interactive elements in a TSX component.
 */
export function auditComponentA11y(
  filePath: string,
  tagName: string,
  requiredAttributes: Record<string, string | RegExp | boolean>
): AccessibilityAuditResult[] {
  const source = parseSourceFile(filePath);
  const elements = findJsxElements(source, tagName);

  const results: AccessibilityAuditResult[] = [];

  for (const el of elements) {
    for (const [attr, expected] of Object.entries(requiredAttributes)) {
      const actual = el.attributes[attr];
      let matches = false;

      if (expected instanceof RegExp) {
        matches = typeof actual === 'string' && expected.test(actual);
      } else if (typeof expected === 'boolean') {
        matches = Boolean(actual) === expected;
      } else {
        matches = actual === expected;
      }

      results.push({
        passed: matches,
        element: tagName,
        expectedAttribute: `${attr}=${expected.toString()}`,
        actualAttributes: el.attributes,
        details: matches
          ? `Element <${tagName}> satisfies ${attr}=${expected}`
          : `Element <${tagName}> missing or mismatched attribute ${attr}. Actual: ${actual ?? 'undefined'}`,
      });
    }
  }

  return results;
}

/**
 * Checks if a chat view file contains tool execution loading state logic with role="status" or aria-live.
 */
export function inspectChatLoadingState(filePath: string): {
  hasLoadingState: boolean;
  hasRoleStatus: boolean;
  hasAriaLive: boolean;
  hasThinkingText: boolean;
  handlesActiveToolState: boolean;
} {
  const code = readProjectFile(filePath);

  const hasRoleStatus = /role=["']status["']/.test(code);
  const hasAriaLive = /aria-live=["'](polite|assertive)["']/.test(code);
  const hasThinkingText = /(Thinking\.\.\.|Exploring|Loading|Preparing|Analyzing|Fetching)/i.test(code);
  const handlesActiveToolState = /state\s*!==\s*['"]result['"]|activeToolInvocation|isToolInProgress/i.test(code);

  const hasLoadingState = (hasRoleStatus || hasAriaLive || hasThinkingText) && handlesActiveToolState;

  return {
    hasLoadingState,
    hasRoleStatus,
    hasAriaLive,
    hasThinkingText,
    handlesActiveToolState,
  };
}
