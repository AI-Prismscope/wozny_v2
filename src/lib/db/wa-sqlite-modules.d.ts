// Ambient module declarations for wa-sqlite dist and example paths.
// These live in a .d.ts file (no import/export) so TypeScript treats them
// as global ambient declarations rather than module augmentations.

declare module 'wa-sqlite/dist/wa-sqlite.mjs' {
  /**
   * Emscripten factory function for the synchronous (non-Asyncify) SQLite
   * WASM build. Call it once per worker to get the low-level module, then
   * pass the result to wa-sqlite's Factory() to get the SQLiteAPI wrapper.
   *
   * Pass locateFile to override where the runtime fetch looks for the
   * .wasm binary — point it at the Next.js public/ directory.
   */
  const factory: (opts?: {
    locateFile?: (filename: string) => string;
  }) => Promise<unknown>;
  export default factory;
}

declare module 'wa-sqlite/src/examples/AccessHandlePoolVFS.js' {
  /**
   * Synchronous OPFS VFS that uses FileSystemSyncAccessHandle.
   *
   * - Must be instantiated inside a dedicated Web Worker.
   * - Compatible with the non-Asyncify wa-sqlite.mjs build.
   * - No SharedArrayBuffer required.
   * - Stores all SQLite files in a pool of pre-allocated OPFS files inside
   *   the directory path supplied to the constructor.
   */
  export class AccessHandlePoolVFS {
    /**
     * Resolves when the VFS has opened all OPFS access handles and is
     * ready to be registered with SQLite.
     */
    isReady: Promise<void>;

    /**
     * @param directoryPath  OPFS directory where pool files are stored.
     *                       e.g. '/wozny-db'
     */
    constructor(directoryPath: string);

    /** Number of SQLite files currently stored in the pool. */
    getSize(): number;

    /** Maximum number of SQLite files the pool can hold. */
    getCapacity(): number;

    /**
     * Increase pool capacity by n additional files.
     * Must be called before the pool is full if more files are needed.
     */
    addCapacity(n: number): Promise<number>;

    /**
     * Release all OPFS access handles.
     * Call before page unload if you need a clean shutdown.
     */
    close(): Promise<void>;
  }
}
