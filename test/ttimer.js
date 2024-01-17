import { Timer } from '../js/timer.js';
import { GadgetCtx } from '../js/gadget.js';

describe('timers', () => {
    var gctx;
    beforeEach(() => {
        gctx = new GadgetCtx();
        GadgetCtx.current = gctx;
    });

    let timer, counter, incr;
    beforeEach(() => {
        counter = 0;
        incr = () => counter++;
    });
    afterEach(() => {
        if (timer) timer.destroy();
    });

    it('can be triggered by game ticker', ()=>{
        timer = new Timer({
            cb: incr,
            ttl: 100,
        });
        gctx.at_tocked.trigger({ elapsed:100 })
        expect(counter).toBe(1);
    });


    it('can be looped', ()=>{
        timer = new Timer({
            cb: incr,
            ttl: 100,
            loop: true,
        });
        gctx.at_tocked.trigger({ elapsed:100 })
        gctx.at_tocked.trigger({ elapsed:100 })
        expect(counter).toBe(2);
    });

    it('loop tracks overlap', ()=>{
        timer = new Timer({
            cb: incr,
            ttl: 150,
            loop: true,
        });
        gctx.at_tocked.trigger({ elapsed:100 })
        expect(counter).toBe(0);
        gctx.at_tocked.trigger({ elapsed:100 })
        expect(counter).toBe(1);
        gctx.at_tocked.trigger({ elapsed:100 })
        expect(counter).toBe(2);
    });

    it('destroyed timers are ignored', ()=>{
        timer = new Timer({
            cb: incr,
            ttl: 500,
            loop: true,
        });
        timer.destroy();
        gctx.at_tocked.trigger({ elapsed:100 })
        expect(counter).toBe(0);
    });

});
