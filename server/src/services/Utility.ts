class Utility {


    constructor() {
    }

    getMappedValueFromSchema(response: any, key: string, schemaData: any) {
        if (!schemaData || !schemaData.processingSchema) {
            throw new Error("Invalid schemaData format");
        }
        const mapping = schemaData.processingSchema.find(
            (item: any) => item.mappedWith === key
        );
        if (!mapping) {
            console.warn(`Mapped key "${key}" not found in schema`);
            return null;
        }
        const inputKey = mapping.inputKey;
        const value = this.getNestedValue(response, inputKey);
        return value !== undefined ? value : null;
    }

    private getNestedValue(obj: any, path: string) {
        try {
            return path
                .replace(/\[(\w+)\]/g, ".$1")
                .split(".")
                .reduce(
                    (acc, part) =>
                        acc && acc[part] !== undefined ? acc[part] : undefined,
                    obj
                );
        } catch {
            return undefined;
        }
    }


    /*
        Payload builder from schema
    */

    /*
    1. schema mapping
    2. blueprint payload
    3. integration formatter
    4. send
    */
    getValueByPath(obj: any, path: string) {
        if (!obj || !path) return undefined;
        const parts = path.split(".");
        let value: any = obj;
        for (const part of parts) {
            if (value === undefined || value === null) return undefined;
            const arrayMatch = part.match(/(\w+)\[(\d+)\]/);
            if (arrayMatch) {
                const key = arrayMatch[1]!;
                const index = Number(arrayMatch[2]!);
                const target = value[key];
                if (!Array.isArray(target)) return undefined;
                value = target[index];
                continue;
            }
            value = value[part];
        }
        return value;
    }

    // ----------------------------
    // 2. Write nested values safely
    // ----------------------------
    setValueByPath(obj: any, path: string, value: any) {
        const parts = path.split('.');
        let current = obj;
        parts.forEach((part, index) => {
            const isLast = index === parts.length - 1;
            const arrayMatch = part.match(/(\w+)\[(\d+)\]/);
            if (arrayMatch) {
                const key = arrayMatch[1]!;
                const i = Number(arrayMatch[2]!);
                if (!current[key]) current[key] = [];
                if (!current[key][i]) current[key][i] = {};
                if (isLast) {
                    current[key][i] = value;
                } else {
                    current = current[key][i];
                }
                return;
            }
            if (isLast) {
                current[part] = value;
            } else {
                if (!current[part] || typeof current[part] !== "object") {
                    current[part] = {};
                }
                current = current[part];
            }
        });
    }




    // ----------------------------------------------
    // 3. Build payload using schema + optional base
    // ----------------------------------------------
    buildPayloadFromSchema(
        inputData: any,
        schemaData: any[],
        basePayload: any = {}
    ) {
        const output = JSON.parse(JSON.stringify(basePayload)); // deep clone
        for (const schemaItem of schemaData) {
            let value;
            if (schemaItem.customLogic !== undefined && schemaItem.customLogic !== null) {
                value = schemaItem.customLogic;
            }
            else if (schemaItem.inputKey) {
                value = this.getValueByPath(inputData, schemaItem.inputKey);
            }
            if (value !== undefined) {
                this.setValueByPath(output, schemaItem.mappedWith, value);
            }
        }
        return output;
    }

}

export default Utility;
