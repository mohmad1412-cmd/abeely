<!--
Sync Impact Report:
Version: 0.0.0 → 1.0.0
Status: Initial creation
Templates: N/A (initial setup)
-->

# ServiceLink AI Platform Constitution

**Version:** 1.0.0  
**Ratified On:** 2025-01-27  
**Last Amended:** 2025-01-27

## Purpose

This constitution establishes the foundational principles and governance structures for the ServiceLink AI Platform (أبيلي) project. It ensures consistency, quality, and adherence to best practices throughout the development lifecycle of this Arabic-first, AI-powered reverse marketplace platform connecting service requesters with providers.

## Project Identity

**Project Name:** ServiceLink AI Platform (أبيلي)  
**Primary Language:** Arabic (RTL) with English support  
**Architecture:** React + TypeScript + Supabase + AI (Gemini/Claude)  
**Deployment:** Vercel (Frontend) + Supabase (Backend)  
**Mobile:** Capacitor (Android/iOS)

## Architectural Principles

### Principle 1: Arabic-First RTL Design
**Description:** All user-facing interfaces MUST prioritize Arabic language and right-to-left (RTL) layout. English support is secondary and MUST maintain proper RTL/LTR switching without breaking layout.

**Rationale:** The platform targets Arabic-speaking users primarily in Saudi Arabia and the broader Arab region. RTL support is non-negotiable for user experience and accessibility.

**Examples:**
- ✓ Proper RTL layout with `dir="rtl"` in HTML and Tailwind RTL utilities
- ✓ Arabic text rendering with proper font families (IBM Plex Sans Arabic)
- ✗ Hardcoded LTR layouts that break in RTL mode
- ✗ Mixed RTL/LTR without proper direction switching

**Enforcement:**
- All components MUST support RTL by default
- Text direction MUST be dynamically set based on locale
- Layout utilities MUST use Tailwind's RTL-aware classes

---

### Principle 2: Type Safety and TypeScript Strictness
**Description:** All code MUST be written in TypeScript with strict type checking enabled. No `any` types are permitted except in exceptional cases with explicit justification.

**Rationale:** Type safety prevents runtime errors, improves developer experience, and ensures maintainability as the codebase grows.

**Examples:**
- ✓ Proper interface definitions for all data structures (Request, Offer, User, etc.)
- ✓ Type-safe API calls with proper error handling
- ✗ Using `any` without explicit justification
- ✗ Bypassing TypeScript errors with `@ts-ignore` without fixing root cause

**Enforcement:**
- `tsconfig.json` MUST have `strict: true`
- All functions MUST have explicit return types
- All API responses MUST be typed

---

### Principle 3: Security-First Data Access
**Description:** All database operations MUST use Row Level Security (RLS) policies in Supabase. Client-side code MUST NEVER expose sensitive operations or API keys.

**Rationale:** Security is critical for user data protection, especially with authentication, personal information, and financial data (future payment integration).

**Examples:**
- ✓ All Supabase tables MUST have RLS policies enabled
- ✓ API keys stored in environment variables, never in code
- ✓ Edge Functions for sensitive operations (AI, payments)
- ✗ Direct database access without RLS
- ✗ Hardcoded API keys or secrets in source code

**Enforcement:**
- Every Supabase table MUST have RLS policies
- All environment variables MUST be prefixed with `VITE_` for client-side or stored in Supabase secrets for Edge Functions
- Regular security audits of RLS policies

---

### Principle 4: AI Integration Best Practices
**Description:** AI features (Gemini/Claude) MUST be implemented via Supabase Edge Functions, never directly from client-side code. AI responses MUST be validated and sanitized before display.

**Rationale:** Centralizing AI logic in Edge Functions ensures security, cost control, rate limiting, and consistent error handling.

**Examples:**
- ✓ AI chat requests go through `/supabase/functions/ai-chat`
- ✓ Input validation and sanitization before sending to AI
- ✓ Error handling and fallback mechanisms
- ✗ Direct API calls to Gemini/Claude from React components
- ✗ Displaying unvalidated AI responses

**Enforcement:**
- All AI API keys MUST be stored in Supabase secrets
- Client-side code MUST only call Edge Functions, never AI APIs directly
- All AI responses MUST be validated before rendering

---

### Principle 5: Responsive Mobile-First Design
**Description:** All UI components MUST be designed mobile-first and MUST work seamlessly on screens from 320px to 4K displays. Touch interactions MUST be optimized for mobile devices.

**Rationale:** A significant portion of users access the platform via mobile devices. Mobile-first design ensures optimal experience across all devices.

**Examples:**
- ✓ Components use Tailwind responsive utilities (`sm:`, `md:`, `lg:`)
- ✓ Touch-friendly button sizes (minimum 44x44px)
- ✓ Proper viewport meta tags and mobile optimization
- ✗ Desktop-only layouts that break on mobile
- ✗ Small touch targets that are hard to tap

**Enforcement:**
- All new components MUST be tested on mobile viewports
- Touch interactions MUST be tested on actual devices or emulators
- Responsive breakpoints MUST follow Tailwind's default scale

---

### Principle 6: Real-Time Updates and Notifications
**Description:** Critical user actions (new offers, messages, notifications) MUST use Supabase Realtime subscriptions for instant updates. Polling is prohibited for real-time features.

**Rationale:** Real-time updates are essential for user engagement and provide a modern, responsive experience.

**Examples:**
- ✓ Realtime subscriptions for messages, offers, and notifications
- ✓ Optimistic UI updates with proper error rollback
- ✗ Polling with `setInterval` for real-time data
- ✗ Manual refresh requirements for critical updates

**Enforcement:**
- All real-time features MUST use Supabase Realtime
- Fallback mechanisms MUST be implemented for connection failures
- Optimistic updates MUST have error handling

---

### Principle 7: Dark Mode and Theme Consistency
**Description:** The platform MUST support both light and dark themes with seamless switching. Theme preference MUST be persisted and applied consistently across all components.

**Rationale:** User preference for dark/light mode is important for accessibility and user comfort, especially for extended usage.

**Examples:**
- ✓ Theme toggle in settings with persistence
- ✓ All components use CSS variables for theme colors
- ✓ Consistent color scheme across light and dark modes
- ✗ Hardcoded colors that don't adapt to theme
- ✗ Theme switching that causes layout shifts

**Enforcement:**
- Theme state MUST be managed in a central context (AppContext)
- All color values MUST use Tailwind theme variables or CSS custom properties
- Theme preference MUST be saved to localStorage or user preferences

---

### Principle 8: Performance and Optimization
**Description:** Page load times MUST be under 2 seconds for initial load and under 1 second for subsequent navigation. Images MUST be optimized, and code MUST be split appropriately.

**Rationale:** Performance directly impacts user experience, SEO, and conversion rates.

**Examples:**
- ✓ Image optimization (WebP, lazy loading, proper sizing)
- ✓ Code splitting with React.lazy for route-based chunks
- ✓ Proper caching strategies for static assets
- ✗ Unoptimized large images
- ✗ Loading entire application bundle on initial page load

**Enforcement:**
- Lighthouse performance score MUST be 90+ for production builds
- All images MUST be optimized before deployment
- Bundle size MUST be monitored and kept reasonable

---

### Principle 9: Accessibility and Inclusive Design
**Description:** The platform MUST be accessible to users with disabilities. This includes proper ARIA labels, keyboard navigation, screen reader support, and sufficient color contrast.

**Rationale:** Accessibility ensures the platform is usable by all users, complies with regulations, and improves overall UX.

**Examples:**
- ✓ Proper semantic HTML and ARIA attributes
- ✓ Keyboard navigation for all interactive elements
- ✓ Sufficient color contrast ratios (WCAG AA minimum)
- ✗ Interactive elements without keyboard support
- ✗ Low contrast text that's hard to read

**Enforcement:**
- All interactive elements MUST be keyboard accessible
- Color contrast MUST meet WCAG AA standards
- ARIA labels MUST be provided for icon-only buttons

---

### Principle 10: Error Handling and User Feedback
**Description:** All errors MUST be caught and handled gracefully with user-friendly messages in Arabic. Users MUST always receive feedback for their actions (success, error, loading states).

**Rationale:** Clear error messages and feedback improve user trust and help users understand what's happening.

**Examples:**
- ✓ Try-catch blocks for all async operations
- ✓ User-friendly error messages in Arabic
- ✓ Loading states for all async operations
- ✓ Success confirmations for critical actions
- ✗ Unhandled errors that crash the app
- ✗ Technical error messages exposed to users

**Enforcement:**
- All API calls MUST have error handling
- Error messages MUST be in Arabic (or user's selected language)
- Loading states MUST be shown for operations > 500ms

---

## Governance Procedures

### Amendment Process

Changes to this constitution must follow this process:

1. **Proposal:** Any team member can propose amendments via pull request or issue
2. **Review:** Proposed changes are reviewed for:
   - Impact on existing codebase
   - Alignment with project goals
   - Consistency with other principles
3. **Approval:** Requires consensus from core team members
4. **Implementation:** Approved changes are:
   - Updated in this document with version bump
   - Propagated to affected templates and documentation
   - Communicated to the team

### Version Management

This constitution follows semantic versioning:

- **MAJOR (X.0.0):** Backward incompatible changes, principle removals, or fundamental redefinitions
- **MINOR (0.X.0):** New principles added, existing principles materially expanded
- **PATCH (0.0.X):** Clarifications, wording improvements, typo fixes, non-semantic refinements

### Compliance Review

- Constitution compliance MUST be checked during code reviews
- Regular audits (quarterly) to ensure principles are being followed
- Violations MUST be addressed before merging code

## Template Integration

All project templates, specifications, and documentation MUST align with the principles outlined in this constitution. When creating new features or components, developers MUST verify compliance with all relevant principles.

## Notes

- This constitution is a living document and will evolve with the project
- Principles are non-negotiable unless formally amended
- All team members are responsible for upholding these principles

---

**Next Review Date:** 2025-04-27 (Quarterly review)
