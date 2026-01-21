declare global {
  namespace Express {
    interface User {
      id: number;
      username: string;
      password?: string;
      displayName: string | null;
      description: string | null;
      role: "admin" | "user";
      isActive: boolean;
      canCreateEvents: boolean;
      canEditEvents: boolean;
      canDeleteEvents: boolean;
      createdAt: Date;
    }
  }
}

declare module 'express-serve-static-core' {
  interface Request {
    user?: Express.User;
  }
}

export {};
