import PdfParserClient from "../clients/pdfparserClient.js";
import { ProviderMetadata, ProviderDefinition } from "../../../interface/providerInterface.js";

class PdfParserProvider {
    private static _instance: PdfParserClient | null = null;
    private static _actionsCache: any[] | null = null;

    private constructor() { }

    /** Lazy singleton client */
    static getClient(): PdfParserClient {
        if (!this._instance) this._instance = new PdfParserClient();
        return this._instance;
    }

    static getActions(): any {
        if (!this._actionsCache) {
            const client = this.getClient();
            this._actionsCache = client.pairingFunctionNameAndPayload();
        }
        return this._actionsCache;
    }

    static metadata(): ProviderMetadata {
        return {
            name: "pdfparser",
            description: "Extract text from PDF files",
            authType: "none",
            actions: this.getActions(),
        };
    }
}

// Adaptation to match the dynamic loader's expectations
// The dynamic loader expects an object with getClient and metadata properties (or a class with static methods that matches?)
// Looking at openaiProvider.ts, it exports a Class with static methods.
// Let's double check IntegrationService.ts
// IntegrationService:
//   const module = await import(fileUrl);
//   const provider: ProviderDefinition = module.default;
//   client = provider.getClient()
//   metadata = provider.metadata
// So exporting the Class with static methods works IF the class itself treats those as properties on the class object.
// Yes, static methods are properties on the constructor function.

export default PdfParserProvider;
