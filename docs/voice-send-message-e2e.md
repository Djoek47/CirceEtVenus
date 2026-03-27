# Voice Send Message E2E Matrix

This matrix validates voice-driven navigation and `send_message` behavior across connection states.

## Preconditions

- Test user has working Divine voice access.
- At least one known fan id exists on OnlyFans for positive send tests.
- Browser console open for client-side exceptions.

## Scenarios

### 1) Connected: Navigate from non-Messages page then send

1. Start on `/dashboard/content` (or `/dashboard/analytics`).
2. Open voice and ask to open a specific fan chat.
3. Confirm app navigates to `/dashboard/messages` and focuses target chat.
4. Ask voice to send a short DM to that fan.

Expected:
- No client exception.
- No false "OnlyFans not connected".
- Tool response confirms send success.

### 2) Connected: Already on Messages page then send

1. Start on `/dashboard/messages`.
2. Ask voice to open/focus a specific fan chat.
3. Ask voice to send DM.

Expected:
- Same behavior as Scenario 1.
- No extra first-load churn; no connection error.

### 3) OnlyFans disconnected: explicit failure path

1. Disconnect OnlyFans in Settings Integrations.
2. From any dashboard page, ask voice to send a DM.

Expected:
- Response includes clear reconnect message.
- Uses standardized code semantics (`ONLYFANS_NOT_CONNECTED` or `ONLYFANS_CONNECTION_INCOMPLETE` internally).
- App guidance points to `/dashboard/settings?tab=integrations`.

### 4) Reconnect recovery

1. Reconnect OnlyFans in Settings Integrations.
2. Repeat Scenario 1 immediately after reconnect.

Expected:
- No stale "not connected" response after reconnect.
- DM send works.

### 5) Fansly disconnected with OF connected

1. Ensure OnlyFans connected; Fansly disconnected.
2. Ask voice to run Fansly-specific action.

Expected:
- Voice reports Fansly disconnected without blocking valid OnlyFans actions.
- Navigation guidance points to Integrations tab.

## Observability checks

- Server logs should include failing stage and connection reason (`not_connected` vs `missing_credential`).
- API responses for connection failures should include both `error` and `code`.
- `voice-tool` payload should preserve human-readable message for the assistant response.

## Regression checks

- Standard Messages page open without voice still works.
- DM polling and thread refresh continue functioning with no crash on initial entry from other pages.
- `ui_navigate` continues to allow `/dashboard/settings?tab=integrations`.
