# Memory: features/cell-membership-security-v1
Updated: 2026-02-06

## Cell Membership Security Model

### Principle
**Volunteers CANNOT create/update/delete cell_memberships directly.**
Only coordinators and admins can modify memberships via SECURITY DEFINER RPCs.

### RLS Policies on `cell_memberships`

| Operation | Policy | Who Can Execute |
|-----------|--------|-----------------|
| SELECT | "Users can view their memberships" | Own user_id |
| SELECT | "Coordinators can view all memberships" | is_coordinator(auth.uid()) |
| INSERT | "Only coordinators can create memberships via RPC" | coord_roles OR admins |
| UPDATE | "Only coordinators can update memberships" | is_coordinator() OR admins |
| DELETE | "Only coordinators can delete memberships" | is_coordinator() OR admins |

### RPCs for Volunteers

1. **`request_cell_allocation(p_cell_id uuid)`**
   - Creates a `cell_assignment_requests` entry with status 'pending'
   - Updates `profiles.preferred_cell_id`
   - Does NOT create cell_membership
   - Returns: `{success, request_id, message, cell_name}`

2. **`cancel_cell_allocation_request()`**
   - Cancels user's pending request
   - Clears `profiles.preferred_cell_id`
   - Returns: `{success, cancelled_count}`

3. **`volunteer_save_city_selection(p_city_id, p_preferred_cell_id, p_skip_cell)`**
   - Saves city and preferred cell to profile
   - Sets `onboarding_complete = true`
   - Does NOT create membership
   - Returns: `{success, city_id, preferred_cell_id, needs_assignment}`

### RPCs for Coordinators

1. **`approve_volunteer(_user_id, _cell_id)`**
   - Changes `volunteer_status` to 'ativo'
   - Creates `cell_memberships` entry (uses _cell_id or preferred_cell_id)
   - Closes pending assignment requests
   - Logs to `coord_audit_log`

2. **`approve_and_assign_request(request_id, cell_id)`**
   - Resolves assignment request
   - Creates cell_membership
   - Updates profile.cell_id

### Frontend Hooks

- `useCellAssignmentRequest.requestCell(cellId)` - Uses `request_cell_allocation` RPC
- `useCellAssignmentRequest.cancelRequest()` - Uses `cancel_cell_allocation_request` RPC  
- `useCityCellSelection.saveSelection()` - Uses `volunteer_save_city_selection` RPC

### Flow Summary

1. Volunteer selects city/cell in wizard → saves preference via RPC
2. Volunteer goes to `/aguardando-aprovacao`
3. Coordinator sees pending volunteer in queue
4. Coordinator approves via `approve_volunteer` → creates membership
5. Volunteer now has actual cell_membership
