export { HexGrid };

import { Fmt } from './fmt.js';
import { HexBucketArray } from './hexArray.js';
import { Contains, Overlaps } from './intersect.js';
import { Mathf } from './math.js';
import { Util } from './util.js';

class HexGrid extends HexBucketArray {

    // SCHEMA --------------------------------------------------------------
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
        let qtry = sizey*.25;
        let halfx = sizex*.5;
        // if point is within mid section of hex, use i/j derived from column/row sizes
        let j = Math.floor(py/sizey);
        let offx = (j%2) ? halfx : 0;
        let i = Math.floor((px-offx)/sizex);
        let xm = (px-offx) % sizex;
        let ym = py % sizey;
        // if point lies within top section/bounds of hex... it could belong to one of three hex regions
        // check left half
        if (ym < qtry) {
            if (xm < halfx) {
                // check if it belongs to hex to northwest
                if ((halfx-xm) > 2*ym) {
                    if (!offx) i -= 1;
                    j -= 1;
                }
            // check right half
            } else {
                // check if it belongs to hex to northeast
                if (xm-halfx > (2*ym)) {
                    if (offx) i += 1;
                    j -= 1;
                }
            }
        }
        if (i < 0 || i>=dimx) i = -1;
        if (j < 0 || j>=dimy) j = -1;
        return {x:i, y:j};
    }
    static ijFromPoint(p, dim, size) {
        if (!p || !dim || !size) return {x:-1, y:-1};
        return this._ijFromPoint(p.x, p.y, dim.x, dim.y, size.x, size.y);
    }

    static _pointFromIJ(i, j, dimx, dimy, sizex, sizey, center=false) {
        let halfx = sizex*.5;
        let x = sizex*i + ((center) ? halfx : 0) + ((j%2) ? halfx : 0);
        let y = sizey*j + ((center) ? (sizey*2/3) : 0);
        return {x:x, y:y};
    }
    static pointFromIJ(ij, dim, size, center=false) {
        if (!ij || !dim || !size) return null;
        return this._pointFromIJ(ij.x, ij.y, dim.x, dim.y, size.x, size.y, center);
    }

    static _pointFromIdx(idx, dimx, dimy, sizex, sizey, center=false) {
        let ij = this._ijFromIdx(idx, dimx, dimy);
        return this._pointFromIJ(ij.x, ij.y, dimx, dimy, sizex, sizey, center);
    }
    static pointFromIdx(idx, dim, size) {
        if (!ij || !dim || !size) return null;
        return this._PointFromIdx(idx, dim.x, dim.y, sizex, sizey, minx, miny)
    }

    static _idxsFromBounds(bminx, bminy, bmaxx, bmaxy, dimx, dimy, sizex, sizey) {
        let qtry = sizey/3;
        let halfx = sizex*.5;
        let qmini = Math.floor(bminx/halfx);
        let qminj = Math.floor(bminy/qtry);
        let mminx = bminx%halfx;
        let mminy = bminy%qtry;
        let qmaxi = Math.floor((bmaxx-1)/halfx);
        let qmaxj = Math.floor((bmaxy-1)/qtry);
        let mmaxx = (bmaxx-1)%halfx;
        let mmaxy = (bmaxy-1)%qtry;
        let idxs = [];
        let j = Math.floor((bminy)/sizey);
        for ( let qj=qminj; qj<=qmaxj; qj++) {
            let mqj = (qj%3);
            let ioff = (qj%6) > 2;
            let i = (ioff) ? (qmini-1) >> 1 : qmini >> 1;
            let idx;
            for (let qi=qmini; qi<=qmaxi; qi++) {
                let mqi = (!ioff) ? (qi%2) : ((qi+1)%2);
                idx = this._idxFromIJ(i,j,dimx,dimy);
                // hex top left
                if (mqi === 0 && mqj === 0) {
                    // along the top most row
                    if (qj === qminj) {
                        if ((halfx-mminx) > 2*mminy) {
                            idx = this._idxFromIJ((ioff) ? i : i-1, j-1, dimx, dimy);
                            if (idx !== -1) idxs.push(idx);
                        }
                    } else if (qj === qmaxj && qi === qmaxi) {
                        if ((halfx-mmaxx) <= 2*mmaxy) {
                            idx = this._idxFromIJ(i, j, dimx, dimy);
                            if (idx !== -1) idxs.push(idx);
                        }
                    }
                    // we have more quadrants to the right or below...
                    if (qi !== qmaxi || qj !== qmaxj) {
                        idx = this._idxFromIJ(i,j,dimx,dimy);
                        if (idx !== -1) idxs.push(idx);
                    // special case... check if bounds is within one quadrant
                    } else {
                        if ((halfx-mmaxx) <= (2*mminy)) {
                            idx = this._idxFromIJ(i,j,dimx,dimy);
                            if (idx !== -1) idxs.push(idx);
                        }
                    }
                // hex top right
                } else if (mqi === 1 && mqj === 0) {
                    // top most right
                    if (qi === qmaxi && qj === qminj) {
                        if (mmaxx > (2*mminy)) {
                            idx = this._idxFromIJ((ioff) ? i+1 : i,j-1,dimx,dimy);
                            if (idx !== -1) idxs.push(idx);
                        }
                    }
                    // at left edge w/ tiles below
                    if (qi === qmini && qi !== qmaxi) {
                        idx = this._idxFromIJ(i,j,dimx,dimy);
                        if (idx !== -1) idxs.push(idx);
                    // special case... check if bounds is within one quadrant
                    } else if (qi === qmini && qj === qmaxj) {
                        if (mminx <= (2*mmaxy)) {
                            idx = this._idxFromIJ(i,j,dimx,dimy);
                            if (idx !== -1) idxs.push(idx);
                        }
                    }
                // hex mid
                } else {
                    // top row is mid
                    if (qj === qminj) {
                        idx = this._idxFromIJ(i,j,dimx,dimy);
                        if (idx !== -1) idxs.push(idx);
                    }
                }
                if (mqi > 0 && qi !== qmaxi) i++;
            }
            if (mqj > 1) j++;
        }
        idxs.sort((a,b) => a-b);
        return idxs;
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
        let gidx = this.idxsFromGzo(gzo);
        if (!gidx.length) {
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
        this.$oob.delete(gzo);
        // remove object from grid
        for (const idx of gidx) this.delidx(idx, gzo);
    }

    recheck(gzo) {
        if (!gzo) return;
        let ogidx = this.$gzoIdxMap.get(gzo.gid) || [];
        let gidx = this.idxsFromGzo(gzo) || [];
        let modified = false;
        if (!Util.arraysEqual(ogidx, gidx)) {
            if (this.dbg) console.log(`----- Grid.recheck: ${gzo} old ${ogidx} new ${gidx}`);
            // remove old
            for (const idx of ogidx) this.delidx(idx, gzo);
            // add new
            for (const idx of gidx) this.setidx(idx, gzo);
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
            this.recheck(gzo);
        }
    }

    render(ctx, x=0, y=0, width=0, height=0, color='rgba(0,255,255,.5)', occupiedColor='red') {
        let halfx = Math.round(this.colSize*.5);
        let halfy = Math.round(this.rowSize*2/3);
        let qtry = Math.round(this.rowSize/3);
        let path = new Path2D();
        path.moveTo(-halfx, -qtry);
        path.lineTo(0, -halfy);
        path.lineTo(halfx, -qtry);
        path.lineTo(halfx, qtry);
        path.lineTo(0, halfy);
        path.lineTo(-halfx, qtry);
        path.closePath();
        for (let i=0; i<this.cols; i++) {
            for (let j=0; j<this.rows; j++) {
                let d = this._pointFromIJ(i, j, true);
                let idx = this._idxFromIJ(i, j);
                let entries = this.entries[idx] || [];
                ctx.translate(x+d.x, y+d.y);
                ctx.strokeStyle = (entries.length) ? occupiedColor : color;
                ctx.lineWidth = 1;
                ctx.stroke(path);
                ctx.translate(-(x+d.x), -(y+d.y));
            }
        }
    }

    toString() {
        return Fmt.toString(this.constructor.name, this.cols, this.rows);
    }
    
}
