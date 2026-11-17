# Safe Tx Service + Safe App (post-trust)

**Do not build until Reach is trusted (after R1/R2).**

## Ladder position

1. CLI + golden reports  
2. GitHub Action  
3. Opt-in pilots  
4. Shareable reports  
5. Governance attachment  
6. **Then** Safe Transaction Service pending-tx import  
7. **Then** Safe App iframe  
8. Alerts last  

## STS import (planned)

- List pending txs for a Safe via Safe Transaction Service API  
- One-click open in `/review` with official `safeTxHash` as expected hash  
- Kill criterion: if ops still won’t open it after paste friction is gone  

## Safe App (planned)

- iframe hosted under saviours.xyz  
- Pass selected Safe context  
- Never auto-sign / auto-block  
