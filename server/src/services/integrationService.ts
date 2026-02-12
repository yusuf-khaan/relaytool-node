import { pathToFileURL, fileURLToPath } from "node:url";
import path from "path";
import {
  ProviderDefinition,
  ProviderMetadata,
} from "../interface/providerInterface.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class IntegrationService {
  private providers: Map<string, ProviderDefinition> = new Map();

  /** Load a provider lazily based on folder structure */
  private async loadProvider(
    providerName: string,
  ): Promise<ProviderDefinition> {
    if (this.providers.has(providerName)) {
      return this.providers.get(providerName)!;
    }

    const baseDir = path.resolve(
      __dirname,
      "../integrations",
      providerName,
      "providers",
    );
    const jsPath = path.join(baseDir, `${providerName}Provider.js`);
    const tsPath = path.join(baseDir, `${providerName}Provider.ts`);

    try {
      const providerUrl = pathToFileURL(jsPath).href;
      return await this.importProvider(providerName, providerUrl);
    } catch {
      try {
        const providerUrl = pathToFileURL(tsPath).href;
        return await this.importProvider(providerName, providerUrl);
      } catch {
        throw new Error(`Provider "${providerName}" not found`);
      }
    }
  }

  private async importProvider(providerName: string, fileUrl: string) {
    const module = await import(fileUrl);
    const provider: ProviderDefinition = module.default;
    this.providers.set(providerName, provider);
    return provider;
  }

  /** Execute provider action dynamically */
  async execute(providerName: string, action: string, params: any) {
    const provider = await this.loadProvider(providerName);
    const client = provider.getClient();
    if (typeof client[action] !== "function") {
      throw new Error(
        `Action "${action}" not supported by provider "${providerName}"`,
      );
    }
    return await client[action](params);
  }

  /** Get processing keys for an integration */
  async getIntegrationProcessingKeys(providerName: string) {
    let module;
    const clientBase = path.resolve(
      __dirname,
      "../integrations",
      providerName,
      "clients",
      `${providerName}Client`,
    );

    const jsPath = clientBase + ".js";
    const tsPath = clientBase + ".ts";

    // Try JS first (production, compiled code)
    try {
      module = await import(pathToFileURL(jsPath).href);
    } catch {
      // fallback to TS (local dev with ts-node)
      try {
        module = await import(pathToFileURL(tsPath).href);
      } catch {
        throw new Error(
          `Provider "${providerName}" does not implement getProcessingKeys()`,
        );
      }
    }

    const ClientClass = module.default;
    if (!ClientClass || typeof ClientClass.getProcessingKeys !== "function") {
      throw new Error(
        `Provider "${providerName}" does not implement getProcessingKeys()`,
      );
    }

    return ClientClass.getProcessingKeys();
  }

  /** Get metadata for one or more providers */
  async getProviderMetadata(providers: string | string[]) {
    const list = Array.isArray(providers) ? providers : [providers];
    const results = [];
    for (const name of list) {
      try {
        const provider = await this.loadProvider(name);
        const metadata =
          typeof provider.metadata === "function"
            ? await provider.metadata()
            : provider.metadata;

        results.push({ provider: name, providerDetails: metadata });
      } catch (err: any) {
        results.push({ provider: name, error: err.message });
      }
    }
    return results;
  }
}

export default IntegrationService;
