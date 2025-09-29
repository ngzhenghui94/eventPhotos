## Components Reference

A tour of notable components exported from `components/`.

Notes:
- Most components are designed for the Next.js App Router and Tailwind CSS.
- Many accept `className` and `children` props even if not explicitly documented.

---

### Photo Upload

`components/photo-upload.tsx`

- Export: `PhotoUpload`
- Props:
  - `eventId: number` — target event
  - `planName?: string | null` — host plan used to display per-file size hints
- Description: Host-side multi-file uploader using presigned S3 `PUT` URLs with bounded concurrency and progress UI.
- Example:
```tsx
import { PhotoUpload } from '@/components/photo-upload';

export default function UploadPanel({ eventId, planName }: { eventId: number; planName?: string | null }) {
  return <PhotoUpload eventId={eventId} planName={planName} />;
}
```

---

### Gallery & Photos

- `components/photo-gallery.tsx` — Grid and modal viewer for event photos
- `components/virtualized-photo-grid.tsx` — Large grid virtualization for smooth scrolling
- `components/guest-photo-upload.tsx` — Guest-side uploader dropzone and form
- `components/guest-photo-grid.tsx` — Guest-facing photo grid
- `components/guest-photo-card.tsx` — Card for single photo in guest grid
- `components/bulk-download.tsx` — Business plan ZIP download button
- `components/optimized-image.tsx` — Image wrapper optimized for thumbnails/full images

---

### Events & Timeline

- `components/events-grid.tsx` — Dashboard grid of events
- `components/event-card.tsx` — Event summary card
- `components/event-members.tsx` — Members list and management UI
- `components/event-settings-form.tsx` — Event settings form (name, date, privacy, approvals)
- `components/event-timeline.tsx` — Read-only timeline display
- `components/event-timeline-editor.tsx` — Editor for timeline entries
- `components/timeline-collapsible-card.tsx` — Collapsible panel with persistent state
- `components/inline-slideshow.tsx` — Inline slideshow for event photos
- `components/optimized-slideshow.tsx` — Optimized slideshow with progressive loading

---

### Chat

- `components/EventChat.tsx` — Event chat panel
- `components/admin-event-chat.tsx` — Admin variant of chat panel

---

### Layout & Navigation

- `components/site-header.tsx` — Top navigation bar
- `components/user-menu.tsx` / `components/user-menu.client.tsx` — User account menu
- `components/no-scroll.tsx` — Portal/body overflow control helper
- `components/modal.tsx` — Modal wrapper
- `components/collapsible.tsx` — Collapsible primitive

---

### Admin

- `components/admin-orphans-table.tsx` — Admin view for orphaned storage objects

---

### Icons & Misc

- `components/BrandMark.tsx` — Brand mark/logo
- `components/category-dropdown.tsx` and `components/category-icon.tsx` — Event category helpers
- `components/regenerate-code-button.tsx` — Button for regenerating codes
- `components/update-toast.tsx` — Toast helper for optimistic updates

---

### UI Primitives (Shadcn-inspired)

`components/ui/*` provides a curated set of UI primitives wired to Tailwind:

- `Button`, `Input`, `Textarea`, `Label`
- `Card`
- `Avatar`
- `Checkbox`, `RadioGroup`
- `Popover`, `DropdownMenu`, `Tooltip`
- `Calendar`
- `sonner` toast utilities

Example:
```tsx
import { Button } from '@/components/ui/button';

export function CTA() {
  return <Button onClick={() => alert('Clicked!')}>Click me</Button>;
}
```

