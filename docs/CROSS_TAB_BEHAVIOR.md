# Local voting across tabs

Observed on 2026-11-11 in installed Edge, using two real pages in the **same
browser context and HTTP origin**. This is an implementation self-check, not
independent acceptance or evidence of cross-user voting.

## Observed limitations (unfixed)

Both pages started with a controlled synthetic local fixture: each event had 10 votes and
no local voted flags. Storage itself was the browser's real `localStorage`, not
a JavaScript replacement. Native browser mouse input clicked the vote buttons.

| Sequence | Stored result | Page behavior |
| --- | --- | --- |
| A votes for X | X = 11, X flagged | B receives a trusted `storage` event and can read X = 11, but still displays 10 and an unvoted button. |
| Activate B after A's vote | Still X = 11 | Real focus/visibility events occur; B remains stale. |
| B then votes for different event Y | X = 10, Y = 11; only Y flagged | B overwrites A's new vote and X flag using its stale snapshot. A still displays its own old snapshot. |
| Reload both pages | X = 10, Y = 11 | Both read the last stored record. X can be voted for again because its earlier flag was lost. |
| Fresh pair: A and then B both vote for X | X = 11, X flagged | Both pages accept the action and show voted. B writes the same 11, not 12; it does not reject the already-recorded local vote. |
| Reload after the same-event case, then retry | X remains 11 | The reloaded voted flag blocks a further vote. |

These are sequential writes from already-open pages; simultaneous clicks are
not required. The observed policy is **last write wins for the whole record**.
The same-event result does not establish a correct duplicate-vote policy just
because the final count happens to be 11. A repeated local action was accepted.

## Source cause

`index.html:1634` loads `dp_vote_state` once. `voteCounts` and `myVotes` are
page-local snapshots (`index.html:1637`). `getVoteCount` and `hasVoted` read those
snapshots (`index.html:2449`). `voteHype` validates against them and spreads them
into a new record (`index.html:2922`). `saveVoteState` replaces the entire
`dp_vote_state` value with one `setItem` (`index.html:1643`).

There is no application listener that refreshes those snapshots on `storage`,
focus or visibility changes. Saving count and flag together protects the two
fields in one write; it does not coordinate two tabs' read/modify/write cycles.

## Reproducing and interpreting the evidence

1. Serve this revision over loopback HTTP and open A and B in one fresh browser
   profile/context at the exact same origin. Initialize the local fixture before
   loading B; never clear an existing user's data.
2. Observe `storage` events on B and inspect `dp_vote_state`, displayed counts
   and button states separately. Vote X in A, activate B, then vote Y in B.
3. Reload both pages and retry X. Repeat with a new isolated context, voting X
   from both already-open pages instead.

The historical local observation retained six **product FAIL** results.
Successful completion of the observation harness is not a product
synchronization PASS. Raw local experimental logs and browser state are not
included in this repository; the sequence above describes how to reproduce
the behavior with synthetic data.

External font/preconnect links were omitted only in the test HTTP response;
the repo HTML/CSS was not changed for this. CSP, request blocking and a dead
external proxy kept page traffic local. Screenshots therefore use fallback
fonts and are functional evidence, not typography or mobile acceptance.

## Sharing and regression checks

All six supported share languages (zh-TW, en, ja, es, fr, de), the native share
payload's separate URL field, and clipboard fallback use
`https://theroyatlas.github.io/T-MINUS/`. Browser share/clipboard functions were
stubbed to capture payloads locally; no real share sheet or system clipboard
write was performed. Actual OS sharing and clipboard permissions remain untested.

Run `node --test tests/app.test.cjs tests/share.test.cjs`: the original 15 tests
remain unchanged and 14 share tests cover both paths and all languages. These
Node tests use controlled DOM/storage/clock doubles, not real browser tabs.

## Possible future repair, not implemented

Refreshing on storage/focus could address stale displays but would not by
itself prevent lost updates. A separately scoped repair would need coordinated
read/validate/write operations across tabs (for example, a common lock used by
every writer, or transactional browser storage), plus regression cases for
concurrent writes and failures. No such synchronization or backend was added.

Counts remain local demo data, not community totals or cross-user evidence.
The existing 390px clipping issue, event content, animations and styles were
not changed. The existing `og:url` metadata is outside this share-text/payload
patch and still contains the old handle.
