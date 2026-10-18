import { Router, type IRouter } from "express";
import healthRouter from "./health";
import flowRouter from "./flow";

const router: IRouter = Router();

router.use(healthRouter);
router.use(flowRouter);

export default router;
