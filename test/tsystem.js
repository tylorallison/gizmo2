import { GadgetCtx } from '../js/gadget.js';
import { System } from '../js/system.js';

describe('systems', () => {
    var gctx;
    let tevt;
    beforeEach(() => {
        gctx = new GadgetCtx();
        GadgetCtx.current = gctx;
    });

    it('automatically track entities based on match rules', ()=>{
        let e = { gid: 1, wanted: true };
        let system = new System({
            matchFcn: (e) => e.wanted,
        });
        gctx.at_created.trigger({ actor:e });
        expect(system.$store.has(1)).toBeTrue();
        gctx.at_destroyed.trigger({ actor:e });
        expect(system.$store.has(1)).toBeFalse();
        let other = { gid: 2, wanted: false };
        gctx.at_created.trigger({ actor:other });
        expect(system.$store.has(2)).toBeFalse();
    });

    it('can iterate over tracked entities', ()=>{
        let e = { gid: 1, wanted: true };
        let system = new System({
            matchFcn: (e) => e.wanted,
            iterateTTL: 100,
        });
        system.$iterate = (evt, e) => e.visited = true;
        gctx.at_created.trigger({ actor:e });
        gctx.at_tocked.trigger({ elapsed:100 });
        expect(e.visited).toBeTrue();
    });

});
