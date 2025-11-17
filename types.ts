export enum AspectRatio {
  SIXTEEN_NINE = '16:9',
  NINE_SIXTEEN = '9:16',
}

// Fix: Use declaration merging to augment the global Window interface
// This correctly adds the 'aistudio' property to the global Window type
// without causing conflicts with other properties that might exist on 'Window'.
declare global {
  interface Window {
    aistudio?: {
      hasSelectedApiKey: () => Promise<boolean>;
      openSelectKey: () => Promise<void>;
    };
  }
}
