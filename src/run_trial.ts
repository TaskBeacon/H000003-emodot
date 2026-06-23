import {
  set_trial_context,
  type StimBank,
  type TaskSettings,
  type TrialBuilder
} from "psyflow-web";

import type { EmodotTrialInfo } from "./utils";

export function run_trial(
  trial: TrialBuilder,
  trial_info: EmodotTrialInfo,
  context: {
    settings: TaskSettings;
    stimBank: StimBank;
    block_id: string;
    block_idx: number;
  }
): TrialBuilder {
  const { settings, stimBank, block_id, block_idx } = context;
  const condition_id = String(trial_info.condition);
  const left_stim = stimBank.rebuild("left_stim", { image: trial_info.left_stim.url });
  const right_stim = stimBank.rebuild("right_stim", { image: trial_info.right_stim.url });
  const target_position = trial_info.target_position;
  const correct_key = String(target_position === "left" ? settings.left_key ?? "f" : settings.right_key ?? "j");
  const key_list = ((settings.key_list as string[]) ?? ["f", "j"]).map(String);

  trial.setTrialState("left_asset", trial_info.left_stim.name);
  trial.setTrialState("right_asset", trial_info.right_stim.name);
  trial.setTrialState("target_position", target_position);
  trial.setTrialState("correct_response", correct_key);

  const fixationUnit = trial.unit("fixation").addStim(stimBank.get("fixation"));
  set_trial_context(fixationUnit, {
    trial_id: trial.trial_id,
    phase: "pre_face_fixation",
    deadline_s: (settings.fixation_duration as number | number[] | null | undefined) ?? null,
    valid_keys: [...key_list],
    block_id,
    condition_id,
    task_factors: {
      condition: condition_id,
      stage: "pre_face_fixation",
      block_idx
    },
    stim_id: "fixation"
  });
  fixationUnit.show({ duration: (settings.fixation_duration as number | number[] | null | undefined) ?? null }).to_dict();

  const cuesUnit = trial.unit("cues").addStim(left_stim).addStim(right_stim);
  set_trial_context(cuesUnit, {
    trial_id: trial.trial_id,
    phase: "face_pair_preview",
    deadline_s: Number(settings.cue_duration ?? 0.5),
    valid_keys: [...key_list],
    block_id,
    condition_id,
    task_factors: {
      condition: condition_id,
      stage: "face_pair_preview",
      block_idx
    },
    stim_id: `${condition_id}_faces`,
    stim_features: {
      left_asset: trial_info.left_stim.name,
      right_asset: trial_info.right_stim.name
    }
  });
  cuesUnit.show({ duration: Number(settings.cue_duration ?? 0.5) }).to_dict();

  const intervalUnit = trial.unit("interval").addStim(stimBank.get("fixation"));
  set_trial_context(intervalUnit, {
    trial_id: trial.trial_id,
    phase: "inter_stimulus_interval",
    deadline_s: (settings.interval_duration as number | number[] | null | undefined) ?? null,
    valid_keys: [],
    block_id,
    condition_id,
    task_factors: {
      condition: condition_id,
      stage: "inter_stimulus_interval",
      target_position,
      block_idx
    },
    stim_id: "fixation",
    stim_features: {
      left_asset: trial_info.left_stim.name,
      right_asset: trial_info.right_stim.name
    }
  });
  intervalUnit.show({ duration: (settings.interval_duration as number | number[] | null | undefined) ?? null }).to_dict();

  const targetStimId = `${target_position}_target`;
  const targetUnit = trial.unit("target").addStim(stimBank.get(targetStimId));
  set_trial_context(targetUnit, {
    trial_id: trial.trial_id,
    phase: "dot_probe_response",
    deadline_s: Number(settings.target_duration ?? 1),
    valid_keys: [...key_list],
    block_id,
    condition_id,
    task_factors: {
      condition: condition_id,
      stage: "dot_probe_response",
      target_position,
      correct_key,
      block_idx
    },
    stim_id: targetStimId
  });
  targetUnit
    .captureResponse({
      keys: key_list,
      correct_keys: correct_key,
      duration: Number(settings.target_duration ?? 1),
      response_trigger: Number((settings.triggers as Record<string, number> | undefined)?.key_press ?? 68),
      timeout_trigger: Number((settings.triggers as Record<string, number> | undefined)?.no_response ?? 69),
      terminate_on_response: true
    })
    .to_dict();

  return trial;
}
