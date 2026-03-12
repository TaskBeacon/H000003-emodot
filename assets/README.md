# EmoDot Assets

## Copyright Notice

The original emotional face image set is **not distributed** in this repository.
Only placeholder BMP files are included so QA/sim/validation pipelines can run.

## Placeholder Files (QA/Sim Only)

This task loader groups files by filename prefix:

- `HF*` -> positive female
- `HM*` -> positive male
- `NEF*` -> neutral female
- `NEM*` -> neutral male
- `SAF*` -> negative female
- `SAM*` -> negative male

Keep at least one BMP per prefix to allow task startup.

## Replacing with Licensed Stimuli

1. Remove placeholder BMP files.
2. Copy licensed stimuli into this folder with the same prefix scheme.
3. Keep `.bmp` extension (or update loader in `src/utils.py` if using a different format).
4. Re-run:
   - `psyflow-validate T000003-emodot`
   - `psyflow-qa T000003-emodot --config config/config_qa.yaml --no-maturity-update`

## Important

Behavioral/EEG data quality claims should only be made when using real licensed stimuli,
not placeholders.
