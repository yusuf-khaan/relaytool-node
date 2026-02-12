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
        console.log("these are cred",credential);
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
        if (slug === "gmail") {
            return data;
        } else {
        }
        return payload;
    }

}

export default IntegrationDetailService;