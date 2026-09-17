import type { FocusEvent } from "react";

/**
 * Select a number input's contents when it gains focus.
 *
 * Every numeric field in the admin defaults to `0` rather than empty, because a
 * blank price or shipping rate is not a meaningful state. That default then
 * behaves badly: clicking into the box puts the caret next to the `0` and
 * typing `999` yields `0999`. It parses to 999 so nothing breaks, but the
 * operator watches the wrong number form under their hands and has to go back
 * and clear it.
 *
 * Selecting on focus makes the first keystroke replace the default, which is
 * what clicking into a pre-filled number box is universally taken to mean.
 * Keyboard tabbing gets the same behaviour, which is also the convention.
 *
 * Not applied to text inputs: there, select-on-focus fights the far more common
 * intent of clicking to place a caret and edit in place.
 */
export function selectOnFocus(event: FocusEvent<HTMLInputElement>): void {
  event.currentTarget.select();
}
