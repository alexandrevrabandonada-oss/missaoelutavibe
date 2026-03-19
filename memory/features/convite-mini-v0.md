# Memory: features/convite-mini-v0
Updated: now

Convite Mini v0.2: Simplified signup flow for territory links (/r/:code). When users arrive from territory links (without ?direct=1), they're redirected to /convite-mini instead of /auth. The mini form collects only: first name, city (pre-filled), interests (checkboxes), availability (low/med/high), with optional collapsed contact fields (email/phone). LGPD consent is mandatory. On submit, data is stored in sessionStorage and user redirects to /auth?mode=mini. After account creation and approval, mini-mode users skip to onboarding step 4 to complete their profile (email/phone/neighborhood). New growth event 'invite_submit_mini' tracks mini submissions separately. Admin Ops shows mini vs normal conversion metrics in GrowthFunnelCard.
