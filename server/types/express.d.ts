import { User } from "@db/schema";

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
```

7. Scroll down and click **"Commit changes"**
8. Add commit message: "Add Passport type definitions"
9. Click **"Commit changes"** again

### Visual Guide:
```
Step in filename box:
server/types/express.d.ts
       ↑     ↑
    folder  file
