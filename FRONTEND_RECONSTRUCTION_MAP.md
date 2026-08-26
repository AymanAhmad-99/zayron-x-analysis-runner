# FRONTEND RECONSTRUCTION MAP

## APPLICATIONS
| PATH | PURPOSE | LEGACY / CURRENT | DUPLICATE / UNIQUE | SAFE TO REMOVE |
|------|---------|-------------------|-------------------|----------------|
| `apps/web` | Canonical frontend | LEGACY | UNIQUE | KEEP DIR, REMOVE CONTENTS |
| `apps/admin` | Admin dashboard | - | - | - (Empty) |
| `apps/mobile` | Mobile app | - | - | - (Empty) |

## ROUTES & PAGES (`apps/web/app`)
| ROUTE | PURPOSE | LEGACY / CURRENT | DATA SOURCE | SAFE TO REMOVE | KEEP |
|-------|---------|-------------------|-------------|----------------|------|
| `/` (`page.tsx`) | Homepage | LEGACY | `/api/v1/articles`, `/api/v1/feed` | YES (Rebuild) | NO |
| `/layout.tsx` | Root Layout | LEGACY | None | YES (Rebuild) | NO |
| `/actors` | Threat Actors Dossier | LEGACY | API | YES (Rebuild) | NO |
| `/alerts` | Alerts Dashboard | LEGACY | API | YES (Rebuild) | NO |
| `/campaigns` | Campaigns Dossier | LEGACY | API | YES (Rebuild) | NO |
| `/dashboard` | Fake Terminal Dashboard | LEGACY | API | YES (Rebuild) | NO |
| `/intelligence` | Intelligence Stream | LEGACY | API | YES (Rebuild) | NO |
| `/intelligence/today` | Today's Intelligence | LEGACY | API | YES (Rebuild) | NO |
| `/iocs` | Indicators of Compromise | LEGACY | API | YES (Rebuild) | NO |
| `/jobs` | Jobs Board | LEGACY | API | YES (Rebuild) | NO |
| `/knowledge` | Knowledge Center | LEGACY | API | YES (Rebuild) | NO |
| `/malware` | Malware Dossiers | LEGACY | API | YES (Rebuild) | NO |
| `/regulations` | Regulatory Intelligence | LEGACY | API | YES (Rebuild) | NO |
| `/reports` | Strategic Reports | LEGACY | API | YES (Rebuild) | NO |
| `/search` | Global Search | LEGACY | API | YES (Rebuild) | NO |
| `/sources` | Verified Sources | LEGACY | API | YES (Rebuild) | NO |
| `/threats` | Threat Articles | LEGACY | API | YES (Rebuild) | NO |
| `/vulnerabilities` | Vulnerability Dossiers | LEGACY | API | YES (Rebuild) | NO |
| `/watchlists` | User Watchlists | LEGACY | API | YES (Rebuild) | NO |

## COMPONENTS (`packages/ui/src/components`)
| PATH | PURPOSE | LEGACY / CURRENT | DUPLICATE / UNIQUE | SAFE TO REMOVE | KEEP |
|------|---------|-------------------|-------------------|----------------|------|
| `AIAnswer.tsx` | Render AI responses | LEGACY | UNIQUE | YES (Rebuild) | NO |
| `EntityPill.tsx` | Render entities | LEGACY | UNIQUE | YES (Rebuild) | NO |
| `EvidencePanel.tsx` | Render evidence data | LEGACY | UNIQUE | YES (Rebuild) | NO |
| `IntelligenceCard.tsx` | List intelligence items | LEGACY | UNIQUE | YES (Rebuild) | NO |
| `JobCard.tsx` | Job listing | LEGACY | UNIQUE | YES (Rebuild) | NO |
| `SourceChip.tsx` | Source attribution | LEGACY | UNIQUE | YES (Rebuild) | NO |
| `ThreatBadge.tsx` | Severity/Confidence | LEGACY | UNIQUE | YES (Rebuild) | NO |
| `Timeline.tsx` | Event timeline | LEGACY | UNIQUE | YES (Rebuild) | NO |

## STYLES & CONFIG
| PATH | PURPOSE | LEGACY / CURRENT | DEPENDENCIES | SAFE TO REMOVE | KEEP |
|------|---------|-------------------|--------------|----------------|------|
| `apps/web/app/globals.css` | Global CSS | LEGACY | Tailwind v4 | YES (Rebuild) | NO |
| `packages/ui/package.json` | UI dependencies | LEGACY | React | KEEP | YES |

## DESIGN TOKENS (Found in `globals.css`)
- **Colors**: `--color-zx-bg`, `--color-zx-white`, `--color-zx-text`, `--color-zx-secondary`, etc. (To be rebuilt)
- **Typography**: `Inter`, `Fraunces` (To be kept/rebuilt around Inter/Geist Sans)
- **Spacing**: `--spacing-1` to `--spacing-16` (To be rebuilt)

All existing frontend UI components, pages, and layout are considered LEGACY and will be removed and rebuilt according to the new QUIET AUTHORITY design system.
