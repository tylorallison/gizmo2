export { UiGrid };

import { Bounds } from './bounds.js';
import { UiView } from './uiView.js';
import { Direction } from './direction.js';
import { Grid } from './grid.js';
import { HexGrid } from './hexGrid.js';
import { Overlaps } from './intersect.js';
import { Vect } from './vect.js';
import { GadgetCtx } from './gadget.js';
import { Timer } from './timer.js';
import { GameModel } from './gameModel.js';
import { Fmt } from './fmt.js';

class UiGrid extends UiView {
    static {
        // the boundsFor is responsible for translating an object bounds to local grid space.  Object transformation is based on local coordinate space of the UI grid
        // which needs to be translated to a zero-based coordinate space of the underlying storage grid
        this.$schema('boundsFor', { readonly:true, dflt:() => GameModel.boundsFor });
        this.$schema('sortBy', { readonly:true, dflt:() => GameModel.sortBy });
        this.$schema('createFilter', { readonly:true, dflt:() => (gzo) => gzo.gridable });
        this.$schema('renderFilter', { eventable:false, dflt:() => ((idx, view) => true) });
        this.$schema('optimizeRender', { eventable:false, dflt:true });
        this.$schema('$chunks', { parser: (o,x) => {
            if (x.chunks) return x.chunks;
            const rows = x.rows || 8;
            const cols = x.cols || 8;
            const xgrid = {
                rows: rows,
                cols: cols,
                colSize: o.xform.width/cols,
                rowSize: o.xform.height/rows,
                boundsFor: o.boundsFor,
                sortBy: o.sortBy,
            }
            if (x.hex) {
                return new HexGrid(xgrid);
            } else {
                return new Grid(xgrid);
            }
        }});
        this.$schema('$revision', { parser:(o,x) => 0 });
        this.$schema('$rerender', { parser:(o,x) => true });
        this.$schema('$chunkUpdates', { readonly:true, parser: (o,x) => new Set()});
        this.$schema('$chunkCanvas', { readonly:true, parser: (o,x) => document.createElement('canvas') });
        this.$schema('$chunkCtx', { readonly:true, parser: (o,x) => o.$chunkCanvas.getContext('2d') });
        this.$schema('$gridCanvas', { readonly:true, parser: (o,x) => document.createElement('canvas') });
        this.$schema('$gridCtx', { readonly:true, parser: (o,x) => o.$gridCanvas.getContext('2d') });
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
        this.resize();
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
        this.remove(evt.actor);
    }

    // METHODS -------------------------------------------------------------

    // grid proxy functions
    _ijFromPoint(x, y) { return this.$chunks._ijFromPoint(x, y); }
    ijFromPoint(p) { return this.$chunks.ijFromPoint(p); }
    _idxFromPoint(x, y) { return this.$chunks._idxFromPoint(x, y) }
    idxFromPoint(p) { return this.$chunks.idxFromPoint(p); }
    pointFromIdx(idx, center=false) { return this.$chunks.pointFromIdx(idx, center); }
    _pointFromIJ(i, j, center=false) { return this.$chunks._pointFromIJ(i, j, center); }
    pointFromIJ(ij, center=false) { return this.$chunks.pointFromIJ(ij, center); }
    *_findForPoint(x, y, filter=(v) => true) { yield *this.$chunks._findForPoint(x, y, filter); }
    *findForPoint(p, filter=(v) => true) { yield *this.$chunks.findForPoint(p, filter); }
    _firstForPoint(x, y, filter=(v) => true) { return this.$chunks._firstForPoint(x, y, filter); }
    firstForPoint(p, filter=(v) => true) { return this.$chunks.firstForPoint(p, filter); }
    *_findForBounds(bminx, bminy, bmaxx, bmaxy, filter=(v) => true) { yield *this.$chunks._findForBounds(bminx, bminy, bmaxx, bmaxy, filter); }
    *findForBounds(b, filter=(v) => true) { yield *this.$chunks.findForBounds(b, filter); }
    _firstForBounds(bminx, bminy, bmaxx, bmaxy, filter=(v) => true) { return this.$chunks._firstForBounds(bminx, bminy, bmaxx, bmaxy, filter); }
    firstForBounds(b, filter=(v) => true) { return this.$chunks.firstForBounds(b, filter); }
    idxsFromGzo(gzo) { return this.$chunks.idxsFromGzo(gzo); }
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
        // FIXME
        //gzo.xform._parent = this.xform;
        // add to grid
        this.$chunks.add(gzo);
        // retrieve idxs
        let gidxs = this.$chunks.idxof(gzo);
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
        if (gzo.at_modified) gzo.at_modified.ignore(this.$on_viewModified, this);
        if (gzo.at_destroyed) gzo.at_destroyed.ignore(this.$on_viewDestroyed, this);
        let needsUpdate = false;
        for (const idx of gidxs) {
            needsUpdate = true;
            this.$chunkUpdates.add(idx);
        }
        if (needsUpdate) this.$revision = this.$revision + 1;
    }

    resize() {
        if ( (this.xform.minx !== this.$chunks.minx) || 
             (this.xform.miny !== this.$chunks.miny) || 
             (this.xform.width !== this.$gridCanvas.width) || 
             (this.xform.height !== this.$gridCanvas.height)) {
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
        if (!this.$chunkCanvas.width || !this.$chunkCanvas.height) return;
        // everything from the grid 'chunk' is rendered to an offscreen chunk canvas
        let chunkOffset = this.$chunks.pointFromIdx(idx);
        // FIXME bounds on optimized rendering...
        /*
        if (this.parent && this.optimizeRender) {
            const min = this.xform.getWorld({x:chunkOffset.x+dx, y:chunkOffset.y+dy}, false);
            const max = this.xform.getWorld({x:chunkOffset.x+dx+this.$chunks.colSize, y:chunkOffset.y+dy+this.$chunks.rowSize}, false);
            if (!Overlaps.bounds(this.parent.xform.bounds, {minx:min.x, miny:min.y, maxx: max.x, maxy:max.y})) {
                //if (this.dbg) console.log(`-- chunk: ${idx} ${t.x},${t.y} is out of bounds against ${this.xform.bounds}`);
                return;
            }
        }
        */
        this.$chunkCtx.clearRect( 0, 0, this.$chunks.colSize, this.$chunks.rowSize );
        this.$chunkCtx.translate(-chunkOffset.x, -chunkOffset.y);
        // iterate through all views at given idx
        for (const view of this.getidx(idx)) {
            if (this.renderFilter(idx, view)) {
                view.render(this.$chunkCtx);
            }
        }
        this.$chunkCtx.translate(chunkOffset.x, chunkOffset.y);
        // -- resulting chunk is rendered to grid canvas
        let tx = chunkOffset.x-dx;
        let ty = chunkOffset.y-dy;
        this.$gridCtx.clearRect(tx, ty, this.$chunks.colSize, this.$chunks.rowSize);
        this.$gridCtx.drawImage(this.$chunkCanvas, tx, ty);
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
            this.$chunks.render(ctx, 0, 0);
        }
    }


}
