export { Autotiler, $TileOverlay };

import { Direction } from './direction.js';
import { Gadget, GadgetCtx } from './gadget.js';
import { Tiler } from './tiler.js';
import { Vect } from './vect.js';

//         ctl #t# #t# ctr
//         #l# #m# #m# #r#
// ctl #t# jtl #m# #m# jtr #t# ctr
// #l# #m# #m# #m# #m# #m# #m# #r#
// #l# #m# #m# #m# #m# #m# #m# #r#
// cbl #b# jbl #m# #m# jbr #b# cbr
//         #l# #m# #m# #r#
//         cbl #b# #b# cbr

const WEST =                    1;
const NORTHWEST =               2;
const NORTH =                   3;
const NORTHEAST =               4;
const EAST =                    5;
const SOUTHEAST =               6;
const SOUTH =                   7;
const SOUTHWEST =               8;

const WEST_NORTH =              9;
const WEST_NORTHWEST =          10;
const NORTH_WEST =              11;
const NORTH_NORTHWEST =         12;
const NORTHWEST_WEST =          13;
const NORTHWEST_NORTH =         14;
const WEST_NORTH_NORTHWEST =    15;
const WEST_NORTHWEST_NORTH =    16;
const NORTH_WEST_NORTHWEST =    17;
const NORTH_NORTHWEST_WEST =    18;
const NORTHWEST_WEST_NORTH =    19;
const NORTHWEST_NORTH_WEST =    20;

const EAST_NORTH =              9;
const EAST_NORTHEAST =          10;
const NORTH_EAST =              11;
const NORTH_NORTHEAST =         12;
const NORTHEAST_EAST =          13;
const NORTHEAST_NORTH =         14;
const EAST_NORTH_NORTHEAST =    15;
const EAST_NORTHEAST_NORTH =    16;
const NORTH_EAST_NORTHEAST =    17;
const NORTH_NORTHEAST_EAST =    18;
const NORTHEAST_EAST_NORTH =    19;
const NORTHEAST_NORTH_EAST =    20;

const WEST_SOUTH =              9;
const WEST_SOUTHWEST =          10;
const SOUTH_WEST =              11;
const SOUTH_SOUTHWEST =         12;
const SOUTHWEST_WEST =          13;
const SOUTHWEST_SOUTH =         14;
const WEST_SOUTH_SOUTHWEST =    15;
const WEST_SOUTHWEST_SOUTH =    16;
const SOUTH_WEST_SOUTHWEST =    17;
const SOUTH_SOUTHWEST_WEST =    18;
const SOUTHWEST_WEST_SOUTH =    19;
const SOUTHWEST_SOUTH_WEST =    20;

const EAST_SOUTH =              9;
const EAST_SOUTHEAST =          10;
const SOUTH_EAST =              11;
const SOUTH_SOUTHEAST =         12;
const SOUTHEAST_EAST =          13;
const SOUTHEAST_SOUTH =         14;
const EAST_SOUTH_SOUTHEAST =    15;
const EAST_SOUTHEAST_SOUTH =    16;
const SOUTH_EAST_SOUTHEAST =    17;
const SOUTH_SOUTHEAST_EAST =    18;
const SOUTHEAST_EAST_SOUTH =    19;
const SOUTHEAST_SOUTH_EAST =    20;

class $TileOverlay extends Gadget {
    static {
        this.$schema('idx');
        this.$schema('grid');
        this.$schema('priorityMap', { dflt:() => { return ({}); } });
        this.$schema('halfSize', { readonly:true, dflt: () => new Vect({x:16, y:16}) });

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
        //console.log(`which:${which} assettag:${assetTag}`);
        if (!(this[which]) || this[which].tag !== assetTag) {
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
    $computeTopLeft(priority) {
        // lookup neighbor info
        let t_west = this.grid.getidx(this.grid.idxFromDir(this.idx, Direction.west));
        let p_west = this.priorityMap[t_west];
        let t_north = this.grid.getidx(this.grid.idxFromDir(this.idx, Direction.north));
        let p_north = this.priorityMap[t_north];
        let t_northWest = this.grid.getidx(this.grid.idxFromDir(this.idx, Direction.northWest));
        let p_northWest = this.priorityMap[t_northWest];
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
                side = 'b';
            }
            this.$resolveSketch('$tl_north', t_north, side);
        } else {
            this.$tl_north = null;
        }
        // compute order
        if (this.$tl_north && this.$tl_northWest && this.$tl_west) {
            if ((p_north < p_northWest) &&
                (p_north < p_west)) {
                if (p_northWest < p_west) {
                    this.$tl_mask = NORTH_NORTHWEST_WEST;
                } else {
                    this.$tl_mask = NORTH_WEST_NORTHWEST;
                }
            } else if ((p_west < p_northWest) &&
                       (p_west < p_north)) {
                if (p_northWest < p_north) {
                    this.$tl_mask = WEST_NORTHWEST_NORTH;
                } else {
                    this.$tl_mask = WEST_NORTH_NORTHWEST;
                }
            } else {
                if (p_west < p_north) {
                    this.$tl_mask = NORTHWEST_WEST_NORTH;
                } else {
                    this.$tl_mask = NORTHWEST_NORTH_WEST;
                }
            }
        } else if (this.$tl_north && this.$tl_northWest) {
            if (p_north < p_northWest) {
                this.$tl_mask = NORTH_NORTHWEST;
            } else {
                this.$tl_mask = NORTHWEST_NORTH;
            }
        } else if (this.$tl_northWest && this.$tl_west) {
            if (p_northWest < p_west) {
                this.$tl_mask = NORTHWEST_WEST;
            } else {
                this.$tl_mask = WEST_NORTHWEST;
            }
        } else if (this.$tl_north && this.$tl_west) {
            if (p_north < p_west) {
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

    /**
     * top right
     * 
     * XXX|XXX    |       |XXX XXX|       |XXX XXX|XXX XXX|    XXX|XXX
     * ---+--- ---+--- ---+--- ---+--- ---+--- ---+--- ---+--- ---+---
     * ???|XXX #l#|XXX cbl|    #b#|    #l#|XXX #b#|    jbl|XXX jbl|XXX
     */
    $computeTopRight(priority) {
        // lookup neighbor info
        let t_east = this.grid.getidx(this.grid.idxFromDir(this.idx, Direction.east));
        let p_east = this.priorityMap[t_east];
        let t_north = this.grid.getidx(this.grid.idxFromDir(this.idx, Direction.north));
        let p_north = this.priorityMap[t_north];
        let t_northEast = this.grid.getidx(this.grid.idxFromDir(this.idx, Direction.northEast));
        let p_northEast = this.priorityMap[t_northEast];
        //console.log(`north:${t_north}|${p_north} northEast:${t_northEast}|${p_northEast} east:${t_east}|${p_east}`);
        // -- east overlap
        if (p_east > priority) {
            let side;
            if (p_east >= p_north) {
                side = 'jbl';
            } else {
                side = 'l';
            }
            this.$resolveSketch('$tr_east', t_east, side);
        } else {
            this.$tr_east = null;
        }
        // -- northEast overlap
        if (p_northEast > priority) {
            let side;
            if ((p_northEast >= p_east) && (p_northEast >= p_north)) {
                side = 'jbl';
            } else if (p_northEast >= p_north) {
                side = 'b';
            } else if (p_northEast >= p_east) {
                side = 'l';
            } else {
                side = 'cbl'
            }
            this.$resolveSketch('$tr_northEast', t_northEast, side);
        } else {
            this.$tr_northEast = null;
        }
        // -- north overlap
        if (p_north > priority) {
            let side;
            if (p_north >= p_east) {
                side = 'jbl';
            } else {
                side = 'b';
            }
            this.$resolveSketch('$tr_north', t_north, side);
        } else {
            this.$tr_north = null;
        }
        // compute order
        if (this.$tr_north && this.$tr_northEast && this.$tr_east) {
            if ((p_north < p_northEast) &&
                (p_north < p_east)) {
                if (p_northEast < p_east) {
                    this.$tr_mask = NORTH_NORTHEAST_EAST;
                } else {
                    this.$tr_mask = NORTH_EAST_NORTHEAST;
                }
            } else if ((p_east < p_northEast) &&
                       (p_east < p_north)) {
                if (p_northEast < p_north) {
                    this.$tr_mask = EAST_NORTHEAST_NORTH;
                } else {
                    this.$tr_mask = EAST_NORTH_NORTHEAST;
                }
            } else {
                if (p_east < p_north) {
                    this.$tr_mask = NORTHEAST_EAST_NORTH;
                } else {
                    this.$tr_mask = NORTHEAST_NORTH_EAST;
                }
            }
        } else if (this.$tr_north && this.$tr_northEast) {
            if (p_north < p_northEast) {
                this.$tr_mask = NORTH_NORTHEAST;
            } else {
                this.$tr_mask = NORTHEAST_NORTH;
            }
        } else if (this.$tr_northEast && this.$tr_east) {
            if (p_northEast < p_east) {
                this.$tr_mask = NORTHEAST_EAST;
            } else {
                this.$tr_mask = EAST_NORTHEAST;
            }
        } else if (this.$tr_north && this.$tr_east) {
            if (p_north < p_east) {
                this.$tr_mask = NORTH_EAST;
            } else {
                this.$tr_mask = EAST_NORTH;
            }
        } else if (this.$tr_north) {
                this.$tr_mask = NORTH;
        } else if (this.$tr_northEast) {
                this.$tr_mask = NORTHEAST;
        } else if (this.$tr_east) {
                this.$tr_mask = EAST;
        } else {
            this.$tr_mask = 0;
        }
    }

    /**
     * bottom left
     * 
     * XXX|??? XXX|#r#    |ctr    |#t# XXX|#r#    |#t# XXX|jtr XXX|jtr
     * ---+--- ---+--- ---+--- ---+--- ---+--- ---+--- ---+--- ---+---
     * XXX|XXX    |    XXX|       |XXX XXX|    XXX|XXX    |XXX XXX|XXX
     */
    $computeBottomLeft(priority) {
        // lookup neighbor info
        let t_west = this.grid.getidx(this.grid.idxFromDir(this.idx, Direction.west));
        let p_west = this.priorityMap[t_west];
        let t_south = this.grid.getidx(this.grid.idxFromDir(this.idx, Direction.south));
        let p_south = this.priorityMap[t_south];
        let t_southWest = this.grid.getidx(this.grid.idxFromDir(this.idx, Direction.southWest));
        let p_southWest = this.priorityMap[t_southWest];
        //console.log(`south:${t_south}|${p_south} southWest:${t_southWest}|${p_southWest} west:${t_west}|${p_west}`);
        // -- west overlap
        if (p_west > priority) {
            let side;
            if (p_west >= p_south) {
                side = 'jtr';
            } else {
                side = 'r';
            }
            this.$resolveSketch('$bl_west', t_west, side);
        } else {
            this.$bl_west = null;
        }
        // -- southWest overlap
        if (p_southWest > priority) {
            let side;
            if ((p_southWest >= p_west) && (p_southWest >= p_south)) {
                side = 'jtr';
            } else if (p_southWest >= p_south) {
                side = 't';
            } else if (p_southWest >= p_west) {
                side = 'r';
            } else {
                side = 'ctr'
            }
            this.$resolveSketch('$bl_southWest', t_southWest, side);
        } else {
            this.$bl_southWest = null;
        }
        // -- south overlap
        if (p_south > priority) {
            let side;
            if (p_south >= p_west) {
                side = 'jtr';
            } else {
                side = 't';
            }
            this.$resolveSketch('$bl_south', t_south, side);
        } else {
            this.$bl_south = null;
        }
        // compute order
        if (this.$bl_south && this.$bl_southWest && this.$bl_west) {
            if ((p_south < p_southWest) &&
                (p_south < p_west)) {
                if (p_southWest < p_west) {
                    this.$bl_mask = SOUTH_SOUTHWEST_WEST;
                } else {
                    this.$bl_mask = SOUTH_WEST_SOUTHWEST;
                }
            } else if ((p_west < p_southWest) &&
                       (p_west < p_south)) {
                if (p_southWest < p_south) {
                    this.$bl_mask = WEST_SOUTHWEST_SOUTH;
                } else {
                    this.$bl_mask = WEST_SOUTH_SOUTHWEST;
                }
            } else {
                if (p_west < p_south) {
                    this.$bl_mask = SOUTHWEST_WEST_SOUTH;
                } else {
                    this.$bl_mask = SOUTHWEST_SOUTH_WEST;
                }
            }
        } else if (this.$bl_south && this.$bl_southWest) {
            if (p_south < p_southWest) {
                this.$bl_mask = SOUTH_SOUTHWEST;
            } else {
                this.$bl_mask = SOUTHWEST_SOUTH;
            }
        } else if (this.$bl_southWest && this.$bl_west) {
            if (p_southWest < p_west) {
                this.$bl_mask = SOUTHWEST_WEST;
            } else {
                this.$bl_mask = WEST_SOUTHWEST;
            }
        } else if (this.$bl_south && this.$bl_west) {
            if (p_south < p_west) {
                this.$bl_mask = SOUTH_WEST;
            } else {
                this.$bl_mask = WEST_SOUTH;
            }
        } else if (this.$bl_south) {
                this.$bl_mask = SOUTH;
        } else if (this.$bl_southWest) {
                this.$bl_mask = SOUTHWEST;
        } else if (this.$bl_west) {
                this.$bl_mask = WEST;
        } else {
            this.$bl_mask = 0;
        }
    }

    /**
     * bottom right
     * 
     * ???|XXX #l#|XXX ctl|    #t#|    #l#|XXX #t#|    jtl|XXX jtl|XXX
     * ---+--- ---+--- ---+--- ---+--- ---+--- ---+--- ---+--- ---+---
     * XXX|XXX    |       |XXX XXX|       |XXX XXX|XXX XXX|    XXX|XXX
     */
    $computeBottomRight(priority) {
        // lookup neighbor info
        let t_east = this.grid.getidx(this.grid.idxFromDir(this.idx, Direction.east));
        let p_east = this.priorityMap[t_east];
        let t_south = this.grid.getidx(this.grid.idxFromDir(this.idx, Direction.south));
        let p_south = this.priorityMap[t_south];
        let t_southEast = this.grid.getidx(this.grid.idxFromDir(this.idx, Direction.southEast));
        let p_southEast = this.priorityMap[t_southEast];
        //console.log(`south:${t_south}|${p_south} southEast:${t_southEast}|${p_southEast} east:${t_east}|${p_east}`);
        // -- east overlap
        if (p_east > priority) {
            let side;
            if (p_east >= p_south) {
                side = 'jtl';
            } else {
                side = 'l';
            }
            this.$resolveSketch('$br_east', t_east, side);
        } else {
            this.$br_east = null;
        }
        // -- southEast overlap
        if (p_southEast > priority) {
            let side;
            if ((p_southEast >= p_east) && (p_southEast >= p_south)) {
                side = 'jtl';
            } else if (p_southEast >= p_south) {
                side = 't';
            } else if (p_southEast >= p_east) {
                side = 'l';
            } else {
                side = 'ctl'
            }
            this.$resolveSketch('$br_southEast', t_southEast, side);
        } else {
            this.$br_southEast = null;
        }
        // -- south overlap
        if (p_south > priority) {
            let side;
            if (p_south >= p_east) {
                side = 'jtl';
            } else {
                side = 't';
            }
            this.$resolveSketch('$br_south', t_south, side);
        } else {
            this.$br_south = null;
        }
        // compute order
        if (this.$br_south && this.$br_southEast && this.$br_east) {
            if ((p_south < p_southEast) &&
                (p_south < p_east)) {
                if (p_southEast < p_east) {
                    this.$br_mask = SOUTH_SOUTHEAST_EAST;
                } else {
                    this.$br_mask = SOUTH_EAST_SOUTHEAST;
                }
            } else if ((p_east < p_southEast) &&
                       (p_east < p_south)) {
                if (p_southEast < p_south) {
                    this.$br_mask = EAST_SOUTHEAST_SOUTH;
                } else {
                    this.$br_mask = EAST_SOUTH_SOUTHEAST;
                }
            } else {
                if (p_east < p_south) {
                    this.$br_mask = SOUTHEAST_EAST_SOUTH;
                } else {
                    this.$br_mask = SOUTHEAST_SOUTH_EAST;
                }
            }
        } else if (this.$br_south && this.$br_southEast) {
            if (p_south < p_southEast) {
                this.$br_mask = SOUTH_SOUTHEAST;
            } else {
                this.$br_mask = SOUTHEAST_SOUTH;
            }
        } else if (this.$br_southEast && this.$br_east) {
            if (p_southEast < p_east) {
                this.$br_mask = SOUTHEAST_EAST;
            } else {
                this.$br_mask = EAST_SOUTHEAST;
            }
        } else if (this.$br_south && this.$br_east) {
            if (p_south < p_east) {
                this.$br_mask = SOUTH_EAST;
            } else {
                this.$br_mask = EAST_SOUTH;
            }
        } else if (this.$br_south) {
                this.$br_mask = SOUTH;
        } else if (this.$br_southEast) {
                this.$br_mask = SOUTHEAST;
        } else if (this.$br_east) {
                this.$br_mask = EAST;
        } else {
            this.$br_mask = 0;
        }
    }

    $compute() {
        let tag = this.grid.getidx(this.idx);
        let priority = this.priorityMap[tag];
        this.$computeTopLeft(priority);
        this.$computeTopRight(priority);
        this.$computeBottomLeft(priority);
        this.$computeBottomRight(priority);
    }

    render(ctx, x=0, y=0, width=0, height=0) {
        let hwidth = width/2;
        let hheight = height/2;
        // top left
        let sx = x;
        let sy = y;
        switch (this.$tl_mask) {
            case WEST:
                this.$tl_west.render(ctx, sx, sy, hwidth, hheight);
                break;
            case NORTHWEST:
                this.$tl_northWest.render(ctx, sx, sy, hwidth, hheight);
                break;
            case NORTH:
                this.$tl_north.render(ctx, sx, sy, hwidth, hheight);
                break;
            case WEST_NORTH:
                this.$tl_west.render(ctx, sx, sy, hwidth, hheight);
                this.$tl_north.render(ctx, sx, sy, hwidth, hheight);
                break;
            case NORTH_WEST:
                this.$tl_north.render(ctx, sx, sy, hwidth, hheight);
                this.$tl_west.render(ctx, sx, sy, hwidth, hheight);
                break;
            case WEST_NORTHWEST:
                this.$tl_west.render(ctx, sx, sy, hwidth, hheight);
                this.$tl_northWest.render(ctx, sx, sy, hwidth, hheight);
                break;
            case NORTHWEST_WEST:
                this.$tl_northWest.render(ctx, sx, sy, hwidth, hheight);
                this.$tl_west.render(ctx, sx, sy, hwidth, hheight);
                break;
            case NORTH_NORTHWEST:
                this.$tl_north.render(ctx, sx, sy, hwidth, hheight);
                this.$tl_northWest.render(ctx, sx, sy, hwidth, hheight);
                break;
            case NORTHWEST_NORTH:
                this.$tl_northWest.render(ctx, sx, sy, hwidth, hheight);
                this.$tl_north.render(ctx, sx, sy, hwidth, hheight);
                break;
            case WEST_NORTH_NORTHWEST:
                this.$tl_west.render(ctx, sx, sy, hwidth, hheight);
                this.$tl_north.render(ctx, sx, sy, hwidth, hheight);
                this.$tl_northWest.render(ctx, sx, sy, hwidth, hheight);
                break;
            case WEST_NORTHWEST_NORTH:
                this.$tl_west.render(ctx, sx, sy, hwidth, hheight);
                this.$tl_northWest.render(ctx, sx, sy, hwidth, hheight);
                this.$tl_north.render(ctx, sx, sy, hwidth, hheight);
                break;
            case NORTH_WEST_NORTHWEST:
                this.$tl_north.render(ctx, sx, sy, hwidth, hheight);
                this.$tl_west.render(ctx, sx, sy, hwidth, hheight);
                this.$tl_northWest.render(ctx, sx, sy, hwidth, hheight);
                break;
            case NORTH_NORTHWEST_WEST:
                this.$tl_north.render(ctx, sx, sy, hwidth, hheight);
                this.$tl_northWest.render(ctx, sx, sy, hwidth, hheight);
                this.$tl_west.render(ctx, sx, sy, hwidth, hheight);
                break;
            case NORTHWEST_WEST_NORTH:
                this.$tl_northWest.render(ctx, sx, sy, hwidth, hheight);
                this.$tl_west.render(ctx, sx, sy, hwidth, hheight);
                this.$tl_north.render(ctx, sx, sy, hwidth, hheight);
                break;
            case NORTHWEST_NORTH_WEST:
                this.$tl_northWest.render(ctx, sx, sy, hwidth, hheight);
                this.$tl_north.render(ctx, sx, sy, hwidth, hheight);
                this.$tl_west.render(ctx, sx, sy, hwidth, hheight);
                break;
        }

        // top right
        sx = x + this.halfSize.x;
        sy = y;
        switch (this.$tr_mask) {
            case EAST:
                this.$tr_east.render(ctx, sx, sy, hwidth, hheight);
                break;
            case NORTHEAST:
                this.$tr_northEast.render(ctx, sx, sy, hwidth, hheight);
                break;
            case NORTH:
                this.$tr_north.render(ctx, sx, sy, hwidth, hheight);
                break;
            case EAST_NORTH:
                this.$tr_east.render(ctx, sx, sy, hwidth, hheight);
                this.$tr_north.render(ctx, sx, sy, hwidth, hheight);
                break;
            case NORTH_EAST:
                this.$tr_north.render(ctx, sx, sy, hwidth, hheight);
                this.$tr_east.render(ctx, sx, sy, hwidth, hheight);
                break;
            case EAST_NORTHEAST:
                this.$tr_east.render(ctx, sx, sy, hwidth, hheight);
                this.$tr_northEast.render(ctx, sx, sy, hwidth, hheight);
                break;
            case NORTHEAST_EAST:
                this.$tr_northEast.render(ctx, sx, sy, hwidth, hheight);
                this.$tr_east.render(ctx, sx, sy, hwidth, hheight);
                break;
            case NORTH_NORTHEAST:
                this.$tr_north.render(ctx, sx, sy, hwidth, hheight);
                this.$tr_northEast.render(ctx, sx, sy, hwidth, hheight);
                break;
            case NORTHEAST_NORTH:
                this.$tr_northEast.render(ctx, sx, sy, hwidth, hheight);
                this.$tr_north.render(ctx, sx, sy, hwidth, hheight);
                break;
            case EAST_NORTH_NORTHEAST:
                this.$tr_east.render(ctx, sx, sy, hwidth, hheight);
                this.$tr_north.render(ctx, sx, sy, hwidth, hheight);
                this.$tr_northEast.render(ctx, sx, sy, hwidth, hheight);
                break;
            case EAST_NORTHEAST_NORTH:
                this.$tr_east.render(ctx, sx, sy, hwidth, hheight);
                this.$tr_northEast.render(ctx, sx, sy, hwidth, hheight);
                this.$tr_north.render(ctx, sx, sy, hwidth, hheight);
                break;
            case NORTH_EAST_NORTHEAST:
                this.$tr_north.render(ctx, sx, sy, hwidth, hheight);
                this.$tr_east.render(ctx, sx, sy, hwidth, hheight);
                this.$tr_northEast.render(ctx, sx, sy, hwidth, hheight);
                break;
            case NORTH_NORTHEAST_EAST:
                this.$tr_north.render(ctx, sx, sy, hwidth, hheight);
                this.$tr_northEast.render(ctx, sx, sy, hwidth, hheight);
                this.$tr_east.render(ctx, sx, sy, hwidth, hheight);
                break;
            case NORTHEAST_EAST_NORTH:
                this.$tr_northEast.render(ctx, sx, sy, hwidth, hheight);
                this.$tr_east.render(ctx, sx, sy, hwidth, hheight);
                this.$tr_north.render(ctx, sx, sy, hwidth, hheight);
                break;
            case NORTHEAST_NORTH_EAST:
                this.$tr_northEast.render(ctx, sx, sy, hwidth, hheight);
                this.$tr_north.render(ctx, sx, sy, hwidth, hheight);
                this.$tr_east.render(ctx, sx, sy, hwidth, hheight);
                break;
        }

        // bottom left
        sx = x;
        sy = y + this.halfSize.y;
        switch (this.$bl_mask) {
            case WEST:
                this.$bl_west.render(ctx, sx, sy, hwidth, hheight);
                break;
            case SOUTHWEST:
                this.$bl_southWest.render(ctx, sx, sy, hwidth, hheight);
                break;
            case SOUTH:
                this.$bl_south.render(ctx, sx, sy, hwidth, hheight);
                break;
            case WEST_SOUTH:
                this.$bl_west.render(ctx, sx, sy, hwidth, hheight);
                this.$bl_south.render(ctx, sx, sy, hwidth, hheight);
                break;
            case SOUTH_WEST:
                this.$bl_south.render(ctx, sx, sy, hwidth, hheight);
                this.$bl_west.render(ctx, sx, sy, hwidth, hheight);
                break;
            case WEST_SOUTHWEST:
                this.$bl_west.render(ctx, sx, sy, hwidth, hheight);
                this.$bl_southWest.render(ctx, sx, sy, hwidth, hheight);
                break;
            case SOUTHWEST_WEST:
                this.$bl_southWest.render(ctx, sx, sy, hwidth, hheight);
                this.$bl_west.render(ctx, sx, sy, hwidth, hheight);
                break;
            case SOUTH_SOUTHWEST:
                this.$bl_south.render(ctx, sx, sy, hwidth, hheight);
                this.$bl_southWest.render(ctx, sx, sy, hwidth, hheight);
                break;
            case SOUTHWEST_SOUTH:
                this.$bl_southWest.render(ctx, sx, sy, hwidth, hheight);
                this.$bl_south.render(ctx, sx, sy, hwidth, hheight);
                break;
            case WEST_SOUTH_SOUTHWEST:
                this.$bl_west.render(ctx, sx, sy, hwidth, hheight);
                this.$bl_south.render(ctx, sx, sy, hwidth, hheight);
                this.$bl_southWest.render(ctx, sx, sy, hwidth, hheight);
                break;
            case WEST_SOUTHWEST_SOUTH:
                this.$bl_west.render(ctx, sx, sy, hwidth, hheight);
                this.$bl_southWest.render(ctx, sx, sy, hwidth, hheight);
                this.$bl_south.render(ctx, sx, sy, hwidth, hheight);
                break;
            case SOUTH_WEST_SOUTHWEST:
                this.$bl_south.render(ctx, sx, sy, hwidth, hheight);
                this.$bl_west.render(ctx, sx, sy, hwidth, hheight);
                this.$bl_southWest.render(ctx, sx, sy, hwidth, hheight);
                break;
            case SOUTH_SOUTHWEST_WEST:
                this.$bl_south.render(ctx, sx, sy, hwidth, hheight);
                this.$bl_southWest.render(ctx, sx, sy, hwidth, hheight);
                this.$bl_west.render(ctx, sx, sy, hwidth, hheight);
                break;
            case SOUTHWEST_WEST_SOUTH:
                this.$bl_southWest.render(ctx, sx, sy, hwidth, hheight);
                this.$bl_west.render(ctx, sx, sy, hwidth, hheight);
                this.$bl_south.render(ctx, sx, sy, hwidth, hheight);
                break;
            case SOUTHWEST_SOUTH_WEST:
                this.$bl_southWest.render(ctx, sx, sy, hwidth, hheight);
                this.$bl_south.render(ctx, sx, sy, hwidth, hheight);
                this.$bl_west.render(ctx, sx, sy, hwidth, hheight);
                break;
        }

        // bottom right
        sx = x + this.halfSize.x;
        sy = y + this.halfSize.y;
        switch (this.$br_mask) {
            case EAST:
                this.$br_east.render(ctx, sx, sy, hwidth, hheight);
                break;
            case SOUTHEAST:
                this.$br_southEast.render(ctx, sx, sy, hwidth, hheight);
                break;
            case SOUTH:
                this.$br_south.render(ctx, sx, sy, hwidth, hheight);
                break;
            case EAST_SOUTH:
                this.$br_east.render(ctx, sx, sy, hwidth, hheight);
                this.$br_south.render(ctx, sx, sy, hwidth, hheight);
                break;
            case SOUTH_EAST:
                this.$br_south.render(ctx, sx, sy, hwidth, hheight);
                this.$br_east.render(ctx, sx, sy, hwidth, hheight);
                break;
            case EAST_SOUTHEAST:
                this.$br_east.render(ctx, sx, sy, hwidth, hheight);
                this.$br_southEast.render(ctx, sx, sy, hwidth, hheight);
                break;
            case SOUTHEAST_EAST:
                this.$br_southEast.render(ctx, sx, sy, hwidth, hheight);
                this.$br_east.render(ctx, sx, sy, hwidth, hheight);
                break;
            case SOUTH_SOUTHEAST:
                this.$br_south.render(ctx, sx, sy, hwidth, hheight);
                this.$br_southEast.render(ctx, sx, sy, hwidth, hheight);
                break;
            case SOUTHEAST_SOUTH:
                this.$br_southEast.render(ctx, sx, sy, hwidth, hheight);
                this.$br_south.render(ctx, sx, sy, hwidth, hheight);
                break;
            case EAST_SOUTH_SOUTHEAST:
                this.$br_east.render(ctx, sx, sy, hwidth, hheight);
                this.$br_south.render(ctx, sx, sy, hwidth, hheight);
                this.$br_southEast.render(ctx, sx, sy, hwidth, hheight);
                break;
            case EAST_SOUTHEAST_SOUTH:
                this.$br_east.render(ctx, sx, sy, hwidth, hheight);
                this.$br_southEast.render(ctx, sx, sy, hwidth, hheight);
                this.$br_south.render(ctx, sx, sy, hwidth, hheight);
                break;
            case SOUTH_EAST_SOUTHEAST:
                this.$br_south.render(ctx, sx, sy, hwidth, hheight);
                this.$br_east.render(ctx, sx, sy, hwidth, hheight);
                this.$br_southEast.render(ctx, sx, sy, hwidth, hheight);
                break;
            case SOUTH_SOUTHEAST_EAST:
                this.$br_south.render(ctx, sx, sy, hwidth, hheight);
                this.$br_southEast.render(ctx, sx, sy, hwidth, hheight);
                this.$br_east.render(ctx, sx, sy, hwidth, hheight);
                break;
            case SOUTHEAST_EAST_SOUTH:
                this.$br_southEast.render(ctx, sx, sy, hwidth, hheight);
                this.$br_east.render(ctx, sx, sy, hwidth, hheight);
                this.$br_south.render(ctx, sx, sy, hwidth, hheight);
                break;
            case SOUTHEAST_SOUTH_EAST:
                this.$br_southEast.render(ctx, sx, sy, hwidth, hheight);
                this.$br_south.render(ctx, sx, sy, hwidth, hheight);
                this.$br_east.render(ctx, sx, sy, hwidth, hheight);
                break;
        }

    }
}

class Autotiler extends Tiler {

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