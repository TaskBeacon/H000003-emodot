import type { ReducedTrialRow } from "psyflow-web";

export interface AssetEntry {
  name: string;
  url: string;
}

type StimList = Record<string, AssetEntry[]>;

export interface EmodotTrialInfo {
  condition: string;
  left_stim: AssetEntry;
  right_stim: AssetEntry;
  target_position: "left" | "right";
}

function basename(pathLike: string): string {
  const segments = pathLike.replace(/\\/g, "/").split("/");
  return segments[segments.length - 1] ?? pathLike;
}

class PythonRandom {
  private mt = new Array<number>(624).fill(0);
  private index = 624;

  constructor(seed: number) {
    this.seed(seed);
  }

  private seed(seed: number): void {
    this.mt[0] = 19650218;
    for (let index = 1; index < 624; index += 1) {
      const previous = this.mt[index - 1] ^ (this.mt[index - 1] >>> 30);
      this.mt[index] = (Math.imul(1812433253, previous) + index) >>> 0;
    }

    const key = [Math.abs(Math.trunc(seed)) >>> 0];
    let i = 1;
    let j = 0;
    for (let k = Math.max(624, key.length); k > 0; k -= 1) {
      const previous = this.mt[i - 1] ^ (this.mt[i - 1] >>> 30);
      this.mt[i] = ((this.mt[i] ^ Math.imul(previous, 1664525)) + key[j] + j) >>> 0;
      i += 1;
      j += 1;
      if (i >= 624) {
        this.mt[0] = this.mt[623];
        i = 1;
      }
      if (j >= key.length) {
        j = 0;
      }
    }
    for (let k = 623; k > 0; k -= 1) {
      const previous = this.mt[i - 1] ^ (this.mt[i - 1] >>> 30);
      this.mt[i] = ((this.mt[i] ^ Math.imul(previous, 1566083941)) - i) >>> 0;
      i += 1;
      if (i >= 624) {
        this.mt[0] = this.mt[623];
        i = 1;
      }
    }
    this.mt[0] = 0x80000000;
    this.index = 624;
  }

  private nextUint32(): number {
    if (this.index >= 624) {
      this.twist();
    }
    let value = this.mt[this.index];
    this.index += 1;
    value ^= value >>> 11;
    value ^= (value << 7) & 0x9d2c5680;
    value ^= (value << 15) & 0xefc60000;
    value ^= value >>> 18;
    return value >>> 0;
  }

  private twist(): void {
    for (let index = 0; index < 624; index += 1) {
      const y = (this.mt[index] & 0x80000000) + (this.mt[(index + 1) % 624] & 0x7fffffff);
      let value = this.mt[(index + 397) % 624] ^ (y >>> 1);
      if (y % 2 !== 0) {
        value ^= 0x9908b0df;
      }
      this.mt[index] = value >>> 0;
    }
    this.index = 0;
  }

  randBelow(maxExclusive: number): number {
    const max = Math.max(1, Math.floor(maxExclusive));
    const bitLength = max.toString(2).length;
    let value = this.nextUint32() >>> (32 - bitLength);
    while (value >= max) {
      value = this.nextUint32() >>> (32 - bitLength);
    }
    return value;
  }
}

function shuffleInPlace<T>(items: T[], rng: PythonRandom): T[] {
  for (let index = items.length - 1; index > 0; index -= 1) {
    const swapIndex = rng.randBelow(index + 1);
    [items[index], items[swapIndex]] = [items[swapIndex], items[index]];
  }
  return items;
}

export class AssetPool {
  private readonly rng: PythonRandom;
  private readonly original: StimList;
  private readonly pool: StimList;

  constructor(stim_list: StimList, seed = 42) {
    this.rng = new PythonRandom(seed);
    this.original = Object.fromEntries(
      Object.entries(stim_list).map(([key, items]) => [key, items.map((item) => ({ ...item }))])
    );
    this.pool = Object.fromEntries(Object.keys(stim_list).map((key) => [key, []]));
  }

  draw(key: string): AssetEntry {
    const workingPool = this.pool[key];
    const sourcePool = this.original[key];
    if (!sourcePool || sourcePool.length === 0) {
      throw new Error(`Asset pool '${key}' is empty or missing.`);
    }
    if (!workingPool || workingPool.length === 0) {
      this.pool[key] = shuffleInPlace(
        sourcePool.map((item) => ({ ...item })),
        this.rng
      );
    }
    return this.pool[key].pop() as AssetEntry;
  }
}

export function normalizeImportedAssets(modules: Record<string, string>): Record<string, string> {
  return Object.fromEntries(
    Object.entries(modules).map(([moduleKey, assetUrl]) => [basename(moduleKey), String(assetUrl)])
  );
}

export function get_stim_list_from_assets(assetMap: Record<string, string>): StimList {
  const stim_list: StimList = {
    P_F: [],
    P_M: [],
    N_F: [],
    N_M: [],
    S_F: [],
    S_M: []
  };

  for (const [fileName, assetUrl] of Object.entries(assetMap)) {
    const lookupName = fileName.toUpperCase();
    if (!lookupName.endsWith(".BMP")) {
      continue;
    }
    const entry: AssetEntry = { name: fileName, url: assetUrl };
    if (lookupName.startsWith("HF")) {
      stim_list.P_F.push(entry);
    } else if (lookupName.startsWith("HM")) {
      stim_list.P_M.push(entry);
    } else if (lookupName.startsWith("NEF")) {
      stim_list.N_F.push(entry);
    } else if (lookupName.startsWith("NEM")) {
      stim_list.N_M.push(entry);
    } else if (lookupName.startsWith("SAF")) {
      stim_list.S_F.push(entry);
    } else if (lookupName.startsWith("SAM")) {
      stim_list.S_M.push(entry);
    }
  }

  return stim_list;
}

export function assign_stim_from_condition(condition: string, asset_pool: AssetPool): EmodotTrialInfo {
  const [emotion, gender, target] = condition.split("_");
  let left_key: string;
  let right_key: string;

  if (emotion === "PN") {
    left_key = `P_${gender}`;
    right_key = `N_${gender}`;
  } else if (emotion === "NP") {
    left_key = `N_${gender}`;
    right_key = `P_${gender}`;
  } else if (emotion === "SN") {
    left_key = `S_${gender}`;
    right_key = `N_${gender}`;
  } else if (emotion === "NS") {
    left_key = `N_${gender}`;
    right_key = `S_${gender}`;
  } else if (emotion === "NN") {
    left_key = `N_${gender}`;
    right_key = `N_${gender}`;
  } else {
    throw new Error(`Unknown emotion code: ${emotion}`);
  }

  return {
    condition,
    left_stim: asset_pool.draw(left_key),
    right_stim: asset_pool.draw(right_key),
    target_position: target === "L" ? "left" : "right"
  };
}

export function generate_emodot_conditions(
  n_trials: number,
  condition_labels: unknown[],
  options: { seed: number; stim_list: StimList }
): EmodotTrialInfo[] {
  const labels = condition_labels.map(String);
  if (labels.length === 0) {
    throw new Error("EmoDot condition_labels cannot be empty.");
  }

  const scheduledLabels: string[] = [];
  while (scheduledLabels.length < n_trials) {
    scheduledLabels.push(...labels);
  }
  scheduledLabels.length = n_trials;
  shuffleInPlace(scheduledLabels, new PythonRandom(options.seed));

  const assetPool = new AssetPool(options.stim_list, options.seed);
  return scheduledLabels.map((condition) => assign_stim_from_condition(condition, assetPool));
}

export function resolve_canonical_block_seed(
  settings: { block_seed?: unknown; overall_seed?: unknown; total_blocks?: unknown },
  blockIdx: number
): number {
  const seeds = Array.isArray(settings.block_seed) ? settings.block_seed : [];
  const configuredSeed = seeds[blockIdx];
  if (configuredSeed != null) {
    return Number(configuredSeed);
  }

  const totalBlocks = Math.max(1, Number(settings.total_blocks ?? blockIdx + 1));
  const rng = new PythonRandom(Number(settings.overall_seed ?? 2025));
  const generated = Array.from({ length: totalBlocks }, () => rng.randBelow(100000));
  return generated[blockIdx] ?? Number(settings.overall_seed ?? 2025);
}

export function summarizeBlock(rows: ReducedTrialRow[], blockId: string): { accuracy: number } {
  const trialRows = rows.filter(
    (row) => row.block_id === blockId && typeof row.target_hit === "boolean"
  );
  if (trialRows.length === 0) {
    return { accuracy: 0 };
  }
  const hits = trialRows.filter((row) => row.target_hit === true);
  return {
    accuracy: hits.length / trialRows.length
  };
}
