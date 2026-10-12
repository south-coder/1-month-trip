import { createAudioPlayer, setAudioModeAsync } from "expo-audio";
import { createNativeClickSoundEngine } from "./nativePlayback";

/** Metro resolves engine.web.ts on web and this local WAV adapter on iOS/Android. */
export function createClickSoundEngine() {
  return createNativeClickSoundEngine(
    () =>
      createAudioPlayer(
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        require("./assets/click.wav"),
        { updateInterval: 1000 },
      ),
    () =>
      setAudioModeAsync({
        playsInSilentMode: false,
        interruptionMode: "mixWithOthers",
      }),
  );
}
