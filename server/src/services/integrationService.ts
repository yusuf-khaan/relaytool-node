import type { ProviderDefinition } from '../interface/providerInterface.js';
import { ProviderName, ProviderRepository } from './ProviderRepository.js';

class IntegrationService {
  private providers: Map<ProviderName, ProviderDefinition> = new Map();

  private getProvider(name: ProviderName) {
    if (!this.providers.has(name)) {
      this.providers.set(name, ProviderRepository[name]);
    }
    return this.providers.get(name)!;
  }

  async execute(name: string, action: string, params: any) {
    const provider = this.getProvider(name as ProviderName);
    const client = provider.getClient();
    if (typeof client[action] !== 'function') {
      throw new Error(`Action "${action}" not supported by provider "${name}"`);
    }
    const enrichedParams = this.attachExecutionContext(params);
    return await client[action](enrichedParams);
  }

  async getProviderMetadata(names: ProviderName | ProviderName[]) {
    const list = Array.isArray(names) ? names : [names];
    return list.map(name => {
      const provider = this.getProvider(name);
      const metadata = typeof provider.metadata === 'function' ? provider.metadata() : provider.metadata;
      return { provider: name, providerDetails: metadata };
    });
  }

  private attachExecutionContext(params: any) {
    const safeParams = params ?? {};
    const safeData = safeParams?.data && typeof safeParams.data === "object"
      ? safeParams.data
      : {};

    return {
      ...safeParams,
      data: {
        ...safeData,
        __requestContext: safeParams,
      },
    };
  }
}

export default IntegrationService;
