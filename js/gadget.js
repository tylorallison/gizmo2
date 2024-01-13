export { Gadget, GadgetCtx };

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

    constructor(spec={}) {
        this.gid = ('gid' in spec) ? spec.gid : this.constructor.$gid++;
        this.tag = ('tag' in spec) ? spec.tag : `${this.constructor.name}.${this.gid}`;
        this.dflts = ('dflts' in spec) ? spec.dflts : new $GadgetDefaults();
    }

    toString() {
        return Fmt.toString(this.constructor.name, this.tag);
    }
}

class $GadgetSchemaEntry {
    constructor(key, spec={}) {
        this.key = key;
        this.xkey = spec.xkey || this.key;
        this.dflt = spec.dflt;
        // generator function of format (object, value) => { <function returning final value> };
        this.generator = spec.generator;
        this.readonly = (this.generator) ? true : ('readonly' in spec) ? spec.readonly : false;
        this.parser = spec.parser || ((o, x) => {
            if (this.xkey in x) return x[this.xkey];
            const dflt = this.getDefault(o);
            if (this.generator) return this.generator(o,dflt);
            return dflt;
        });
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
        return GadgetCtx.current.dflts.has(this.$cls, key)
    }
    get(key) {
        return GadgetCtx.current.dflts.get(this.$cls, key)
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
            this.prototype.$registered = true;
            if (!this.$registry.has(this.name)) this.$registry.set(this.name, this);
        }
    }

    static $schema(key, spec={}) {
        this.$register();
        let schemas;
        let clsp = this.prototype;
        // class defaults
        if (!clsp.hasOwnProperty('$dflts')) {
            clsp.$dflts = new $GadgetDfltProxy(this.name, Object.getPrototypeOf(clsp).$dflts);
        }
        if (!clsp.hasOwnProperty('$schemas')) {
            schemas = new $GadgetSchemas(Object.getPrototypeOf(clsp).$schemas);
            clsp.$schemas = schemas;
        } else {
            schemas = clsp.$schemas;
        }
        let sentry = new $GadgetSchemaEntry(key, spec);
        schemas.set(sentry);
    }

    static xparse(o, spec) {
    }

    cpre(...args) {
    }

    cparse(spec={}) {
        const schemas = this.$schemas;
        if (schemas) {
            for (const sentry of schemas.$entries) {
                if (sentry.generator) {
                    this[sentry.key] = sentry.getDefault(this);
                } else {
                    this[sentry.key] = sentry.parser(this, spec);
                }
            }
        }
    }

    /*
    _at_modified
    get at_modified() {
        if (!this._at_modified) this._at_modified = new EvtEmitter(this, 'modified');
        return this._at_modified;
    }
    */

    constructor(...args) {
        this.constructor.$register();
        this.cpre(...args);
        this.cparse(...args);
        /*
        let proxy = new Proxy(this, {
            get(target, key, receiver) {
                //if (!sentry && o.$schema) sentry = o.$schema.get(key);
                if (key === '$proxy') return receiver;
                if (key === '$target') return target;
                if (target[key] instanceof Function) {
                    const value = target[key];
                    return function (...args) {
                        return value.apply(this === receiver ? target : this, args);
                    };
                }
                return target.$get(key, target.$schema.get(key));
            },
            set(target, key, value, receiver) {
                //if (typeof key === 'string' && key.startsWith('$')) {
                    target[key] = value;
                //} else {
                    //target.constructor.$set(target, key, value, target.esentry);
                //}
                return true;
            },
            //ownKeys(target) {
                //return Object.keys(target);
            //},
            //getOwnPropertyDescriptor(target, prop) {
                //return {
                    //enumerable: true,
                    //configurable: true,
                    //value: target.$store[prop],
                //};
            //},
            //deleteProperty(target, key) {
                //target.constructor.$delete(target, key, target.esentry);
                //return true;
            //}
        });
        return proxy;
        */
    }

    /*
    $get(key, sentry=null) {
        if (sentry && sentry.generator) {
            this[key] = sentry.generator(target, this[key]);
        }
        return this[key];
    }

    $set(key, value, sentry=null) {
        let storedValue = this[key];
        if (target.$flags & FDEFINED) {
            storedValue = target.$store[key];
            if (Object.is(storedValue, value)) return true;
            if (sentry.link && (storedValue instanceof Gadget) && !(storedValue instanceof Gizmo)) this.$unlink(target, storedValue);
        }
        if (value) {
            if (sentry.link && (value instanceof Gadget) && !(value instanceof Gizmo)) {
                this.$link(target, key, sentry, value);
            } else if (sentry.link && Array.isArray(value)) {
                value = new GadgetArray(value);
                this.$link(target, key, sentry, value);
            } else if (sentry.link && (typeof value === 'object') && !(value instanceof Gizmo) && !value.$proxy) {
                value = new GadgetObject(value);
                this.$link(target, key, sentry, value);
            }
        }
        target.$store[key] = value;
        if (target.$flags & FDEFINED) {
            if (sentry.atUpdate) sentry.atUpdate( target, key, storedValue, value );
            for (const pgdt of this.eachInPath(target)) {
                if (pgdt.$trunkSentry && pgdt.$trunkSentry.atUpdate) {
                    pgdt.$trunkSentry.atUpdate(pgdt.$trunk, pgdt.$trunkKey, pgdt, pgdt);
                }
                pgdt.$v++;
            }
            if ((target.$flags & FEVENTABLE) && sentry.eventable) {
                let gemitter = this.findInPath(target, (gdt) => (gdt && gdt.$emitter));
                let path = (target.$path) ? `${target.$path}.${key}` : key;
                if (gemitter) Evts.trigger(gemitter, 'GizmoSet', { 'set': { [path]: value }});
            }
        }
        return true;
    }
    */

}