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
                gctx.assets.$add(new Rect({tag:`${tag}_${side}`}));
            }
        }
    });

    function _sktag(sketch) {
        if (!sketch) return null;
        return sketch.tag;
    }

    // xx ^^    xx ..
    // xx ^^    xx ..
    //   
    // XX oo    .. /.
    // XX oo    .. ..

    // XXX|XXX    |    XXX|       |XXX XXX|    XXX|XXX    |XXX XXX|XXX
    // ---+--- ---+--- ---+--- ---+--- ---+--- ---+--- ---+--- ---+---
    // XXX|??? XXX|#r#    |cbr    |#b# XXX|#r#    |#b# XXX|jbr XXX|jbr
    for (const test of [
        { data:[null,null,null,'one'], x_mask:0, x_west:null, x_northWest:null, x_north:null },
        { data:[null,null,'four','one'], x_mask:WEST, x_west:'four_r', x_northWest:null, x_north:null },
        { data:['four',null,null,'one'], x_mask:NORTHWEST, x_west:null, x_northWest:'four_cbr', x_north:null },
        { data:[null,'four',null,'one'], x_mask:NORTH, x_west:null, x_northWest:null, x_north:'four_b' },
        { data:['two',null,'four','one'], x_mask:NORTHWEST_WEST, x_west:'four_r', x_northWest:'two_cbr', x_north:null },
        { data:['four',null,'two','one'], x_mask:WEST_NORTHWEST, x_west:'two_r', x_northWest:'four_cbr', x_north:null },
        { data:['four',null,'four','one'], x_mask:NORTHWEST_WEST, x_west:'four_r', x_northWest:'four_r', x_north:null },
        { data:['two','four',null,'one'], x_mask:NORTHWEST_NORTH, x_west:null, x_northWest:'two_cbr', x_north:'four_b' },
        { data:['four','two',null,'one'], x_mask:NORTH_NORTHWEST, x_west:null, x_northWest:'four_cbr', x_north:'two_b' },
        { data:['four','four',null,'one'], x_mask:NORTH_NORTHWEST, x_west:null, x_northWest:'four_b', x_north:'four_b' },
        { data:[null,'two','four','one'], x_mask:NORTH_WEST, x_west:'four_r', x_northWest:null, x_north:'two_b' },
        { data:[null,'four','two','one'], x_mask:WEST_NORTH, x_west:'two_r', x_northWest:null, x_north:'four_b' },
        { data:[null,'four','four','one'], x_mask:NORTH_WEST, x_west:'four_jbr', x_northWest:null, x_north:'four_jbr' },
        { data:['two','three','four','one'], x_mask:NORTHWEST_NORTH_WEST, x_west:'four_r', x_northWest:'two_cbr', x_north:'three_b' },
        { data:['two','four','three','one'], x_mask:NORTHWEST_WEST_NORTH, x_west:'three_r', x_northWest:'two_cbr', x_north:'four_b' },
        { data:['three','four','two','one'], x_mask:WEST_NORTHWEST_NORTH, x_west:'two_r', x_northWest:'three_cbr', x_north:'four_b' },
        { data:['four','three','two','one'], x_mask:WEST_NORTH_NORTHWEST, x_west:'two_r', x_northWest:'four_cbr', x_north:'three_b' },
        { data:['four','two','three','one'], x_mask:NORTH_WEST_NORTHWEST, x_west:'three_r', x_northWest:'four_cbr', x_north:'two_b' },
        { data:['three','two','four','one'], x_mask:NORTH_NORTHWEST_WEST, x_west:'four_r', x_northWest:'three_cbr', x_north:'two_b' },
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
        { data:[null,null,'one',null], x_mask:0, x_east:null, x_northEast:null, x_north:null },
        { data:[null,null,'one','four'], x_mask:EAST, x_east:'four_l', x_northEast:null, x_north:null },
        { data:[null,'four','one',null], x_mask:NORTHEAST, x_east:null, x_northEast:'four_cbl', x_north:null },
        { data:['four',null,'one',null], x_mask:NORTH, x_east:null, x_northEast:null, x_north:'four_b' },
        { data:[null,'two','one','four'], x_mask:NORTHEAST_EAST, x_east:'four_l', x_northEast:'two_cbl', x_north:null },
        { data:[null,'four','one','two'], x_mask:EAST_NORTHEAST, x_east:'two_l', x_northEast:'four_cbl', x_north:null },
        { data:[null,'four','one','four'], x_mask:NORTHEAST_EAST, x_east:'four_l', x_northEast:'four_l', x_north:null },
        { data:['four','two','one',null], x_mask:NORTHEAST_NORTH, x_east:null, x_northEast:'two_cbl', x_north:'four_b' },
        { data:['two','four','one',null], x_mask:NORTH_NORTHEAST, x_east:null, x_northEast:'four_cbl', x_north:'two_b' },
        { data:['four','four','one',null], x_mask:NORTH_NORTHEAST, x_east:null, x_northEast:'four_b', x_north:'four_b' },
        { data:['two',null,'one','four'], x_mask:NORTH_EAST, x_east:'four_l', x_northEast:null, x_north:'two_b' },
        { data:['four',null,'one','two'], x_mask:EAST_NORTH, x_east:'two_l', x_northEast:null, x_north:'four_b' },
        { data:['four',null,'one','four'], x_mask:NORTH_EAST, x_east:'four_jbl', x_northEast:null, x_north:'four_jbl' },
        { data:['three','two','one','four'], x_mask:NORTHEAST_NORTH_EAST, x_east:'four_l', x_northEast:'two_cbl', x_north:'three_b' },
        { data:['four','two','one','three'], x_mask:NORTHEAST_EAST_NORTH, x_east:'three_l', x_northEast:'two_cbl', x_north:'four_b' },
        { data:['four','three','one','two'], x_mask:EAST_NORTHEAST_NORTH, x_east:'two_l', x_northEast:'three_cbl', x_north:'four_b' },
        { data:['three','four','one','two'], x_mask:EAST_NORTH_NORTHEAST, x_east:'two_l', x_northEast:'four_cbl', x_north:'three_b' },
        { data:['two','four','one','three'], x_mask:NORTH_EAST_NORTHEAST, x_east:'three_l', x_northEast:'four_cbl', x_north:'two_b' },
        { data:['two','three','one','four'], x_mask:NORTH_NORTHEAST_EAST, x_east:'four_l', x_northEast:'three_cbl', x_north:'two_b' },
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
        { data:[null,'one',null,null], x_mask:0, x_west:null, x_southWest:null, x_south:null },
        { data:['four','one',null,null], x_mask:WEST, x_west:'four_r', x_southWest:null, x_south:null },
        { data:[null,'one','four',null], x_mask:SOUTHWEST, x_west:null, x_southWest:'four_ctr', x_south:null },
        { data:[null,'one',null,'four'], x_mask:SOUTH, x_west:null, x_southWest:null, x_south:'four_t' },
        { data:['four','one','two',null], x_mask:SOUTHWEST_WEST, x_west:'four_r', x_southWest:'two_ctr', x_south:null },
        { data:['two','one','four',null], x_mask:WEST_SOUTHWEST, x_west:'two_r', x_southWest:'four_ctr', x_south:null },
        { data:['four','one','four',null], x_mask:SOUTHWEST_WEST, x_west:'four_r', x_southWest:'four_r', x_south:null },
        { data:[null,'one','two','four'], x_mask:SOUTHWEST_SOUTH, x_west:null, x_southWest:'two_ctr', x_south:'four_t' },
        { data:[null,'one','four','two'], x_mask:SOUTH_SOUTHWEST, x_west:null, x_southWest:'four_ctr', x_south:'two_t' },
        { data:[null,'one','four','four'], x_mask:SOUTH_SOUTHWEST, x_west:null, x_southWest:'four_t', x_south:'four_t' },
        { data:['four','one',null,'two'], x_mask:SOUTH_WEST, x_west:'four_r', x_southWest:null, x_south:'two_t' },
        { data:['two','one',null,'four'], x_mask:WEST_SOUTH, x_west:'two_r', x_southWest:null, x_south:'four_t' },
        { data:['four','one',null,'four'], x_mask:SOUTH_WEST, x_west:'four_jtr', x_southWest:null, x_south:'four_jtr' },
        { data:['four','one','two','three'], x_mask:SOUTHWEST_SOUTH_WEST, x_west:'four_r', x_southWest:'two_ctr', x_south:'three_t' },
        { data:['three','one','two','four'], x_mask:SOUTHWEST_WEST_SOUTH, x_west:'three_r', x_southWest:'two_ctr', x_south:'four_t' },
        { data:['two','one','three','four'], x_mask:WEST_SOUTHWEST_SOUTH, x_west:'two_r', x_southWest:'three_ctr', x_south:'four_t' },
        { data:['two','one','four','three'], x_mask:WEST_SOUTH_SOUTHWEST, x_west:'two_r', x_southWest:'four_ctr', x_south:'three_t' },
        { data:['three','one','four','two'], x_mask:SOUTH_WEST_SOUTHWEST, x_west:'three_r', x_southWest:'four_ctr', x_south:'two_t' },
        { data:['four','one','three','two'], x_mask:SOUTH_SOUTHWEST_WEST, x_west:'four_r', x_southWest:'three_ctr', x_south:'two_t' },
        // extra test
        { data:['two','one','four','two'], x_mask:SOUTH_WEST_SOUTHWEST, x_west:'two_jtr', x_southWest:'four_ctr', x_south:'two_jtr' },
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
        { data:['one',null,null,null], x_mask:0, x_east:null, x_southEast:null, x_south:null },
        { data:['one','four',null,null], x_mask:EAST, x_east:'four_l', x_southEast:null, x_south:null },
        { data:['one',null,null,'four'], x_mask:SOUTHEAST, x_east:null, x_southEast:'four_ctl', x_south:null },
        { data:['one',null,'four',null], x_mask:SOUTH, x_east:null, x_southEast:null, x_south:'four_t' },
        { data:['one','four',null,'two'], x_mask:SOUTHEAST_EAST, x_east:'four_l', x_southEast:'two_ctl', x_south:null },
        { data:['one','two',null,'four'], x_mask:EAST_SOUTHEAST, x_east:'two_l', x_southEast:'four_ctl', x_south:null },
        { data:['one','four',null,'four'], x_mask:SOUTHEAST_EAST, x_east:'four_l', x_southEast:'four_l', x_south:null },
        { data:['one',null,'four','two'], x_mask:SOUTHEAST_SOUTH, x_east:null, x_southEast:'two_ctl', x_south:'four_t' },
        { data:['one',null,'two','four'], x_mask:SOUTH_SOUTHEAST, x_east:null, x_southEast:'four_ctl', x_south:'two_t' },
        { data:['one','four','two',null], x_mask:SOUTH_EAST, x_east:'four_l', x_southEast:null, x_south:'two_t' },
        { data:['one','two','four',null], x_mask:EAST_SOUTH, x_east:'two_l', x_southEast:null, x_south:'four_t' },
        { data:['one','four','four',null], x_mask:SOUTH_EAST, x_east:'four_jtl', x_southEast:null, x_south:'four_jtl' },
        { data:['one','four','three','two'], x_mask:SOUTHEAST_SOUTH_EAST, x_east:'four_l', x_southEast:'two_ctl', x_south:'three_t' },
        { data:['one','three','four','two'], x_mask:SOUTHEAST_EAST_SOUTH, x_east:'three_l', x_southEast:'two_ctl', x_south:'four_t' },
        { data:['one','two','four','three'], x_mask:EAST_SOUTHEAST_SOUTH, x_east:'two_l', x_southEast:'three_ctl', x_south:'four_t' },
        { data:['one','two','three','four'], x_mask:EAST_SOUTH_SOUTHEAST, x_east:'two_l', x_southEast:'four_ctl', x_south:'three_t' },
        { data:['one','three','two','four'], x_mask:SOUTH_EAST_SOUTHEAST, x_east:'three_l', x_southEast:'four_ctl', x_south:'two_t' },
        { data:['one','four','two','three'], x_mask:SOUTH_SOUTHEAST_EAST, x_east:'four_l', x_southEast:'three_ctl', x_south:'two_t' },
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