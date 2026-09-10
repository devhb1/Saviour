/**
 * Browser helper: resolve 0x / <addr>.saviours.eth / public *.eth via API.
 */

export type ClientResolveOk = {
  ok: true;
  address: string;
  via: "hex" | "saviours-label" | "ens";
  ensName?: string;
};

export type ClientResolveFail = {
  ok: false;
  error: string;
};

export async function resolveTargetClient(
  raw: string,
): Promise<ClientResolveOk | ClientResolveFail> {
  const q = raw.trim();
  if (!q) return { ok: false, error: "Paste a 0x address or ENS name" };

  if (/^0x[a-fA-F0-9]{40}$/.test(q)) {
    return { ok: true, address: q.toLowerCase(), via: "hex" };
  }

  const sav = q.match(/^(0x[a-fA-F0-9]{40})\.saviours\.eth$/i);
  if (sav?.[1]) {
    return {
      ok: true,
      address: sav[1].toLowerCase(),
      via: "saviours-label",
      ensName: q.toLowerCase(),
    };
  }

  try {
    const res = await fetch(
      `/api/resolve-target?q=${encodeURIComponent(q)}`,
    );
    const data = (await res.json()) as {
      ok?: boolean;
      address?: string;
      via?: ClientResolveOk["via"];
      ensName?: string;
      error?: string;
    };
    if (!res.ok || !data.ok || !data.address) {
      return {
        ok: false,
        error: data.error ?? "Could not resolve that name",
      };
    }
    return {
      ok: true,
      address: data.address.toLowerCase(),
      via: data.via ?? "ens",
      ensName: data.ensName,
    };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Resolve failed",
    };
  }
}
