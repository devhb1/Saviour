"use client";

import { useState } from "react";
import {
  AppShell,
  DEMO_TARGETS,
  useMemoryHitCount,
  type ScreenId,
} from "./AppShell";
import { InvestigateScreen } from "./InvestigateScreen";
import { ResolveScreen } from "./ResolveScreen";
import { GovernScreen } from "./GovernScreen";

export function SavioursApp() {
  const [screen, setScreen] = useState<ScreenId>("investigate");
  const [address, setAddress] = useState<string>(DEMO_TARGETS[0].address);
  const { count, bump } = useMemoryHitCount();

  return (
    <AppShell screen={screen} onScreen={setScreen} memoryHits={count}>
      {screen === "investigate" ? (
        <InvestigateScreen
          address={address}
          onAddress={setAddress}
          onMemoryHit={bump}
        />
      ) : null}
      {screen === "resolve" ? (
        <ResolveScreen
          address={address}
          onAddress={setAddress}
          onMemoryHit={bump}
        />
      ) : null}
      {screen === "govern" ? (
        <GovernScreen onSelectAddress={setAddress} />
      ) : null}
    </AppShell>
  );
}
