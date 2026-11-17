# Recipe — Delta before sign

1. Export Safe transaction JSON from Safe UI (include official safeTxHash)
2. `pnpm review:cli --json ./tx.json` — integrity must be MATCH against **independent** expected hash
3. Never click “use computed as expected” for integrity theater
4. Share `/review` or CLI output with co-signers
5. Sign only in Safe / HW wallet
