import express from 'express';
import { Router } from 'express';
import * as orderController from '../controllers/orderController.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();
router.post('/webhook', express.raw({ type: 'application/json', limit: '100kb' }), asyncHandler(orderController.receiveRazorpayWebhook));

export default router;
