export interface ClickSoundEngine {
  play(): void | Promise<void>;
  stop(): void | Promise<void>;
  dispose(): void | Promise<void>;
}
