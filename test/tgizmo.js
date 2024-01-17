import { Fmt } from '../js/fmt.js';
import { GadgetCtx } from '../js/gadget.js';
import { Gizmo } from '../js/gizmo.js';

describe('gizmos', () => {
    var gctx;
    var tevt;
    beforeEach(() => {
        gctx = new GadgetCtx();
        GadgetCtx.current = gctx;
    });
    afterEach(() => {
        tevt = null;
    });

    it('trigger static created event', ()=>{
        let cls = class tgadget extends Gizmo {};
        gctx.at_created.listen((evt) => tevt=evt);
        let o = new cls;
        expect(tevt.tag).toEqual('created');
        expect(tevt.actor).toEqual(o);
    });

    it('can adopt children during constructor', ()=>{
        let c1 = new Gizmo();
        let c2 = new Gizmo();
        let g = new Gizmo( { children: [c1, c2]});
        expect(g.children.includes(c1)).toBeTruthy();
        expect(g.children.includes(c2)).toBeTruthy();
        expect(c1.parent).toBe(g);
        expect(c2.parent).toBe(g);
    });

    it('can detect hierarchy loops in parent', ()=>{
        let parent = new Gizmo({tag: 'parent'});
        let child = new Gizmo({tag: 'child'});
        parent.children.push(child);
        expect(() => parent.adopt(child)).toThrow();
    });

    it('can detect hierarchy loops in child', ()=>{
        let parent = new Gizmo({tag: 'parent'});
        let child = new Gizmo({tag: 'child'});
        child.children.push(parent);
        expect(() => parent.adopt(child)).toThrow();
    });

    it('adopted children updates trigger root events', ()=>{
        class tgizmo extends Gizmo {
            static { this.$schema('data', { dflt:'hello' }) };
        }
        let c1 = new tgizmo();
        let c2 = new tgizmo();
        c1.adopt(c2);
        c1.at_modified.listen((evt) => tevt=evt);
        c2.data = 'there';
        expect(tevt.key).toEqual('children.0.data');
        expect(tevt.value).toEqual('there');
        c1.orphan(c2);
        tevt = null;
        c2.data = 'again';
        expect(tevt).toEqual(null);
    });


});