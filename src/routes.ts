import { Router } from "express";
import { DeveloperController } from "./controllers/DeveloperController";


const router = Router();

const createUserController = new DeveloperController();


router.post("/developers", createUserController.worklogSearch);


export { router };
