export { Grid, GadgetBounder, XFormBounder };

import { GridBucketArray } from './gridArray.js';
import { Bounds } from './bounds.js';
import { Fmt } from './fmt.js';
import { Contains, Overlaps } from './intersect.js';
import { Util } from './util.js';
import { Gadget } from './gadget.js';

class GadgetBounder extends Gadget {
    boundsFor(gzo) {
        if (!gzo) return new Bounds();
        return new Bounds( gzo );
    }
    sortBy(a, b) {
        if (a.z === b.z) {
            return a.y-b.y;
        } else {
            return a.z-b.z;
        }
    }
}

class XFormBounder extends Gadget {
    boundsFor(gzo) {
        if (!gzo || !gzo.xform) return new Bounds();
        let min, max;
        if (gzo.xform.angle) {
            // min/max the four points of the bounds of the gzo, given that the angle
            let p1 = gzo.xform.getWorld({x:gzo.xform.minx, y:gzo.xform.miny}, false);
            let p2 = gzo.xform.getWorld({x:gzo.xform.maxx, y:gzo.xform.miny}, false);
            let p3 = gzo.xform.getWorld({x:gzo.xform.minx, y:gzo.xform.maxy}, false);
            let p4 = gzo.xform.getWorld({x:gzo.xform.maxx, y:gzo.xform.maxy}, false);
            min = Vect.min(p1, p2, p3, p4);
            max = Vect.max(p1, p2, p3, p4);
        } else {
            min = gzo.xform.getWorld({x:gzo.xform.minx, y:gzo.xform.miny}, false);
            max = gzo.xform.getWorld({x:gzo.xform.maxx, y:gzo.xform.maxy}, false);
        }
        return new Bounds({ x: min.x-o.xform.minx, y: min.y-o.xform.miny, width: max.x-min.x, height: max.y-min.y }); 
    }
    sortBy(a, b) {
        if (a.z === b.z) {
            return a.xform.y-b.xform.y;
        } else {
            return a.z-b.z;
        }
    }
}

/** ========================================================================
 * A grid-based object (gizmo) storage bucket which allows for quick lookups of game elements based on location.
 */

class Grid extends GridBucketArray {
    static dfltCols = 8;
    static dfltRows = 8;

    static {
        this.$schema('boundsFor', { readonly:true, dflt:() => ((v) = ((v && ('bounds' in v)) ? v.bounds : new Bounds(v))) }),
        this.$schema('dbg', { eventable:false, dflt:false });
        this.$schema('rowSize', { dflt:(o,x) => ('size' in x) ? x.size : 32 });
        this.$schema('colSize', { dflt:(o,x) => ('size' in x) ? x.size : 32 });
        this.$schema('$gzoIdxMap', { readonly:true, parser: () => new Map() });
        this.$schema('$oob', { readonly:true, parser: () => new Set() })
        this.$schema('minx', { dflt:0 });
        this.$schema('miny', { dflt:0 });
    }

    // STATIC METHODS ------------------------------------------------------
    static _ijFromPoint(px, py, dimx, dimy, sizex, sizey) {
        let i = Math.floor(px/sizex);
        if (i < 0 || i > dimx) i = -1;
        let j = Math.floor(py/sizey);
        if (j < 0 || j > dimy) j = -1;
        return {x:i, y:j};
    }
    static ijFromPoint(p, dim, size) {
        if (!p || !dim || !size) return { x:-1, y:-1 };
        return this._ijFromPoint(p.x, p.y, dim.x, dim.y, size.x, size.y);
    }

    static _pointFromIJ(i, j, dimx, dimy, sizex, sizey, center=false) {
        if (i<0 || i>=dimx || j<0 || j>=dimy) return {x:-1, y:-1}
        let x = (i * sizex) + ((center) ? sizex*.5 : 0);
        let y = (j * sizey) + ((center) ? sizey*.5 : 0);
        return {x:x, y:y};
    }
    static pointFromIJ(ij, dim, size, center=false) {
        if (!ij || !dim || !size) return { x:-1, y:-1 };
        return this._pointFromIJ(ij.x, ij.y, dim.x, dim.y, size.x, size.y, center);
    }

    static _pointFromIdx(idx, dimx, dimy, sizex, sizey, center=false) {
        if (idx<0 || idx>(dimx*dimy)) return { x:-1, y:-1 };
        let x = ((idx % dimx) * sizex) + ((center) ? sizex*.5 : 0);
        let y = (Math.floor(idx/dimx) * sizey) + ((center) ? sizey*.5 : 0);
        return {x:x, y:y};
    }
    static pointFromIdx(idx, dim, size, center=false) {
        if (!dim || !size) return { x:-1, y:-1 };
        return this._pointFromIdx(idx, dim.x, dim.y, size.x, size.y, center);
    }

    static _idxsFromBounds(bminx, bminy, bmaxx, bmaxy, dimx, dimy, sizex, sizey) {
        let minij = this._ijFromPoint(bminx, bminy, dimx, dimy, sizex, sizey);
        let maxij = this._ijFromPoint(Math.max(bminx, bmaxx-1), Math.max(bminy, bmaxy-1), dimx, dimy, sizex, sizey);
        let gidxs = [];
        for (let i=Math.max(0, minij.x); i<=Math.min(dimx-1, maxij.x); i++) {
            for (let j=Math.max(0, minij.y); j<=Math.min(dimy-1, maxij.y); j++) {
                let idx = this._idxFromIJ(i, j, dimx, dimy);
                gidxs.push(idx);
            }
        }
        return gidxs;
    }
    static idxsFromBounds(b, dim, size) {
        if (!b || !dim || !size) return [];
        return this._idxsFromBounds(b.minx, b.miny, b.maxx, b.maxy, dim.x, dim.y, size.x, size.y);
    }

    static _idxFromPoint(px, py, dimx, dimy, sizex, sizey) {
        let ij = this._ijFromPoint(px, py, dimx, dimy, sizex, sizey);
        return this._idxFromIJ(ij.x, ij.y, dimx, dimy);
    }
    static idxFromPoint(p, dim, size) {
        if (!p || !dim || !size) return -1;
        return this._idxFromPoint(p.x, p.y, dim.x, dim.y, size.x, size.y);
    }

    // METHODS -------------------------------------------------------------
    _ijFromPoint(px, py) {
        return this.constructor._ijFromPoint(px-this.minx, py-this.miny, this.cols, this.rows, this.colSize, this.rowSize);
    }
    ijFromPoint(p) {
        if (!p) return {x:-1,y:-1};
        return this.constructor._ijFromPoint(p.x-this.minx, p.y-this.miny, this.cols, this.rows, this.colSize, this.rowSize);
    }

    _idxFromPoint(px, py) {
        return this.constructor._idxFromPoint(px-this.minx, py-this.miny, this.cols, this.rows, this.colSize, this.rowSize);
    }
    idxFromPoint(p) {
        if (!p) return -1;
        return this.constructor._idxFromPoint(p.x-this.minx, p.y-this.miny, this.cols, this.rows, this.colSize, this.rowSize);
    }

    pointFromIdx(idx, center=false) {
        let p = this.constructor._pointFromIdx(idx, this.cols, this.rows, this.colSize, this.rowSize, center);
        p.x += this.minx;
        p.y += this.miny;
        return p;
    }

    _pointFromIJ(i, j, center=false) {
        let p = this.constructor._pointFromIJ(i, j, this.cols, this.rows, this.colSize, this.rowSize, center);
        p.x += this.minx;
        p.y += this.miny;
        return p;
    }
    pointFromIJ(ij, center=false) {
        if (!ij) return {x:-1, y:-1};
        let p = this.constructor._pointFromIJ(ij.x, ij.y, this.cols, this.rows, this.colSize, this.rowSize, center);
        p.x += this.minx;
        p.y += this.miny;
        return p;
    }

    idxof(gzo) {
        let gidx = this.$gzoIdxMap.get(gzo.gid) || [];
        return gidx.slice();
    }

    includes(gzo) {
        return this.$gzoIdxMap.has(gzo.gid);
    }

    idxsFromGzo(gzo) {
        let b = this.boundsFor(gzo);
        return this.constructor._idxsFromBounds(b.minx-this.minx, b.miny-this.miny, b.maxx-this.minx, b.maxy-this.miny, this.cols, this.rows, this.colSize, this.rowSize);
    }

    *_findForPoint(px, py, filter=(v) => true) {
        let gidx = this.constructor._idxFromPoint(px-this.minx, py-this.miny, this.cols, this.rows, this.colSize, this.rowSize);
        let found = new Set();
        for (const gzo of this.findForIdx(gidx, filter)) {
            let ob = this.boundsFor(gzo);
            if (!found.has(gzo) && Contains._bounds(ob.minx, ob.miny, ob.maxx, ob.maxy, px, py)) {
                found.add(gzo);
                yield gzo;
            }
        }
    }
    *findForPoint(p, filter=(v) => true) {
        if (!p) return;
        yield *this._findForPoint(p.x, p.y, filter);
    }

    _firstForPoint(px, py, filter=(v) => true) {
        let gidx = this.constructor._idxFromPoint(px-this.minx, py-this.miny, this.cols, this.rows, this.colSize, this.rowSize);
        for (const gzo of this.findForIdx(gidx, filter)) {
            let ob = this.boundsFor(gzo);
            if (Contains._bounds(ob.minx, ob.miny, ob.maxx, ob.maxy, px, py)) return gzo;
        }
        return null;
    }
    firstForPoint(p, filter=(v) => true) {
        if (!p) return null;
        return this._firstForPoint(p.x, p.y, filter);
    }

    *_findForBounds(bminx, bminy, bmaxx, bmaxy, filter=(v) => true) {
        let gidxs = this.constructor._idxsFromBounds(bminx-this.minx, bminy-this.miny, bmaxx-this.minx, bmaxy-this.miny, this.cols, this.rows, this.colSize, this.rowSize);
        let found = new Set();
        for (const gzo of this.findForIdx(gidxs, filter)) {
            let ob = this.boundsFor(gzo);
            if (!found.has(gzo) && Overlaps._bounds(ob.minx, ob.miny, ob.maxx, ob.maxy, bminx, bminy, bmaxx, bmaxy)) {
                found.add(gzo);
                yield gzo;
            }
        }
    }
    *findForBounds(bounds, filter=(v) => true) {
        if (!bounds) return;
        yield *this._findForBounds(bounds.minx, bounds.miny, bounds.maxx, bounds.maxy, filter);
    }

    _firstForBounds(bminx, bminy, bmaxx, bmaxy, filter=(v) => true) {
        let gidxs = this.constructor._idxsFromBounds(bminx-this.minx, bminy-this.miny, bmaxx-this.minx, bmaxy-this.miny, this.cols, this.rows, this.colSize, this.rowSize);
        for (const gzo of this.findForIdx(gidxs, filter)) {
            let ob = this.boundsFor(gzo);
            if (Overlaps._bounds(ob.minx, ob.miny, ob.maxx, ob.maxy, bminx, bminy, bmaxx, bmaxy)) return gzo;
        }
        return null;
    }
    firstForBounds(bounds, filter=(v) => true) {
        if (!bounds) return null;
        return this._firstForBounds(bounds.minx, bounds.miny, bounds.maxx, bounds.maxy, filter);
    }

    add(gzo) {
        console.log(`add ${gzo} min: ${this.minx},${this.miny}`);
        let gidx = this.idxsFromGzo(gzo);
        if (!gidx.length) {
            console.log(`oob add: ${gzo}`);
            this.$oob.add(gzo);
        } else {
            // assign object to grid
            for (const idx of gidx) this.setidx(idx, gzo);
        }
        // assign gizmo gidx
        this.$gzoIdxMap.set(gzo.gid, gidx);
        if (this.dbg) console.log(`grid add ${gzo} w/ idx: ${gidx}`);
    }

    remove(gzo) {
        if (!gzo) return;
        let gidx = this.$gzoIdxMap.get(gzo.gid) || [];
        this.$gzoIdxMap.delete(gzo.gid);
        // remove object from grid
        for (const idx of gidx) this.delidx(idx, gzo);
    }

    recheck(gzo) {
        if (!gzo) return;
        let ogidx = this.$gzoIdxMap.get(gzo.gid) || [];
        let gidx = this.idxsFromGzo(gzo) || [];
        let modified = false;
        console.log(`ogidx: ${ogidx}`)
        console.log(`gidx: ${gidx}`)
        console.log(`gzo min: ${gzo.x},${gzo.y} grid min: ${this.minx},${this.miny}`)
        if (!Util.arraysEqual(ogidx, gidx)) {
            if (this.dbg) console.log(`----- Grid.recheck: ${gzo} old ${ogidx} new ${gidx}`);
            // remove old
            for (const idx of ogidx) this.delidx(idx, gzo);
            // add new
            for (const idx of gidx) this.setidx(idx, gzo);
            console.log(`set new`);
            // assign new gidx
            this.$gzoIdxMap.set(gzo.gid, gidx);
            modified = true;
        } else {
            // resort
            for (const idx of gidx) {
                if (this.sortBy) this.entries[idx].sort(this.sortBy);
            }
        }
        if (gidx.length && this.$oob.has(gzo)) {
            console.log(`oob delete ${gzo}`)
            this.$oob.delete(gzo);
        }
        return modified;
    }

    resize(bounds, cols, rows) {
        let gzos = Array.from(this);
        // handle grid array resize
        if (this.cols != cols || this.rows != rows) super.resize(cols, rows);
        // handle spatial resize
        this.minx = bounds.minx;
        this.miny = bounds.miny;
        this.colSize = bounds.width/cols;
        this.rowSize = bounds.height/rows;
        // recheck position of all assigned objects
        for (const gzo of gzos) this.recheck(gzo);
        // recheck position of all out-of-bounds objects
        for (const gzo of Array.from(this.$oob)) {
            console.log(`recheck oob: ${gzo}`);
            this.recheck(gzo);
        }
    }

    render(ctx, x=0, y=0, color='rgba(0,255,255,.5)', occupiedColor='red') {
        ctx.translate(x+this.minx,y+this.miny);
        for (let i=0; i<this.cols; i++) {
            for (let j=0; j<this.rows; j++) {
                let idx = this._idxFromIJ(i, j);
                let entries = this.entries[idx] || [];
                ctx.strokeStyle = (entries.length) ? occupiedColor : color;
                //ctx.setLineDash([5,5]);
                ctx.lineWidth = 1;
                ctx.strokeRect(i*this.colSize, j*this.rowSize, this.colSize, this.rowSize);
                //ctx.setLineDash([]);
            }
        }
        ctx.translate(-x-this.minx,-y-this.miny);
    }

    toString() {
        return Fmt.toString(this.constructor.name, this.cols, this.rows);
    }

}
