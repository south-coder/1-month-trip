import React from "react";
import { AppProvider } from "./src/app/AppProvider";
import { SoundProvider } from "./src/features/sound";
import AppShell from "./src/layout/AppShell";

export default function App() {
  return (
    <SoundProvider>
      <AppProvider>
        <AppShell />
      </AppProvider>
    </SoundProvider>
  );
}
