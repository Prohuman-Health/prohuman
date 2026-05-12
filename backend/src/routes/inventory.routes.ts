import { Router } from "express";
import * as c from "../controllers/inventory.controller";
import { authenticate, authorize } from "../middleware/auth.middleware";

const router = Router();
router.use(authenticate);

// Low-stock summary (before /:id routes to avoid conflict)
router.get("/low-stock", authorize("admin", "receptionist", "doctor"), c.getLowStockItems);

// Item CRUD
router.get(   "/items",       authorize("admin", "receptionist", "doctor"), c.listItems);
router.post(  "/items",       authorize("admin"),                            c.createItem);
router.get(   "/items/:id",   authorize("admin", "receptionist", "doctor"), c.getItem);
router.patch( "/items/:id",   authorize("admin"),                            c.updateItem);
router.delete("/items/:id",   authorize("admin"),                            c.deactivateItem);

// Transactions
router.get( "/items/:id/transactions", authorize("admin", "receptionist"), c.listTransactions);
router.post("/items/:id/transactions", authorize("admin", "receptionist"), c.recordTransaction);

export default router;
