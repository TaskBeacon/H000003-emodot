import type { ReducedTrialRow } from "psyflow-web";

export interface AssetEntry {
  name: string;
  url: string;
}

type StimList = Record<string, AssetEntry[]>;

function basename(pathLike: string): string {
  const segments = pathLike.replace(/\\/g, "/").split("/");
  return segments[segments.length - 1] ?? pathLike;
}

function makeSeededRandom(seed: number): () => number {
  let value = seed >>> 0;
  return () => {
    value = (value + 0x6d2b79f5) >>> 0;
    let t = Math.imul(value ^ (value >>> 15), 1 | value);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffleInPlace<T>(items: T[], rng: () => number): T[] {
  for (let index = items.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(rng() * (index + 1));
    [items[index], items[swapIndex]] = [items[swapIndex], items[index]];
  }
  return items;
}

export class AssetPool {
  private readonly rng: () => number;
  private readonly original: StimList;
  private readonly pool: StimList;

  constructor(stim_list: StimList, seed = 42) {
    this.rng = makeSeededRandom(seed);
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
    Object.entries(modules).map(([moduleKey, assetUrl]) => [basename(moduleKey).toUpperCase(), String(assetUrl)])
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
    if (!fileName.toLowerCase().endsWith(".bmp")) {
      continue;
    }
    const entry: AssetEntry = { name: fileName, url: assetUrl };
    if (fileName.startsWith("HF")) {
      stim_list.P_F.push(entry);
    } else if (fileName.startsWith("HM")) {
      stim_list.P_M.push(entry);
    } else if (fileName.startsWith("NEF")) {
      stim_list.N_F.push(entry);
    } else if (fileName.startsWith("NEM")) {
      stim_list.N_M.push(entry);
    } else if (fileName.startsWith("SAF")) {
      stim_list.S_F.push(entry);
    } else if (fileName.startsWith("SAM")) {
      stim_list.S_M.push(entry);
    }
  }

  return stim_list;
}

export function assign_stim_from_condition(condition: string, asset_pool: AssetPool): {
  condition: string;
  left_stim: AssetEntry;
  right_stim: AssetEntry;
  target_position: "left" | "right";
} {
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
