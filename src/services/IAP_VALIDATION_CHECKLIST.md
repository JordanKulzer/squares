# IAP Validation Checklist

Manual QA steps for every in-app purchase scenario.  
Run against a **development build** (not Expo Go) connected to the Apple Sandbox environment.  
All Supabase checks should be done in the **project dashboard → Table Editor → `users` / `square_credits`**.

---

## 1. Premium Subscription Purchase

**Steps**
1. Open the Premium modal from any gated feature.
2. Tap "Go Premium — $4.99/mo".
3. Complete the Sandbox purchase dialog.

**Expected**
- Modal dismisses immediately after tapping (store dialog takes over).
- `IAPInitializer` callback fires with `success=true`, `productId=com.jkulzer.squaresgame.premium_monthly`.
- `refreshPremiumStatus()` is called → `isPremium` flips to `true` in context.
- Toast: "Welcome to Premium!"
- Supabase `users` row: `is_premium=true`, `premium_type=subscription`, `subscription_status=active`, `subscription_expires_at` ≈ now + 30 days, `premium_receipt` non-null.
- Badge row upserted: `badge_type=premium_member`.

**Failure indicators**
- Modal stays open after store dialog.
- `isPremium` still `false` after purchase.
- Supabase row not updated → check `handleSubscriptionPurchase` logs.

---

## 2. Premium Restore (active subscription)

**Steps**
1. Log out or reinstall. Log back in.
2. Open Premium modal.
3. Tap "Restore Premium".

**Expected**
- `getAvailablePurchases()` returns the `PREMIUM_MONTHLY_ID` purchase.
- `handleSubscriptionRestore()` runs — sets `is_premium=true`, `subscription_status=active`.
- `subscription_expires_at` is **NOT** modified (the existing stored date is preserved).
- `refreshPremiumStatus()` called → `isPremium` flips to `true`.
- Toast: "Premium restored".
- Modal dismisses.

**Failure indicators**
- Toast: "No premium subscription found" when subscription should be active → check Sandbox account has active subscription.
- `subscription_expires_at` changed unexpectedly → `handleSubscriptionPurchase` was called instead of `handleSubscriptionRestore`.

---

## 3. Expired Subscription Restore

**Steps**
1. Let the Sandbox subscription expire (Sandbox subscriptions expire in minutes).
2. Open Premium modal.
3. Tap "Restore Premium".

**Expected**
- `getAvailablePurchases()` returns empty array or only expired receipts (Apple removes expired subs from available purchases on Sandbox after a short window).
- `restored = false` → Toast: "No premium subscription found".
- `refreshPremiumStatus()` runs on next app foreground → `subscription_expires_at` < now → `is_premium` set to `false`, `subscription_status=expired` in Supabase.
- User sees non-premium UI.

**Failure indicators**
- Expired user incorrectly shown as premium after restore.
- `subscription_expires_at` reset to now + 30 days (means restore is calling purchase handler instead of restore handler).

---

## 4. Extra Square Purchase

**Steps**
1. Reach the square limit to trigger the modal with `context="square_limit"`.
2. Tap "Add 1 Extra Square — $0.99".

**Expected**
- Modal dismisses immediately.
- `purchaseUpdatedListener` fires with `productId=com.jkulzer.squaresgame.extra_square`.
- `handleExtraSquarePurchase(purchase)` inserts one row into `square_credits`: `reason=purchased`, `transaction_id=<non-null>`.
- `finishTransaction` called with `isConsumable=true`.
- Toast: "Extra square credit added!"
- User can now create/join one additional square.

**Failure indicators**
- `transaction_id` is null in `square_credits` → check `purchase.transactionId` and `purchase.purchaseToken` fields in logs; credit is refused if both are null.
- Credit not appearing → check `square_credits` table directly.

---

## 5. Duplicate Listener Replay (Extra Square)

**Setup**: Simulate an unfinished transaction by killing the app before `finishTransaction` completes, then reopening.

**Expected**
- `purchaseUpdatedListener` fires again on reconnect with the same purchase.
- `handleExtraSquarePurchase` attempts INSERT with the same `transaction_id`.
- Postgres unique constraint on `square_credits(transaction_id)` fires error code `23505`.
- Code catches `23505` and returns silently — no second credit inserted.
- `finishTransaction` still called so Apple stops replaying.
- `onPurchaseComplete(true)` fires (credit was already present).

**Failure indicators**
- Two rows in `square_credits` with the same `transaction_id`.
- Any unhandled error toast shown to user.

---

## 6. App Restart After Purchase

**Steps**
1. Complete a subscription or extra square purchase.
2. Force-quit the app and reopen.

**Expected (subscription)**
- `PremiumContext` calls `refreshPremiumStatus()` on mount → reads `is_premium=true` from Supabase → `isPremium=true` without any additional purchase flow.

**Expected (extra square)**
- If `finishTransaction` was NOT called before quit: `purchaseUpdatedListener` replays — see scenario 5.
- If `finishTransaction` WAS called: no replay, `square_credits` row already exists.

**Failure indicators**
- Premium UI locked after restart → `refreshPremiumStatus` not running on mount, or Supabase row not written.
- Extra square credit doubled after restart → unique constraint not applied.

---

## 7. Reinstall + Restore

**Steps**
1. Delete the app entirely.
2. Reinstall.
3. Sign in with the same Apple ID.
4. Open Premium modal → tap "Restore Premium".

**Expected**
- Same as scenario 2 (active subscription) or scenario 3 (expired).
- `is_premium` state comes from Supabase, not local storage — no stale local state issue.

**Failure indicators**
- `isPremium=true` before restore is tapped → check if Supabase row was already populated from a previous sign-in.

---

## 8. Offline / Network Failure During Purchase

**Steps**
1. Enable Airplane Mode after the Sandbox dialog appears but before the purchase confirms.
2. Observe.

**Expected**
- `requestPurchase` or the listener fires an error.
- `purchaseErrorListener` fires → `onPurchaseComplete(false)` → no toast from `IAPInitializer`.
- Modal `catch` block shows Toast: "Purchase failed. Please try again."
- No partial Supabase write (handlers only run if listener fires with a valid receipt).

**Steps (network drops during Supabase write)**
1. Purchase completes normally from Apple's side.
2. Network drops before `handleSubscriptionPurchase` / `handleExtraSquarePurchase` completes.

**Expected**
- Supabase call throws → error logged.
- For subscription: `finishTransaction` was already called; user can tap "Restore Premium" to re-sync.
- For extra square: credit not written; transaction was finished; credit is permanently lost unless support intervenes. (Known limitation — requires server-side receipt validation to fix robustly.)

---

## 9. Cancelled Purchase

**Steps**
1. Tap Subscribe or Extra Square.
2. Cancel the Sandbox payment sheet.

**Expected**
- `purchaseErrorListener` fires with a user-cancelled error code.
- `onPurchaseComplete(false)` called.
- No toast shown to user (cancellation is intentional — the modal `catch` block shows a generic error toast; consider suppressing it for cancel codes `E_USER_CANCELLED` / code `2`).
- No Supabase writes.
- Modal remains open so the user can try again.

**Known gap**: The modal currently shows "Purchase failed. Please try again." on cancellation. This is technically wrong. A future fix should check the error code and suppress the toast on intentional cancel.

---

## 10. Wrong Account / Account Mismatch

**Context**: Apple Sandbox allows multiple test accounts. A user might restore on a different Apple ID than the one used to purchase.

**Steps**
1. Purchase on Sandbox account A.
2. Sign out of the device from account A, sign in with account B.
3. Attempt "Restore Premium" in the app.

**Expected**
- `getAvailablePurchases()` returns purchases for the **currently signed-in Apple ID** (account B).
- Account B has no premium purchase → `restored=false` → Toast: "No premium subscription found".
- Supabase user for account B is NOT marked premium.

**Note**: The app uses Supabase for auth, not Apple ID. If a user signs into the *same* Supabase account on a device with a *different* Apple ID, and then restores, the app will correctly find no purchase for that Apple ID and show the empty restore message. This is correct behavior — premium is tied to the purchasing Apple ID via `getAvailablePurchases`, and to the Supabase user via the database row.

**Failure indicators**
- Premium granted to a Supabase user who purchased on a different Apple ID → would require the Supabase row to already be marked premium from a previous device; this is correct and expected (Supabase is the source of truth).

---

## Quick Reference: Product IDs

| Product | ID | Type | Restorable |
|---|---|---|---|
| Premium Monthly | `com.jkulzer.squaresgame.premium_monthly` | Subscription | Yes |
| Extra Square | `com.jkulzer.squaresgame.extra_square` | Consumable | No |
| Legacy Premium | `com.jkulzer.squaresgame.premium` | One-time (deprecated) | Yes |

## Key Files

| File | Responsibility |
|---|---|
| `src/services/iapService.ts` | All purchase/restore logic, Supabase writes |
| `src/contexts/PremiumContext.tsx` | Premium state, expiry check, refresh |
| `src/components/PremiumUpgradeModal.tsx` | Purchase UI, restore UI |
| `App.tsx` → `IAPInitializer` | Listener registration, success toasts |
| Supabase `users` table | `is_premium`, `subscription_expires_at`, `premium_receipt` |
| Supabase `square_credits` table | Consumable credit rows, `transaction_id` unique index |
