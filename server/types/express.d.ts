declare global {
  namespace Express {
    interface User {
      id: number;
      username: string;
      isAdmin: boolean;
    }

    interface Request {
      user?: User;
      isAuthenticated(): boolean;
      logIn(user: User, done: (err: any) => void): void;
      logout(done: (err: any) => void): void;
    }
  }
}

export {};
