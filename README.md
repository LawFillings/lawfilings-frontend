# Filing Assistant — React scaffold

A working starting point for the legal drafting platform designed across the earlier schema and wizard-logic
sessions. This is a real, buildable Vite + React + TypeScript project — not a chat prototype.

## Run it

```bash
npm install
npm run dev
```

## What's actually wired up

- **Home page** — lists all forums and case types from `src/data/mockData.ts` (seeded from the schema docs)
- **DRT Written Statement wizard** — the one fully working, end-to-end reference flow: mode toggle (justice
  seeker / advocate), deadline calculator with the three-band urgency treatment, para-wise admit/deny, grounds
  of defence selection, and a preview step that changes behavior if the filing window has closed
- Every other case type on the home page routes to a "coming soon" placeholder — the component pattern is
  proven, but only this one flow has its step logic built out

## How this maps to the schema

- `src/types.ts` mirrors the Postgres schema types designed earlier (`CaseType`, `ClauseDef`,
  `ComplexityRule`, `DeadlineSource`, etc.) — this is the same model, just as TypeScript instead of SQL
- `src/data/mockData.ts` stands in for the database — in a real build, this becomes API calls
- `src/components/DeadlineCalculator.tsx` implements both deadline forks designed earlier: `statutory_fixed`
  (computes from a trigger date) and `tribunal_assigned` (asks the user directly rather than guessing)
- `src/components/ParaWiseReply.tsx` and `WizardShell.tsx` are the reusable pieces of the "reply" wizard shape
  — extending to NCLT or consumer commission reply flows means building a new page that reuses these, plus a
  different set of grounds-of-defence options

## Design system

Tokens live in `src/styles/tokens.css` — deep ink-teal for authority, a warm turmeric accent (deliberately
distinct from the generic AI-terracotta look), Source Serif 4 for headings, Inter for UI text, IBM Plex Mono
for case numbers and dates. The deadline calculator's three-color urgency band (calm green → amber → red) is
the signature element — it's the one place the design takes a visible risk, since it's the actual emotional
core of the reply flow.

## Next steps

1. Wire up the remaining case types (Consumer Complaint, DRT SA, NCLT Section 9 as `original`-shape wizards;
   NCLT reply and consumer commission written version as second/third instances of the `reply` shape)
2. Replace `mockData.ts` with real API calls once a backend exists
3. Add the clause-assembly/draft-preview step that actually renders the final document from selected clauses
4. Add persistence (save-and-resume, since these forms are long and users will not finish in one sitting)
