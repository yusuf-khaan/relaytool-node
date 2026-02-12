
import { PDFParse } from "pdf-parse";
import AbstractPdfParserClient from "./abstractPdfParserClient.js";
import Utility from "../../../services/Utility.js";

export default class PdfParserClient extends AbstractPdfParserClient {
    private utilityService = new Utility();
    constructor() {
        super();
    }

    static getProcessingKeys() {
        return [];
    }

    buildPayloadFromPdfLink() {
        return {
            url: null
        }
    }

    buildPayloadFromPdfRaw() {
        return {
            data: null
        }
    }

    public async parsePdfFromBuffer(request: any): Promise<any> {
        let parser: any;

        try {
            const schema = request?.schemaData ?? [];
            const pdfBuffer = request?.data?.pdfBuffer;

            const payload = this.utilityService.buildPayloadFromSchema(
                request?.data,
                schema,
                this.buildPayloadFromPdfRaw()
            );

            const buffer = Buffer.isBuffer(pdfBuffer)
                ? pdfBuffer
                : Buffer.from(pdfBuffer, "base64");

            parser = new PDFParse(payload);

            const result = await parser.getText();

            return {
                text: result.text,
                success: true,
            };
        } finally {
            if (parser) {
                await parser.destroy();
            }
        }
    }

    public async parsePdfFromUrl(request: any): Promise<any> {
        let parser: any;

        try {
            const schema = request?.schemaData ?? [];

            const payload = this.utilityService.buildPayloadFromSchema(
                request?.data,
                schema,
                this.buildPayloadFromPdfLink()
            );
            console.log("payload si 72 ", payload)
            console.log("payload si 73 ", schema)
            console.log("payload si 73 ", request?.data)

            parser = new PDFParse(payload);

            const result = await parser.getText();

            return {
                text: result.text,
                success: true,
            };
        } finally {
            if (parser) {
                await parser.destroy();
            }
        }
    }



    pairingFunctionNameAndPayload() {
        return [
            {
                action: "parsePdfFromBuffer",
                description: "Extract text from a PDF file",
                defaultPayload: this.buildPayloadFromPdfRaw()
            },
            {
                action: "parsePdfFromUrl",
                description: "Extract text from a PDF Url",
                defaultPayload: this.buildPayloadFromPdfLink()
            },
        ];
    }
}
