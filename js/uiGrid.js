export { UiGrid };

import { Bounds } from './bounds.js';
import { UiView } from './uiView.js';
import { Direction } from './direction.js';
import { GadgetBounder, Grid } from './grid.js';
import { HexGrid } from './hexGrid.js';
import { Overlaps } from './intersect.js';
import { Vect } from './vect.js';
import { GadgetCtx } from './gadget.js';
import { Timer } from './timer.js';

class UiGrid extends UiView {
    // FIXME: move all functions from schema to be static methods of the class.  You can change behavior by subclassing and overriding static functions.  
    // This makes it possible to serialize data and still have customizable functions.

    static {
        // the bounder is responsible for translating an object bounds to local grid space.  Object transformation is based on local coordinate space of the UI grid
        // which needs to be translated to a zero-based coordinate space of the underlying storage grid
        //this.schema('bounder', { readonly: true, parser: (o,x) => ((x.bounder) ? x.bounder : ((gzo) => new Bounds({x:gzo.xform.bounds.minx+gzo.xform.x, y:gzo.xform.bounds.miny+gzo.xform.y, width:gzo.xform.bounds.width, height:gzo.xform.bounds.height})) )});
        this.$schema('bounder', { readonly:true, dflt:() => new GadgetBounder() }),

        this.$schema('createFilter', { readonly:true, dflt:() => (gzo) => gzo.gridable });
        this.$schema('renderFilter', { eventable:false, dflt: (o,x) => ((idx, view) => true) });
        this.$schema('optimizeRender', { eventable:false, dflt: true });

        this.$schema('$chunks', { parser: (o,x) => {
            if (x.chunks) return x.chunks;
            const rows = x.rows || 8;
            const cols = x.cols || 8;
            const xgrid = {
                rows: rows,
                cols: cols,
                colSize: o.xform.width/cols,
                rowSize: o.xform.height/rows,
                bounder: o.bounder,
                // FIXME
                bucketSort: x.bucketSort || ((a, b) => (a.z === b.z) ? a.xform.y-b.xform.y : a.z-b.z),
            }
            if (x.hex) {
                return new HexGrid(xgrid);
            } else {
                return new Grid(xgrid);
            }
        }});
        this.$schema('$revision', { parser: (o,x) => 0 });
        this.$schema('$rerender', { parser: (o,x) => true });
        this.$schema('$chunkUpdates', { readonly: true, parser: (o,x) => new Set()});
        this.$schema('$chunkCanvas', { readonly: true, parser: (o,x) => document.createElement('canvas') });
        this.$schema('$chunkCtx', { readonly: true, parser: (o,x) => o.$chunkCanvas.getContext('2d') });
        this.$schema('$gridCanvas', { readonly: true, parser: (o,x) => document.createElement('canvas') });
        this.$schema('$gridCtx', { readonly: true, parser: (o,x) => o.$gridCanvas.getContext('2d') });
        this.$schema('$resizeTimer');
        this.$schema('length', { getter: (o,x) => o.$chunks.length });
    }

    // CONSTRUCTOR/DESTRUCTOR ----------------------------------------------

    $cpost(spec) {
        super.$cpost(spec);
        // -- resize offscreen canvases
        this.$gridCanvas.width = this.xform.width;
        this.$gridCanvas.height = this.xform.height;
        this.$chunkCanvas.width = this.$chunks.colSize;
        this.$chunkCanvas.height = this.$chunks.rowSize;
        // handle view creation event handling
        if (this.createFilter) {
            GadgetCtx.at_created.listen(this.$on_viewCreated, this, false, (evt) => this.createFilter(evt.actor));
        }
        this.at_modified.listen(this.$on_modified, this, false, (evt) => evt.key.startsWith('xform'));
    }

    destroy() {
        GadgetCtx.ignore(this.$on_viewCreated, this);
    }

    // EVENT HANDLERS ------------------------------------------------------
    $on_modified(evt) {
        if (!this.$resizeTimer) {
            console.log(`on modified evt: ${evt}`);
            this.$resizeTimer = new Timer({ttl:0, cb: () => {
                this.$resizeTimer = null;
                this.resize();
            }});
            this.$resizeTimer.dbg = true;
        }
    }

    $on_viewCreated(evt) {
        this.add(evt.actor);
    }

    $on_viewModified(evt) {
        let view = evt.actor;
        let needsUpdate = evt.render;
        // -- keep track of grid indices that need to be rerendered (e.g.: all grid indices associated with updated view before and after rechecking grid)
        let gidxs = this.$chunks.idxof(view);
        for (const idx of gidxs) {
            needsUpdate = true;
            this.$chunkUpdates.add(idx);
        }
        // -- recheck grid to update grid position
        this.$chunks.recheck(view);
        gidxs = this.idxof(view);
        for (const idx of gidxs) {
            needsUpdate = true;
            this.$chunkUpdates.add(idx);
        }
        if (needsUpdate) this.$revision = this.$revision + 1;
    }

    $on_viewDestroyed(evt) {
        //console.log(`onChildDestroyed: ${Fmt.ofmt(evt)}`);
        this.remove(evt.actor);
    }

    // STATIC METHODS ------------------------------------------------------

    // METHODS -------------------------------------------------------------

    // grid proxy functions
    // -- methods requiring translation
    _ijFromPoint(x, y) { return this.$chunks._ijFromPoint(x-this.xform.minx, y-this.xform.miny); }
    ijFromPoint(p) { return ((p) ? this._ijFromPoint(p.x, p.y) : {x:-1,y:-1}); }
    _idxFromPoint(x, y) { return this.$chunks._idxFromPoint(x-this.xform.minx, y-this.xform.miny) }
    idxFromPoint(p) { return ((p) ? this._idxFromPoint(p.x, p.y) : -1); }
    pointFromIdx(idx, center=false) { 
        let v = this.$chunks.pointFromIdx(idx, center);
        return { 
            x: (v.x !== -1) ? (v.x+this.xform.minx) : -1,
            y: (v.y !== -1) ? (v.y+this.xform.miny) : -1,
        }
    }
    _pointFromIJ(i, j, center=false) { 
        let v = this.$chunks._pointFromIJ(i, j, center);
        return { 
            x: (v.x !== -1) ? (v.x+this.xform.minx) : -1,
            y: (v.y !== -1) ? (v.y+this.xform.miny) : -1,
        }
    }
    pointFromIJ(ij, center=false) { return ((ij) ? this._pointFromIJ(ij.x, ij.y, center) : { x:-1,y:-1}); }

    *_findForPoint(x, y, filter=(v) => true) { yield *this.$chunks._findForPoint(x-this.xform.minx, y-this.xform.miny, filter); }
    *findForPoint(p, filter=(v) => true) { 
        if (!p) return;
        yield *this._findForPoint(p.x, p.y, filter); 
    }

    _firstForPoint(x, y, filter=(v) => true) { return this.$chunks._firstForPoint(x-this.xform.minx, y-this.xform.miny, filter); }
    firstForPoint(p, filter=(v) => true) { 
        if (!p) return null;
        return this._firstForPoint(p.x, p.y, filter);
    }

    *_findForBounds(bminx, bminy, bmaxx, bmaxy, filter=(v) => true) { 
        yield *this.$chunks._findForBounds(bminx-this.xform.minx, bminy-this.xform.miny, bmaxx-this.xform.minx, bmaxy-this.xform.miny, filter); 
    }
    *findForBounds(b, filter=(v) => true) { 
        if (!b) return;
        yield *this._findForBounds(b.minx, b.miny, b.maxx, b.maxy, filter); 
    }

    _firstForBounds(bminx, bminy, bmaxx, bmaxy, filter=(v) => true) { 
        return this.$chunks._firstForBounds(bminx-this.xform.minx, bminy-this.xform.miny, bmaxx-this.xform.minx, bmaxy-this.xform.miny, filter); 
    }
    firstForBounds(b, filter=(v) => true) { 
        if (!b) return null;
        return this._firstForBounds(b.minx, b.miny, b.maxx, b.maxy, filter); 
    }

    // -- translation from bounder
    idxsFromGzo(gzo) { return this.$chunks.idxsFromGzo(gzo); }

    // -- no translation
    ijFromIdx(idx) { return this.$chunks.ijFromIdx(idx); }
    _idxFromIJ(i,j) { return this.$chunks._idxFromIJ(i,j); }
    idxFromIJ(ij) { return this.$chunks.idxFromIJ(ij); }
    idxFromDir(idx, dir) { return this.$chunks.idxFromDir(idx, dir); }
    idxsAdjacent(idx1, idx2) { return this.$chunks.idxsAdjacent(idx1, idx2); }
    *idxsBetween(idx1, idx2) { yield *this.$chunks.idxsBetween(idx1, idx2); }
    includes(gzo) { return this.$chunks.includes(gzo); }
    idxof(gzo) { return this.$chunks.idxof(gzo); }
    *[Symbol.iterator]() { yield *this.$chunks; }
    *keys() { yield *this.$chunks.keys(); }
    *_getij(i, j) { yield *this.$chunks._getij(i,j); }
    *getij(ij) { yield *this.$chunks.getij(ij); }
    *getidx(idx) { yield *this.$chunks.getidx(idx); }
    *find(filter=(v) => true) { yield *this.$chunks.find(filter); }
    first(filter=(v) => true) { return this.$chunks.first(filter); }
    *findForIdx(gidxs, filter=(v) => true) { yield *this.$chunks.findForIdx(gidxs, filter); }
    firstForIdx(gidxs, filter=(v) => true) { return this.$chunks.firstForIdx(gidxs, filter); }
    *findForNeighbors(idx, filter=(v) => true, dirs=Direction.any) { yield *this.$chunks.findForNeighbors(idx, filter, dirs); }
    firstForNeighbors(idx, filter=(v) => true, dirs=Direction.any) { return this.$chunks.firstForNeighbors(idx, filter, dirs); }

    add(gzo) {
        gzo.xform._parent = this.xform;
        // add to grid
        this.$chunks.add(gzo);
        // retrieve idxs
        let gidxs = this.$chunks.idxof(gzo);
        //console.log(`idxs for gzo: ${gzo} @ ${gzo.xform} idxs: ${gidxs} ij: ${Fmt.ofmt(this.ijFromIdx(gidxs[0]))}`);
        let needsUpdate = false;
        // assign object to grid
        for (const idx of gidxs) {
            needsUpdate = true;
            // update list of updated chunks
            this.$chunkUpdates.add(idx);
        }
        // listen for gizmo events
        if (gzo.at_modified) gzo.at_modified.listen(this.$on_viewModified, this);
        if (gzo.at_destroyed) gzo.at_destroyed.listen(this.$on_viewDestroyed, this);
        // if chunkUpdates have been set, trigger update for grid
        if (needsUpdate) this.$revision = this.$revision + 1;
    }

    remove(gzo) {
        if (!gzo) return;
        // retrieve idxs for gzo
        const gidxs = this.$chunks.idxof(gzo);
        // remove from grid
        this.$chunks.remove(gzo);
        // ignore gizmo events
        // FIXME
        Evts.ignore(gzo, 'gizmo.updated', this.onChildUpdate, this);
        Evts.ignore(gzo, 'gizmo.destroyed', this.onChildDestroyed, this);
        let needsUpdate = false;
        for (const idx of gidxs) {
            needsUpdate = true;
            this.$chunkUpdates.add(idx);
        }
        if (needsUpdate) this.$revision = this.$revision + 1;
    }

    resize() {
        if ((this.xform.width !== this.$gridCanvas.width) || (this.xform.height !== this.$gridCanvas.height)) {
            // resize grid
            this.$chunks.resize(this.xform, this.$chunks.cols, this.$chunks.rows);
            this.$gridCanvas.width = this.xform.width;
            this.$gridCanvas.height = this.xform.height;
            this.$chunkCanvas.width = this.$chunks.colSize;
            this.$chunkCanvas.height = this.$chunks.rowSize;
            this.$rerender = true;
        }
    }

    renderChunk(idx, dx, dy) {
        // everything from the grid 'chunk' is rendered to an offscreen chunk canvas
        let chunkOffset = this.$chunks.pointFromIdx(idx);
        // FIXME bounds on optimized rendering...
        if (this.parent && this.optimizeRender) {
            const min = this.xform.getWorld({x:chunkOffset.x+dx, y:chunkOffset.y+dy}, false);
            const max = this.xform.getWorld({x:chunkOffset.x+dx+this.$chunks.colSize, y:chunkOffset.y+dy+this.$chunks.rowSize}, false);
            if (!Overlaps.bounds(this.parent.xform.bounds, {minx:min.x, miny:min.y, maxx: max.x, maxy:max.y})) {
                //if (this.dbg) console.log(`-- chunk: ${idx} ${t.x},${t.y} is out of bounds against ${this.xform.bounds}`);
                return;
            }
        }
        this.$chunkCtx.clearRect( 0, 0, this.$chunks.colSize, this.$chunks.rowSize );
        let tx = -(dx+chunkOffset.x);
        let ty = -(dy+chunkOffset.y);
        this.$chunkCtx.translate(tx, ty);
        // iterate through all views at given idx
        for (const view of this.getidx(idx)) {
            if (this.renderFilter(idx, view)) {
                //console.log(`render view: ${view} @ ${view.xform.x} idx: ${idx} dx: ${dx} chunkOffset.x: ${chunkOffset.x} tx: ${tx}`);
                view.render(this.$chunkCtx);
            }
        }
        this.$chunkCtx.translate(-tx, -ty);
        // -- resulting chunk is rendered to grid canvas
        this.$gridCtx.clearRect(chunkOffset.x, chunkOffset.y, this.$chunks.colSize, this.$chunks.rowSize);
        //console.log(`render chunk ${idx} to grid: ${t.x},${t.y}`)
        this.$gridCtx.drawImage(this.$chunkCanvas, chunkOffset.x, chunkOffset.y);
    }

    $subrender(ctx) {
        // compute delta between xform space and grid space
        let dx = this.xform.minx;
        let dy = this.xform.miny;
        // render any updated chunks
        if (this.$rerender) {
            this.$chunkUpdates.clear();
            this.$rerender = false;
            for (let idx=0; idx<this.$chunks.length; idx++) {
                this.renderChunk(idx, dx, dy);
            }
        } else {
            let chunkUpdates = Array.from(this.$chunkUpdates);
            this.$chunkUpdates.clear();
            for (const idx of chunkUpdates) {
                this.renderChunk(idx, dx, dy);
            }
        }
        // render grid canvas
        if (this.$gridCanvas.width && this.$gridCanvas.height) ctx.drawImage(this.$gridCanvas, dx, dy);
        // overlay grid
        if (this.dbg && this.dbg.grid) {
            this.$chunks.render(ctx, dx, dy);
        }

    }


}
