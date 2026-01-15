export enum BodyWood {
  MAHOGANY = 'Mahogany',
  ASH = 'Swamp Ash',
  ALDER = 'Alder',
  MAPLE = 'Maple',
  BASSWOOD = 'Basswood',
  KOA = 'Koa'
}

export enum NeckProfile {
  MODERN_C = 'Modern C',
  VINTAGE_50S = '50s Vintage U',
  SLIM_TAPER = 'Slim Taper D',
  WIZARD = 'Super Thin (Wizard)'
}

export enum FretboardMaterial {
  ROSEWOOD = 'Rosewood',
  MAPLE = 'Maple',
  EBONY = 'Ebony',
  PAU_FERRO = 'Pau Ferro'
}

export enum BridgeSystem {
  TUNE_O_MATIC = 'Tune-o-matic (Fixed)',
  HARDTAIL = 'Hardtail (String-thru)',
  SYNCHRONIZED_TREMOLO = 'Synchronized Tremolo (Vintage)',
  FLOYD_ROSE = 'Floyd Rose (Double Locking)',
  EVERTUNE = 'Evertune (Spring Tension)'
}

export enum PickupConfig {
  SSS = 'SSS (3 Single Coils)',
  HSS = 'HSS (Humbucker Bridge)',
  HH = 'HH (Dual Humbuckers)',
  P90 = 'Dual P-90s'
}

export interface GuitarSpecs {
  bodyWood: BodyWood;
  neckProfile: NeckProfile;
  fretboard: FretboardMaterial;
  bridge: BridgeSystem;
  pickups: PickupConfig;
  scaleLength: string; // e.g., "25.5\""
  fretboardRadius: string; // e.g., "9.5\""
  notes?: string;
  construction?: string; // e.g. Bolt-on vs Set-neck
  philosophy?: string;   // e.g. Modular, Artesanal, High Performance
}

export interface AnalysisResult {
  detectedSpecs: Partial<GuitarSpecs>;
  luthierNotes: string;
}

export interface GenerationResult {
  technicalPrompt: string;
  imageUrl: string;
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}