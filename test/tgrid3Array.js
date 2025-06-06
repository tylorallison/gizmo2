import { Grid3Array } from "../js/grid3Array.js";

describe('a 3d grid array', () => {

    it('can be created', ()=>{
        let ga = new Grid3Array({cols:4, rows:4, layers:4});
        expect(ga.length).toEqual(64);
    });

    it('can add entries', ()=>{
        let ga = new Grid3Array({cols:4, rows:4, layers:4});
        ga._setijk(0,0,1, 42);
        ga._setijk(0,0,2, 101);
        expect(ga.entries[16]).toEqual(42);
        expect(ga.entries[32]).toEqual(101);
    });

});