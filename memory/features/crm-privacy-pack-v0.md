# CRM Privacy Pack v0

## Overview
Implements WhatsApp masking, secure reveal, soft delete, and LGPD-compliant purge for CRM contacts.

## Database Schema Changes

### New Columns on `crm_contatos`
- `whatsapp_last4` (text): Auto-populated via trigger with last 4 digits of `whatsapp_norm`
- `deleted_at` (timestamptz): Soft delete timestamp

### Trigger
- `trg_crm_contatos_whatsapp_last4`: Auto-updates `whatsapp_last4` on insert/update of whatsapp fields

## RPCs

### `get_contact_whatsapp(p_contact_id uuid)`
Returns full WhatsApp number only for authorized users:
- Contact owner (`criado_por`)
- Assigned user (`assignee_id`)
- Coordinators with matching city/cell scope
- Admins (global access)

Logs `crm_whatsapp_reveal` event to `growth_events` (PII-free).

### `delete_my_contact(p_contact_id uuid)`
Soft deletes a contact owned by the current user:
- Sets `deleted_at = now()`
- Clears PII: `whatsapp`, `whatsapp_norm`, `telefone`, `email` → NULL
- Logs `crm_contact_deleted` event

### `purge_my_contacts()`
Soft deletes ALL contacts owned by the current user:
- Clears all PII from all owned contacts
- Returns count of purged contacts
- Logs `crm_contacts_purged` event

## Frontend Components

### `useCRMPrivacy` Hook (`src/hooks/useCRMPrivacy.tsx`)
- `revealWhatsApp`: Mutation to fetch full number via RPC
- `deleteContact`: Mutation for single contact deletion
- `purgeContacts`: Mutation for bulk deletion
- `maskWhatsApp(last4)`: Utility to format masked display (e.g., "•••• 7766")

### `MaskedWhatsAppField` (`src/components/crm/MaskedWhatsAppField.tsx`)
Displays masked WhatsApp with reveal/copy/open actions:
- Shows `•••• XXXX` by default
- Eye icon to reveal full number (triggers RPC + audit log)
- Copy button to copy normalized number
- WhatsApp icon to open wa.me link

### `DeleteContactDialog` (`src/components/crm/DeleteContactDialog.tsx`)
Alert dialog for single contact deletion with confirmation.

### `PurgeContactsDialog` (`src/components/crm/PurgeContactsDialog.tsx`)
Alert dialog for bulk deletion requiring typed confirmation ("EXCLUIR TUDO").

## RLS Policy Updates
All SELECT policies now include `AND deleted_at IS NULL` filter to hide soft-deleted contacts.

## Privacy Tracking
All reveal/delete/purge actions logged to `growth_events` with:
- `contact_id` (for audit trail)
- `cidade` (for aggregated analytics)
- NO PII (no phone numbers, names, or emails in logs)

## Usage in UI
- Contact list shows masked WhatsApp by default
- Click eye icon to reveal (logged)
- Click copy/WhatsApp icons to trigger reveal + action
- Delete button on each contact card
- "Excluir todos meus contatos" button for LGPD compliance
