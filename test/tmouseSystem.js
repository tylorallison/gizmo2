
import { GadgetCtx } from '../js/gadget.js';
import { MouseSystem } from '../js/mouseSystem.js';
import { UiView } from '../js/uiView.js';
import { XForm } from '../js/xform.js';

describe('a mouse system', () => {
    var gctx;
    let tevt;
    let sys, v1, v2;
    beforeEach(() => {
        gctx = new GadgetCtx();
        GadgetCtx.current = gctx;
        sys = new MouseSystem();
        v1 = new UiView({active: true, xform: new XForm({x: 100, y: 100, fixedWidth:100, fixedHeight:100, origx: 0, origy: 0})});
        v2 = new UiView({active: true, xform: new XForm({x: 150, y: 150, fixedWidth:100, fixedHeight:100, origx: 0, origy: 0})});
    });

    it('can register views', ()=>{
        expect(sys.$store.has(v1.gid)).toBeTruthy();
        expect(sys.$store.has(v2.gid)).toBeTruthy();
    });

    it('can handle mouse movements', ()=>{
        GadgetCtx.at_moused.listen((evt) => tevt = evt);
        sys.$on_moved({ offsetX:125, offsetY:135 });
        expect(tevt.x).toEqual(125);
        expect(tevt.y).toEqual(135);
        expect(sys.active).toBeTruthy();
        gctx.at_tocked.trigger({ elapsed:100 })
        expect(v1.hovered).toBeTruthy();
        expect(v2.hovered).toBeFalsy();
        sys.$on_moved({ offsetX:75, offsetY:75 });
        gctx.at_tocked.trigger({ elapsed:100 })
        expect(v1.hovered).toBeFalsy();
        expect(v2.hovered).toBeFalsy();
        sys.$on_moved({ offsetX:175, offsetY:175 });
        gctx.at_tocked.trigger({ elapsed:100 })
        expect(v1.hovered).toBeTruthy();
        expect(v2.hovered).toBeTruthy();
    });

    it('can handle mouse clicks', ()=>{
        GadgetCtx.at_moused.listen((evt) => tevt = evt);
        sys.$on_clicked( {offsetX:125, offsetY:135 });
        expect(tevt.x).toEqual(125);
        expect(tevt.y).toEqual(135);
        expect(sys.active).toBeTruthy();
        let v1clicked=false, v2clicked=false;
        v1.at_clicked.listen(() => v1clicked=true);
        v2.at_clicked.listen(() => v2clicked=true);
        gctx.at_tocked.trigger({ elapsed:100 })
        expect(v1clicked).toBeTruthy();
        expect(v2clicked).toBeFalsy();
        v1clicked=false, v2clicked=false;
        sys.$on_clicked( {offsetX:175, offsetY:175 });
        gctx.at_tocked.trigger({ elapsed:100 })
        expect(v1clicked).toBeTruthy();
        expect(v2clicked).toBeTruthy();
    });

});
