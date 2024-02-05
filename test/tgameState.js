import { GadgetCtx } from '../js/gadget.js';
import { GameState } from '../js/gameState.js';
import { Rect } from '../js/rect.js';

describe('a game state', () => {
    var gctx;
    let tevt;
    beforeEach(() => {
        gctx = new GadgetCtx();
        GadgetCtx.current = gctx;
        tevt = {};
    });

    it('can be started', async ()=>{
        let state = new GameState( {} );
        state.at_transitioned.listen((evt) => tevt=evt);
        await state.start();
        expect(tevt.tag).toEqual('transitioned');
        expect(tevt.state).toEqual('active');
    });

    it('registers assets', async ()=>{
        let state = new GameState( { xassets: [
            Rect.xspec({tag: 'test'}),
        ] });
        state.at_transitioned.listen((evt) => tevt=evt);
        await state.start();
        expect(tevt.state).toEqual('active');
        let asset = gctx.assets.get('test');
        expect(asset).toBeTruthy();
        await state.stop();
        expect(gctx.assets.get('test')).toBeFalsy();
    });

    it('can be restarted', async ()=>{
        let state = new GameState( { xassets: [
            Rect.xspec({tag: 'test'}),
        ] });
        expect(state.$state).toEqual('inactive');
        await state.start();
        expect(state.$state).toEqual('active');
        await state.stop();
        expect(state.$state).toEqual('inactive');
        await state.start();
        expect(state.$state).toEqual('active');
        expect(gctx.assets.get('test')).toBeTruthy();
        await state.stop();
    });

});
