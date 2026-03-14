import type { Request, Response } from "express";
import handler from "../server/index";

export default function (req: Request, res: Response) {
    return handler(req, res);
}
