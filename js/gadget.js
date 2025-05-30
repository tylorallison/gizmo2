export { GadgetProperty, Gadget, GadgetArray, GadgetGenerator, GadgetAssets, GadgetCtx };

import { EvtEmitter } from './evt.js';
import { Fmt } from './fmt.js';
import { Util } from './util.js';

class GadgetProperty {
    static key = 'property';
    static dflt = null;
    static readonly = false;
    static eventable = true;
    static link = false;

    constructor(gzd, xprop={}) {
        // link to gadget
        this.$gzd = gzd;
        // determine keys
        // - key: property key as it exists in gadget
        // - xkey: key to look for in passed xgzd spec
        this.$key = xprop.key || this.constructor.key;
        this.$xkey = xprop.xkey || this.$key;
        this.$dflt = ('dflt' in xprop) ? xprop.dflt : this.constructor.dflt;
        this.$readonly = ('readonly' in xprop) ? xprop.readonly : this.constructor.readonly;
        this.$eventable = ('eventable' in xprop) ? xprop.eventable : this.constructor.eventable;
        this.$link = ('link' in xprop) ? xprop.link : this.constructor.link;
        this.$pparser = xprop.parser;
        this.$pgetter = xprop.getter;
        this.$psetter = xprop.setter;
        // parse/set initial value
        //this.$parser(xprop, xgzd);
    }

    cparse(xgzd={}) {
        this.$parser(xgzd);
    }

    destroy() {
        if (this.$link && this.$value) {
            this.$unlinker(this.$value);
            if (this.$value.destroy) this.$value.destroy();
        }
    }

    static apply(cls, key=this.key, xprop={}) {
        cls.$schema(key, Object.assign({pcls:this, xprop}), this);
    }

    $parser(xgzd) {
        let value;
        // determine initial value
        if (this.$pparser) {
            value = this.$pparser(this.$gzd, xgzd);
        } else {
            if (this.$xkey in xgzd) {
                value = xgzd[this.$xkey];
            } else {
                let dflt = this.$dflter(xgzd);
                if (this.$pgetter) {
                    value = this.$pgetter(this.$gzd, dflt);
                } else {
                    value = dflt;
                }
            }
        }
        // handle initial value being assigned and linked
        if (this.$link && value) {
            if (value && Array.isArray(value)) {
                value = new GadgetArray(...value);
            }
            this.$linker(value);
        }
        // handle setter value conversion
        if (this.$psetter) value = this.$psetter(this.$gzd, undefined, value);
        // assign stored value 
        this.$value = value;
    }

    $dflter(xgzd) {
        // class schema $dflts overrides sentry defaults
        if (this.$gzd.$dflts && this.$gzd.$dflts.has(this.$key)) {
            return this.$gzd.$dflts.get(this.$key);
        }
        // sentry default
        return (this.$dflt instanceof Function) ? this.$dflt(this.$gzd, xgzd) : this.$dflt;
    }

    $linker(value) {
        if (value.at_modified) value.at_modified.listen(this.$on_linkModified, this, false, null, 0, this.$key);
    }

    $unlinker(value) {
        if (value.at_modified) value.at_modified.ignore(this.$on_linkModified, this);
    }

    $on_linkModified(evt, key) {
        if (this.$gzd.$at_modified) {
            let path = `${key}.${evt.key}`;
            this.$gzd.$at_modified.trigger({key:path, value:evt.value});
        }
    }

    $getter() {
        if (this.$pgetter) {
            let nv = this.$pgetter(this.$gzd, this.$value);
            this.$value = nv;
        }
        return this.$value;
    }

    $setter(value) {
        let gzd = this.$gzd;
        // handle readonly
        if (gzd.$gadgetReady && this.$readonly) throw new Error(`${this.$key} is readonly`);
        // allow value to be updated or acted upon by schema specific setter
        if (this.$psetter) value = this.$psetter(gzd, this.$value, value);
        if (Object.is(this.$value, value)) return;
        if (gzd.$gadgetReady && this.$link && this.$value) {
            this.$unlinker(this.$value);
        }
        if (this.$link && value) {
            if (value && Array.isArray(value)) {
                value = new GadgetArray(...value);
            }
            this.$linker(value);
        }
        this.$value = value;
        if (gzd.$gadgetReady && gzd.$at_modified && this.$eventable) {
            gzd.$at_modified.trigger({key:this.$key, value:value});
        }
    }

    get value() {
        return this.$getter();
    }

    set value(value) {
        this.$setter(value);
    }

    toString() {
        return Fmt.toString(this.constructor.name, this.$key);
    }
}

class $GadgetDefaults {

    constructor(map) {
        this.$clsKeyMap = (map) ? map : {}
    }

    assign(dflts) {
        if (!dflts) return;
        for (const [cls, key, dflt] of dflts) {
            this.add(cls, key, dflt);
        }
    }
    unassign(dflts) {
        if (!dflts) return;
        for (const [cls, key, dflt] of dflts) {
            this.remove(cls, key, dflt);
        }
    }
    add(cls, key, dflt) {
        if (!(cls in this.$clsKeyMap)) this.$clsKeyMap[cls] = {}
        let keyMap = this.$clsKeyMap[cls];
        keyMap[key] = dflt
    }
    remove(cls, key) {
        if (!(cls in this.$clsKeyMap)) return;
        let keyMap = this.$clsKeyMap[cls];
        if (key in keyMap) {
            delete keyMap[key];
        }
        if (Object.keys(keyMap).length === 0) {
            delete this.$clsKeyMap[cls];
        }
    }

    has(cls, key) {
        return ((cls in this.$clsKeyMap) && (key in this.$clsKeyMap[cls]));
    }

    get(cls, key) {
        if (!(cls in this.$clsKeyMap)) return undefined;
        let keyMap = this.$clsKeyMap[cls];
        return keyMap[key];
    }

    clear() {
        this.$clsKeyMap = (map) ? map : {}
    }
}

class $GadgetSchemaEntry {
    constructor(key, spec={}) {
        this.pcls = spec.pcls || GadgetProperty;
        this.key = key;
        // generated fields are not serializable
        this.serializable = (this.getter) ? false : ('serializable' in spec) ? spec.serializable : true;
        this.serializer = spec.serializer;
        this.order = spec.order || 0;
        this.xprop = Object.assign({key:key}, spec);
    }
    getDefault(o, spec={}) {
        // class schema $dflts overrides sentry defaults
        if (o.$dflts && o.$dflts.has(this.key)) {
            return o.$dflts.get(this.key);
        }
        // sentry default
        return (this.dflt instanceof Function) ? this.dflt(o, spec) : this.dflt;
    }
    toString() {
        return Fmt.toString(this.constructor.name, this.key);
    }
}

class $GadgetDfltProxy {
    constructor(cls, base) {
        this.$cls = cls;
        this.$base = base;
    }
    has(key) {
        let present = GadgetCtx.dflts.has(this.$cls, key);
        if (present) return present;
        if (this.$base) return this.$base.has(key);
        return false;
    }
    get(key) {
        if (GadgetCtx.dflts.has(this.$cls, key)) {
            return GadgetCtx.dflts.get(this.$cls, key)
        }
        if (this.$base) return this.$base.get(key);
        return undefined;
    }
}

class $GadgetSchemas {
    constructor(base) {
        this.$order = [];
        this.$order = (base) ? Array.from(base.$order) : [];
        this.$entries = new Map();
        if (base) {
            base.$entries.forEach((value, key) => this.$entries.set(key, value));
        }
    }

    get entries() {
        let entries = [];
        for (const key of this.$order) entries.push(this.$entries.get(key));
        return entries;
    }

    has(key) {
        return this.$entries.has(key);
    }

    get(key) {
        return this.$entries.get(key);
    }

    keys() {
        return Array.from(this.$order);
    }

    /**
     * assign class schema entry
     * @param {*} entry 
     */
    set(entry) {
        let key = entry.key;
        this.$entries.set(key, entry);
        if (!this.$order.includes(key)) this.$order.push(key);
        // adjust order for sentries appropriately
        this.$order.sort(((self) => {
            return (a, b) => (self.$entries.get(a).order - self.$entries.get(b).order);
        })(this));
    }

    clear(key) {
        let idx = this.$order.indexOf(key);
        if (idx !== -1) this.$order.splice(idx, 1);
        delete this.$entries.delete(key);
    }
}

class $GadgetProxyHandler {
    constructor() {
        this.$fcns = {};
    }

    get(target, key, proxy) {
        if (key === '$target') return target;
        let sentry = (target.$schemas) ? target.$schemas.get(key) : null;
        if (sentry) {
            let prop = target[key];
            if (prop) return prop.value;
        }
        return Reflect.get(target, key, proxy);
    }

    set(target, key, value, proxy) {
        let sentry = (target.$schemas) ? target.$schemas.get(key) : null;
        if (sentry) {
            let prop = target[key];
            if (prop) {
                target[key].value = value;
                return true;
            }
        }
        return Reflect.set(target, key, value, proxy);
    }

    ownKeys(target) {
        if (target.$schemas) {
            return target.$schemas.keys();
        } else {
            let keys = Reflect.ownKeys(target);
            return keys.filter((v) => v !== '$proxy');
        }
    }

    deleteProperty(target, key) {
        let sentry = (target.$schemas) ? target.$schemas.get(key) : null;
        if (sentry) {
            if (target.$gadgetReady && sentry.readonly) return false;
            const storedValue = target[key];
            if (sentry.link && storedValue) this.$unlink(proxy, storedValue);
        }
        if (target.$gadgetReady && target.$at_modified && sentry && sentry.eventable) {
            target.$at_modified.trigger({key:key, value:undefined, deleted:true});
        }
        delete target[key];
        return true;
    }

}

class Gadget {

    static { this.prototype.gadgetable = true; }
    static $registry = new Map();
    static $register() {
        if (!Object.hasOwn(this.prototype, '$registered')) {
            let clsproto = this.prototype;
            // registration
            clsproto.$registered = true;
            this.$registry.set(this.name, this);
            // class defaults
            clsproto.$dflts = new $GadgetDfltProxy(this.name, Object.getPrototypeOf(clsproto).$dflts);
            // class schemas
            clsproto.$schemas = new $GadgetSchemas(Object.getPrototypeOf(clsproto).$schemas);
        }
    }

    static $schema(key, spec={}, pcls=GadgetProperty) {
        this.$register();
        let schemas = this.prototype.$schemas;
        let sentry = new $GadgetSchemaEntry(key, spec);
        schemas.set(sentry);
    }

    /**
     * xspec provides an GizmoSpec which can be used by a {@link Generator} class to create a Gadget object.
     * @param {Object} spec={} - overrides for properties to create in the GizmoSpec
     * @returns {...GizmoSpec}
     */
    static xspec(spec={}) {
        return {
            $gzx: true,
            cls: this.name,
            args: [Object.assign({}, spec)],
        }
    }

    $cpre(...args) { }
    $cpost(...args) { }

    $cparse(spec={}) {
        const schemas = this.$schemas;
        if (schemas) {
            for (const sentry of schemas.entries) {
                let prop = new sentry.pcls(this, sentry.xprop, spec);
                this.$target[sentry.key] = prop;
                prop.cparse(spec);
            }
        }
    }

    $at_modified
    get at_modified() {
        if (!this.$at_modified) this.$at_modified = new EvtEmitter(this.$proxy, 'modified');
        return this.$at_modified;
    }

    $at_destroyed
    get at_destroyed() {
        if (!this.$at_destroyed) this.$at_destroyed = new EvtEmitter(this.$proxy, 'destroyed');
        return this.$at_destroyed;
    }

    constructor(...args) {
        this.constructor.$register();
        this.$proxy = new Proxy(this, new $GadgetProxyHandler());
        this.$proxy.$cpre(...args);
        this.$proxy.$cparse(...args);
        this.$proxy.$cpost(...args);
        this.$gadgetReady = true;
        GadgetCtx.at_created.trigger({actor:this.$proxy});
        return this.$proxy;
    }

    destroy() {
        for (const sentry of this.$schemas.entries) {
            if (sentry.key in this.$target) {
                this.$target[sentry.key].destroy();
            }
        }
        if (this.$at_destroyed) this.$at_destroyed.trigger();
        GadgetCtx.at_destroyed.trigger({actor:this});
    }

    toString() {
        return Fmt.toString(this.constructor.name);
    }
}

class GadgetArray extends Array {
    constructor(...args) {
        super(...args);
        for (const key of Object.keys(this)) {
            if (this[key]) this.$link(key, this[key]);
        }
        this.$proxy = new Proxy(this, {
            get(target, key, receiver) {
                if (target[key] instanceof Function) {
                    const value = target[key];
                    return function (...args) {
                        return value.apply(this === receiver ? target : this, args);
                    };
                }
                return target[key];
            },
            ownKeys(target) {
                let keys = Reflect.ownKeys(target);
                return keys.filter((v) => v !== '$proxy');
            },
            set(target, key, value, receiver) {
                return target.$set(key, value);
            },
            deleteProperty(target, key) {
                return target.$delete(key);
            }
        });
        this.$gadgetReady = true;
        return this.$proxy;
    }

    push(...v) {
        let i=this.length;
        for (const el of v) {
            this.$set(String(i++), el);
        }
        return this.length;
    }

    pop() {
        let idx = this.length-1;
        if (idx < 0) return undefined;
        const v = this[idx];
        this.$set(String(idx), undefined);
        super.pop();
        return v;
    }

    unshift(...v) {
        let i=0;
        for (const el of v) {
            super.splice(i, 0, undefined);
            this.$set(String(i++), el);
        }
        return this.length;
    }

    shift() {
        if (this.length < 0) return undefined;
        const v = this[0];
        this.$set('0', undefined);
        super.shift();
        return v;
    }

    splice(start, deleteCount=0, ...avs) {
        let tidx = start;
        let aidx = 0;
        let dvs = [];
        // splice out values to delete, replace w/ items to add (if any)
        for (let i=0; i<deleteCount; i++ ) {
            dvs.push(this[tidx])
            if (aidx < avs.length) {
                this.$set(String(tidx++), avs[aidx++]);
            } else {
                this.$set(String(tidx), undefined);
                super.splice(tidx++, 1);
            }
        }
        // splice in any remainder of items to add
        for ( ; aidx<avs.length; aidx++ ) {
            super.splice(tidx, 0, undefined);
            this.$set(String(tidx++), avs[aidx]);
        }
        return dvs;
    }

    $set(key, value) {
        let storedValue = this[key];
        if (Object.is(storedValue, value)) return true;
        if (storedValue) this.$unlink(key, storedValue);
        if (value) this.$link(key, value);
        this[key] = value;
        if (this.$gadgetReady) {
            if (this.$at_modified) this.$at_modified.trigger({key:key, value:value});
        }
        return true;
    }

    $delete(key) {
        const storedValue = this[key];
        if (storedValue) this.$unlink(key, storedValue);
        delete this[key];
        if (this.$at_modified) this.$at_modified.trigger({key:key, value:undefined, deleted:true});
        return true;
    }

    $at_modified
    get at_modified() {
        if (!this.$at_modified) this.$at_modified = new EvtEmitter(this.$proxy, 'modified');
        return this.$at_modified;
    }

    $link(key, value) {
        if (value.at_modified) value.at_modified.listen(this.$on_linkModified, this, false, null, 0, key);
    }

    $unlink(key, value) {
        if (value.at_modified) value.at_modified.ignore(this.$on_linkModified, this);
    }

    $on_linkModified(evt, key) {
        if (this.$at_modified) {
            let path = `${key}.${evt.key}`;
            this.$at_modified.trigger({key:path, value:evt.value});
        }
    }

}

/**
 * The Generator class creates instances of {@link Gadget} or {@link Gizmo} based on specified GadgetSpec object specification.
 */
class GadgetGenerator {

    // CONSTRUCTOR ---------------------------------------------------------
    constructor(spec={}) {
        this.registry = spec.registry || Gadget.$registry;
        this.assets = spec.assets;
    }

    // METHODS -------------------------------------------------------------
    resolve(spec) {
        let nspec = Util.copy(spec);
        let assets = this.assets || GadgetCtx.assets;
        for (const [k,v,o] of Util.kvWalk(nspec)) {
            if (v && (v.cls === '$Asset')) {
                const tag = v.args[0].tag;
                o[k] = assets.get(tag);
            } else if (v && typeof v === 'object' && v.$gzx) {
                let nv = this.generate(v);
                o[k] = nv;
                if (this.dbg) console.log(`-- generator: resolve ${k}->${Fmt.ofmt(v)} to ${k}->${nv}`);
            }
        }
        return nspec;
    }

    generate(spec) {
        if (!spec) return undefined;
        // resolve sub references within spec...
        // -- sub references are tagged w/ the '$gzx' property and are replaced with the generated object
        spec = this.resolve(spec);
        // look up class definition
        let cls = this.registry.get(spec.cls);
        if (!cls) {
            console.error(`generator failed for ${Fmt.ofmt(spec)} -- undefined class ${spec.cls}`);
            return undefined;
        }
        let gzd = new cls(...spec.args);
        if (gzd) return gzd;
        console.error(`generator failed for ${Fmt.ofmt(spec)} -- constructor failed`);
        return undefined;
    }

}

class GadgetAssets {
    // CONSTRUCTOR ---------------------------------------------------------
    constructor(spec={}) {
        // the asset references defined by the user...
        this.$xassets = [];
        // the generated/loaded asset cache
        this.$stack = [{}];
        this.$assets = this.$stack[0];
        if (spec.xassets) {
            let xassets = spec.xassets;
            if (!Array.isArray(xassets)) xassets = [ xassets ];
            for (const xasset of xassets) this.$add(xasset);
        }
    }

    $add(xasset) {
        if (xasset.assetable) {
            if (xasset.tag in this.$assets) {
                console.error(`duplicate asset tag detected: ${xasset.tag}, previous asset: ${this.$assets[xasset.tag]}, new asset: ${xasset}`);
            }
            this.$assets[xasset.tag] = xasset;
        } else {
            this.$xassets.push(xasset);
        }
    }

    push(xassets=[]) {
        let assets = {}
        Object.setPrototypeOf(assets, this.$assets);
        this.$stack.push(assets);
        this.$assets = assets;
        if (!Array.isArray(xassets)) xassets = [xassets];
        for (const xasset of xassets) {
            this.$add(xasset)
        }
    }

    pop() {
        if (this.$stack.length > 1) {
            this.$stack.pop();
            this.$assets = this.$stack[this.$stack.length-1];
        }
    }

    async load() {
        // load unresolves assets
        let xassets = this.$xassets;
        this.$xassets = [];
        for (const xasset of xassets) {
            let asset = GadgetCtx.generate(xasset);
            if (!asset) {
                console.error(`failed to generate asset for: ${Fmt.ofmt(xasset)}`);
                continue;
            }
            if (asset.tag in this.$assets) {
                console.error(`duplicate asset tag detected: ${asset.tag}, previous asset: ${this.$assets[asset.tag]}, new asset: ${asset}`);
            }
            this.$assets[asset.tag] = asset;
        }
        return Promise.all(Object.values(this.$assets).map((x) => x.load()));
    }

    get(tag, overrides={}) {
        // search for asset tag
        let asset = this.$assets[tag];
        if (!asset) {
            console.error(`-- missing asset for ${tag}`);
            return null;
        }
        return asset.copy(Object.assign({}, overrides, { loadable: true }));
    }

}

class GadgetCtx {

    static { this.prototype.gadgetable = true; }
    static current = new GadgetCtx();

    // static properties that allow unique inheritance
    static get $gid() {
        if (!this.hasOwnProperty('$$gid')) Object.defineProperty(this, '$$gid', { value: 0, writable: true });
        return this.$$gid;
    }
    static set $gid(value) {
        if (!this.hasOwnProperty('$$gid')) Object.defineProperty(this, '$$gid', { value: 0, writable: true });
        return this.$$gid = value;
    }

    static get dflts() { return this.current.dflts; }
    static get at_tocked() { return this.current.at_tocked; }
    static get at_keyed() { return this.current.at_keyed; }
    static get at_moused() { return this.current.at_moused; }
    static get at_created() { return this.current.at_created; }
    static get at_destroyed() { return this.current.at_destroyed; }
    static get at_sfxed() { return this.current.at_sfxed; }
    static get at_gizmoed() { return this.current.at_gizmoed; }
    static get interacted() { return this.current.interacted; }
    static get media() { return this.current.media; }
    static get assets() { return this.current.assets; }
    static get game() { return this.current.game; }
    static set game(v) { return this.current.game = v; }
    static set interacted(v) { return this.current.interacted = v; }
    static generate(spec) {
        return this.current.generator.generate(spec);
    }

    constructor(spec={}) {
        this.gid = ('gid' in spec) ? spec.gid : this.constructor.$gid++;
        this.tag = ('tag' in spec) ? spec.tag : `${this.constructor.name}.${this.gid}`;
        this.dflts = ('dflts' in spec) ? spec.dflts : new $GadgetDefaults();
        this.generator = ('generator' in spec) ? spec.generator: new GadgetGenerator();
        this.assets = ('assets' in spec) ? spec.assets: new GadgetAssets();
        this.interacted = false;
        this.game = null;
        this.at_tocked = new EvtEmitter(this, 'tocked');
        this.at_keyed = new EvtEmitter(this, 'keyed');
        this.at_moused = new EvtEmitter(this, 'moused');
        this.at_created = new EvtEmitter(this, 'created');
        this.at_destroyed = new EvtEmitter(this, 'destroyed');
        this.at_sfxed = new EvtEmitter(this, 'sfxed');
        this.at_gizmoed = new EvtEmitter(this, 'gizmoed');
        // the raw media cache
        this.media = {};
    }

    toString() {
        return Fmt.toString(this.constructor.name, this.tag);
    }
}