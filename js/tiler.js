export { Tiler };

import { GadgetCtx } from './gadget.js';
import { GridArray } from './gridArray.js';
import { Sketch } from './sketch.js';
import { Vect } from './vect.js';

class Tiler extends Sketch {
    static {
        this.$schema('gridSize', { order:-1, readonly:true, dflt: () => new Vect({x:10, y:10}) });
        this.$schema('tileSize', { readonly:true, dflt: () => new Vect({x:32, y:32}) });
        this.$schema('assetMap', { readonly:true });
        this.$schema('$grid', { parser: (o) => new GridArray({ cols:o.gridSize.x, rows:o.gridSize.y }) });
        this.$schema('$gridCanvas', { readonly: true, parser: (o,x) => document.createElement('canvas') });
        this.$schema('$gridCtx', { readonly: true, parser: (o,x) => o.$gridCanvas.getContext('2d') });
        this.$schema('$assetCache', { readonly: true, parser: () => new Map()});
        this.$schema('$modifiedIdxs', { readonly: true, parser: () => new Set()});
        this.$schema('width', { getter: (o) => o.tileSize.x*o.gridSize.x });
        this.$schema('height', { getter: (o) => o.tileSize.y*o.gridSize.y });
    }

    $renderIdx(idx) {
        let ij = this.$grid.ijFromIdx(idx);
        let x = ij.x*this.tileSize.x;
        let y = ij.y*this.tileSize.y;
        // clear current index
        this.$gridCtx.clearRect(x, y, this.tileSize.x, this.tileSize.y);
        // pull asset
        let tag = this.$grid.getidx(idx);
        if (this.assetMap) tag = this.assetMap(tag);
        if (!tag) return;
        let asset = this.$assetCache.get(idx);
        // cache hit
        if (asset) {
            // validate cache asset still matches grid asset
            if (asset.tag !== tag) asset = null;
        }
        // handle cache miss or invalidated cache
        if (!asset) {
            asset = GadgetCtx.assets.get(tag);
            if (asset) this.$assetCache.set(idx, asset);
        }
        // render asset to grid
        asset.render(this.$gridCtx, x,y, this.tileSize.x, this.tileSize.y);
    }

    $renderModified() {
        let modified = Array.from(this.$modifiedIdxs);
        this.$modifiedIdxs.clear();
        for (const idx of modified) {
            this.$renderIdx(idx);
        }
    }

    $subrender(ctx, x=0, y=0, width=0, height=0) {
        // render modified indices
        this.$renderModified();
        // translate/scale
        let ctxXform = ctx.getTransform();
        if (x || y) ctx.translate(x, y);
        if ((width && width !== this.width) || (height && height !== this.height)) {
            let scalex = width/this.width;
            let scaley = height/this.height;
            ctx.scale(scalex, scaley);
        }
        // draw canvas
        ctx.drawImage(this.$gridCanvas, 0, 0);
        // restore
        ctx.setTransform(ctxXform);
    }

    _getij(i, j) {
        return this.$grid._getij(i,j);
    }
    getij(ij) {
        return this.$grid.getij(ij);
    }
    getidx(idx) {
        return this.$grid.getidx(idx);
    }

    _setij(i, j, v) {
        let idx = this.$grid._idxFromIJ(i, j);
        if (idx !== -1) {
            this.$modifiedIdxs.add(idx);
            this.$grid.setidx(idx, v);
        }
    }
    setij(ij, v) {
        let idx = this.$grid.idxFromIJ(ij);
        if (idx !== -1) {
            this.$modifiedIdxs.add(idx);
            this.$grid.setidx(idx, v);
        }
    }
    setidx(idx, v) {
        if (idx !== -1 && idx<this.$grid.length) {
            this.$modifiedIdxs.add(idx);
            this.$grid.setidx(idx, v);
        }
    }

}