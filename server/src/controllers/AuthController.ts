import AuthService from "../services/AuthService.js";

class AuthController {
    private authService = new AuthService();

    constructor() {

    }

    async callbacks(req:any, res:any) {
        let weburl= process.env.WEB_URL || "https://relayhook.in";
        try {
            await this.authService.oauthLoginsCallback(req.query);
            return res.redirect(weburl+"/hooks/project");
        } catch (err) {
            console.error(err);
            return res.redirect(weburl+"/hooks/project");
        }
    }

    async hookConsentScreens(req: any, res: any) {
        const query = req.query;
        const integration = query?.integration;
        const userId = query?.userId ?? 1;
        const authType = query?.auth_type;
        const encodedState = await this.authService.encodeDecode(
            { integrationSlug: integration, userId: userId },
            true
        );
        if (integration === "gmail") {
            return this.authService.gmailConsent(res, encodedState);
        }
        else if( integration === "sheet"){

        } else if( integration === "facebook") {
            return this.authService.facebookConsent(res, encodedState);
        }

        throw new Error("Integration not supported");
    }

}
export default new AuthController();
