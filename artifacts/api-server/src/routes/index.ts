import { Router, type IRouter } from "express";
import healthRouter from "./health";
import adminRouter from "./admin";
import storageRouter from "./storage";
import websiteRouter from "./website";

const router: IRouter = Router();

router.use(healthRouter);
router.use(websiteRouter);
router.use(adminRouter);
router.use(storageRouter);

export default router;
