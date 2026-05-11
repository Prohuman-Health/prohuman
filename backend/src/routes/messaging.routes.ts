import { Router } from "express";
import * as c from "../controllers/messaging.controller";
import { authenticate, authorize } from "../middleware/auth.middleware";

const router = Router();
router.use(authenticate);

// Channels
router.get(  "/channels",                authorize("admin", "receptionist", "doctor"), c.listChannels);
router.post( "/channels",                authorize("admin"),                            c.createChannel);

// DM
router.post( "/dm",                      authorize("admin", "receptionist", "doctor"), c.createOrGetDM);

// Messages within a channel
router.get(  "/channels/:id/messages",   authorize("admin", "receptionist", "doctor"), c.getMessages);
router.post( "/channels/:id/messages",   authorize("admin", "receptionist", "doctor"), c.sendMessage);
router.patch("/channels/:id/read",       authorize("admin", "receptionist", "doctor"), c.markRead);

// Channel members
router.get(  "/channels/:id/members",    authorize("admin", "receptionist", "doctor"), c.getChannelMembers);
router.post( "/channels/:id/members",    authorize("admin"),                            c.addChannelMember);

export default router;
