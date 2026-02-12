import express, { Router } from "express";
import AuthController from "../controllers/AuthController.js";


const authRouter: Router = express.Router();


authRouter.get("/callback", AuthController.callbacks.bind(AuthController));
authRouter.get("/hook/consent", AuthController.hookConsentScreens.bind(AuthController));


export default authRouter;