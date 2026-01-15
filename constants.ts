import { BodyWood, NeckProfile, BridgeSystem, FretboardMaterial } from './types';

export const WOOD_CHARACTERISTICS: Record<BodyWood, string> = {
  [BodyWood.MAHOGANY]: "High density, warm lows/mids, slow decay. Visually porous grain, often reddish-brown.",
  [BodyWood.ASH]: "Lightweight, scooped mids, pronounced 'twang' and high-end snap. Distinctive, bold grain patterns.",
  [BodyWood.ALDER]: "Balanced weight and frequency response. The neutral standard for bolt-on bodies. Closed grain.",
  [BodyWood.MAPLE]: "Extreme density, very bright attack, heavy weight. Tight grain, often figured (flame/quilt).",
  [BodyWood.BASSWOOD]: "Soft, lightweight, neutral tone with strong fundamental. Minimal grain definition.",
  [BodyWood.KOA]: "Medium density, crisp highs that warm up over time. Exotic, highly figured golden/brown grain."
};

export const NECK_CHARACTERISTICS: Record<NeckProfile, string> = {
  [NeckProfile.MODERN_C]: "Oval ergonomic profile, standard for contemporary playability.",
  [NeckProfile.VINTAGE_50S]: "Thick 'Baseball Bat' profile, maximizes mechanical coupling and sustain.",
  [NeckProfile.SLIM_TAPER]: "Flat 'D' shape, low mass, favored for faster playing styles.",
  [NeckProfile.WIZARD]: "Ultra-thin, flat radius, reinforced with volute or multi-ply for stability."
};

export const BRIDGE_MECHANICS: Record<BridgeSystem, string> = {
  [BridgeSystem.TUNE_O_MATIC]: "Fixed bridge, sharp break angle, maximizes body resonance transfer.",
  [BridgeSystem.HARDTAIL]: "String-through body, high tuning stability, direct vibration transfer.",
  [BridgeSystem.SYNCHRONIZED_TREMOLO]: "Vintage vibrato fulcrum, relies on spring claw tension.",
  [BridgeSystem.FLOYD_ROSE]: "Double locking nut/bridge, infinite sustain, dive-bomb capability.",
  [BridgeSystem.EVERTUNE]: "Mechanical spring modules per saddle, constant tension, zero pitch drift."
};

export const FRETBOARD_RESPONSE: Record<FretboardMaterial, string> = {
  [FretboardMaterial.EBONY]: "Extreme hardness, glass-like surface, immediate transient attack.",
  [FretboardMaterial.MAPLE]: "Finished surface, bright snap, distinct separation of notes.",
  [FretboardMaterial.ROSEWOOD]: "Oily open pore, warm attack, attenuates harsh high frequencies.",
  [FretboardMaterial.PAU_FERRO]: "Harder than rosewood, snappy attack, tight grain structure."
};