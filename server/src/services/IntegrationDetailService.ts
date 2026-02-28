import db from "../config/db.js";

class IntegrationDetailService {

    constructor() {

    }

    async getIntegrationCredential(integrationDetail: any) { // get creddential of that specifi
        let userId = integrationDetail?.userId;
        const integrationSlug = integrationDetail?.slug;
        console.log(integrationSlug);
        let credential = null;
        if (integrationSlug && userId && (typeof userId == "number")) {
            credential = await db("user_integrations_credentials")
                .where({
                    slug: integrationSlug,
                    user_id: userId
                })
                .first();
        }
        console.log("1233 ", credential);
        if (!credential && (typeof userId != "number")) {
            const user = await db("users")
                .where({ relaytoken: userId })
                .select("id")
                .first();
            console.log("28888 ", user);

            if (user?.id) {
                userId = user.id; // optional if you need to reuse userId
                credential = await db("user_integrations_credentials")
                    .where({ slug: integrationSlug, user_id: userId })
                    .first();
            }
        }
        console.log("these are cred", credential);
        return credential;
    }


    // this is only used for when doing oauth flow to store extra details
    async storeIntegrationCredential(data: any) {
        console.log("Storing integration credential:", data);
        const userId = data?.userId;
        const slug = data?.slug;
        const credential = data?.credential;
        let integrationCredentialStructuredPayload = await this.createSpecificJsonCredentialPayloadForIntegration(credential, slug);
        const existing = await db("user_integrations_credentials")
            .where({ user_id: userId, slug: slug })
            .first();
        let result;
        console.log("apyload, ", integrationCredentialStructuredPayload);
        if (existing) {
            result = await db("user_integrations_credentials")
                .where({ user_id: userId, slug: slug })
                .update({ auth_detail: integrationCredentialStructuredPayload }) // update ke andar integrationCredentialStructuredPayload store krao
                .returning("*");
        } else {
            result = await db("user_integrations_credentials")
                .insert({ user_id: userId, slug: slug, auth_detail: integrationCredentialStructuredPayload })
                .returning("*");
        }
        console.log("result", result);
        return result;
    }

    async createSpecificJsonCredentialPayloadForIntegration(data: any, slug: any) {
        let payload = null;
        if (slug === "gmail" || slug === "sheets" || slug === "sheet" || slug === "drive") {
            return data;
        } else if (slug === "facebook") {
            payload = {
                access_token: data?.access_token,
                expires_in: data?.expires_in,
            };
        }
        return payload;
    }

    async getExecutionNodeData(requestContext: any, workflowNodeId: any, wantInput = true) { // wantInput=false means output_data
        const workflowExecutionId = requestContext?.__requestContext?.workflowExecutionId;
        const workflowId = requestContext?.__requestContext?.workflowId;
        if (!workflowExecutionId) {
            // return [];
            throw new Error("workflowExecutionId is required to fetch node execution data");
        }
        if (workflowNodeId === undefined || workflowNodeId === null) {
            // return [];
            throw new Error("workflowNodeId is required");
        }

        const workflowNode = await db("workflow_nodes").where({ node_id: workflowNodeId, workflow_id: workflowId }).first(); // to check if node exist in that workflow or not
        if (!workflowNode) {
            // return [];
            throw new Error("Node not found in the specified workflow");
        }

        const row = await db("workflow_node_execution")
            .where({ workflow_execution_id: workflowExecutionId, workflow_node_id: workflowNode?.id })
            .select(wantInput ? "input_data" : "output_data")
            .first();

        if (!row) return null;
        return wantInput ? row.input_data ?? null : row.output_data ?? null;
    }
}

export default IntegrationDetailService;
