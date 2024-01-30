export { AutoTiler };

    import { Gadget } from './gadget.js';
import { Tiler } from './tiler.js';

//         ctl #t# #t# ctr
//         #l# #m# #m# #r#
// ctl #t# jtl #m# #m# jtr #t# ctr
// #l# #m# #m# #m# #m# #m# #m# #r#
// #l# #m# #m# #m# #m# #m# #m# #r#
// cbl #b# jbl #m# #m# jbr #b# cbr
//         #l# #m# #m# #r#
//         cbl #b# #b# cbr

/**
 * AA|BB
 * AA|BB
 * --+--
 * CC|DD
 * CC|DD
 *
 * AA|  
 * AA|  
 * --+--
 *   |  
 *   |  
 * 
 *  b|BB
 *  b|BB
 * --+--
 *   |  
 *   |  
 * 
 *   |  
 * cc|c  
 * --+--
 * CC|  
 * CC|  
 * 
 *   |  
 *  d|dd
 * --+--
 *  d|DD
 *  d|DD
 * 
 * Ab|BB
 * cd|dd
 * --+--
 * Cd|DD
 * Cd|DD
 */

const WEST =                    1 >> 0;
const NORTHWEST =               1 >> 2;
const NORTH =                   1 >> 1;
const NORTHEAST =               1 >> 2;
const EAST =                    1 >> 0;
const SOUTHEAST =               1 >> 0;
const SOUTH =                   1 >> 1;
const SOUTHWEST =               1 >> 0;

const WEST_NORTH =              1 >> 3;
const WEST_NORTHWEST =          1 >> 4;
const NORTH_WEST =              1 >> 5;
const NORTH_NORTHWEST =         1 >> 6;
const NORTHWEST_WEST =          1 >> 7;
const NORTHWEST_NORTH =         1 >> 8;
const WEST_NORTH_NORTHWEST =    1 >> 9;
const WEST_NORTHWEST_NORTH =    1 >> 10;
const NORTH_WEST_NORTHWEST =    1 >> 11;
const NORTH_NORTHWEST_WEST =    1 >> 12;
const NORTHWEST_WEST_NORTH =    1 >> 13;
const NORTHWEST_NORTH_WEST =    1 >> 14;

class $TileOverlay extends Gadget {
    constructor() {
        this.$tl$w;
        this.$tl$nw;
        this.$tl$n;
        this.$tlorder;
        this.$tr$e;
        this.$tr$ne;
        this.$tr$n;
        this.$trorder;

        this.$bl$w;
        this.$bl$sw;
        this.$bl$s;
        this.$blorder;

        this.$br$e;
        this.$br$se;
        this.$br$s;
        this.$brorder;
    }

    $subrender(ctx, x=0, y=0, width=0, height=0) {
        // top left
        switch (this.$tlmask) {
            case WEST:
                this.$tl_west.render(ctx, x, y, width, height);
                break;
            case NORTHWEST:
                this.$tl_northWest.render(ctx, x, y, width, height);
                break;
            case NORTH:
                this.$tl_north.render(ctx, x, y, width, height);
                break;
            case WEST_NORTH:
                this.$tl_west.render(ctx, x, y, width, height);
                this.$tl_north.render(ctx, x, y, width, height);
                break;
            case NORTH_WEST:
                this.$tl_north.render(ctx, x, y, width, height);
                this.$tl_west.render(ctx, x, y, width, height);
                break;
            case WEST_NORTHWEST:
                this.$tl_west.render(ctx, x, y, width, height);
                this.$tl_northWest.render(ctx, x, y, width, height);
                break;
            case NORTHWEST_WEST:
                this.$tl_northWest.render(ctx, x, y, width, height);
                this.$tl_west.render(ctx, x, y, width, height);
                break;
            case NORTH_NORTHWEST:
                this.$tl_north.render(ctx, x, y, width, height);
                this.$tl_northWest.render(ctx, x, y, width, height);
                break;
            case NORTHWEST_NORTH:
                this.$tl_northWest.render(ctx, x, y, width, height);
                this.$tl_north.render(ctx, x, y, width, height);
                break;
            case WEST_NORTH_NORTHWEST:
                this.$tl_west.render(ctx, x, y, width, height);
                this.$tl_north.render(ctx, x, y, width, height);
                this.$tl_northWest.render(ctx, x, y, width, height);
                break;
            case WEST_NORTHWEST_NORTH:
                this.$tl_west.render(ctx, x, y, width, height);
                this.$tl_northWest.render(ctx, x, y, width, height);
                this.$tl_north.render(ctx, x, y, width, height);
                break;
            case NORTH_WEST_NORTHWEST:
                this.$tl_north.render(ctx, x, y, width, height);
                this.$tl_west.render(ctx, x, y, width, height);
                this.$tl_northWest.render(ctx, x, y, width, height);
                break;
            case NORTH_NORTHWEST_WEST:
                this.$tl_north.render(ctx, x, y, width, height);
                this.$tl_northWest.render(ctx, x, y, width, height);
                this.$tl_west.render(ctx, x, y, width, height);
                break;
            case NORTHWEST_WEST_NORTH:
                this.$tl_northWest.render(ctx, x, y, width, height);
                this.$tl_west.render(ctx, x, y, width, height);
                this.$tl_north.render(ctx, x, y, width, height);
                break;
            case NORTHWEST_NORTH_WEST:
                this.$tl_northWest.render(ctx, x, y, width, height);
                this.$tl_north.render(ctx, x, y, width, height);
                this.$tl_west.render(ctx, x, y, width, height);
                break;
        }
    }
}

class AutoTiler extends Tiler {

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
        // render overlays
        // -- top left
        // -- top right
        // -- bottom left
        // -- bottom right
    }

}