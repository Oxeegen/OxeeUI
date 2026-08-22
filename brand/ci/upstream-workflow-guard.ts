/**
 * Keeps upstream's GitHub Actions from running on this fork.
 *
 * Upstream ships 28 workflows and 16 fire on `push`, `pull_request`, or
 * `schedule`. This is a real fork with Actions enabled, so without a guard the
 * first push would start macOS build matrices, Windows e2e suites, and mobile
 * release jobs on our quota for no benefit.
 *
 * Every job carries `if: github.repository == 'stablyai/orca'`, which is
 * upstream's own fork-protection idiom — six of their jobs already used it
 * before we touched anything. Jobs still resolve, then skip immediately, and
 * skipped jobs bill nothing.
 *
 * Guarding beats deleting on two counts. Upstream changed `.github/workflows`
 * 232 times in six months, and a deleted file conflicts on every one of those
 * that touches it, whereas a guarded file merges cleanly unless the edit lands
 * on the guard line itself. Deleting also breaks the 17 upstream test files that
 * read these workflows; guarding cost four relaxed assertions and no coverage.
 *
 * The companion test fails when any job lacks the guard, which covers the case
 * no merge conflict ever reports: a workflow or job added upstream after we
 * guarded, arriving as a clean add.
 */

export const WORKFLOW_GUARD = "github.repository == 'stablyai/orca'"

/**
 * Workflows this fork authored, which must run here and therefore must not carry
 * the guard. Add a filename here only for a workflow we own.
 */
export const FORK_OWNED_WORKFLOWS: readonly string[] = ['release-brand.yml']
