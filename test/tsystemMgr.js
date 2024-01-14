import { GadgetCtx } from '../js/gadget.js';
import { System } from '../js/system.js';
import { SystemMgr } from '../js/systemMgr.js';

describe('a system manager', () => {
    var gctx;
    let tevt;
    beforeEach(() => {
        gctx = new GadgetCtx();
        GadgetCtx.current = gctx;
    });

    it('can watch for new systems', ()=>{
        let mgr = new SystemMgr();
        let sys = new System({ tag: 'test'});
        expect(mgr.get('test')).toBe(sys);
    });

    it('can watch for destroyed systems', ()=>{
        let mgr = new SystemMgr();
        let sys = new System({ tag: 'test'});
        expect(mgr.get('test')).toBe(sys);
        sys.destroy();
        expect(mgr.get('test')).toBeFalsy();
    });

});