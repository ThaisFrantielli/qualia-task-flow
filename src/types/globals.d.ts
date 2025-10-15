// Types declaration to fix import issues
declare module './types.d.ts' {
  // This file resolves type import conflicts
}

// Extend global types if needed
declare global {
  namespace NodeJS {
    interface ProcessEnv {
      NODE_ENV: 'development' | 'production' | 'test';
    }
  }
}

export {};