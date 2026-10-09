# Hunting data hub snapshot

Builds the static data of `/hunting/data` (`public/data/hunting/v1/*.json`) from the medžioklė database:
national and municipality aggregates of loots, moose limits, damage reports and located wolves.

**Committing these files publishes them.** The repository is public, the files are served on staging and, behind
the UI gate, as static files on production. Only aggregates that passed the privacy rules below may be committed.

## Files

| Path               | What                                                                                                            |
| ------------------ | --------------------------------------------------------------------------------------------------------------- |
| `sql/*.sql`        | the queries, run in file order; every one is a read-only `SELECT` over live (not deleted) rows                  |
| `run.sh`           | runs the queries through `psql` in a read-only session, then `build.mjs` and `check.mjs`                        |
| `build.mjs`        | turns the CSV outputs into the five JSON files; fails on any column that is not whitelisted                     |
| `check.mjs`        | checks the committed JSON without a database (privacy lint, references, consistency, `checks.json`); runs in CI |
| `privacy.mjs`      | small-cell protection of damages and pooling of municipalities with fewer than 3 MPV (used by build and check)  |
| `checks.json`      | expected values; exact for closed seasons, floors (≥) for the running season                                    |
| `meta-static.json` | hand-maintained official figures (AM pages) copied into `meta.json` as `static`                                 |

Output: `meta.json`, `loots.json`, `limits.json`, `damages.json`, `wolves.json`. Each file is
`{ v: 1, snapshotDate, generatedAt, tables: { <name>: { columns, rows } } }` with one row per line, so
`git diff` shows what a new snapshot changed.

## Who runs it, and how

A person with read access to the production database, locally, through the `biip` tunnel. Never in CI and never on
a remote helper: the queries read production data.

```bash
# tunnel to the production database on 127.0.0.1:5446 (see the team's access notes), then:
PGHOST=127.0.0.1 PGPORT=5446 PGDATABASE=medziokle PGUSER=… PGPASSWORD=… \
  scripts/hunting-snapshot/run.sh            # snapshotDate = today (Europe/Vilnius)
git diff --stat public/data/hunting/v1       # review what changed
node scripts/hunting-snapshot/check.mjs      # also runs at the end of run.sh and in CI
```

Every session starts with `default_transaction_read_only=on` and a 60 s statement timeout; `run.sh` refuses to run
unless the server confirms the session is read-only. The queries always cut at today's date; `--date YYYY-MM-DD` only
relabels the snapshot (use it for a run that crosses midnight). Close the tunnel afterwards.

When a re-snapshot moves a closed-season value, update `checks.json` in the same commit and add a line to its
`changes` list saying why, so the drift is visible in review. When the 2026/2027 wolf limit order is signed, set
`wolves.seasons.2026.limit` in `meta-static.json` by hand.

## Privacy rules

- Only counts and sums leave the database. Never names, e-mails, phones, notes, files, geometry or coordinates, days
  or times, MPV ids or names, hunter, hunt or user ids, or per-MPV values.
- Damage reports: the reporter key (md5 of the normalised e-mail) exists only inside `count(DISTINCT)`. Reporters are
  published only per (season, municipality), (season, group) and (season), and only when ≥ 3. Month and livestock
  tables are national only.
- **Small damages counts (owner decision 2026-10-09).** The SQL nulls every damages count of 1 or 2. Totals are
  computed on unsuppressed data, so `privacy.mjs` (run by `build.mjs`) makes sure no small count can be worked out
  from them:
  - every published row comes with all its sibling cells (the six groups of a municipality, of Lietuva and of a
    month; every livestock class of a predator), and a missing count is published as `null` too. So `<3` means 0, 1
    or 2: a reader can no longer tell one report from none, or subtract the published parts from a total;
  - escalated counts are published only for kanopiniai and bebrai (for the other groups the letter to the eldership
    is automatic, so the count would repeat the report count);
  - complementary suppression: while any `<3` cell can still be pinned to exactly 1 or 2 (linear algebra over the
    published sums plus interval bounds), a further cell is withheld: `null`, named in the row's `hidden` column,
    shown as "neskelbiama". Derived figures count too: the remainder of a sum over several unknown cells ("the
    other groups" of a municipality = total minus the published groups) and the reports a group did not escalate
    (reports minus escalated) may not be 1 or 2 either. The 2026-10-09 snapshot withholds 27 cells this way.
- **Municipalities with fewer than 3 MPV** (Klaipėdos m. sav. has 1, Neringos sav. 2) are flagged `pooled` in
  `meta.json`; their loot and limit rows are summed into one row with the code `1` (not a municipality code), so the
  national sums stay exact and no published row describes fewer than 3 MPV.
- Loots and limits are attributed to the municipality the MPV is assigned to; only municipality and national sums are
  published.
- `check.mjs` enforces: exact table and column whitelist, no personal-looking key, only enumerated codes as string
  values, no e-mail or phone pattern anywhere, no damages count of 1 or 2, complete sibling cells, no damages cell or
  remainder that can be worked out as 1 or 2 (`auditDamages`), escalated only for kanopiniai and bebrai, no reporters at
  municipality × group, no loot or limit row for a pooled municipality, no `Kita` (species 39) in the loot rows,
  source URLs only on `am.lrv.lt`.

When a privacy rule changes, `node scripts/hunting-snapshot/build.mjs --reapply` applies `privacy.mjs` to the
committed JSON without a database (same snapshot date and data).
