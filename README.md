# Bhuzen Website

Staging package from the approved V3. Hosted review: https://abhisheksiloiya.github.io/bhuzen-website/. This is not the bhuzen.com production release or launch approval.

## Local review

Run `npm test`, then `python3 -m http.server 8794 --bind 127.0.0.1 --directory public`.

Only `public/` is deployable. The GitHub Pages workflow is manual and uploads only that directory. It does not configure a custom domain. Staging retains noindex and robots disallow rules. Those are indexing signals, not access controls: a published staging URL would be publicly accessible unless the host separately protects it.

The staging source's 404 uses `/bhuzen-website/` so nested missing URLs recover without JavaScript. The production candidate builder rewrites those paths to `/`. Other pages use relative paths. Canonicals and sitemap reference the intended production domain; social URLs/images use the actual build profile's origin.

## Isolated release profiles

- `npm run build`: writes a fresh generated staging directory under ignored `dist/`, with noindex/disallow retained.
- `npm run build:candidate`: writes a fresh root-domain candidate under `dist/`, still noindex with forms unchanged. It neither publishes nor configures the domain.
- `node scripts/release.mjs --profile production --out /absolute/fresh/output`: optional explicit empty output directory. Existing non-empty output and public-source/ancestor paths are refused; no recursive deletion occurs.
- Only after separate launch approval: `node scripts/release.mjs --profile production --approve-indexing`. This explicit build flag permits indexing in the generated artifact, not in the staging source. The 404 stays noindex. It does not certify policy/legal readiness, activate forms, change DNS or deploy anything.

Generated output contains only allowlisted runtime files and `.nojekyll`; private/source-provenance files, PDFs, symlinks and CNAME are rejected. The current manual Pages workflow still uploads **public/** only, never `dist/`. A production deployment requires a separately reviewed/approved cutover step. Do not upload a local candidate merely because a build succeeded.

Legacy routes `/general-7/`, `/general-clean/`, `/blank/` and `/blank-1/` now contain the full Commitment, Growth Briefing, Privacy and Accessibility content respectively. Their canonical tags name the primary routes. This preserves useful old links but is **not an HTTP 301** or a guarantee that a search engine will honour the preferred URL. No new redirect service is introduced.

Page-specific Open Graph/Twitter metadata uses the approved founder portrait as a JPEG format derivative (1122×1402, no retouching), with a summary-card thumbnail rather than an invented result/testimonial image. Actual sharing-platform crop/cache rendering still requires a live sharing check. Never add private identifiers or confidential query parameters to metadata.

## Delivery

The Web3Forms integration follows the personal-site pattern with a separate Bhuzen configuration in `public/site-config.mjs`. It is disabled by default. A public Web3Forms access key routes the recipient on the provider side; changing `recipient` text in this file does not redirect messages.

Before enabling: verify the intended recipient, Bhuzen-specific key and provider dashboard settings; allowlist the actual staging origin; review privacy/retention/spam controls; then run one authorised labelled browser submission and confirm inbox arrival. Browser origin checks prevent accidental activation but are not server-side access controls. No email service passwords or private API credentials belong in this public repository.

Resource requests require separate publication clearance and a confirmed manual or automated fulfilment route. An accepted API request does not prove inbox delivery, send a PDF by itself, subscribe anyone to marketing or create a calendar booking. Automatic replies and tailored playbook fulfilment remain unconfigured. Source PDFs and their publication issues are not included here.

Form details remain on failure; ambiguous failures warn against duplicate retries. JavaScript handlers must mount before inputs become usable, and forms use POST fallback to avoid personal data in URL queries. No persistent storage or analytics is added. Assessment financial inputs and answers are excluded from lead payloads.

## Launch gates

- Confirm recipient and delivery configuration; verify real enquiry/resource delivery.
- Clear final PDFs, engagement commitments, evidence use and production policies.
- Public repository and staging environment created with owner approval; reverify the hosted workflow after each release.
- Complete accessibility/performance/SEO, legacy URL and custom 404 checks.
- Preserve Wix content/data and DNS/email records; approve rollback and cutover.

Keep strategy, evidence, source baselines, reviews and DNS records in the separate private project space. V1/V2 and the approved V3 review copy remain outside the deployable package. No `CNAME` file is shipped during staging preparation.
