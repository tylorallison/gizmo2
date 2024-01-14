export { GadgetCtx, Gadget, GadgetArray, GadgetGenerator };

import { EvtEmitter } from './evt.js';
import { Fmt } from './fmt.js';

class $GadgetDefaults {

    constructor(map) {
        this.$clsKeyMap = (map) ? map : {}
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
        this.key = key;
        this.xkey = spec.xkey || this.key;
        this.dflt = spec.dflt;
        this.eventable = ('eventable' in spec) ? spec.eventable : true;
        // generator function of format (object, value) => { <function returning final value> };
        this.generator = spec.generator;
        this.readonly = (this.generator) ? true : ('readonly' in spec) ? spec.readonly : false;
        this.parser = spec.parser || ((o, x) => {
            if (this.xkey in x) return x[this.xkey];
            const dflt = this.getDefault(o);
            if (this.generator) return this.generator(o,dflt);
            return dflt;
        });
        // FIXME
        //this.atUpdate = spec.atUpdate;
        // link - if the value is an object, setup Gadget links between the trunk and leaf.
        this.link = ('link' in spec) ? spec.link : false;
        // generated fields are not serializable
        this.serializable = (this.generator) ? false : ('serializable' in spec) ? spec.serializable : true;
        this.serializer = spec.serializer;
        this.order = spec.order || 0;
    }
    getDefault(o) {
        // class schema $dflts overrides sentry defaults
        if (o.$dflts && o.$dflts.has(this.key)) {
            return o.$dflts.get(this.key);
        }
        // sentry default
        return (this.dflt instanceof Function) ? this.dflt(o) : this.dflt;
    }
    toString() {
        return Fmt.toString(this.constructor.name, this.key);
    }
}

class $GadgetDfltProxy {
    constructor(cls, base) {
        this.$cls = cls;
        if (base) Object.setPrototypeOf(this, base);
    }
    has(key) {
        return GadgetCtx.dflts.has(this.$cls, key)
    }
    get(key) {
        return GadgetCtx.dflts.get(this.$cls, key)
    }
}

class $GadgetSchemas {
    constructor(base) {
        this.$order = [];
        this.$dflts = new $GadgetDefaults((base) ? base.$dflts : null);
        this.$order = (base) ? Array.from(base.$order) : [];
        if (base) Object.setPrototypeOf(this, base);
    }

    get $entries() {
        let entries = [];
        for (const key of this.$order) entries.push(this[key]);
        return entries;
    }

    has(key) {
        return key in this;
    }

    get(key) {
        return this[key];
    }

    /**
     * assign class schema entry
     * @param {*} entry 
     */
    set(entry) {
        let key = entry.key;
        this[key] = entry;
        if (!this.$order.includes(key)) this.$order.push(key);
        // adjust order for sentries appropriately
        this.$order.sort(((self) => {
            return (a, b) => (self[a].order - self[b].order);
        })(this));
    }

    clear(key) {
        let idx = this.$order.indexOf(key);
        if (idx !== -1) this.$order.splice(idx, 1);
        if (Object.hasOwn(this, key)) delete this[key];
    }
}

class Gadget {

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

    static $schema(key, spec={}) {
        this.$register();
        let schemas = this.prototype.$schemas;
        let sentry = new $GadgetSchemaEntry(key, spec);
        schemas.set(sentry);
    }

    $cpre(...args) { }
    $cpost(...args) { }

    $cparse(spec={}) {
        const schemas = this.$schemas;
        if (schemas) {
            for (const sentry of schemas.$entries) {
                if (sentry.generator) {
                    this.$set(sentry.key, sentry.getDefault(this), sentry);
                } else {
                    this.$set(sentry.key, sentry.parser(this, spec), sentry);
                }
            }
        }
    }

    /*
    static $at_created
    static get at_created() {
        if (!this.$at_created) this.$at_created = new EvtEmitter(this, 'created');
        return this.$at_created;
    }

    static $at_destroyed
    static get at_destroyed() {
        if (!this.$at_destroyed) this.$at_destroyed = new EvtEmitter(this, 'destroyed');
        return this.$at_destroyed;
    }
    */

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
        this.$cpre(...args);
        this.$cparse(...args);
        this.$proxy = new Proxy(this, {
            get(target, key, receiver) {
                if (key === '$target') return target;
                if (target[key] instanceof Function) {
                    const value = target[key];
                    return function (...args) {
                        return value.apply(this === receiver ? target : this, args);
                    };
                }
                return target.$get(key, (target.$schemas) ? target.$schemas.get(key) : null);
            },
            set(target, key, value, receiver) {
                let sentry = (target.$schemas) ? target.$schemas.get(key) : null;
                if (sentry) {
                    if (sentry.readonly) return false;
                    return target.$set(key, value, sentry);
                }
                target[key] = value;
                return true;
            },
            deleteProperty(target, key) {
                let sentry = (target.$schemas) ? target.$schemas.get(key) : null;
                if (sentry) {
                    if (sentry.readonly) return false;
                    return target.$delete(key, sentry);
                }
                delete target[key];
                return true;
            }
        });
        this.$cpost(...args);
        this.$ready = true;
        GadgetCtx.at_created.trigger({actor:this.$proxy});
        return this.$proxy;
    }

    $get(key, sentry) {
        if (sentry && sentry.generator) {
            this[key] = sentry.generator(target, this[key]);
        }
        return this[key];
    }

    $set(key, value, sentry) {
        let storedValue = this[key];
        if (Object.is(storedValue, value)) return true;
        if (this.$ready && sentry && sentry.link && storedValue) {
            this.$unlink(key, storedValue);
        }
        if (sentry && sentry.link && value) {
            if (value && Array.isArray(value)) {
                value = new GadgetArray(...value);
            }
            this.$link(key, value);
        }
        this[key] = value;
        if (this.$ready) {
            if (this.$at_modified && (!sentry || (sentry && sentry.eventable))) this.$at_modified.trigger({key:key, value:value});
        }
        return true;
    }

    $link(key, value) {
        if (value.at_modified) value.at_modified.listen(this.$on_linkModified, this, false, null, 0, key);
    }

    $unlink(key, value) {
        if (value.at_modified) value.at_modified.ignore(this.$on_linkModified);
    }

    $on_linkModified(evt, key) {
        if (this.$at_modified) {
            let path = `${key}.${evt.key}`;
            this.$at_modified.trigger({key:path, value:evt.value});
        }
    }

    $delete(key, sentry) {
        const storedValue = this[key];
        if (sentry.link && storedValue) this.$unlink(key, storedValue);
        delete this[key];
        if (this.$at_modified) this.$at_modified.trigger({key:key, value:undefined, deleted:true});
        return true;
    }

    destroy() {
        for (const sentry of this.$schemas.$entries) {
            if (sentry.link && this[sentry.key]) {
                this[sentry.key].at_modified.ignore(this.$on_linkModified);
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
            set(target, key, value, receiver) {
                return target.$set(key, value);
            },
            deleteProperty(target, key) {
                return target.$delete(key);
            }
        });
        this.$ready = true;
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
        if (this.$ready) {
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
        if (value.at_modified) value.at_modified.ignore(this.$on_linkModified);
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
        //this.assets = spec.assets || Assets;
    }

    // METHODS -------------------------------------------------------------
    resolve(spec) {
        let nspec = Util.copy(spec);
        for (const [k,v,o] of Util.kvWalk(nspec)) {
            if (this.assets && v && (v.cls === '$Asset')) {
                const tag = v.args[0].tag;
                o[k] = this.assets.get(tag);
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

class GadgetCtx {

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

    static get dflts() {
        return this.current.dflts;
    }
    static get at_tocked() {
        return this.current.at_tocked;
    }
    static get at_created() {
        return this.current.at_created;
    }
    static get at_destroyed() {
        return this.current.at_destroyed;
    }
    static get interacted() {
        return this.current.interacted;
    }
    static set interacted(v) {
        return this.current.interacted = v;
    }
    static generate(spec) {
        return this.current.generator.generate(spec);
    }

    constructor(spec={}) {
        this.gid = ('gid' in spec) ? spec.gid : this.constructor.$gid++;
        this.tag = ('tag' in spec) ? spec.tag : `${this.constructor.name}.${this.gid}`;
        this.dflts = ('dflts' in spec) ? spec.dflts : new $GadgetDefaults();
        this.generator = ('generator' in spec) ? spec.generator: new GadgetGenerator();
        this.interacted = false;
        this.at_tocked = new EvtEmitter(this, 'tocked');
        this.at_created = new EvtEmitter(this, 'created');
        this.at_destroyed = new EvtEmitter(this, 'destroyed');
    }

    toString() {
        return Fmt.toString(this.constructor.name, this.tag);
    }
}

