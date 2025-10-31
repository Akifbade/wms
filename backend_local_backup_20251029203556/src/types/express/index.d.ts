// backend/src/types/express/index.d.ts
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        companyId: string;
        role: string;
      };
    }
  }
}

// This empty export is needed to treat this file as a module.
export {};
