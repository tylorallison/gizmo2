import { Fmt } from '../js/fmt.js';
import { Gadget, GadgetArray, GadgetCtx } from '../js/gadget.js';

describe('gadgets', () => {
    var gctx;
    let tevt;
    beforeEach(() => {
        gctx = new GadgetCtx();
        GadgetCtx.current = gctx;
    });
    afterEach(() => {
        Gadget.at_created.clear();
        Gadget.at_destroyed.clear();
    });

    it('can be registered', ()=>{
        let cls = class tgadget extends Gadget {};
        let o = new cls;
        expect(Gadget.$registry.has('tgadget')).toBeTruthy();
    });

    it('trigger static created event', ()=>{
        let cls = class tgadget extends Gadget {};
        cls.at_created.listen((evt) => tevt=evt);
        let o = new cls;
        expect(tevt.tag).toEqual('created');
        expect(tevt.actor).toEqual(o);
    });

    it('trigger destroyed events on destroy', ()=>{
        let cls = class tgadget extends Gadget {};
        cls.at_destroyed.listen((evt) => tevt=evt);
        let o = new cls;
        o.destroy();
        expect(tevt.tag).toEqual('destroyed');
        expect(tevt.actor).toEqual(o);
    });

    it('have overrideable defaults', ()=>{
        let cls = class tgadget extends Gadget {
            static { this.$schema('key', { dflt: 'hello' }); }
        };
        let o = new cls();
        expect(o.key).toEqual('hello');
        gctx.dflts.add('tgadget', 'key', 'there');
        o = new cls();
        expect(o.key).toEqual('there');
        gctx.dflts.remove('tgadget', 'key');
        o = new cls();
        expect(o.key).toEqual('hello');
    });

    it('can have values set', ()=>{
        let cls = class tgadget extends Gadget {
            static { this.$schema('key', { dflt: 'hello' }); }
        };
        let o = new cls();
        expect(o.key).toEqual('hello');
        o.key = 'there';
        expect(o.key).toEqual('there');
    });

    it('value changes trigger modified event', ()=>{
        let cls = class tgadget extends Gadget {
            static { this.$schema('key', { dflt: 'hello' }); }
        };
        let o = new cls();
        o.at_modified.listen((evt) => tevt=evt);
        expect(o.key).toEqual('hello');
        o.key = 'there';
        expect(o.key).toEqual('there');
        expect(tevt.tag).toEqual('modified');
        expect(tevt.key).toEqual('key');
        expect(tevt.value).toEqual('there');
    });

    it('readonly keys cannot be modified', ()=>{
        let cls = class tgadget extends Gadget {
            static { this.$schema('key', { dflt:'hello', readonly:true }); }
        };
        let o = new cls();
        let tevt;
        o.at_modified.listen((evt) => tevt=evt);
        expect(o.key).toEqual('hello');
        expect(() => o.key = 'there').toThrow();
        expect(o.key).toEqual('hello');
        expect(tevt).toEqual(undefined);
    });

    it('can have schema applied/redefined', ()=>{
        class tgadget extends Gadget {
            static { this.$schema('var1', { dflt: 'foo'} ); }
            static { this.$schema('var2', { dflt: 'bar'} ); }
        };
        class tgadget2 extends tgadget {
            static { this.$schema('var3', { dflt: 'hello', readonly: true} ); }
        };
        class tgadget3 extends tgadget {
            static { this.$schema('var1', { dflt: 'there'} ); }
            static { this.prototype.$schemas.clear('var2'); }
        };
        let o = new tgadget();
        let o2 = new tgadget2();
        let o3 = new tgadget3();
        expect(o.var1).toEqual('foo');
        expect(o.var2).toEqual('bar');
        expect(o.var3).toEqual(undefined);
        expect(o2.var1).toEqual('foo');
        expect(o2.var2).toEqual('bar');
        expect(o2.var3).toEqual('hello');
        expect(o3.var1).toEqual('there');
        expect(o3.var2).toEqual(undefined);
        expect(o3.var3).toEqual(undefined);
    });

    it('can have ordered schema', ()=>{
        class tgadget extends Gadget {
            static { this.$schema('var2', { dflt: 'bar', order: 2} ); }
            static { this.$schema('var1', { dflt: 'bar', order: 1} ); }
            static { this.$schema('var0', { dflt: 'foo', order: 0} ); }
        }
        expect(tgadget.prototype.$schemas.$order).toEqual(['var0', 'var1', 'var2']);
    });

    it('subclass schema can be reordered', ()=>{
        class tgadget extends Gadget {
            static { this.$schema('var2', { dflt: 'bar', order: 2} ); }
            static { this.$schema('var1', { dflt: 'bar', order: 1} ); }
            static { this.$schema('var0', { dflt: 'foo', order: 0} ); }
        }
        class tsub extends tgadget {
            static { this.$schema('var2', { dflt: 'bar', order: -1} ); }
        }
        expect(tgadget.prototype.$schemas.$order).toEqual(['var0', 'var1', 'var2']);
        expect(tsub.prototype.$schemas.$order).toEqual(['var2', 'var0', 'var1']);
    });

    it('can be linked', ()=>{
        class tdata extends Gadget {
            static { this.$schema('var'); };
        };
        class tgadget extends Gadget {
            static { this.$schema('data', { link: true }); };
        };
        let o = new tgadget({data: new tdata({var: 'foo'})});
        expect(o.data.var).toEqual('foo');
    });

    it('linked vars trigger base at_modified', ()=>{
        class tdata extends Gadget {
            static { this.$schema('var'); };
        };
        class tgadget extends Gadget {
            static { this.$schema('data', { link: true }); };
        };
        let o = new tgadget({data: new tdata({var: 'foo'})});
        expect(o.data.var).toEqual('foo');
        o.at_modified.listen((evt) => tevt=evt);
        o.data.var = 'hello';
        expect(o.data.var).toEqual('hello');
        expect(tevt.tag).toEqual('modified');
        expect(tevt.key).toEqual('data.var');
        expect(tevt.value).toEqual('hello');
        let odata = o.data;
        o.data = new tdata();
        tevt = null;
        odata.var = 'there';
        expect(tevt).toEqual(null);
    });

    /*

    it('base generator updates on gadget change', ()=>{
        class TBase extends gadgetClass {
            static { this.schema('el'); }
            static { this.schema('g', { dflt: 1, generator: (o,ov) => ov*2}); }
        };
        let b = new TBase();
        expect(b.g).toEqual(2);
        expect(b.g).toEqual(2);
        b.el = 'v1';
        expect(b.g).toEqual(4);
        expect(b.g).toEqual(4);
        b.el = 'v2';
        expect(b.g).toEqual(8);
        expect(b.g).toEqual(8);
        b.el = 'v2';
        expect(b.g).toEqual(8);
    });

    it('root generator updates on leaf change', ()=>{
        class TLeaf extends gadgetClass {
            static { this.schema('el'); }
        };
        class TBase extends gadgetClass {
            static { this.schema('el', { link: true }); }
            static { this.schema('g', { dflt: 1, generator: (o,ov) => ov*2}); }
        };
        let b = new TBase({el: new TLeaf()});
        expect(b.g).toEqual(2);
        expect(b.g).toEqual(2);
        b.el.el = 'v1';
        expect(b.g).toEqual(4);
        expect(b.g).toEqual(4);
        b.el.el = 'v2';
        expect(b.g).toEqual(8);
        expect(b.g).toEqual(8);
        b.el.el = 'v2';
        expect(b.g).toEqual(8);
    });

    it('leaf generator updates on link change', ()=>{
        class TLeaf extends gadgetClass {
            static { this.schema('el'); }
            static { this.schema('g', { dflt: 1, generator: (o,ov) => ov*2}); }
        };
        class TBase extends gadgetClass {
            static { this.schema('el', { link: true }); }
        };
        let b = new TBase();
        let l = new TLeaf();
        expect(l.g).toEqual(2);
        b.el = l;
        expect(l.g).toEqual(4);
        b.el = null;
        expect(l.g).toEqual(8);
    });

    it('root changes trigger events', ()=>{
        var gid = 0;
        class TRoot extends gadgetClass {
            static { this.prototype.$emitter = true}
            static { this.schema('data'); }
            static { this.schema('ndata', { eventable: false }); }
            static { this.schema('gid', { dflt: () => gid++ }); }
        };
        let o = new TRoot({data: 'foo', ndata: 'ok'});
        expect(o.data).toEqual('foo');
        let tevt;
        Evts.listen(o, 'GizmoSet', (evt) => tevt = evt);
        gSetter(o, 'data', 'bar');
        expect(tevt.tag).toEqual('GizmoSet');
        expect(tevt.actor).toBe(o);
        expect(tevt.set['data']).toEqual('bar');
        tevt = undefined;
        gSetter(o, 'ndata', 'bar');
        expect(tevt).toBeFalsy();
        expect(o.ndata).toEqual('bar');
    });

    it('leaf changes trigger events', ()=>{
        var gid = 0;
        class TLeaf extends gadgetClass {
            static { this.schema('data'); };
            static { this.schema('ndata', { eventable: false }); };
        };
        class TRoot extends gadgetClass {
            static { this.prototype.$emitter = true}
            static { this.schema('sub', { link: true }); }
            static { this.schema('nsub', { link: true, eventable: false }); }
            static { this.schema('gid', { dflt: () => gid++ }); }
        };
        let o = new TRoot({sub: new TLeaf({data: 'foo', ndata: 'nfoo'}), nsub: new TLeaf({data: 'nfoo'})});
        expect(o.sub.data).toEqual('foo');
        expect(o.sub.ndata).toEqual('nfoo');
        let tevt = {};
        Evts.listen(o, 'GizmoSet', (evt) => tevt = evt);
        gSetter(o.sub, 'data', 'bar');
        expect(tevt.tag).toEqual('GizmoSet');
        expect(tevt.actor).toBe(o);
        expect(tevt.set['sub.data']).toEqual('bar');
        tevt = {};
        gSetter(o.sub, 'ndata', 'bar');
        expect(tevt).toEqual({});
        gSetter(o.nsub, 'data', 'nv2');
        expect(tevt).toEqual({});
        let l = o.sub;
        gSetter(o, 'sub', null);
        tevt = {};
        l.data = 'v2';
        gSetter(l, 'data', 'v2');
        expect(tevt).toEqual({});
        expect(l.data).toEqual('v2');
    });
    */

});

/*
describe('gizmos', () => {
    var counter;
    beforeEach(() => {
        counter = 0;
    });
    afterEach(() => {
        Evts.clear();
    });

    it('can trigger events', ()=>{
        let g = new Gizmo();
        Evts.listen(g, 'test', () => counter++);
        Evts.trigger(g, 'test');
        expect(counter).toBe(1);
    });

    it('triggers creation event when created', ()=>{
        Evts.listen(null, 'GizmoCreated', () => counter++);
        let g = new Gizmo();
        expect(counter).toBe(1);
    });

    it('can receive global gizmo events', ()=>{
        let g = new Gizmo();
        Evts.listen(null, 'test', () => counter++);
        Evts.trigger(g, 'test');
        expect(counter).toBe(1);
        Evts.ignore(null, 'test');
        Evts.trigger(g, 'test');
        expect(counter).toBe(1);
    });

    it('can receive global/local gizmo events', ()=>{
        let g = new Gizmo();
        Evts.listen(null, 'test', () => counter++);
        Evts.listen(g, 'test', () => counter++);
        Evts.trigger(g, 'test');
        expect(counter).toBe(2);
        Evts.ignore(null, 'test');
        Evts.ignore(g, 'test');
        Evts.trigger(g, 'test');
        expect(counter).toBe(2);
    });

    it('can auto-release listeners', ()=>{
        let g = new Gizmo();
        Evts.listen(g, 'test', () => counter++);
        Evts.trigger(g, 'test');
        g.destroy();
        Evts.trigger(g, 'test');
        expect(counter).toBe(1);
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

});
*/

describe('gadget arrays', () => {

    let arr;
    let tevt;
    beforeEach(() => {
        arr = new GadgetArray();
        arr.at_modified.listen((evt) => tevt=evt);
    });

    it('causes modified events when k/v set', ()=>{
        arr[0] = 'foo';
        expect(arr[0]).toEqual('foo');
        expect(tevt.tag).toEqual('modified');
        expect(tevt.actor).toBe(arr);
        expect(tevt.key).toEqual('0')
        expect(tevt.value).toEqual('foo');
    });

    it('causes modified events when items pushed', ()=>{
        arr.push('foo');
        expect(arr[0]).toEqual('foo');
        expect(tevt.tag).toEqual('modified');
        expect(tevt.actor).toBe(arr);
        expect(tevt.key).toEqual('0')
        expect(tevt.value).toEqual('foo');
        arr.push('hello');
        expect(arr[1]).toEqual('hello');
        expect(tevt.key).toEqual('1')
        expect(tevt.value).toEqual('hello');
    });

    it('causes modified events when items unshifted', ()=>{
        arr.unshift('foo');
        expect(arr[0]).toEqual('foo');
        expect(tevt.tag).toEqual('modified');
        expect(tevt.actor).toBe(arr);
        expect(tevt.key).toEqual('0')
        expect(tevt.value).toEqual('foo');
        arr.unshift('hello');
        expect(arr[0]).toEqual('hello');
        expect(arr[1]).toEqual('foo');
        expect(tevt.key).toEqual('0')
        expect(tevt.value).toEqual('hello');
    });

    it('causes modified events when items popped', ()=>{
        arr.push('foo', 'bar', 'baz');
        let v = arr.pop();
        expect(v).toEqual('baz');
        expect(arr.length).toEqual(2);
        expect(tevt.tag).toEqual('modified');
        expect(tevt.actor).toBe(arr);
        expect(tevt.key).toEqual('2')
        expect(tevt.value).toEqual(undefined);
    });

    it('causes modified events when items shifted', ()=>{
        arr.push('foo', 'bar', 'baz');
        let v = arr.shift();
        expect(v).toEqual('foo');
        expect(arr.length).toEqual(2);
        expect(tevt.tag).toEqual('modified');
        expect(tevt.actor).toBe(arr);
        expect(tevt.key).toEqual('0')
        expect(tevt.value).toEqual(undefined);
    });

    it('causes modified events when items spliced', ()=>{
        arr.push('foo', 'bar', 'baz');
        let v = arr.splice(1, 1);
        expect(tevt.key).toEqual('1');
        expect(tevt.value).toEqual(undefined);
        expect(v).toEqual(['bar']);
        expect(arr[0]).toEqual('foo');
        expect(arr[1]).toEqual('baz');
        expect(arr.length).toEqual(2);
        v = arr.splice(1, 0, 'hello', 'there');
        expect(v).toEqual([]);
        expect(arr[0]).toEqual('foo');
        expect(arr[1]).toEqual('hello');
        expect(arr[2]).toEqual('there');
        expect(arr[3]).toEqual('baz');
        expect(tevt.key).toEqual('2');
        expect(tevt.value).toEqual('there');
        expect(arr.length).toEqual(4);
        v = arr.splice(1, 1, 'nihao');
        expect(v).toEqual(['hello']);
        expect(arr.length).toEqual(4);
        expect(arr[1]).toEqual('nihao');
        expect(tevt.key).toEqual('1');
        expect(tevt.value).toEqual('nihao');
        v = arr.splice(1, 2, 'hola');
        expect(v).toEqual(['nihao', 'there']);
        expect(arr.length).toEqual(3);
        expect(tevt.key).toEqual('2');
        expect(tevt.value).toEqual(undefined);
        expect(arr[0]).toEqual('foo');
        expect(arr[1]).toEqual('hola');
        expect(arr[2]).toEqual('baz');
    });

    it('sub arrays are linked', ()=>{
        class tgadget extends Gadget {
            static { this.$schema('data', { dflt: () => [], link:true }); }
        };
        class tdata extends Gadget {
            static { this.$schema('value', { dflt:42 }); }
        };
        let o = new tgadget({data:[
            new tdata({value:1}),
            new tdata({value:2}),
        ]});
        expect(o.data[0].value).toEqual(1);
        o.at_modified.listen((evt) => tevt=evt);
        o.data[0].value = 101;
        expect(tevt.key).toEqual('data.0.value');
        expect(tevt.value).toEqual(101);
        o.data[0] = new tdata({value:88});
        expect(tevt.key).toEqual('data.0');
        expect(tevt.value.value).toEqual(88);
    });

});