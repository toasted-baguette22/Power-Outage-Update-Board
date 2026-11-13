# Design Note and Wireframe - Power Outage Update Board

**Course:** CS344 Web Engineering - Assignment 1 | **Idea #24** | Individual project

## 1. User and problem

**Primary user:** a student or staff member living or working on a campus (or neighbourhood) divided into zones. When the power fails they want to know: *Is it already reported? Is it verified? Which services are hit? When will it be back?*

**Secondary user:** a utility desk operator who verifies reports and posts recovery updates.

**Problem:** outage information is scattered across messages and word of mouth, so people file duplicate reports and nobody sees a single timeline of what happened and when.

**Core workflow:** (1) report an outage for a zone, with start time, severity and an affected-service checklist, (2) neighbours confirm the report until it is verified, (3) the desk posts status updates and recovery estimates, (4) everyone filters and reads the timeline until power is restored.

**Group-level extension for #24 covered in this stage:** zone-based reports, verification (confirmation threshold + desk verification), update timeline, affected-service checklist, recovery estimate notes, accurate timestamps.

## 2. Web Development Life Cycle (WDLC) stages

| Stage | What was done for this assignment |
|---|---|
| Planning | Chose the user, problem and scope from idea #24; decided Assignment 1 is a pure client-side prototype. |
| Analysis | Listed requirements: report form, verification rule, filter/search, timeline, recovery estimate, responsive layout, accessibility. |
| Design | Wireframes (below), colour-coded status system (colour plus text label), mobile-first layout with 640 px and 1000 px breakpoints. |
| Implementation | Semantic HTML, CSS (variables, Grid, Flexbox, media queries), vanilla JavaScript (arrays, functions, events, DOM). |
| Testing | Manual and scripted browser checks: filters, empty state, invalid input, duplicate warning, verification threshold, desk updates, 3 viewport widths, no horizontal overflow, no console errors. |
| Deployment | Source on GitHub; runs by opening `index.html` or via GitHub Pages (static hosting, no backend needed). |
| Maintenance | Assignment 2 adds PHP/PDO persistence; Assignment 3 re-implements in React/Express/MongoDB. Thresholds live in `js/data.js` for easy change. |

## 3. Browser client vs server

| Runs in the browser (this assignment) | Server (not used yet) |
|---|---|
| Rendering all pages and cards (DOM) | Serving the static files only (any static host) |
| Form validation (HTML attributes + JavaScript checks) | Nothing - no validation on a server yet |
| Filtering, sorting, searching | Persistent storage (Assignment 2: PHP + database) |
| Verification rule, duplicate detection, duration/ETR calculation | Authentication and roles (Assignment 3) |
| Timestamps via `Date` / `Intl` in the device time zone | Trusted server-side clock (later stages) |
| Sample data held in a JavaScript array (resets on reload) | Shared data between users |

Because data is only in memory, "Utility desk view" is a demonstration toggle, **not** security. Real authorisation arrives in Assignments 2-3.

## 4. Data model (client-side)

Each outage record: `id, zone, reporter, email, severity (partial|full), services[], description, startedAt (ISO UTC), status (reported|verified|crew|restored), confirmations, etr (ISO or null), etrNote, restoredAt, timeline[{at, type, text}]`.

Status flow is forward-only: Reported -> Verified -> Crew on site -> Restored. A report auto-verifies when confirmations reach the threshold (`VERIFY_THRESHOLD = 3`).

## 5. Wireframes

Both wireframes are in `docs/wireframe.svg`. Text version:

**Desktop (>= 1000 px)**

```
+--------------------------------------------------------------+
| Power Outage Update Board            [clock]  [x] Utility desk |
+--------------------------------------------------------------+
| [Active] [Awaiting verification] [Avg restoration] [Top zone]  |
+-----------------------------------------+--------------------+
| Outage reports                          | Report an outage   |
| [search][zone][status]                  | Zone [v]           |
| [service][sort][Clear]                  | Name [          ]  |
| Showing n of N                          | Email [         ]  |
| +-------------+ +-------------+         | Started [dt-local] |
| | Zone D      | | Zone E      |         | ( ) Partial ( )Full|
| | status badge| | status badge|         | [ ] services...    |
| | chips, ETR  | | chips, ETR  |         | Description [    ] |
| | [I see this][Timeline]      |         | [Submit] [Clear]   |
| +-------------+ +-------------+         | (sticky column)    |
+-----------------------------------------+--------------------+
```

**Mobile (< 640 px)**: single column in this order - header, 2x2 summary tiles, report form, filters, one card per row. Tablet (640-999 px): 4 summary tiles, 2 card columns, form above the list.

## 6. Accessibility decisions

Skip link; one `h1` with logical `h2`/`h3`; every control has a `<label>`; related inputs in `<fieldset>/<legend>`; correct input types (`email`, `datetime-local`, `search`); `aria-live` for result counts and success messages; `role="alert"` for errors; status shown by text as well as colour; visible focus outline; 44 px minimum button height; dark-mode and reduced-motion support; `<dialog>` for the timeline (focus trapped, Esc closes).
