import { Fmt } from '../js/fmt.js';
import { Gadget, GadgetArray, GadgetCtx, GadgetProperty } from '../js/gadget.js';

describe('gadget properties', () => {

    it('can be constructed', ()=>{
        let gzd = new Gadget();
        let xprop = { key:'tprop' };
        let xgzd = { tprop:42 };
        let p = new GadgetProperty(gzd, xprop, xgzd);
        expect(p.$key).toEqual('tprop');
        expect(p.$value).toEqual(42);
        expect(p.value).toEqual(42);
    });

    it('can provide parser via spec', ()=>{
        let gzd = new Gadget();
        let xprop = { key:'tprop', parser:() => 'no way' };
        let xgzd = { tprop:42 };
        let p = new GadgetProperty(gzd, xprop, xgzd);
        expect(p.value).toEqual('no way');
    });

    it('can provide dflts', ()=>{
        let gzd = new Gadget();
        let xprop = { key:'tprop', dflt:'hello' };
        let xgzd = { };
        let p = new GadgetProperty(gzd, xprop, xgzd);
        expect(p.value).toEqual('hello');
        xprop = { key:'tprop', dflt:(o,x) => x.foo };
        xgzd = { foo:'there' };
        p = new GadgetProperty(gzd, xprop, xgzd);
        expect(p.value).toEqual('there');
    });

    it('can provide a getter', ()=>{
        let gzd = new Gadget();
        let xprop = { key:'tprop', getter:() => 'hello' };
        let xgzd = { tprop:42 };
        let p = new GadgetProperty(gzd, xprop, xgzd);
        expect(p.value).toEqual('hello');
    });

    it('can provide a setter', ()=>{
        let gzd = new Gadget();
        let xprop = { key:'tprop', setter:(o,ov,v) => 'resist' };
        let xgzd = { tprop:42 };
        let p = new GadgetProperty(gzd, xprop, xgzd);
        expect(p.value).toEqual('resist');
        p.value = 'hello';
        expect(p.value).toEqual('resist');
    });

    it('mods trigger gzd modified', ()=>{
        let gzd = new Gadget();
        let tevt = {};
        gzd.at_modified.listen((evt) => tevt=evt);
        let xprop = { key:'tprop' };
        let xgzd = { tprop:42 };
        let p = new GadgetProperty(gzd, xprop, xgzd);
        p.value = 'hello';
        expect(tevt.actor).toBe(gzd);
        expect(tevt.tag).toEqual('modified');
        expect(tevt.key).toEqual('tprop');
        expect(tevt.value).toEqual('hello');
    });

    it('linked value modify cascades', ()=>{
        let gzd = new Gadget();
        let gzdv = new Gadget();
        let tevt = {};
        gzd.at_modified.listen((evt) => tevt=evt);
        let xprop = { key:'tprop', link:true };
        let xgzd = { tprop:gzdv };
        let p = new GadgetProperty(gzd, xprop, xgzd);
        gzdv.at_modified.trigger({key:'hello', value:'there'});
        expect(tevt.actor).toBe(gzd);
        expect(tevt.tag).toEqual('modified');
        expect(tevt.key).toEqual('tprop.hello');
        expect(tevt.value).toEqual('there');
        p.value = null;
        tevt = {};
        gzdv.at_modified.trigger({key:'hello', value:'there'});
        expect(tevt).toEqual({});
    });

});

describe('gadgets', () => {
    var gctx;
    let tevt;
    beforeEach(() => {
        gctx = new GadgetCtx();
        GadgetCtx.current = gctx;
    });

    it('can be registered', ()=>{
        let cls = class tgadget extends Gadget {};
        let o = new cls;
        expect(Gadget.$registry.has('tgadget')).toBeTruthy();
    });

    it('trigger static created event', ()=>{
        let cls = class tgadget extends Gadget {};
        gctx.at_created.listen((evt) => tevt=evt);
        let o = new cls;
        expect(tevt.tag).toEqual('created');
        expect(tevt.actor).toEqual(o);
    });

    it('getters work', ()=>{
        class tgadget extends Gadget {
            static { this.$schema('g', { dflt: 1, getter: (o,ov) => ov*2}); }
            getg() {
                return this.g;
            }
        };
        let o = new tgadget();
        expect(o.g).toEqual(4);
        expect(o.g).toEqual(8);
        expect(o.g).toEqual(16);
        expect(o.getg()).toEqual(32);
    });

    it('privates work', ()=>{
        class tgadget extends Gadget {
            #p = 42;
            getp() {
                return this.#p;
            }
        };
        let o = new tgadget();
        expect(o.getp()).toEqual(42);
    });

    it('object calls work', ()=>{
        class tgadget extends Gadget {
            static { this.$schema('key1', { dflt: 'hello'}); }
            static { this.$schema('key2', { dflt: 'there'}); }
        };
        let o = new tgadget();
        let keys = Object.keys(o);
        expect(keys).toEqual(['key1','key2']);
        let values = Object.values(o);
        expect(values).toEqual(['hello','there']);
        expect('key1' in o).toBeTruthy();
        expect('key2' in o).toBeTruthy();
        expect('key3' in o).toBeFalse();
    });

    it('trigger destroyed events on destroy', ()=>{
        let cls = class tgadget extends Gadget {};
        gctx.at_destroyed.listen((evt) => tevt=evt);
        let o = new cls;
        o.destroy();
        expect(tevt.tag).toEqual('destroyed');
        expect(tevt.actor).toEqual(o);
    });

    it('have overrideable defaults', ()=>{
        class tbase extends Gadget {
            static { this.$schema('key', { dflt: 'hello' }); }
        };
        class tsub extends tbase {
            static { this.$schema('key', { dflt: 'there' }); }
        };
        let o = new tsub();
        expect(o.key).toEqual('there');
        gctx.dflts.add('tsub', 'key', 42);
        o = new tsub();
        expect(o.key).toEqual(42);
        gctx.dflts.remove('tsub', 'key');
        o = new tsub();
        expect(o.key).toEqual('there');
        gctx.dflts.add('tbase', 'key', 42);
        o = new tsub();
        expect(o.key).toEqual(42);
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

    it('proxy is called', ()=>{
        class tgadget extends Gadget {
            static { this.$schema('data', { dflt:42 }); }
            get paccess() {
                return this.access();
            }
            access() {
                return this.$target['data'].value;
            }
            access2() {
                return this.access();
            }
        };
        let o = new tgadget();
        expect(o.access()).toEqual(42);
        expect(o.access2()).toEqual(42);
        expect(o.paccess).toEqual(42);
    });

});

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