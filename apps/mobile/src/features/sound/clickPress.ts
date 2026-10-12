/** Disabled controls and decorative chips have no press handler or effect. */
export function createSoundPressHandler<Event>(
  onPress: ((event: Event) => void) | undefined | null,
  playClick: () => void,
  disabled?: boolean | null,
): ((event: Event) => void) | undefined {
  if (!onPress || disabled) return undefined;
  return (event) => {
    try {
      playClick();
    } catch {
      // Sound is optional feedback; the user's action always proceeds.
    }
    onPress(event);
  };
}
