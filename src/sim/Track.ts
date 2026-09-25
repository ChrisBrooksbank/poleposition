// Track - pure track definition and sampling (no rendering imports).
// Distances are metres along the centreline; curvature is 1/radius (signed, +right);
// slope is rise over run (signed, +uphill). Widths are metres.

export interface TrackSegment {
  name: string;
  /** Segment length in metres. */
  length: number;
  /** Signed curvature in 1/m. Positive turns right. */
  curvature: number;
  /** Signed gradient. Positive climbs. */
  slope: number;
}

export interface TrackDef {
  name: string;
  /** Road width in metres. */
  roadWidth: number;
  segments: readonly TrackSegment[];
}

export interface CenterlinePoint {
  /** Distance along the lap in metres. */
  s: number;
  x: number;
  y: number;
  z: number;
  /** Heading in radians; 0 points along +z, positive turns right (towards -x, as seen looking down +z). */
  heading: number;
}

export class Track {
  readonly length: number;
  private readonly starts: number[] = [];

  constructor(readonly def: TrackDef) {
    if (def.segments.length === 0) throw new Error('Track needs at least one segment');
    let acc = 0;
    for (const seg of def.segments) {
      if (seg.length <= 0) throw new Error(`Segment ${seg.name} must have positive length`);
      this.starts.push(acc);
      acc += seg.length;
    }
    this.length = acc;
  }

  /** Wraps any distance into [0, length). */
  wrap(s: number): number {
    return ((s % this.length) + this.length) % this.length;
  }

  segmentIndexAt(s: number): number {
    const pos = this.wrap(s);
    for (let i = this.starts.length - 1; i >= 0; i--) {
      if (pos >= this.starts[i]) return i;
    }
    return 0;
  }

  curvatureAt(s: number): number {
    return this.def.segments[this.segmentIndexAt(s)].curvature;
  }

  slopeAt(s: number): number {
    return this.def.segments[this.segmentIndexAt(s)].slope;
  }

  /**
   * Integrates the centreline from s=0 at the origin, heading +z.
   * @param step Sample spacing in metres.
   */
  buildCenterline(step = 2): CenterlinePoint[] {
    const points: CenterlinePoint[] = [];
    let x = 0;
    let y = 0;
    let z = 0;
    let heading = 0;
    const count = Math.ceil(this.length / step);
    for (let i = 0; i <= count; i++) {
      const s = Math.min(i * step, this.length);
      points.push({ s, x, y, z, heading });
      const ds = Math.min(step, this.length - s);
      if (ds <= 0) break;
      const mid = s + ds / 2;
      heading += this.curvatureAt(mid) * ds;
      x -= Math.sin(heading) * ds;
      z += Math.cos(heading) * ds;
      y += this.slopeAt(mid) * ds;
    }
    return points;
  }
}
