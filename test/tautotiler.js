import { $TileOverlay } from '../js/autotiler.js';
import { GadgetCtx } from '../js/gadget.js';
import { GridArray } from '../js/gridArray.js';
import { Rect } from '../js/rect.js';

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

describe('an autotiler overlay tile', () => {
    var gctx;
    const priorityMap = { one:1, two:2, three:3, four:4 };
    const sides = [ 'ctl', 't', 'ctr', 'r', 'm', 'jtr', 'cbr', 'b', 'jbr', 'cbl', 'l', 'jbl', 'jtl' ];
    const tags = [ 'one', 'two', 'three', 'four' ];
    beforeEach(() => {
        gctx = new GadgetCtx();
        GadgetCtx.current = gctx;
        for (const tag of tags) {
            for (const side of sides) {
                gctx.assets.$add(new Rect({tag:`${tag}.${side}`}));
            }
        }
    });

    function _sktag(sketch) {
        if (!sketch) return null;
        return sketch.tag;
    }

    // XXX|XXX    |    XXX|       |XXX XXX|    XXX|XXX    |XXX XXX|XXX
    // ---+--- ---+--- ---+--- ---+--- ---+--- ---+--- ---+--- ---+---
    // XXX|??? XXX|#r#    |cbr    |#b# XXX|#r#    |#b# XXX|jbr XXX|jbr
    for (const test of [
        { data:[undefined,undefined,undefined,'one'], x_mask:0, x_west:null, x_northWest:null, x_north:null },
        { data:[undefined,undefined,'four','one'], x_mask:WEST, x_west:'four.r', x_northWest:null, x_north:null },
        { data:['four',undefined,undefined,'one'], x_mask:NORTHWEST, x_west:null, x_northWest:'four.cbr', x_north:null },
        { data:[undefined,'four',undefined,'one'], x_mask:NORTH, x_west:null, x_northWest:null, x_north:'four.b' },
        { data:['two',undefined,'four','one'], x_mask:NORTHWEST_WEST, x_west:'four.r', x_northWest:'two.cbr', x_north:null },
        { data:['four',undefined,'two','one'], x_mask:WEST_NORTHWEST, x_west:'two.r', x_northWest:'four.r', x_north:null },
        { data:['two','four',undefined,'one'], x_mask:NORTHWEST_NORTH, x_west:null, x_northWest:'two.cbr', x_north:'four.b' },
        { data:['four','two',undefined,'one'], x_mask:NORTH_NORTHWEST, x_west:null, x_northWest:'four.b', x_north:'two.b' },
        { data:[null,'two','four','one'], x_mask:NORTH_WEST, x_west:'four.jbr', x_northWest:null, x_north:'two.b' },
        { data:[null,'four','two','one'], x_mask:WEST_NORTH, x_west:'two.r', x_northWest:null, x_north:'four.jbr' },
        { data:['two','three','four','one'], x_mask:NORTHWEST_NORTH_WEST, x_west:'four.jbr', x_northWest:'two.cbr', x_north:'three.b' },
        { data:['two','four','three','one'], x_mask:NORTHWEST_WEST_NORTH, x_west:'three.r', x_northWest:'two.cbr', x_north:'four.jbr' },
        { data:['three','four','two','one'], x_mask:WEST_NORTHWEST_NORTH, x_west:'two.r', x_northWest:'three.r', x_north:'four.jbr' },
        { data:['four','three','two','one'], x_mask:WEST_NORTH_NORTHWEST, x_west:'two.r', x_northWest:'four.jbr', x_north:'three.jbr' },
        { data:['four','two','three','one'], x_mask:NORTH_WEST_NORTHWEST, x_west:'three.jbr', x_northWest:'four.jbr', x_north:'two.b' },
        { data:['three','two','four','one'], x_mask:NORTH_NORTHWEST_WEST, x_west:'four.jbr', x_northWest:'three.b', x_north:'two.b' },
    ]) {
        it(`top left test for ${test.data}`, ()=>{
            let grid = new GridArray({rows:2,cols:2,entries:test.data});
            let o = new $TileOverlay({idx:3, grid:grid, priorityMap:priorityMap});
            expect(o.$tl_mask).toEqual(test.x_mask);
            expect(_sktag(o.$tl_west)).toEqual(test.x_west);
            expect(_sktag(o.$tl_northWest)).toEqual(test.x_northWest);
            expect(_sktag(o.$tl_north)).toEqual(test.x_north);
        });
    }

    // XXX|XXX    |       |XXX XXX|       |XXX XXX|XXX XXX|    XXX|XXX
    // ---+--- ---+--- ---+--- ---+--- ---+--- ---+--- ---+--- ---+---
    // ???|XXX #l#|XXX cbl|    #b#|    #l#|XXX #b#|    jbl|XXX jbl|XXX
    for (const test of [
        { data:[undefined,undefined,'one',undefined], x_mask:0, x_east:null, x_northEast:null, x_north:null },
        { data:[undefined,undefined,'one','four'], x_mask:EAST, x_east:'four.l', x_northEast:null, x_north:null },
        { data:[undefined,'four','one',undefined], x_mask:NORTHEAST, x_east:null, x_northEast:'four.cbl', x_north:null },
        { data:['four',undefined,'one',undefined], x_mask:NORTH, x_east:null, x_northEast:null, x_north:'four.b' },
        { data:[undefined,'two','one','four'], x_mask:NORTHEAST_EAST, x_east:'four.l', x_northEast:'two.cbl', x_north:null },
        { data:[undefined,'four','one','two'], x_mask:EAST_NORTHEAST, x_east:'two.l', x_northEast:'four.l', x_north:null },
        { data:['four','two','one',undefined], x_mask:NORTHEAST_NORTH, x_east:null, x_northEast:'two.cbl', x_north:'four.b' },
        { data:['two','four','one',undefined], x_mask:NORTH_NORTHEAST, x_east:null, x_northEast:'four.b', x_north:'two.b' },
        { data:['two',undefined,'one','four'], x_mask:NORTH_EAST, x_east:'four.jbl', x_northEast:null, x_north:'two.b' },
        { data:['four',undefined,'one','two'], x_mask:EAST_NORTH, x_east:'two.l', x_northEast:null, x_north:'four.jbl' },
        { data:['three','two','one','four'], x_mask:NORTHEAST_NORTH_EAST, x_east:'four.jbl', x_northEast:'two.cbl', x_north:'three.b' },
        { data:['four','two','one','three'], x_mask:NORTHEAST_EAST_NORTH, x_east:'three.l', x_northEast:'two.cbl', x_north:'four.jbl' },
        { data:['four','three','one','two'], x_mask:EAST_NORTHEAST_NORTH, x_east:'two.l', x_northEast:'three.l', x_north:'four.jbl' },
        { data:['three','four','one','two'], x_mask:EAST_NORTH_NORTHEAST, x_east:'two.l', x_northEast:'four.jbl', x_north:'three.jbl' },
        { data:['two','four','one','three'], x_mask:NORTH_EAST_NORTHEAST, x_east:'three.jbl', x_northEast:'four.jbl', x_north:'two.b' },
        { data:['two','three','one','four'], x_mask:NORTH_NORTHEAST_EAST, x_east:'four.jbl', x_northEast:'three.b', x_north:'two.b' },
    ]) {
        it(`top right test for ${test.data}`, ()=>{
            let grid = new GridArray({rows:2,cols:2,entries:test.data});
            let o = new $TileOverlay({idx:2, grid:grid, priorityMap:priorityMap});
            expect(o.$tr_mask).toEqual(test.x_mask);
            expect(_sktag(o.$tr_east)).toEqual(test.x_east);
            expect(_sktag(o.$tr_northEast)).toEqual(test.x_northEast);
            expect(_sktag(o.$tr_north)).toEqual(test.x_north);
        });
    }

    // XXX|XXX    |    XXX|       |XXX XXX|    XXX|XXX    |XXX XXX|XXX
    // ---+--- ---+--- ---+--- ---+--- ---+--- ---+--- ---+--- ---+---
    // XXX|??? XXX|#r#    |cbr    |#b# XXX|#r#    |#b# XXX|jbr XXX|jbr
    for (const test of [
        { data:[undefined,undefined,undefined,'one'], x_mask:0, x_west:null, x_southWest:null, x_south:null },
        { data:['four','one',undefined,undefined], x_mask:WEST, x_west:'four.r', x_southWest:null, x_south:null },
        { data:[undefined,'one','four',undefined], x_mask:SOUTHWEST, x_west:null, x_southWest:'four.ctr', x_south:null },
        { data:[undefined,'one',undefined,'four'], x_mask:SOUTH, x_west:null, x_southWest:null, x_south:'four.t' },
        { data:['four','one','two',undefined], x_mask:SOUTHWEST_WEST, x_west:'four.r', x_southWest:'two.ctr', x_south:null },
        { data:['two','one','four',undefined], x_mask:WEST_SOUTHWEST, x_west:'two.r', x_southWest:'four.r', x_south:null },
        { data:[undefined,'one','two','four'], x_mask:SOUTHWEST_SOUTH, x_west:null, x_southWest:'two.ctr', x_south:'four.t' },
        { data:[undefined,'one','four','two'], x_mask:SOUTH_SOUTHWEST, x_west:null, x_southWest:'four.t', x_south:'two.t' },
        { data:['four','one',undefined,'two'], x_mask:SOUTH_WEST, x_west:'four.jtr', x_southWest:null, x_south:'two.t' },
        { data:['two','one',undefined,'four'], x_mask:WEST_SOUTH, x_west:'two.r', x_southWest:null, x_south:'four.jtr' },
        { data:['four','one','two','three'], x_mask:SOUTHWEST_SOUTH_WEST, x_west:'four.jtr', x_southWest:'two.ctr', x_south:'three.t' },
        { data:['three','one','two','four'], x_mask:SOUTHWEST_WEST_SOUTH, x_west:'three.r', x_southWest:'two.ctr', x_south:'four.jtr' },
        { data:['two','one','three','four'], x_mask:WEST_SOUTHWEST_SOUTH, x_west:'two.r', x_southWest:'three.r', x_south:'four.jtr' },
        { data:['two','one','four','three'], x_mask:WEST_SOUTH_SOUTHWEST, x_west:'two.r', x_southWest:'four.jtr', x_south:'three.jtr' },
        { data:['three','one','four','two'], x_mask:SOUTH_WEST_SOUTHWEST, x_west:'three.jtr', x_southWest:'four.jtr', x_south:'two.t' },
        { data:['four','one','three','two'], x_mask:SOUTH_SOUTHWEST_WEST, x_west:'four.jtr', x_southWest:'three.t', x_south:'two.t' },
    ]) {
        it(`bottom left test for ${test.data}`, ()=>{
            let grid = new GridArray({rows:2,cols:2,entries:test.data});
            let o = new $TileOverlay({idx:1, grid:grid, priorityMap:priorityMap});
            expect(o.$bl_mask).toEqual(test.x_mask);
            expect(_sktag(o.$bl_west)).toEqual(test.x_west);
            expect(_sktag(o.$bl_southWest)).toEqual(test.x_southWest);
            expect(_sktag(o.$bl_south)).toEqual(test.x_south);
        });
    }

    // ???|XXX #l#|XXX ctl|    #t#|    #l#|XXX #t#|    jtl|XXX jtl|XXX
    // ---+--- ---+--- ---+--- ---+--- ---+--- ---+--- ---+--- ---+---
    // XXX|XXX    |       |XXX XXX|       |XXX XXX|XXX XXX|    XXX|XXX
    for (const test of [
        { data:['one',undefined,undefined,undefined], x_mask:0, x_east:null, x_southEast:null, x_south:null },
        { data:['one','four',undefined,undefined], x_mask:EAST, x_east:'four.l', x_southEast:null, x_south:null },
        { data:['one',undefined,undefined,'four'], x_mask:SOUTHEAST, x_east:null, x_southEast:'four.ctl', x_south:null },
        { data:['one',undefined,'four',undefined], x_mask:SOUTH, x_east:null, x_southEast:null, x_south:'four.t' },
        { data:['one','four',undefined,'two'], x_mask:SOUTHEAST_EAST, x_east:'four.l', x_southEast:'two.ctl', x_south:null },
        { data:['one','two',undefined,'four'], x_mask:EAST_SOUTHEAST, x_east:'two.l', x_southEast:'four.l', x_south:null },
        { data:['one',undefined,'four','two'], x_mask:SOUTHEAST_SOUTH, x_east:null, x_southEast:'two.ctl', x_south:'four.t' },
        { data:['one',undefined,'two','four'], x_mask:SOUTH_SOUTHEAST, x_east:null, x_southEast:'four.t', x_south:'two.t' },
        { data:['one','four','two',undefined], x_mask:SOUTH_EAST, x_east:'four.jtl', x_southEast:null, x_south:'two.t' },
        { data:['one','two','four',undefined], x_mask:EAST_SOUTH, x_east:'two.l', x_southEast:null, x_south:'four.jtl' },
        { data:['one','four','three','two'], x_mask:SOUTHEAST_SOUTH_EAST, x_east:'four.jtl', x_southEast:'two.ctl', x_south:'three.t' },
        { data:['one','three','four','two'], x_mask:SOUTHEAST_EAST_SOUTH, x_east:'three.l', x_southEast:'two.ctl', x_south:'four.jtl' },
        { data:['one','two','four','three'], x_mask:EAST_SOUTHEAST_SOUTH, x_east:'two.l', x_southEast:'three.l', x_south:'four.jtl' },
        { data:['one','two','three','four'], x_mask:EAST_SOUTH_SOUTHEAST, x_east:'two.l', x_southEast:'four.jtl', x_south:'three.jtl' },
        { data:['one','three','two','four'], x_mask:SOUTH_EAST_SOUTHEAST, x_east:'three.jtl', x_southEast:'four.jtl', x_south:'two.t' },
        { data:['one','four','two','three'], x_mask:SOUTH_SOUTHEAST_EAST, x_east:'four.jtl', x_southEast:'three.t', x_south:'two.t' },
    ]) {
        it(`bottom right test for ${test.data}`, ()=>{
            let grid = new GridArray({rows:2,cols:2,entries:test.data});
            let o = new $TileOverlay({idx:0, grid:grid, priorityMap:priorityMap});
            expect(o.$br_mask).toEqual(test.x_mask);
            expect(_sktag(o.$br_east)).toEqual(test.x_east);
            expect(_sktag(o.$br_southEast)).toEqual(test.x_southEast);
            expect(_sktag(o.$br_south)).toEqual(test.x_south);
        });
    }

});