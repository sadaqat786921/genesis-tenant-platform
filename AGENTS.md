# Genesis · Tenant (Figma Make)

Clickable prototype of the **Tenant** portal (tenant Daniel Price, or the applicant Aisha Rahman). It uses the same design system as the Supervisor, Office Admin and Landlord portals (`sadaqat786921/genesis-supervisor-platform`, `genesis-officeadmin-platform`, `genesis-landlord-platform`) for Landlord Service Plans (LSP): the client-approved design **"Dashboard Variation 04"** (Figma: Genesis page, node 342:2369, and the "Genesis · Design System" section). React 19 + Vite + TypeScript, running inside Figma Make.

## Do not redesign
The client has approved this design. When editing:
- Keep the layout: a 264px white sidebar card on the left (logo, 5 menu groups, live counts, the user at the bottom), with content on the right inside 24px page padding and 20px gaps between blocks.
- Keep the colours, font, radii and shadows listed below. Use the CSS variables in `src/styles/app.css` and never hard-code new colours.
- Keep the existing classes and components (`.card`, `.kpi`, `.chip`, `.btn`, `Drawer`, `Modal`, `Tabs` and so on). Add new screens by reusing them.
- Do not add Tailwind's base reset (preflight). `src/index.css` loads only Tailwind's theme and utilities, on purpose.
- Tailwind utilities are switched on, so never name a custom class after a Tailwind utility (`outline`, `ring`, `shadow`, `border`, `hidden`…). That is why the outline button uses the class `.btn.line` and the dashboard ring uses `.gring`.
- Do not swap the icon set (lucide-react, stroke width 1.8) or the font (Montserrat).
- Images are relative paths under `public/images/` (`images/home1.jpg`). Keep them as normal git files, not LFS.
- Besides React, only two packages are needed: `react-router-dom` and `lucide-react`. If an import fails, add the missing package to package.json — never delete screens or swap libraries.
- Routing uses `HashRouter`. Paths look like `#/landlords/L1`.

## Design tokens (`src/styles/app.css`)
| Token | Value |
|---|---|
| Font | Montserrat 400/500/600/700/800 (self-hosted in `src/fonts`, loaded by `src/styles/fonts.css` — no font package needed) |
| Page background | `#F3F5F9` |
| Surface (cards) | `#FFFFFF`, border `#E9EDF3`, radius 22, padding 20, shadow `0 8px 24px rgba(15,24,40,.04)` |
| Brand navy | `#153D91` (hover `#0F3279`, subtle `#EEF3FC`) |
| Deep navy (hero / inverse) | `#001649` |
| Accent green | `#5BAF00` |
| Text | primary `#0F1828`, secondary `#475467`, tertiary `#667085`, placeholder `#98A2B3` |
| Status | ok `#3C7300` / `#E8F4DB` · warning `#B54708` / `#FEF0C7` · error `#C8102E` / `#FDE8EB` · info `#0B6FB8` / `#E0F2FE` |
| Radius | 6, 8, 10, 12 (buttons and inputs), 14, 20 (sidebar), 22 (cards), 24 (hero), 999 (chips) |
| Type | H1 24/800 · H2 15/700 · metric 26/800 · body 13/500 · small 12.5/500 · caption 11/500 · hero number 56/800 |

## Tenant rules (this portal)
- Two people can sign in (Login has a "Demo: who is signing in?" picker). Demo login: any email/password, code `123456`. "First time? Set your password" shows the welcome-email password setup; "Forgot password?" sends a reset link. 5 wrong codes lock the account.
  - **Tenant** `ME` = `T14`, Daniel Price, Flat 4, 19 Highgate Hill (P16), rent £1,350 due day 1, tenancy 1 May 2026 to 30 Apr 2027, deposit £1,557 with DPS. October rent is part-paid (£900 of £1,350).
  - **Applicant** `APPLICANT_ID` = `AP11`, Aisha Rahman, applying for 31 Ash Grove (P4), starting at Lettings stage 2. ID and address checked, share code rejected, payslips and bank statements missing.
- The role is kept in sessionStorage (`genesis-tn-signed-in`). Applicants only see My Application, Messages, The Home, Documents and Account; other routes send them to `#/application`.
- The store (`src/store.tsx`) loads only this person's records. Repairs never show prices, contractor costs, budgets or who pays (`tenantEvents` in `lib.tsx` also strips money lines from history). The landlord's money, other tenants and KYC files of others are never shown.
- Things only LSP does show a dashed "Prototype: LSP's answer" box (`DemoAnswer`) so the next step can be shown without the staff portals.
- Web only, desktop first (same layout as the staff portals). No native app.

## Screens (`src/pages/`)
- `Home.tsx`: hero (rent owed now, tenancy progress ring), To do, rent/repairs/visits/certificates KPIs, open repairs, coming up, notices, emergency numbers.
- `Repairs.tsx`: list with search, type and year filter; **Report a repair** (where, type, urgency, details, photos, best days and times, pets, can LSP use a key); repair page with tenant steps (Reported → Checked by LSP → Approved → Visit booked → Work done → Fixed), confirm the visit or ask for another time, "Is it fixed?" yes/no (no reopens it), repair report PDF.
- `Visits.tsx` (**Visits & Inspections**): confirm a visit, allow entry with a key, ask for another time, past inspection reports.
- `Damage.tsx` (+ `src/damage.ts`): **Damage charges** in Rent & Payments and on Home's To do. LSP's damage quote on LSP paper; the tenant agrees (pay now by card, by bank transfer, or from the deposit at move-out) or disagrees (LSP keeps, lowers or cancels it, shown with the prototype answer box). Quotes are also in Documents. Route `#/rent/<damage id>` opens one.
- `Rent.tsx`: owed now, next due, paid this year; history with year filter (part payments carry forward); "I've paid" (LSP then records it); how to pay with copy buttons; ask for help with rent; rent statement PDF.
- `Tenancy.tsx` (**My Tenancy**): tenancy, deposit, move-in report, agreement PDF, staying on (tell LSP your plans), give notice → move-out steps (notice → inspection booked → inspection done → deposit returned → moved out) with forwarding address and bank details.
- `MyHome.tsx`: **Rooms in your home** (room cards; click for photos, dimensions, floor plan and details; view only, `Rooms.tsx` + `src/rooms.ts` shared with every portal), how the home works, safety certificates, who to contact, notices. Applicants see the home they are moving into and what they pay before move-in.
- `Documents.tsx`: every document with search, type and year.
- `Messages.tsx`: conversation with LSP and **My requests**. `Account.tsx`: details, who lives here, notifications, sign-in and security, data copy.
- `Application.tsx` (applicant): Applied → Talked to LSP → Your documents (upload, re-upload rejected ones) → Deposit and references (holding deposit of one week's rent, reference form, sign the agreement) → Final check → Moving in (confirm time, pay the balance, read How to Rent) → Moved in ("Open the tenant portal").
- `lib.tsx`: status wording, the LSP paper template (`DocSheet`), inspection and repair report pop-ups, `AskModal`/`sendMsg`, `DemoAnswer`, `holdingOf`.
