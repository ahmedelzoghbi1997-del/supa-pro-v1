# Color Migration & Design Tokens (Semantic vs Decorative)

## 1. Overview & Semantic Tokens
This document tracks the color migration from hardcoded Tailwind palette colors to the design system's semantic accent tokens defined in `tailwind.config.js` and `@theme` in `src/index.css`:

| Semantic Token | Hex Value | Primary Meaning | Replaces |
| :--- | :--- | :--- | :--- |
| **`accent.success`** (`accent-success`) | `#10B981` | Success, profit, income (+), active status, paid balances, checkmarks | `emerald-*`, `green-*` (semantic) |
| **`accent.danger`** (`accent-danger`) | `#F43F5E` | Danger, error, expense (-), loss, debt, delete, cancel, deficit | `rose-*`, `red-*` (semantic) |
| **`accent.warning`** (`accent-warning`) | `#F59E0B` | Warning, pending, caution, retained debt, attention, alerts | `amber-*`, `yellow-*` (semantic) |
| **`accent.info`** (`accent-info`) | `#3B82F6` | Informational callouts, notes, tooltips, instructions, guide boxes | `blue-*`, `indigo-*` (semantic) |

---

## 2. Preserved Decorative & Chart Usages (EXCLUDED from Replacement)
As strictly required, decorative, categorical, and data visualization colors are preserved to maintain distinct visual hierarchy and analytical clarity:

### A. Charts & Data Visualizations (Recharts & SVG Graphics)
* **`components/shared/report/Charts.tsx`**:
  * Harvest curves, nutrient analysis, cost distribution areas, and multi-series line/bar graphs.
  * Preserved chart palettes: `#10B981` (emerald), `#3B82F6` (blue), `#8B5CF6` (purple), `#F59E0B` (amber), `#F43F5E` (rose), `#06B6D4` (cyan) for distinct graph series differentiation.
* **`components/shared/report/ReportCharts.tsx`**:
  * Financial comparison curves, market efficiency graphs, cumulative yield vs. projected trajectory.
* **`components/analytics/WeeklyAnalysis.tsx`**:
  * Multi-colored comparative yield and cost bar charts.

### B. Category-Specific Meta Palettes & Icons
* **`utils/expenseIconUtils.ts` (`getExpenseCategoryMeta`)**:
  * Agricultural category palettes:
    * Labor/Workers: `blue` (`bg-blue-50`, `text-blue-600`)
    * Seeds/Seedlings: `emerald` (`bg-emerald-50`, `text-emerald-600`)
    * Compost/Organic Fertilizers: `amber` (`bg-amber-50`, `text-amber-600`)
    * Chemical Fertilizers: `emerald` (`bg-emerald-50`, `text-emerald-600`)
    * Pesticides/Disease control: `rose` (`bg-rose-50`, `text-rose-600`)
    * Heavy Machinery/Tractors: `indigo` (`bg-indigo-50`, `text-indigo-600`)
    * Fuel/Gasoline: `amber` (`bg-amber-50`, `text-amber-600`)
* **`components/daily_logs/dailyLogUtils.ts` (`getCategoryStyles`)**:
  * Agricultural daily log category badges:
    * Irrigation (ري): `sky`
    * Fertilization (تسميد): `emerald`
    * Spraying (رش): `indigo`
    * Operations (عمليات زراعية): `orange`
    * Planting (زراعة): `teal`
    * Pests/Infections (إصابات): `rose`
    * Harvest (حصاد): `amber`
    * Labor (عمالة): `blue`

### C. Shift & Status Badges
* **`components/labor/laborBadges.tsx` (`renderShiftBadge`)**:
  * Morning shift (صباحية): `amber` (Sunrise theme)
  * Evening shift (مسائية): `indigo` (Sunset/night theme)
  * Full day (يوم كامل): `emerald` (Day theme)

### D. Multi-Action Floating Trigger
* **`components/shared/FloatingActionButton.tsx`**:
  * Quick action palette differentiating 6 action types:
    * Invoice: `bg-emerald-500`
    * Expense: `bg-rose-500`
    * Cycle: `bg-amber-500`
    * Withdrawal: `bg-blue-600`
    * Payment: `bg-indigo-600`
    * Advance: `bg-purple-600`

### E. Static Illustrations & Empty States
* **`components/Illustrations.tsx`**:
  * Decorative SVG artwork and vector graphics illustrating plants, greenhouses, and nature elements.

---

## 3. Theme Compatibility & Collision Avoidance
* The application provides dynamic user theme customization (`data-theme-color="emerald" | "blue" | "violet" | "amber" | "rose"`), controlling `--color-primary-*`.
* By replacing hardcoded `emerald-*`, `rose-*`, `amber-*`, and `blue-*` with `accent.*` tokens:
  1. When a user selects the **Blue Theme** (`data-theme-color="blue"`), the primary brand elements become blue without conflicting with informational badges or causing semantic confusion.
  2. Profit (+), success alerts, and paid items reliably render in `accent.success` (`#10B981`), regardless of whether the primary brand theme is blue, violet, or rose.
  3. Losses (-), unpaid debts, and delete triggers reliably render in `accent.danger` (`#F43F5E`), ensuring high visual salience across all themes.
