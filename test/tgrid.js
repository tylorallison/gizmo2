import { Bounds } from '../js/bounds.js';
import { Grid } from '../js/grid.js';

describe('a grid implementation', () => {
    let grid;
    beforeEach(() => {
        grid = new Grid({
            rows:4,
            rowSize:4,
            cols:4,
            colSize:4,
            bucketSort:((a, b) => a.z-b.z),
        });
    });

    it('gizmos can be placed into grid', ()=>{
        grid.add({ gid:1, x:2, y:2, width:2, height:2 });
        expect(grid.idxof({gid:1})).toEqual([0]);
        grid.add({ gid:2, x:2, y:2 });
        expect(grid.idxof({gid:2})).toEqual([0]);
        grid.add({ gid:3, x:3, y:3, width:2, height:2 });
        expect(grid.idxof({gid:3})).toEqual([0,4,1,5]);
        grid.add({ gid:4, x:-2, y:-2, width:2, height:2 });
        expect(grid.idxof({gid:4})).toEqual([]);
    });

    it('gizmos can be sorted when inserted', ()=>{
        grid.add({ gid:1, x:1, y:1, z:1});
        expect(Array.from(grid.getidx(0)).map((v)=>v.gid)).toEqual([1]);
        grid.add({ gid:2, x:1, y:1, z:1});
        expect(Array.from(grid.getidx(0)).map((v)=>v.gid)).toEqual([1, 2]);
        grid.add({ gid:3, x:1, y:1, z:0});
        expect(Array.from(grid.getidx(0)).map((v)=>v.gid)).toEqual([3, 1, 2]);
        grid.add({ gid:4, x:1, y:1, z:2});
        expect(Array.from(grid.getidx(0)).map((v)=>v.gid)).toEqual([3, 1, 2, 4]);
        grid.add({ gid:5, x:1, y:1, z:1});
        expect(Array.from(grid.getidx(0)).map((v)=>v.gid)).toEqual([3, 1, 2, 5, 4]);
    });

    it('can iterate through entries', ()=>{
        grid.add({ gid: 1, x: 1, y: 1 });
        grid.add({ gid: 2, x: 1, y: 5 });
        grid.add({ gid: 3, x: 1, y: 9 });
        grid.add({ gid: 4, x: 5, y: 1 });
        grid.add({ gid: 5, x: 5, y: 5 });
        grid.add({ gid: 6, x: 5, y: 9 });
        expect(Array.from(grid).map((v)=>v.gid)).toEqual([1, 4, 2, 5, 3, 6]);
    });

    for (const test of [
        { idx1: 0, idx2: 3, xrslt: [0,1,2,3] },
        { idx1: 0, idx2: 11, xrslt: [0,1,10,11] },
        { idx1: 11, idx2: 0, xrslt: [11,10,1,0] },
        { idx1: 0, idx2: 27, xrslt: [0,9,18,27] },
        { idx1: 0, idx2: 63, xrslt: [0,9,18,27,36,45,54,63] },
        { idx1: 0, idx2: 56, xrslt: [0,8,16,24,32,40,48,56] },
    ]) {
        it(`can determine indices between ${test.idx1} and ${test.idx2}`, ()=>{
            let grid = new Grid({cols:8, rows:8});
            let rslt = Array.from(grid.idxsBetween(test.idx1, test.idx2));
            expect(rslt).toEqual(test.xrslt);
        });
    };

});