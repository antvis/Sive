interface Navigator {
  readonly userAgentData?: {
    readonly platform: string;

    getHighEntropyValues?(hints: string[]): Promise<{ architecture?: string; bitness?: string }>;
  };
}
