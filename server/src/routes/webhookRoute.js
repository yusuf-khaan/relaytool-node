import express from 'express';
import { relayWebhook } from '../controllers/webhookController';

const router = express.Router();

router.post('/relay-webhook', relayWebhook);

export default router;