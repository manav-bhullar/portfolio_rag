import { TestCase, TestResult, FilterOptions, SuiteSummary } from './helpers/types';
import { tier1Tests } from './tier1-feature-coverage.test';
import { tier2Tests } from './tier2-boundary-corner.test';
import { tier3Tests } from './tier3-cross-feature.test';
import { tier4Tests } from './tier4-real-world.test';

// ANSI Color Codes
const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const CYAN = '\x1b[36m';
const DIM = '\x1b[2m';

function parseCliArgs(): FilterOptions {
  const args = process.argv.slice(2);
  const options: FilterOptions = {};

  for (const arg of args) {
    if (arg.startsWith('--tier=')) {
      const val = parseInt(arg.split('=')[1], 10);
      if ([1, 2, 3, 4].includes(val)) {
        options.tier = val as 1 | 2 | 3 | 4;
      }
    } else if (arg.startsWith('--feature=')) {
      const val = arg.split('=')[1].toUpperCase();
      if (['R1', 'R2', 'R3', 'R4'].includes(val)) {
        options.feature = val as 'R1' | 'R2' | 'R3' | 'R4';
      }
    } else if (arg.startsWith('--grep=')) {
      options.grep = arg.split('=')[1];
    }
  }

  return options;
}

function filterTests(tests: TestCase[], options: FilterOptions): TestCase[] {
  return tests.filter((t) => {
    if (options.tier && t.tier !== options.tier) return false;
    if (options.feature && t.feature !== options.feature) return false;
    if (options.grep) {
      const pattern = new RegExp(options.grep, 'i');
      if (!pattern.test(t.id) && !pattern.test(t.name)) return false;
    }
    return true;
  });
}

async function runSingleTest(test: TestCase): Promise<TestResult> {
  const startTime = Date.now();
  try {
    await test.fn();
    return {
      id: test.id,
      name: test.name,
      feature: test.feature,
      tier: test.tier,
      status: 'passed',
      durationMs: Date.now() - startTime,
    };
  } catch (err: any) {
    return {
      id: test.id,
      name: test.name,
      feature: test.feature,
      tier: test.tier,
      status: 'failed',
      durationMs: Date.now() - startTime,
      error: err,
    };
  }
}

async function main() {
  const options = parseCliArgs();
  const allTests: TestCase[] = [
    ...tier1Tests,
    ...tier2Tests,
    ...tier3Tests,
    ...tier4Tests,
  ];

  const selectedTests = filterTests(allTests, options);

  console.log(`\n${BOLD}${CYAN}======================================================================${RESET}`);
  console.log(`${BOLD}${CYAN}      Next.js AI Portfolio — Comprehensive E2E Test Suite            ${RESET}`);
  console.log(`${BOLD}${CYAN}======================================================================${RESET}`);
  console.log(
    `${DIM}Execution Filter:${RESET} ${
      options.tier ? `Tier: ${options.tier} ` : 'All Tiers '
    }${options.feature ? `Feature: ${options.feature} ` : 'All Features '}${
      options.grep ? `Grep: "${options.grep}"` : ''
    }`
  );
  console.log(`${DIM}Total Discovered Tests:${RESET} ${allTests.length} | ${DIM}Selected for Run:${RESET} ${selectedTests.length}\n`);

  if (selectedTests.length === 0) {
    console.log(`${YELLOW}No tests matched the specified filters.${RESET}\n`);
    process.exit(0);
  }

  const results: TestResult[] = [];
  const suiteStartTime = Date.now();

  let currentTier: number | null = null;

  for (const test of selectedTests) {
    if (test.tier !== currentTier) {
      currentTier = test.tier;
      console.log(`\n${BOLD}--- Tier ${currentTier} Tests ---${RESET}`);
    }

    const res = await runSingleTest(test);
    results.push(res);

    const statusBadge =
      res.status === 'passed'
        ? `${GREEN}✔ PASS${RESET}`
        : `${RED}✖ FAIL${RESET}`;

    const durationStr = `${DIM}(${res.durationMs}ms)${RESET}`;
    console.log(`  ${statusBadge} ${BOLD}[${res.id}]${RESET} [${res.feature}] ${res.name} ${durationStr}`);
  }

  const totalDuration = Date.now() - suiteStartTime;
  const passedCount = results.filter((r) => r.status === 'passed').length;
  const failedCount = results.filter((r) => r.status === 'failed').length;

  // Failure details breakdown
  if (failedCount > 0) {
    console.log(`\n${BOLD}${RED}======================== FAILURE DETAILS ========================${RESET}\n`);
    for (const res of results.filter((r) => r.status === 'failed')) {
      console.log(`${BOLD}${RED}✖ [${res.id}] [${res.feature}] ${res.name}${RESET}`);
      if (res.error) {
        console.log(`  ${DIM}Error:${RESET} ${res.error.message}`);
        if (res.error.stack) {
          const cleanStack = res.error.stack
            .split('\n')
            .slice(1, 4)
            .map((line) => `    ${DIM}${line.trim()}${RESET}`)
            .join('\n');
          console.log(cleanStack);
        }
      }
      console.log();
    }
  }

  // Summary Table
  console.log(`\n${BOLD}${CYAN}======================== TEST SUITE SUMMARY ========================${RESET}`);
  console.log(`  ${BOLD}Total Tests Run:${RESET}    ${results.length}`);
  console.log(`  ${BOLD}Passed:${RESET}            ${GREEN}${passedCount}${RESET}`);
  console.log(`  ${BOLD}Failed:${RESET}            ${failedCount > 0 ? RED : GREEN}${failedCount}${RESET}`);
  console.log(`  ${BOLD}Total Duration:${RESET}    ${totalDuration}ms`);
  console.log(`${BOLD}${CYAN}======================================================================${RESET}\n`);

  if (failedCount > 0) {
    console.log(`${RED}${BOLD}Test run failed with ${failedCount} failure(s).${RESET}\n`);
    process.exit(1);
  } else {
    console.log(`${GREEN}${BOLD}All ${passedCount} tests passed successfully!${RESET}\n`);
    process.exit(0);
  }
}

main().catch((err) => {
  console.error(`${RED}Fatal runner error:${RESET}`, err);
  process.exit(1);
});
