import { GadgetCtx } from '../js/gadget.js';
import { GameState } from '../js/gameState.js';
import { StateMgr } from '../js/stateMgr.js';

describe('a state manager', () => {

    let mgr;
    var gctx;
    let tevt;
    beforeEach(() => {
        gctx = new GadgetCtx();
        GadgetCtx.current = gctx;
        tevt = {};
        mgr = new StateMgr({ });
    });

    it('can watch for new states', ()=>{
        let state = new GameState({ tag: 'test'});
        expect(mgr.get('test')).toBe(state);
        expect(state.$state).toEqual('inactive');
    });

    it('can watch for destroyed states', ()=>{
        let state = new GameState({ tag: 'test'});
        expect(mgr.get('test')).toBe(state);
        state.destroy();
        expect(mgr.get('test')).toBeFalsy();
    });

    it('can start a new state', async ()=>{
        let state = new GameState({ tag:'test'});
        gctx.at_gizmoed.trigger({ tag:'desired', state:'test' });
        gctx.at_tocked.trigger({ elapsed:100 });
        await new Promise(resolve => state.at_transitioned.listen((evt) => resolve()));
        expect(state.$state).toEqual('active');
        expect(mgr.$current).toBe(state);
    });

    it('can start a new state from static fcn', async ()=>{
        let state = new GameState({ tag:'test'});
        StateMgr.start('test');
        gctx.at_tocked.trigger({ elapsed:100 });
        await new Promise(resolve => state.at_transitioned.listen((evt) => resolve()));
        expect(state.$state).toEqual('active');
        expect(mgr.$current).toBe(state);
    });

    it('can start a second state', async ()=>{
        let state = new GameState({ tag: 'test'});
        let state2 = new GameState({ tag: 'test2'});
        gctx.at_gizmoed.trigger({ tag:'desired', state:'test' });
        gctx.at_tocked.trigger({ elapsed:100 });
        await new Promise(resolve => state.at_transitioned.listen((evt) => resolve()));
        expect(state.$state).toEqual('active');
        expect(mgr.$current).toBe(state);
        gctx.at_gizmoed.trigger({ tag:'desired', state:'test2' });
        gctx.at_tocked.trigger({ elapsed:100 });
        await new Promise(resolve => state2.at_transitioned.listen((evt) => resolve()));
        expect(state.$state).toEqual('inactive');
        expect(state2.$state).toEqual('active');
        expect(mgr.$current).toBe(state2);
    });

});
