
export interface ProviderMetadata {
  name: string;
  description: string;
  authType?: string | null;
  actions: string[];
}

export interface ProviderDefinition {
  metadata: ProviderMetadata | (() => ProviderMetadata);
  getClient: () => any;
}

