import { Response } from "express";

export class ApiResponse<T = unknown> {
  readonly success: boolean;
  readonly message: string;
  readonly data: T | null;

  constructor(success: boolean, message: string, data: T | null = null) {
    this.success = success;
    this.message = message;
    this.data = data;
  }

  send(res: Response, statusCode = 200) {
    return res.status(statusCode).json(this);
  }

  static ok<T>(res: Response, data: T, message = "Success") {
    return new ApiResponse(true, message, data).send(res, 200);
  }
  static created<T>(res: Response, data: T, message = "Created") {
    return new ApiResponse(true, message, data).send(res, 201);
  }
  static noContent(res: Response) {
    return res.status(204).send();
  }
}
