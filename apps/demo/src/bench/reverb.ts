/**
 * The reverberation analysis moved to the shared engine on 18 Nov 2026 (packages/commissioning-engine/src/acoustics.ts) so that the
 * server recomputes a measured value from its evidence with the same code the bench used to work it out (ADR-0016). This file keeps
 * the old import path for the instrument-bench pages, the exports and their tests.
 */
export * from '@empathia/commissioning-engine/acoustics';
