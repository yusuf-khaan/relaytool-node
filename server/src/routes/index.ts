import express, { Router } from "express";
import integrationController from "../controllers/integrationController.js";

const router: Router = express.Router();

// integration routes
router.all("/integration/action/:provider/:action", integrationController.execute.bind(integrationController));
router.all("/integration/get-processing-keys/:provider", integrationController.getProcessingKeys.bind(integrationController));
router.post("/integration/get-provider-metadata", integrationController.getProviderMetadata.bind(integrationController));

export default router;
