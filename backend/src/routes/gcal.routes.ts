import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware";
import {
  initiateConnect,
  handleCallback,
  getStatus,
  getEvents,
  disconnect,
} from "../controllers/gcal.controller";

const router = Router();

// Initiate Google Calendar OAuth (requires logged-in doctor)
// GET /api/v1/gcal/connect?return_to=<doctor-portal-url>
router.get("/connect", authenticate, initiateConnect);

// Google redirects back here after consent
// GET /api/v1/gcal/callback?code=...&state=...
router.get("/callback", authenticate, handleCallback);

// Connection status for the logged-in doctor
// GET /api/v1/gcal/status
router.get("/status", authenticate, getStatus);

// Busy events for a date
// GET /api/v1/gcal/events?date=YYYY-MM-DD
router.get("/events", authenticate, getEvents);

// Remove stored tokens
// DELETE /api/v1/gcal/disconnect
router.delete("/disconnect", authenticate, disconnect);

export default router;
