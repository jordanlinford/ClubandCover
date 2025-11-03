# Design Guidelines for SaaS Platform

## Design Approach
**System**: Linear-inspired modern SaaS aesthetic with influences from Stripe and Vercel  
**Rationale**: This is a utility-focused, data-intensive platform requiring professional polish, clarity, and efficiency. Linear's design language excels at creating focused, distraction-free interfaces while maintaining visual sophistication.

**Key Principles**:
- Clarity over decoration
- Purposeful whitespace and breathing room
- Typography-driven hierarchy
- Subtle, functional interactions
- Professional, trustworthy aesthetic

---

## Typography System

**Font Families**: 
- Primary: Inter (via Google Fonts) - for UI, body text, data displays
- Monospace: JetBrains Mono - for code snippets, API keys, technical data

**Hierarchy**:
- **Hero/H1**: text-5xl md:text-6xl, font-semibold, tracking-tight, leading-none
- **H2/Section Headers**: text-3xl md:text-4xl, font-semibold, tracking-tight
- **H3/Card Headers**: text-xl md:text-2xl, font-semibold
- **Body Large**: text-lg, font-normal, leading-relaxed
- **Body**: text-base, font-normal, leading-relaxed
- **Small/Meta**: text-sm, font-medium
- **Tiny/Labels**: text-xs, font-medium, uppercase, tracking-wide

---

## Layout System

**Spacing Primitives**: Use Tailwind units **2, 4, 6, 8, 12, 16, 20, 24** consistently
- Component internal spacing: p-4, p-6, p-8
- Section spacing: py-12 md:py-20 lg:py-24
- Element gaps: gap-4, gap-6, gap-8

**Container Strategy**:
- Page containers: max-w-7xl mx-auto px-4 md:px-6 lg:px-8
- Content sections: max-w-4xl for readable text blocks
- Full-bleed sections: w-full with inner containers

**Grid Patterns**:
- Feature grids: grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6
- Dashboard layouts: grid-cols-1 lg:grid-cols-12 (sidebar: col-span-3, main: col-span-9)
- Form layouts: Single column, max-w-md

---

## Component Library

### Core Navigation
**Header/Navbar**:
- Sticky top navigation: sticky top-0 z-50 backdrop-blur-lg
- Height: h-16
- Logo + primary nav links (left) + CTA buttons (right)
- Mobile: Hamburger menu with slide-out drawer

**Sidebar** (for dashboard views):
- Fixed left sidebar: w-64, full-height
- Collapsible on mobile
- Nav items with icons (from Heroicons)
- Active state with subtle indicator bar

### Forms & Inputs
**Input Fields**:
- Height: h-11 for text inputs
- Padding: px-4 py-2.5
- Border: border with rounded-lg
- Focus: ring-2 ring-offset-2
- Label: text-sm font-medium mb-2 block

**Buttons**:
- Primary: px-6 py-2.5 rounded-lg font-medium text-sm
- Secondary: Same sizing, outlined variant
- Icon buttons: w-10 h-10 rounded-lg
- Loading states with subtle spinner

**Form Groups**:
- Stack inputs with space-y-6
- Labels above inputs
- Helper text: text-sm mt-1.5
- Error messages: text-sm with icon

### Data Display
**Card**:
- Base: rounded-xl border p-6
- Shadow: Optional subtle shadow for layering
- Header section: pb-4 mb-4 border-b
- Body: Default prose styling

**DataTable**:
- Responsive: Overflow-x-auto on mobile
- Header row: sticky top-0 with backdrop blur
- Row height: h-14
- Striped rows: Optional alternating treatment
- Hover states on rows
- Action column: Right-aligned icons
- Pagination: Bottom bar with page numbers

**PageHeader**:
- Container: pb-8 border-b mb-8
- Title: H1 with optional subtitle
- Actions: Right-aligned button group
- Breadcrumbs: Above title (text-sm)

**Stats/Metrics Cards**:
- Grid layout: grid-cols-1 md:grid-cols-3 gap-6
- Each card: Label (small caps) + Large number + Trend indicator

### Overlays
**Modal/Dialog**:
- Overlay: backdrop-blur-sm with reduced opacity
- Content: max-w-lg rounded-2xl p-6
- Header: pb-4 border-b with title + close icon
- Footer: pt-4 border-t with action buttons

**Dropdown/Menu**:
- Trigger: Button or clickable element
- Menu: rounded-lg shadow-xl border p-2
- Items: px-3 py-2 rounded-md hover states

---

## Marketing Pages

**Landing Page Structure**:
1. **Hero Section** (h-screen or min-h-[600px]):
   - Large hero image (product screenshot or abstract visual)
   - Centered headline + subheadline
   - Primary + secondary CTA buttons with backdrop-blur backgrounds
   - Subtle scroll indicator

2. **Social Proof Bar**:
   - Logo cloud of clients/integrations
   - py-12 section

3. **Features Section**:
   - Three-column grid (grid-cols-1 md:grid-cols-3)
   - Icon (Heroicons) + Title + Description per feature
   - py-20 spacing

4. **Product Showcase**:
   - Large product screenshot/mockup
   - Two-column layout (image + feature list)
   - Alternating image positions

5. **Pricing Section**:
   - Three-column pricing cards
   - Highlighted "Popular" tier
   - Feature comparison checklist

6. **Testimonials**:
   - Two-column grid of testimonial cards
   - Customer photo + quote + attribution

7. **CTA Section**:
   - Centered content: max-w-3xl
   - Headline + supporting text
   - Primary CTA with context (e.g., "Start free trial - no credit card required")

8. **Footer**:
   - Four-column grid: Product links, Resources, Company, Legal
   - Newsletter signup form
   - Social media icons (Heroicons)
   - Copyright + trust badges

---

## Dashboard Application

**Layout Structure**:
- Left sidebar (fixed, w-64)
- Top header (sticky)
- Main content area (with breadcrumbs, page header, content)

**Dashboard Home**:
- Stats cards row at top
- Charts/graphs section (use placeholder divs)
- Recent activity table
- Quick actions panel

**Data Management Views**:
- Page header with filters + search + add button
- DataTable component
- Pagination controls

**Settings Pages**:
- Two-column layout: Side navigation + form sections
- Grouped form sections with dividers
- Save/cancel buttons sticky at bottom

---

## Icons
**Library**: Heroicons (outline for UI, solid for emphasis) via CDN

---

## Animations
Use sparingly and purposefully:
- Page transitions: None (instant navigation)
- Hover states: subtle scale (scale-105) or opacity changes
- Loading states: Simple spinners, no elaborate animations
- Modal entry: Fast fade + subtle scale
- Focus: Ring animations only

---

## Images

**Hero Image**: Full-width hero section featuring a clean product screenshot or abstract geometric visual showcasing the platform interface. Should convey professionalism and modern tech aesthetic. Position: Background with overlay gradient for text readability.

**Product Screenshots**: Throughout marketing sections - dashboard views, data table interfaces, authentication flows. Position: Alternating left/right in feature sections.

**Customer Photos**: For testimonial section - professional headshots in circular frames.

**Logo Marks**: Client/integration logos in social proof sections - monochrome treatment for consistency.