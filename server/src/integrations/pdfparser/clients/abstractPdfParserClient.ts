
export default abstract class AbstractPdfParserClient {
    constructor() {
        if (new.target === AbstractPdfParserClient) {
            throw new Error("Cannot instantiate AbstractPdfParserClient directly");
        }
    }

    abstract parsePdfFromBuffer(params: any): Promise<any>;
    abstract parsePdfFromUrl(params: any): Promise<any>;

    // Capability descriptor
    abstract pairingFunctionNameAndPayload(): any;
}
