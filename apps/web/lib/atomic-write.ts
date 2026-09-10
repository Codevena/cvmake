/**
 * Re-export. The implementation lives in `@codevena/cvmake-core` because
 * `processPhoto` writes to `public/photos/` from there and must use the same
 * one — two copies of a durability helper drift, and the copy that drifts is
 * the one nobody is looking at.
 */
export { atomicWriteFile } from '@codevena/cvmake-core/atomic-write';
