import { GadgetCtx } from '../js/gadget.js';
import { Game } from '../js/game.js';

describe('a game', () => {
    var gctx;
    let tevt;
    beforeEach(() => {
        gctx = new GadgetCtx();
        GadgetCtx.current = gctx;
        tevt = {};
    });

    it('can be started', async ()=>{
        let g = new Game();
        let tevt = {};
        gctx.at_gizmoed.listen((evt) => tevt=evt);
        await g.start();
        expect(tevt.tag).toEqual('started');
    });

});