import { AxeBuilder } from '@axe-core/playwright';
import { expect, type Page } from '@playwright/test';

/**
 * Zero violations is the rule. An exception is a `disableRules` call here with the
 * rule id, the reason and a TODO, and it is listed in the PR.
 */
export async function expectNoAxeViolations(page: Page): Promise<void> {
  const { violations } = await new AxeBuilder({ page }).analyze();
  // One readable line per violation, so a failure names the rule and the elements.
  expect(
    violations.map(
      ({ id, help, nodes }) =>
        `${id} (${help}): ${nodes.map((node) => node.target.join(' ')).join(' | ')}`,
    ),
  ).toEqual([]);
}
