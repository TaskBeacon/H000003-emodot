# H000003 EmoDot

HTML/browser preview of the Emotional Dot-Probe Task built with `psyflow-web`.
The within-trial procedure, face-pair condition semantics, timing, seeded face sampling, and instruction flow are aligned to the local `T000003-emodot` task; only the block and trial count are shortened for preview use.

## Layout

This task keeps the same TAPS-style separation used by local `psyflow` tasks:

- `main.ts`: task-level orchestration
- `config/config.yaml`: declarative task config
- `src/run_trial.ts`: trial-level logic
- `src/utils.ts`: task-specific asset sampling helpers

## Run

From [psyflow-web](/e:/xhmhc/TaskBeacon/psyflow-web):

```powershell
npm install
npm run dev
```

Then open:

```text
http://127.0.0.1:4173/?task=H000003-emodot
```
