export { AutoTiler };

    import { Direction } from './direction.js';
    import { Gadget, GadgetCtx } from './gadget.js';
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
 * 
 * XXX|XXX    |    XXX|       |XXX XXX|    XXX|XXX    |XXX XXX|XXX
 * ---+--- ---+--- ---+--- ---+--- ---+--- ---+--- ---+--- ---+---
 * XXX|??? XXX|#r#    |cbr    |#b# XXX|#r#    |#b# XXX|jbr XXX|jbr
 *
 * XXX|XXX    |       |XXX XXX|       |XXX XXX|XXX XXX|    XXX|XXX
 * ---+--- ---+--- ---+--- ---+--- ---+--- ---+--- ---+--- ---+---
 * ???|XXX #l#|XXX cbl|    #b#|    #l#|XXX #b#|    jbl|XXX jbl|XXX
 * 
 * XXX|??? XXX|#r#    |ctr    |#t# XXX|#r#    |#t# XXX|jtr XXX|jtr
 * ---+--- ---+--- ---+--- ---+--- ---+--- ---+--- ---+--- ---+---
 * XXX|XXX    |    XXX|       |XXX XXX|    XXX|XXX    |XXX XXX|XXX
 *
 * ???|XXX #l#|XXX ctl|    #t#|    #l#|XXX #t#|    jtl|XXX jtl|XXX
 * ---+--- ---+--- ---+--- ---+--- ---+--- ---+--- ---+--- ---+---
 * XXX|XXX    |       |XXX XXX|       |XXX XXX|XXX XXX|    XXX|XXX
 * 
 */

const WEST =                    1 >> 0;
const NORTHWEST =               1 >> 1;
const NORTH =                   1 >> 2;
const NORTHEAST =               1 >> 3;
const EAST =                    1 >> 4;
const SOUTHEAST =               1 >> 5;
const SOUTH =                   1 >> 6;
const SOUTHWEST =               1 >> 7;

const WEST_NORTH =              1 >> 8;
const WEST_NORTHWEST =          1 >> 9;
const NORTH_WEST =              1 >> 10;
const NORTH_NORTHWEST =         1 >> 11;
const NORTHWEST_WEST =          1 >> 12;
const NORTHWEST_NORTH =         1 >> 13;
const WEST_NORTH_NORTHWEST =    1 >> 14;
const WEST_NORTHWEST_NORTH =    1 >> 15;
const NORTH_WEST_NORTHWEST =    1 >> 16;
const NORTH_NORTHWEST_WEST =    1 >> 17;
const NORTHWEST_WEST_NORTH =    1 >> 18;
const NORTHWEST_NORTH_WEST =    1 >> 19;

const EAST_NORTH =              1 >> 8;
const EAST_NORTHEAST =          1 >> 9;
const NORTH_EAST =              1 >> 10;
const NORTH_NORTHEAST =         1 >> 11;
const NORTHEAST_EAST =          1 >> 12;
const NORTHEAST_NORTH =         1 >> 13;
const EAST_NORTH_NORTHEAST =    1 >> 14;
const EAST_NORTHEAST_NORTH =    1 >> 15;
const NORTH_EAST_NORTHEAST =    1 >> 16;
const NORTH_NORTHEAST_EAST =    1 >> 17;
const NORTHEAST_EAST_NORTH =    1 >> 18;
const NORTHEAST_NORTH_EAST =    1 >> 19;

const WEST_SOUTH =              1 >> 8;
const WEST_SOUTHWEST =          1 >> 9;
const SOUTH_WEST =              1 >> 10;
const SOUTH_SOUTHWEST =         1 >> 11;
const SOUTHWEST_WEST =          1 >> 12;
const SOUTHWEST_SOUTH =         1 >> 13;
const WEST_SOUTH_SOUTHWEST =    1 >> 14;
const WEST_SOUTHWEST_SOUTH =    1 >> 15;
const SOUTH_WEST_SOUTHWEST =    1 >> 16;
const SOUTH_SOUTHWEST_WEST =    1 >> 17;
const SOUTHWEST_WEST_SOUTH =    1 >> 18;
const SOUTHWEST_SOUTH_WEST =    1 >> 19;

const EAST_SOUTH =              1 >> 8;
const EAST_SOUTHEAST =          1 >> 9;
const SOUTH_EAST =              1 >> 10;
const SOUTH_SOUTHEAST =         1 >> 11;
const SOUTHEAST_EAST =          1 >> 12;
const SOUTHEAST_SOUTH =         1 >> 13;
const EAST_SOUTH_SOUTHEAST =    1 >> 14;
const EAST_SOUTHEAST_SOUTH =    1 >> 15;
const SOUTH_EAST_SOUTHEAST =    1 >> 16;
const SOUTH_SOUTHEAST_EAST =    1 >> 17;
const SOUTHEAST_EAST_SOUTH =    1 >> 18;
const SOUTHEAST_SOUTH_EAST =    1 >> 19;

class $TileOverlay extends Gadget {
    static {
        this.$schema('idx');
        this.$schema('grid');
        this.$schema('priorityMap', { dflt:() => { return ({}); } });

        this.$schema('$tl_mask', { eventable:false });
        this.$schema('$tr_mask', { eventable:false });
        this.$schema('$bl_mask', { eventable:false });
        this.$schema('$br_mask', { eventable:false });

        this.$schema('$tl_west', { eventable:false });
        this.$schema('$tl_northWest', { eventable:false });
        this.$schema('$tl_north', { eventable:false });

        this.$schema('$tr_north', { eventable:false });
        this.$schema('$tr_northEast', { eventable:false });
        this.$schema('$tr_east', { eventable:false });

        this.$schema('$br_east', { eventable:false });
        this.$schema('$br_southEast', { eventable:false });
        this.$schema('$br_south', { eventable:false });

        this.$schema('$bl_south', { eventable:false });
        this.$schema('$bl_southWest', { eventable:false });
        this.$schema('$bl_west', { eventable:false });
    }

    $cpost(spec) {
        super.$cpost(spec);
        this.$compute();
    }

    $resolveSketch(which, tag, side) {
        let assetTag = `${tag}.${side}`;
        if (this[which] && this[which].tag !== assetTag) {
            this[which] = GadgetCtx.assets.get(assetTag);
        }
    }

    /**
     * top left
     * 
     * XXX|XXX    |    XXX|       |XXX XXX|    XXX|XXX    |XXX XXX|XXX
     * ---+--- ---+--- ---+--- ---+--- ---+--- ---+--- ---+--- ---+---
     * XXX|??? XXX|#r#    |cbr    |#b# XXX|#r#    |#b# XXX|jbr XXX|jbr
     */
    $computeTopLeft(tag, priority) {
        // lookup neighbor info
        let t_west = this.grid.getidx(this.grid.idxFromDir(this.idx, Direction.west));
        let p_west = this.priorityMap[t_west];
        let t_north = this.grid.getidx(this.grid.idxFromDir(this.idx, Direction.north));
        let p_north = this.priorityMap[t_north];
        let t_northWest = this.grid.getidx(this.grid.idxFromDir(this.idx, Direction.northWest));
        let p_northWest = this.priorityMap[t_north];
        // -- west overlap
        if (p_west > priority) {
            let side;
            if (p_west >= p_north) {
                side = 'jbr';
            } else {
                side = 'r';
            }
            this.$resolveSketch('$tl_west', t_west, side);
        } else {
            this.$tl_west = null;
        }
        // -- northWest overlap
        if (p_northWest > priority) {
            let side;
            if ((p_northWest >= p_west) && (p_northWest >= p_north)) {
                side = 'jbr';
            } else if (p_northWest >= p_north) {
                side = 'b';
            } else if (p_northWest >= p_west) {
                side = 'r';
            } else {
                side = 'cbr'
            }
            this.$resolveSketch('$tl_northWest', t_northWest, side);
        } else {
            this.$tl_northWest = null;
        }
        // -- north overlap
        if (p_north > priority) {
            let side;
            if (p_north >= p_west) {
                side = 'jbr';
            } else {
                side = 'r';
            }
            this.$resolveSketch('$tl_north', t_north, side);
        } else {
            this.$tl_north = null;
        }
        // compute order
        if (this.$tl_north && this.$tl_northWest && this.$tl_west) {
            if ((p_north > p_northWest) &&
                (p_north > p_west)) {
                if (p_northWest > p_west) {
                    this.$tl_mask = NORTH_NORTHWEST_WEST;
                } else {
                    this.$tl_mask = NORTH_WEST_NORTHWEST;
                }
            } else if ((p_west> p_northWest) &&
                       (p_west> p_north)) {
                if (p_northWest > p_north) {
                    this.$tl_mask = WEST_NORTHWEST_NORTH;
                } else {
                    this.$tl_mask = WEST_NORTH_NORTHWEST;
                }
            } else {
                if (p_west > p_north) {
                    this.$tl_mask = NORTHWEST_WEST_NORTH;
                } else {
                    this.$tl_mask = NORTHWEST_NORTH_WEST;
                }
            }
        } else if (this.$tl_north && this.$tl_northWest) {
            if (p_north > p_northWest) {
                this.$tl_mask = NORTH_NORTHWEST;
            } else {
                this.$tl_mask = NORTHWEST_NORTH;
            }
        } else if (this.$tl_northWest && this.$tl_west) {
            if (p_northWest > p_west) {
                this.$tl_mask = NORTHWEST_WEST;
            } else {
                this.$tl_mask = WEST_NORTHWEST;
            }
        } else if (this.$tl_north && this.$tl_west) {
            if (p_north > p_west) {
                this.$tl_mask = NORTH_WEST;
            } else {
                this.$tl_mask = WEST_NORTH;
            }
        } else if (this.$tl_north) {
                this.$tl_mask = NORTH;
        } else if (this.$tl_northWest) {
                this.$tl_mask = NORTHWEST;
        } else if (this.$tl_west) {
                this.$tl_mask = WEST;
        } else {
            this.$tl_mask = 0;
        }
    }

    $compute() {
        let neighbors = {};
        let priorities = {};
        for (const dir of Direction.all) {
            let nidx = this.grid.idxFromDir(this.idx, dir);
            neighbors[dir] = this.grid.getidx(nidx);
            priorities[dir] = this.priorityMap[neighbors[dir]];
        }
        let tag = this.grid.getidx(this.idx);
        let npri, priority = this.priorityMap[tag];

        // top left
        //
        // XXX|XXX    |    XXX|       |XXX XXX|    XXX|XXX    |XXX XXX|XXX
        // ---+--- ---+--- ---+--- ---+--- ---+--- ---+--- ---+--- ---+---
        // XXX|??? XXX|#r#    |cbr    |#b# XXX|#r#    |#b# XXX|jbr XXX|jbr
        //
        // -- west overlap
        npri = priorities[Direction.west]
        if (npri > priority) {
            let side;
            if (npri >= priorities[Direction.north]) {
                side = 'jbr';
            } else {
                side = 'r';
            }
            this.$resolveSketch('$tl_west', neighbors[Direction.west], side);
        } else {
            this.$tl_west = null;
        }
        // -- northWest overlap
        npri = priorities[Direction.northWest]
        if (npri > priority) {
            let side;
            if ((npri >= priorities[Direction.west]) && (npri >= priorities[Direction.north])) {
                side = 'jbr';
            } else if (npri >= priorities[Direction.north]) {
                side = 'b';
            } else if (npri >= priorities[Direction.west]) {
                side = 'r';
            } else {
                side = 'cbr'
            }
            this.$resolveSketch('$tl_northWest', neighbors[Direction.northWest], side);
        } else {
            this.$tl_northWest = null;
        }
        // -- north overlap
        npri = priorities[Direction.north]
        if (npri > priority) {
            let side;
            if (npri >= priorities[Direction.west]) {
                side = 'jbr';
            } else {
                side = 'r';
            }
            this.$resolveSketch('$tl_north', neighbors[Direction.north], side);
        } else {
            this.$tl_north = null;
        }
        // compute order
        if (this.$tl_north && this.$tl_northWest && this.$tl_west) {
            if ((this.priorities[Direction.north] > this.priorities[Direction.northWest]) &&
                (this.priorities[Direction.north] > this.priorities[Direction.west])) {
                if (this.priorities[Direction.northWest] > this.priorities[Direction.west]) {
                    this.$tl_mask = NORTH_NORTHWEST_WEST;
                } else {
                    this.$tl_mask = NORTH_WEST_NORTHWEST;
                }
            } else if ((this.priorities[Direction.west] > this.priorities[Direction.northWest]) &&
                       (this.priorities[Direction.west] > this.priorities[Direction.north])) {
                if (this.priorities[Direction.northWest] > this.priorities[Direction.north]) {
                    this.$tl_mask = WEST_NORTHWEST_NORTH;
                } else {
                    this.$tl_mask = WEST_NORTH_NORTHWEST;
                }
            } else {
                if (this.priorities[Direction.west] > this.priorities[Direction.north]) {
                    this.$tl_mask = NORTHWEST_WEST_NORTH;
                } else {
                    this.$tl_mask = NORTHWEST_NORTH_WEST;
                }
            }
        } else if (this.$tl_north && this.$tl_northWest) {
            if (this.priorities[Direction.north] > this.priorities[Direction.northWest]) {
                this.$tl_mask = NORTH_NORTHWEST;
            } else {
                this.$tl_mask = NORTHWEST_NORTH;
            }
        } else if (this.$tl_northWest && this.$tl_west) {
            if (this.priorities[Direction.northWest] > this.priorities[Direction.west]) {
                this.$tl_mask = NORTHWEST_WEST;
            } else {
                this.$tl_mask = WEST_NORTHWEST;
            }
        } else if (this.$tl_north && this.$tl_west) {
            if (this.priorities[Direction.north] > this.priorities[Direction.west]) {
                this.$tl_mask = NORTH_WEST;
            } else {
                this.$tl_mask = WEST_NORTH;
            }
        } else if (this.$tl_north) {
                this.$tl_mask = NORTH;
        } else if (this.$tl_northWest) {
                this.$tl_mask = NORTHWEST;
        } else if (this.$tl_west) {
                this.$tl_mask = WEST;
        } else {
            this.$tl_mask = 0;
        }

        // top right
        //
        // XXX|XXX    |       |XXX XXX|       |XXX XXX|XXX XXX|    XXX|XXX
        // ---+--- ---+--- ---+--- ---+--- ---+--- ---+--- ---+--- ---+---
        // ???|XXX #l#|XXX cbl|    #b#|    #l#|XXX #b#|    jbl|XXX jbl|XXX
        //
        // -- north overlap
        npri = priorities[Direction.north]
        if (npri > priority) {
            let side;
            if (npri >= priorities[Direction.east]) {
                side = 'jbr';
            } else {
                side = 'r';
            }
            this.$resolveSketch('$tr_north', neighbors[Direction.north], side);
        }
        // -- northEast overlap
        npri = priorities[Direction.northEast]
        if (npri > priority) {
            let side;
            if ((npri >= priorities[Direction.east]) && (npri >= priorities[Direction.north])) {
                side = 'jbl';
            } else if (npri >= priorities[Direction.north]) {
                side = 'b';
            } else if (npri >= priorities[Direction.east]) {
                side = 'l';
            } else {
                side = 'cbl'
            }
            this.$resolveSketch('$tl_northEast', neighbors[Direction.northEast], side);
        }
        // -- east overlap
        npri = priorities[Direction.east]
        if (npri > priority) {
            let side;
            if (npri >= priorities[Direction.north]) {
                side = 'jbl';
            } else {
                side = 'l';
            }
            this.$resolveSketch('$tl_east', neighbors[Direction.east], side);
        }
        // compute order
        if (this.$tr_north && this.$tr_northEast && this.$tr_east) {
            if ((this.priorities[Direction.north] > this.priorities[Direction.northEast]) &&
                (this.priorities[Direction.north] > this.priorities[Direction.east])) {
                if (this.priorities[Direction.northEast] > this.priorities[Direction.east]) {
                    this.$tl_mask = NORTH_NORTHEAST_EAST;
                } else {
                    this.$tl_mask = NORTH_EAST_NORTHEAST;
                }
            } else if ((this.priorities[Direction.east] > this.priorities[Direction.northEast]) &&
                       (this.priorities[Direction.east] > this.priorities[Direction.north])) {
                if (this.priorities[Direction.northEast] > this.priorities[Direction.north]) {
                    this.$tl_mask = EAST_NORTHEAST_NORTH;
                } else {
                    this.$tl_mask = EAST_NORTH_NORTHEAST;
                }
            } else {
                if (this.priorities[Direction.east] > this.priorities[Direction.north]) {
                    this.$tl_mask = NORTHEAST_EAST_NORTH;
                } else {
                    this.$tl_mask = NORTHEAST_NORTH_EAST;
                }
            }
        } else if (this.$tr_north && this.$tr_northEast) {
            if (this.priorities[Direction.north] > this.priorities[Direction.northEast]) {
                this.$tl_mask = NORTH_NORTHEAST;
            } else {
                this.$tl_mask = NORTHEAST_NORTH;
            }
        } else if (this.$tr_northEast && this.$tr_east) {
            if (this.priorities[Direction.northEast] > this.priorities[Direction.east]) {
                this.$tl_mask = NORTHEAST_EAST;
            } else {
                this.$tl_mask = EAST_NORTHEAST;
            }
        } else if (this.$tr_north && this.$tr_east) {
            if (this.priorities[Direction.north] > this.priorities[Direction.east]) {
                this.$tl_mask = NORTH_EAST;
            } else {
                this.$tl_mask = EAST_NORTH;
            }
        } else if (this.$tr_north) {
                this.$tl_mask = NORTH;
        } else if (this.$tr_northEast) {
                this.$tl_mask = NORTHEAST;
        } else if (this.$tr_east) {
                this.$tl_mask = EAST;
        } else {
            this.$tl_mask = 0;
        }

        // bottom left
        //
        // XXX|??? XXX|#r#    |ctr    |#t# XXX|#r#    |#t# XXX|jtr XXX|jtr
        // ---+--- ---+--- ---+--- ---+--- ---+--- ---+--- ---+--- ---+---
        // XXX|XXX    |    XXX|       |XXX XXX|    XXX|XXX    |XXX XXX|XXX
        //
        // -- west overlap
        npri = priorities[Direction.west]
        if (npri > priority) {
            let side;
            if (npri >= priorities[Direction.south]) {
                side = 'jtr';
            } else {
                side = 'r';
            }
            this.$resolveSketch('$bl_west', neighbors[Direction.west], side);
        } else {
            this.$bl_west = null;
        }
        // FIXME
        // -- northWest overlap
        npri = priorities[Direction.northWest]
        if (npri > priority) {
            let side;
            if ((npri >= priorities[Direction.west]) && (npri >= priorities[Direction.north])) {
                side = 'jbr';
            } else if (npri >= priorities[Direction.north]) {
                side = 'b';
            } else if (npri >= priorities[Direction.west]) {
                side = 'r';
            } else {
                side = 'cbr'
            }
            this.$resolveSketch('$tl_northWest', neighbors[Direction.northWest], side);
        } else {
            this.$tl_northWest = null;
        }
        // -- north overlap
        npri = priorities[Direction.north]
        if (npri > priority) {
            let side;
            if (npri >= priorities[Direction.west]) {
                side = 'jbr';
            } else {
                side = 'r';
            }
            this.$resolveSketch('$tl_north', neighbors[Direction.north], side);
        } else {
            this.$tl_north = null;
        }
        // compute order
        if (this.$tl_north && this.$tl_northWest && this.$tl_west) {
            if ((this.priorities[Direction.north] > this.priorities[Direction.northWest]) &&
                (this.priorities[Direction.north] > this.priorities[Direction.west])) {
                if (this.priorities[Direction.northWest] > this.priorities[Direction.west]) {
                    this.$tl_mask = NORTH_NORTHWEST_WEST;
                } else {
                    this.$tl_mask = NORTH_WEST_NORTHWEST;
                }
            } else if ((this.priorities[Direction.west] > this.priorities[Direction.northWest]) &&
                       (this.priorities[Direction.west] > this.priorities[Direction.north])) {
                if (this.priorities[Direction.northWest] > this.priorities[Direction.north]) {
                    this.$tl_mask = WEST_NORTHWEST_NORTH;
                } else {
                    this.$tl_mask = WEST_NORTH_NORTHWEST;
                }
            } else {
                if (this.priorities[Direction.west] > this.priorities[Direction.north]) {
                    this.$tl_mask = NORTHWEST_WEST_NORTH;
                } else {
                    this.$tl_mask = NORTHWEST_NORTH_WEST;
                }
            }
        } else if (this.$tl_north && this.$tl_northWest) {
            if (this.priorities[Direction.north] > this.priorities[Direction.northWest]) {
                this.$tl_mask = NORTH_NORTHWEST;
            } else {
                this.$tl_mask = NORTHWEST_NORTH;
            }
        } else if (this.$tl_northWest && this.$tl_west) {
            if (this.priorities[Direction.northWest] > this.priorities[Direction.west]) {
                this.$tl_mask = NORTHWEST_WEST;
            } else {
                this.$tl_mask = WEST_NORTHWEST;
            }
        } else if (this.$tl_north && this.$tl_west) {
            if (this.priorities[Direction.north] > this.priorities[Direction.west]) {
                this.$tl_mask = NORTH_WEST;
            } else {
                this.$tl_mask = WEST_NORTH;
            }
        } else if (this.$tl_north) {
                this.$tl_mask = NORTH;
        } else if (this.$tl_northWest) {
                this.$tl_mask = NORTHWEST;
        } else if (this.$tl_west) {
                this.$tl_mask = WEST;
        } else {
            this.$tl_mask = 0;
        }

    }

    render(ctx, x=0, y=0, width=0, height=0) {

        // top left
        switch (this.$tl_mask) {
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

        // top right
        switch (this.$tr_mask) {
            case EAST:
                this.$tr_east.render(ctx, x, y, width, height);
                break;
            case NORTHEAST:
                this.$tr_northEast.render(ctx, x, y, width, height);
                break;
            case NORTH:
                this.$tr_north.render(ctx, x, y, width, height);
                break;
            case EAST_NORTH:
                this.$tr_east.render(ctx, x, y, width, height);
                this.$tr_north.render(ctx, x, y, width, height);
                break;
            case NORTH_EAST:
                this.$tr_north.render(ctx, x, y, width, height);
                this.$tr_east.render(ctx, x, y, width, height);
                break;
            case EAST_NORTHEAST:
                this.$tr_east.render(ctx, x, y, width, height);
                this.$tr_northEast.render(ctx, x, y, width, height);
                break;
            case NORTHEAST_EAST:
                this.$tr_northEast.render(ctx, x, y, width, height);
                this.$tr_east.render(ctx, x, y, width, height);
                break;
            case NORTH_NORTHEAST:
                this.$tr_north.render(ctx, x, y, width, height);
                this.$tr_northEast.render(ctx, x, y, width, height);
                break;
            case NORTHEAST_NORTH:
                this.$tr_northEast.render(ctx, x, y, width, height);
                this.$tr_north.render(ctx, x, y, width, height);
                break;
            case EAST_NORTH_NORTHEAST:
                this.$tr_east.render(ctx, x, y, width, height);
                this.$tr_north.render(ctx, x, y, width, height);
                this.$tr_northEast.render(ctx, x, y, width, height);
                break;
            case EAST_NORTHEAST_NORTH:
                this.$tr_east.render(ctx, x, y, width, height);
                this.$tr_northEast.render(ctx, x, y, width, height);
                this.$tr_north.render(ctx, x, y, width, height);
                break;
            case NORTH_EAST_NORTHEAST:
                this.$tr_north.render(ctx, x, y, width, height);
                this.$tr_east.render(ctx, x, y, width, height);
                this.$tr_northEast.render(ctx, x, y, width, height);
                break;
            case NORTH_NORTHEAST_EAST:
                this.$tr_north.render(ctx, x, y, width, height);
                this.$tr_northEast.render(ctx, x, y, width, height);
                this.$tr_east.render(ctx, x, y, width, height);
                break;
            case NORTHEAST_EAST_NORTH:
                this.$tr_northEast.render(ctx, x, y, width, height);
                this.$tr_east.render(ctx, x, y, width, height);
                this.$tr_north.render(ctx, x, y, width, height);
                break;
            case NORTHEAST_NORTH_EAST:
                this.$tr_northEast.render(ctx, x, y, width, height);
                this.$tr_north.render(ctx, x, y, width, height);
                this.$tr_east.render(ctx, x, y, width, height);
                break;
        }

        // bottom left
        switch (this.$bl_mask) {
            case WEST:
                this.$bl_west.render(ctx, x, y, width, height);
                break;
            case SOUTHWEST:
                this.$bl_southWest.render(ctx, x, y, width, height);
                break;
            case SOUTH:
                this.$bl_south.render(ctx, x, y, width, height);
                break;
            case WEST_SOUTH:
                this.$bl_west.render(ctx, x, y, width, height);
                this.$bl_south.render(ctx, x, y, width, height);
                break;
            case SOUTH_WEST:
                this.$bl_south.render(ctx, x, y, width, height);
                this.$bl_west.render(ctx, x, y, width, height);
                break;
            case WEST_SOUTHWEST:
                this.$bl_west.render(ctx, x, y, width, height);
                this.$bl_southWest.render(ctx, x, y, width, height);
                break;
            case SOUTHWEST_WEST:
                this.$bl_southWest.render(ctx, x, y, width, height);
                this.$bl_west.render(ctx, x, y, width, height);
                break;
            case SOUTH_SOUTHWEST:
                this.$bl_south.render(ctx, x, y, width, height);
                this.$bl_southWest.render(ctx, x, y, width, height);
                break;
            case SOUTHWEST_SOUTH:
                this.$bl_southWest.render(ctx, x, y, width, height);
                this.$bl_south.render(ctx, x, y, width, height);
                break;
            case WEST_SOUTH_SOUTHWEST:
                this.$bl_west.render(ctx, x, y, width, height);
                this.$bl_south.render(ctx, x, y, width, height);
                this.$bl_southWest.render(ctx, x, y, width, height);
                break;
            case WEST_SOUTHWEST_SOUTH:
                this.$bl_west.render(ctx, x, y, width, height);
                this.$bl_southWest.render(ctx, x, y, width, height);
                this.$bl_south.render(ctx, x, y, width, height);
                break;
            case SOUTH_WEST_SOUTHWEST:
                this.$bl_south.render(ctx, x, y, width, height);
                this.$bl_west.render(ctx, x, y, width, height);
                this.$bl_southWest.render(ctx, x, y, width, height);
                break;
            case SOUTH_SOUTHWEST_WEST:
                this.$bl_south.render(ctx, x, y, width, height);
                this.$bl_southWest.render(ctx, x, y, width, height);
                this.$bl_west.render(ctx, x, y, width, height);
                break;
            case SOUTHWEST_WEST_SOUTH:
                this.$bl_southWest.render(ctx, x, y, width, height);
                this.$bl_west.render(ctx, x, y, width, height);
                this.$bl_south.render(ctx, x, y, width, height);
                break;
            case SOUTHWEST_SOUTH_WEST:
                this.$bl_southWest.render(ctx, x, y, width, height);
                this.$bl_south.render(ctx, x, y, width, height);
                this.$bl_west.render(ctx, x, y, width, height);
                break;
        }

        // bottom right
        switch (this.$br_mask) {
            case EAST:
                this.$br_east.render(ctx, x, y, width, height);
                break;
            case SOUTHEAST:
                this.$br_southEast.render(ctx, x, y, width, height);
                break;
            case SOUTH:
                this.$br_south.render(ctx, x, y, width, height);
                break;
            case EAST_SOUTH:
                this.$br_east.render(ctx, x, y, width, height);
                this.$br_south.render(ctx, x, y, width, height);
                break;
            case SOUTH_EAST:
                this.$br_south.render(ctx, x, y, width, height);
                this.$br_east.render(ctx, x, y, width, height);
                break;
            case EAST_SOUTHEAST:
                this.$br_east.render(ctx, x, y, width, height);
                this.$br_southEast.render(ctx, x, y, width, height);
                break;
            case SOUTHEAST_EAST:
                this.$br_southEast.render(ctx, x, y, width, height);
                this.$br_east.render(ctx, x, y, width, height);
                break;
            case SOUTH_SOUTHEAST:
                this.$br_south.render(ctx, x, y, width, height);
                this.$br_southEast.render(ctx, x, y, width, height);
                break;
            case SOUTHEAST_SOUTH:
                this.$br_southEast.render(ctx, x, y, width, height);
                this.$br_south.render(ctx, x, y, width, height);
                break;
            case EAST_SOUTH_SOUTHEAST:
                this.$br_east.render(ctx, x, y, width, height);
                this.$br_south.render(ctx, x, y, width, height);
                this.$br_southEast.render(ctx, x, y, width, height);
                break;
            case EAST_SOUTHEAST_SOUTH:
                this.$br_east.render(ctx, x, y, width, height);
                this.$br_southEast.render(ctx, x, y, width, height);
                this.$br_south.render(ctx, x, y, width, height);
                break;
            case SOUTH_EAST_SOUTHEAST:
                this.$br_south.render(ctx, x, y, width, height);
                this.$br_east.render(ctx, x, y, width, height);
                this.$br_southEast.render(ctx, x, y, width, height);
                break;
            case SOUTH_SOUTHEAST_EAST:
                this.$br_south.render(ctx, x, y, width, height);
                this.$br_southEast.render(ctx, x, y, width, height);
                this.$br_east.render(ctx, x, y, width, height);
                break;
            case SOUTHEAST_EAST_SOUTH:
                this.$br_southEast.render(ctx, x, y, width, height);
                this.$br_east.render(ctx, x, y, width, height);
                this.$br_south.render(ctx, x, y, width, height);
                break;
            case SOUTHEAST_SOUTH_EAST:
                this.$br_southEast.render(ctx, x, y, width, height);
                this.$br_south.render(ctx, x, y, width, height);
                this.$br_east.render(ctx, x, y, width, height);
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