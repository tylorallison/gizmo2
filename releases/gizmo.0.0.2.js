var gizmo = (function (exports) {
    'use strict';

    // =========================================================================
    let Fmt$1 = class Fmt {
        // STATIC METHODS ------------------------------------------------------
        static toString(name, ...args) {
            if (args.length) {
                return `{${name}:${args.join('|')}}`;
            }
            return `{${name}}`;
        }

        static ofmt(obj, seen=new WeakSet()) {
            if (!obj) return '';
            if (seen.has(obj)) return '<circular data>';
            if (typeof obj === 'object') seen.add(obj);
            if (obj.gadgetable) {
                return `${obj}`;
            }
            if (obj instanceof Map) {
                const tokens = [];
                for (const [key, value] of obj) {
                    tokens.push( (value && (typeof value === 'object')) ? `${key}:${this.ofmt(value, seen)}` : `${key}:${value}` );
                }
                return `<Map:${tokens.join(',')}>`;
            } else if (Array.isArray(obj)) {
                const tokens = [];
                for (const value of obj) {
                    tokens.push( (value && (typeof value === 'object')) ?  `${this.ofmt(value, seen)}` : `${value}` );
                }
                return `[${tokens.join(',')}]`;
            } else if (typeof obj === 'object') {
                const tokens = [];
                for (const [key,value] of Object.entries(obj)) {
                    if (key[0] === '$') continue;
                    tokens.push( (value && (typeof value === 'object')) ? `${key}:${this.ofmt(value, seen)}` : `${key}:${value}` );
                }
                return `{${tokens.join(',')}}`;
            } else if (typeof obj === 'function') {
                return `fcn<${obj.name}`;
            }
            return `${obj}`;
        }

    };

    /** ========================================================================
     * represents an instance of an event that is triggered, along w/ associated event data
     */
    class Evt {
        // CONSTRUCTOR ---------------------------------------------------------
        constructor(actor, tag, atts={}) {
            this.tag = tag;
            this.actor = actor;
            Object.assign(this, atts);
        }

        // METHODS -------------------------------------------------------------
        toString() {
            return Fmt$1.toString(this.constructor.name, Fmt$1.ofmt(this));
        }
    }

    class $EvtListener {
        constructor(fcn, boundfcn, receiver, once=false, filter=undefined, priority=0, ctx=undefined) {
            this.fcn = fcn;
            this.boundfcn = boundfcn;
            this.receiver = receiver;
            this.priority = priority;
            this.once = once;
            this.filter = filter;
            this.ctx = ctx;
        }
        toString() {
            return Fmt$1.toString(this.constructor.name, this.priority, this.once);
        }
    }

    class EvtEmitter {

        constructor(actor, tag='event') {
            this.$actor = actor;
            this.$tag = tag;
            this.$listeners = [];
        }

        trigger(atts={}) {
            // no listeners... no work...
            if (!this.$listeners.length) return;
            // build event
            let evt = new Evt(this.$actor, this.$tag, atts);
            // -- listeners
            const listeners = Array.from(this.$listeners);
            for (const listener of listeners) {
                // check for listener filter
                if (listener.filter && !listener.filter(evt)) continue;
                // delete any listener from emitter if marked w/ once attribute
                if (listener.once) {
                    let idx = this.$listeners.indexOf(listener);
                    if (idx !== -1) this.$listeners.splice(idx, 1);
                }
                // execute listener callback
                listener.boundfcn(evt, listener.ctx);
            }
        }

        listen(fcn, receiver, once=false, filter=undefined, priority=0, ctx=undefined) {
            let boundfcn = (receiver) ? fcn.bind(receiver) : fcn;
            let listener = new $EvtListener(fcn, boundfcn, receiver, once, filter, priority, ctx);
            this.$listeners.push(listener);
            this.$listeners.sort((a,b) => a.priority-b.priority);
        }

        ignore(fcn, receiver) {
            let idx = this.$listeners.findIndex((v) => (v.fcn === fcn) && v.receiver === receiver);
            if (idx !== -1) this.$listeners.splice(idx, 1);
        }

        clear() {
            this.$listeners.splice(0,this.$listeners.length);
        }

        toString() {
            return Fmt$1.toString(this.constructor.name, this.$actor, this.$tag);
        }

    }

    // =========================================================================
    class Util {

        static _update(target, ext) {
            for (const [k,v] of Object.entries(ext)) {
                // -- handle simple objects
                if (v && v.constructor && v.constructor.name === 'Object') {
                // -- handle simple values ... overwrite or assign target property
                    target[k] = this._update((k in target) ? target[k] : {}, v);
                } else {
                    target[k] = v;
                }
            }
            return target;
        }

        /**
         * update performs a deep copy of the provided extension objects to the target object.
         * All updates are added as extensions to the original object, so nested values in the target are only overwritten if that same path/key is in the extension update
         * @param {*} target 
         * @param  {...any} exts 
         * @returns target
         */
        static update(target, ...exts) {
            if (target && typeof target === 'object') {
                for (const ext of exts) {
                    if (ext && typeof ext === 'object') {
                        this._update(target, ext);
                    }
                }
            }
            return target;
        }

        static *kvWalk(obj, cache=new WeakSet()) {
            if (cache.has(obj)) return;
            if (Array.isArray(obj)) {
                cache.add(obj);
                for (let i=0; i<obj.length; i++) {
                    yield [i,obj[i],obj];
                    yield *this.kvWalk(obj[i], cache);
                }
            } else if (typeof obj === 'object' && obj !== null) {
                cache.add(obj);
                for (const [k,v] of Object.entries(obj)) {
                    yield [k,v,obj];
                    yield *this.kvWalk(v, cache);
                }
            }
        }

        static getpath(obj, path, dflt) {
            let node = obj;
            for (const key of path.split('.')) {
                if (!node || !(key in node)) return dflt;
                node = node[key];
            }
            return (node !== undefined) ? node : dflt;
        }

        static haspath(obj, path) {
            let node = obj;
            for (const key of path.split('.')) {
                if (!node || !node.hasOwnProperty(key)) return false;
                node = node[key];
            }
            return (node !== undefined) ? true : false;
        }

        static setpath(obj, path, v) {
            let node = obj;
            let ptokens = path.split('.');
            let key = ptokens[ptokens.length-1];
            ptokens = ptokens.slice(0,-1);
            for (const token of ptokens) {
                if (!node.hasOwnProperty(token)) {
                    node[token] = {};
                }
                node = node[token];
            }
            node[key] = v;
        }

        static delpath(obj, path) {
            let node = obj;
            let ptokens = path.split('.');
            let key = ptokens[ptokens.length-1];
            ptokens = ptokens.slice(0,-1);
            for (const token of ptokens) {
                if (!node.hasOwnProperty(token)) return;
                node = node[token];
            }
            delete node[key];
        }

        static hashStr(str) {
            var hash = 0, chr;
            if (str.length === 0) return hash;
            for (let i=0; i<str.length; i++) {
                chr = str.charCodeAt(i);
                hash = ((hash << 5) - hash) + chr;
                hash |= 0; // Convert to 32bit integer
            }
            return hash;
        }

        static copy(entity, cache = new WeakMap()) {
            if (entity === undefined) return undefined;
            if (cache.has(entity)) return cache.get(entity);
            if (entity instanceof Map) {
                let c = new Map();
                entity.forEach((value, key) => c.set(this.copy(key), this.copy(value)));
                return c;
            }
            if (entity instanceof Set) {
                let c = new Set();
                entity.forEach((value) => c.add(this.copy(value)));
                return c;
            }
            if (Array.isArray(entity)) {
                let c = [];
                entity.forEach((value) => c.push(this.copy(value)));
                return c;
            }
            if (entity.constructor.name === 'Object') {
                let c = {};
                cache.set(entity, c);
                return Object.assign(c, ...Object.keys(entity).map((prop) => ({ [prop]: this.copy(entity[prop], cache) })));
            }
            return entity;
        }

        static arrayBufferToBase64( buffer ) {
            var binary = '';
            var bytes = new Uint8Array(buffer);
            var len = bytes.byteLength;
            for (var i=0; i<len; i++) {
                binary += String.fromCharCode( bytes[i] );
            }
            return btoa( binary );
        }

        static spliceStr(str, index, count, add) {
            var ar = str.split('');
            ar.splice(index, count, add);
            return ar.join('');
        }

        static arraysEqual(a, b) {
            if (a === b) return true;
            if (a == null || b == null) return false;
            if (a.length !== b.length) return false;
            for (let i=0; i<a.length; i++) {
                if (a[i] !== b[i]) return false;
            }
            return true;
        }

        static iterable(obj) {
            if (obj == null) return false;
            if (typeof obj[Symbol.iterator] === 'function') return true;
            return false;
        }

        // Refer to: http://rosettacode.org/wiki/Bitmap/Bresenham's_line_algorithm#JavaScript
        static *pixelsInSegment(x0, y0, x1, y1) {
            let dx = Math.abs(x1 - x0);
            let sx = x0 < x1 ? 1 : -1;
            let dy = Math.abs(y1 - y0);
            let sy = y0 < y1 ? 1 : -1; 
            let err = (dx>dy ? dx : -dy)/2;        
            while (true) {
                yield [x0,y0];
                if (x0 === x1 && y0 === y1) break;
                var e2 = err;
                if (e2 > -dx) { 
                    err -= dy; 
                    x0 += sx; 
                }
                if (e2 < dy) { 
                    err += dx; 
                    y0 += sy; 
                }
            }
        }

        static *pixelsInSegment3d(x0, y0, z0, x1, y1, z1) {
            let dx = Math.abs(x1 - x0);
            let sx = x0 < x1 ? 1 : -1;
            let dy = Math.abs(y1 - y0);
            let sy = y0 < y1 ? 1 : -1; 
            let dz = Math.abs(z1 - z0);
            let sz = z0 < z1 ? 1 : -1; 
            // Driving axis is X-axis"
            if (dx >= dy && dx >= dz) {
                let p1 = 2 * dy - dx;
                let p2 = 2 * dz - dx;
                while (x0 != x1) {
                    x0 += sx;
                    if (p1 >= 0) {
                        y0 += sy;
                        p1 -= 2 * dx;
                    }
                    if (p2 >= 0) {
                        z0 += sz;
                        p2 -= 2 * dx;
                    }
                    p1 += 2 * dy;
                    p2 += 2 * dz;
                    yield [x0,y0,z0];
                }
            // Driving axis is Y-axis"
            } else if (dy >= dx && dy >= dz) {
                let p1 = 2 * dx - dy;
                let p2 = 2 * dz - dy;
                while (y0 != y1) {
                    y0 += sy;
                    if (p1 >= 0) {
                        x0 += sx;
                        p1 -= 2 * dy;
                    }
                    if (p2 >= 0) {
                        z0 += sz;
                        p2 -= 2 * dy;
                    }
                    p1 += 2 * dx;
                    p2 += 2 * dz;
                    yield [x0,y0,z0];
                }
            // Driving axis is Z-axis"
            } else {
                let p1 = 2 * dy - dz;
                let p2 = 2 * dx - dz;
                while (z0 != z1) {
                    z0 += sz;
                    if (p1 >= 0) {
                        y0 += sy;
                        p1 -= 2 * dz;
                    }
                    if (p2 >= 0) {
                        x0 += sx;
                        p2 -= 2 * dz;
                    }
                    p1 += 2 * dy;
                    p2 += 2 * dx;
                    yield [x0,y0,z0];
                }
            }
        }

        static nameFunction(name, body) {
            return { [name](...args) { return body.apply(this, args) } }[name]
        }

        static findBest(items, evalFcn=(v)=>v, cmpFcn=(v1,v2) => v1<v2, filterFcn=(v)=>true, itemFilterFcn=(v)=>true) {
            let bestItem;
            let bestValue;
            for (const item of items) {
                let value = evalFcn(item);
                if (!filterFcn(value)) continue;
                if (!itemFilterFcn(item)) continue;
                if (!bestItem || cmpFcn(value,bestValue)) {
                    bestItem = item;
                    bestValue = value;
                }
            }
            return bestItem;
        }

    }

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
            return Fmt$1.toString(this.constructor.name, this.$key);
        }
    }

    class $GadgetDefaults {

        constructor(map) {
            this.$clsKeyMap = (map) ? map : {};
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
            if (!(cls in this.$clsKeyMap)) this.$clsKeyMap[cls] = {};
            let keyMap = this.$clsKeyMap[cls];
            keyMap[key] = dflt;
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
            this.$clsKeyMap = (map) ? map : {};
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
            return Fmt$1.toString(this.constructor.name, this.key);
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
            return Fmt$1.toString(this.constructor.name);
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
                dvs.push(this[tidx]);
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
                    if (this.dbg) console.log(`-- generator: resolve ${k}->${Fmt$1.ofmt(v)} to ${k}->${nv}`);
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
                console.error(`generator failed for ${Fmt$1.ofmt(spec)} -- undefined class ${spec.cls}`);
                return undefined;
            }
            let gzd = new cls(...spec.args);
            if (gzd) return gzd;
            console.error(`generator failed for ${Fmt$1.ofmt(spec)} -- constructor failed`);
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
            let assets = {};
            Object.setPrototypeOf(assets, this.$assets);
            this.$stack.push(assets);
            this.$assets = assets;
            if (!Array.isArray(xassets)) xassets = [xassets];
            for (const xasset of xassets) {
                this.$add(xasset);
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
                    console.error(`failed to generate asset for: ${Fmt$1.ofmt(xasset)}`);
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
            return Fmt$1.toString(this.constructor.name, this.tag);
        }
    }

    // =========================================================================
    let Vect$1 = class Vect extends Gadget {
        // SCHEMA --------------------------------------------------------------
        static {
            this.$schema('x', { dflt: 0 });
            this.$schema('y', { dflt: 0 });
        }

        // STATIC PROPERTIES ---------------------------------------------------
        static get zero() {
            return new Vect();
        }

        static get maxValue() {
            return new Vect({x: Number.MAX_SAFE_INTEGER, y:Number.MAX_SAFE_INTEGER});
        }

        // PROPERTIES ----------------------------------------------------------
        get mag() {
            return Math.sqrt(this.x*this.x + this.y*this.y);
        }
        set mag(v) {
            this.normalize().smult(v);
        }
        get sqmag() {
            return this.x*this.x + this.y*this.y;
        }

        // STATIC METHODS ------------------------------------------------------
        static iVect(obj) {
            return obj && ('x' in obj) && ('y' in obj);
        }

        static add(...vs) {
            const r = new Vect();
            for (const v of vs) {
                if (v) {
                    if ('x' in v) r.x += v.x;
                    if ('y' in v) r.y += v.y;
                }
            }
            return r;
        }

        static sadd(v1, ...vs) {
            const r = new Vect(v1);
            for (const v of vs) {
                r.x += v;
                r.y += v;
            }
            return r;
        }

        static sub(v1, ...vs) {
            const r = new Vect(v1);
            for (const v of vs) {
                if (v) {
                    if ('x' in v) r.x -= v.x;
                    if ('y' in v) r.y -= v.y;
                }
            }
            return r;
        }

        static ssub(v1, ...vs) {
            const r = new Vect(v1);
            for (const v of vs) {
                r.x -= v;
                r.y -= v;
            }
            return r;
        }

        static mult(v1, ...vs) {
            const r = new Vect(v1);
            for (const v of vs) {
                if (v) {
                    if ('x' in v) r.x *= v.x;
                    if ('y' in v) r.y *= v.y;
                }
            }
            return r;
        }

        static smult(v1, ...vs) {
            const r = new Vect(v1);
            for (const v of vs) {
                r.x *= v;
                r.y *= v;
            }
            return r;
        }

        static div(v1, ...vs) {
            const r = new Vect(v1);
            for (const v of vs) {
                if (v) {
                    if ('x' in v) r.x /= v.x;
                    if ('y' in v) r.y /= v.y;
                }
            }
            return r;
        }

        static sdiv(v1, ...vs) {
            const r = new Vect(v1);
            for (const v of vs) {
                r.x /= v;
                r.y /= v;
            }
            return r;
        }

        static dot(v1, v2) {
            if (!v1 || !v2) return NaN;
            return ((v1.x||0)*(v2.x||0)) + ((v1.y||0)*(v2.y||0));
        }

        static _cross(v1x, v1y, v2x, v2y) {
            return (v1x*v2y) - (v1y*v2x);
        }
        static cross(v1,v2) {
            if (!v1 || !v2) return NaN;
            return ((v1.x||0)*(v2.y||0)) - ((v1.y||0)*(v2.x||0));
        }

        static _dist(v1x, v1y, v2x, v2y) {
            const dx = (v2x||0)-(v1x||0);
            const dy = (v2y||0)-(v1y||0);
            return Math.sqrt(dx*dx + dy*dy);
        }
        static dist(v1, v2) {
            if (!v1 || !v2) return NaN;
            return this._dist(v1.x, v1.y, v2.x, v2.y);
        }

        static mag(v1) {
            if (!v1) return NaN;
            return Math.sqrt((v1.x||0)*(v1.x||0) + (v1.y||0)*(v1.y||0));
        }

        static normalize(v1) {
            if (!v1) return null;
            let m = Math.sqrt((v1.x||0)*(v1.x||0) + (v1.y||0)*(v1.y||0));
            return new Vect({x:(v1.x||0)/m, y:(v1.y||0)/m});
        }

        static heading(v1, rad=true) {
            if (!v1) return NaN;
            let a = Math.atan2(v1.y||0, v1.x||0);
            if (rad) return a;
            return a*180/Math.PI;
        }

        static rotate(v1, angle, rad=true) {
            if (!v1) return null;
            let ra = (rad) ? angle : angle*Math.PI/180;
            ra += this.heading(v1, true);
            let m = this.mag(v1);
            return new Vect({x: Math.cos(ra)*m, y: Math.sin(ra)*m});
        }

        static angle(v1, v2, rad=true) {
            if (!v1 || !v2) return NaN;
            let a1 = Math.atan2(v1.y||0, v1.x||0);
            let a2 = Math.atan2(v2.y||0, v2.x||0);
            let angle = a2-a1;
            // handle angles > 180
            if (Math.abs(angle) > Math.PI) {
                angle = (angle>0) ? -(angle-Math.PI) : -(angle+Math.PI);
            }
            if (rad) return angle;
            return angle*180/Math.PI;
        }

        static min(v1, ...vs) {
            const r = new Vect(v1);
            for (const v of vs) {
                if (('x' in v) && (v.x < r.x)) r.x = v.x;
                if (('y' in v) && (v.y < r.y)) r.y = v.y;
            }
            return r;
        }

        static max(v1, ...vs) {
            const r = new Vect(v1);
            for (const v of vs) {
                if (('x' in v) && (v.x > r.x)) r.x = v.x;
                if (('y' in v) && (v.y > r.y)) r.y = v.y;
            }
            return r;
        }

        static round(v1) {
            if (!v1) return null;
            return new Vect({x:Math.round(v1.x||0), y:Math.round(v1.y||0)});
        }

        static reflect(v, n) {
            //𝑟 = 𝑑−2(𝑑⋅𝑛)𝑛
            let dot = this.dot(v,n);
            return this.sub(this.smult(n, 2*dot), v);
        }

        static neg(v1) {
            if (!v1) return null;
            return new Vect({x: ('x' in v1) ? -v1.x : 0, y: ('y' in v1) ? -v1.y: 0});
        }

        static equals(v1, v2) {
            if (!v1 && !v2) return true;
            if (v1 && !v1 || !v1 && v2) return false;
            return ((v1.x === v2.x) && (v1.y === v2.y));
        }

        // METHODS -------------------------------------------------------------
        copy() {
            return new Vect(this);
        }

        set(spec={}) {
            if (spec && ('x' in spec)) this.x = spec.x;
            if (spec && ('y' in spec)) this.y = spec.y;
            return this;
        }

        add(...vs) {
            for (const v of vs) {
                if (v) {
                    if ('x' in v) this.x += v.x;
                    if ('y' in v) this.y += v.y;
                }
            }
            return this;
        }

        sadd(...vs) {
            for (const v of vs) {
                this.x += v;
                this.y += v;
            }
            return this;
        }

        sub(...vs) {
            for (const v of vs) {
                if (v) {
                    if ('x' in v) this.x -= v.x;
                    if ('y' in v) this.y -= v.y;
                }
            }
            return this;
        }

        ssub(...vs) {
            for (const v of vs) {
                this.x -= v;
                this.y -= v;
            }
            return this;
        }

        mult(...vs) {
            for (const v of vs) {
                if (v) {
                    if ('x' in v) this.x *= v.x;
                    if ('y' in v) this.y *= v.y;
                }
            }
            return this;
        }

        smult(...vs) {
            for (const v of vs) {
                this.x *= v;
                this.y *= v;
            }
            return this;
        }

        div(...vs) {
            for (const v of vs) {
                if (v) {
                    if ('x' in v) this.x /= v.x;
                    if ('y' in v) this.y /= v.y;
                }
            }
            return this;
        }

        sdiv(...vs) {
            for (const v of vs) {
                this.x /= v;
                this.y /= v;
            }
            return this;
        }

        dot(v2) {
            if (!v2) return NaN;
            return this.x*(v2.x||0) + this.y*(v2.y||0);
        }

        cross(v2) {
            if (!v2) return NaN;
            return this.x*(v2.y||0) - this.y*(v2.x||0);
        }

        dist(v2) {
            if (!v2) return NaN;
            const dx = (v2.x||0)-this.x;
            const dy = (v2.y||0)-this.y;
            return Math.sqrt(dx*dx + dy*dy);
        }

        normalize() {
            let m = this.mag;
            if (m != 0) this.sdiv(m);
            return this;
        }

        round() {
            this.x = Math.round(this.x);
            this.y = Math.round(this.y);
            return this;
        }

        reflect(n) {
            //𝑟 = 𝑑−2(𝑑⋅𝑛)𝑛
            let dot = this.dot(n);
            return this.neg().add(Vect.smult(n, 2*dot));
        }

        neg() {
            this.x = -this.x;
            this.y = -this.y;
            return this;
        }

        heading(rad=true) {
            let a = Math.atan2(this.y, this.x);
            if (rad) return a;
            return a*180/Math.PI;
        }

        rotate(angle, rad=true) {
            let ra = (rad) ? angle : angle*Math.PI/180;
            ra += this.heading(true);
            let m = this.mag;
            this.x = Math.cos(ra) * m;
            this.y = Math.sin(ra) * m;
            return this;
        }

        angle(v2, rad=true) {
            if (!v2) return NaN;
            let a1 = Math.atan2(this.y, this.x);
            let a2 = Math.atan2(v2.y||0, v2.x||0);
            let angle = a2-a1;
            // handle angles > 180
            if (Math.abs(angle) > Math.PI) {
                angle = (angle>0) ? -(angle-Math.PI) : -(angle+Math.PI);
            }
            if (rad) return angle;
            return angle*180/Math.PI;
        }

        equals(v2) {
            if (!v2) return false;
            return (this.x === v2.x && this.y === v2.y);
        }

        limit(max) {
            if (this.sqmag > max*max) {
                this.mag = max;
            }
            return this;
        }

        min(...vs) {
            for (const v of vs) {
                if (v) {
                    if (('x' in v) && (v.x < this.x)) this.x = v.x;
                    if (('y' in v) && (v.y < this.y)) this.y = v.y;
                }
            }
            return this;
        }

        max(...vs) {
            for (const v of vs) {
                if (v) {
                    if (('x' in v) && (v.x > this.x)) this.x = v.x;
                    if (('y' in v) && (v.y > this.y)) this.y = v.y;
                }
            }
            return this;
        }

        toString() {
            return Fmt$1.toString('Vect', this.x, this.y);
        }

    };

    // =========================================================================
    let Bounds$1 = class Bounds extends Gadget {
        // SCHEMA --------------------------------------------------------------
        static {
            this.$schema('x', { dflt: 0 });
            this.$schema('y', { dflt: 0 });
            this.$schema('width', { dflt: 0 });
            this.$schema('height', { dflt: 0 });
        }

        // STATIC METHODS ------------------------------------------------------
        static iBounds(obj) {
            return obj && ('minx' in obj) && ('miny' in obj) && ('maxx' in obj) && ('maxy' in obj);
        }

        static _edge1(minx, miny, maxx, maxy) {
            return {
                p1: {x:minx, y:miny}, 
                p2: {x:maxx, y:miny},
            };
        }
        static edge1(b) {
            if (!b) return null;
            return this._edge1(b.minx, b.miny, b.maxx, b.maxy);
        }

        static _edge2(minx, miny, maxx, maxy) {
            return {
                p1: {x:maxx, y:miny}, 
                p2: {x:maxx, y:maxy},
            };
        }
        static edge2(b) {
            if (!b) return null;
            return this._edge2(b.minx, b.miny, b.maxx, b.maxy);
        }
        static _edge3(minx, miny, maxx, maxy) {
            return {
                p1: {x:maxx, y:maxy}, 
                p2: {x:minx, y:maxy},
            };
        }
        static edge3(b) {
            if (!b) return null;
            return this._edge3(b.minx, b.miny, b.maxx, b.maxy);
        }
        static _edge4(minx, miny, maxx, maxy) {
            return {
                p1: {x:minx, y:maxy}, 
                p2: {x:minx, y:miny},
            };
        }
        static edge4(b) {
            if (!b) return null;
            return this._edge4(b.minx, b.miny, b.maxx, b.maxy);
        }

        // STATIC PROPERTIES ---------------------------------------------------
        static get zero() {
            return new Bounds();
        }

        // STATIC FUNCTIONS ----------------------------------------------------
        static fromMinMax(minx, miny, maxx, maxy) {
            return new Bounds({x:minx, y:miny, width:maxx-minx, height:maxy-miny});
        }

        // PROPERTIES ----------------------------------------------------------
        get minx() {
            return this.x;
        }
        get miny() {
            return this.y;
        }
        get min() {
            return new Vect$1({x:this.x, y:this.y});
        }

        get maxx() {
            return this.x + this.width;
        }
        get maxy() {
            return this.y + this.height;
        }
        get max() {
            return new Vect$1({x:this.x + this.width, y:this.y + this.height});
        }

        get midx() {
            return this.x + (this.width * .5);
        }
        get midy() {
            return this.y + (this.height * .5);
        }
        get mid() {
            return new Vect$1({x:this.x + (this.width * .5), y:this.y + (this.height * .5)});
        }

        get edge1() {
            return this.constructor.edge1(this);
        }
        get edge2() {
            return this.constructor.edge2(this);
        }
        get edge3() {
            return this.constructor.edge3(this);
        }
        get edge4() {
            return this.constructor.edge4(this);
        }

        // STATIC FUNCTIONS ----------------------------------------------------
        static newOrExtend(ob, nb) {
            if (!ob) return nb;
            ob.extend(nb);
            return ob;
        }

        // METHODS -------------------------------------------------------------
        /**
         * make a copy of the current bounds and return
         */
        copy() {
            return new Bounds(this);
        }

        /**
         * Extend the current bounds to include the extend of given bounds
         * @param {*} other 
         */
        extend(other) {
            if (!other) return this;
            if (other.minx < this.minx) {
                let delta = this.minx - other.minx;
                this.width += delta;
                this.x = other.minx;
            }
            if (other.maxx > this.maxx) {
                let delta = other.maxx - this.maxx;
                this.width += delta;
            }
            if (other.miny < this.miny) {
                let delta = this.miny - other.miny;
                this.height += delta;
                this.y = other.minx;
            }
            if (other.maxy > this.maxy) {
                let delta = other.maxy - this.maxy;
                this.height += delta;
            }
            return this;
        }

        equals(other) {
            if (!other) return this;
            if (this.x !== other.x) return false;
            if (this.y !== other.y) return false;
            if (this.width !== other.width) return false;
            if (this.height !== other.height) return false;
            return true;
        }

        toString() {
            return Fmt$1.toString('Bounds', this.x, this.y, this.maxx, this.maxy, this.width, this.height);
        }
    };

    // =========================================================================
    // handy math fcns

    class Mathf {
        static approx(v1, v2) {
            return Math.abs(v1 - v2) < .00001;
        }

        static clamp(val, min, max) {
            return (val > max) ? max : ((val < min) ? min : val);
        }

        static clampInt(val, min, max) {
            val = parseInt(val);
            return (val > max) ? max : ((val < min) ? min : val);
        }

        static roundTo(val, digits=1) {
            return +val.toFixed(digits);
        }

        static floorTo(val, digits=1) {
            let base = 1/(10**digits);
            return +(Math.floor(val/base)*base).toFixed(digits);
        }

        static round(val, places) {
            return +(Math.round(val + "e+" + places) + "e-" + places);
        }

        static angle(cx, cy, ex, ey, rad=true) {
            let dx = ex - cx;
            let dy = ey - cy;
            let theta = Math.atan2(dy, dx);     // range (-PI, PI]
            if (rad) return theta;
            theta *= 180 / Math.PI;             // rads to degs, range (-180, 180]
            return theta;
        }

        static modulo(number, divisor) {
            if (number < 0) {
                return ((number % divisor) + divisor) % divisor;
            }
            return number % divisor;
        }

        /**
         * normalize the given angle expressed in radians or degrees to be either within -PI to PI (half)
         * or 0 to 2*PI
         * @param {float} angle 
         * @param {bool} [rad=true] - angle is expressed in radians (true) or degrees (false)
         * @param {float} [min=-Math.PI] - starting angle for normalization
         */
        static normalizeAngle(angle, min=-Math.PI, rad=true) {
            angle -= min;
            angle = this.modulo(angle, (rad) ? Math.PI*2 : 360);
            return angle + min;
        }

        static angleBetween(a, b, rad=true) {
            let d = a - b;
            if (rad) {
                d += (d > Math.PI) ? -Math.PI*2 : (d < -Math.PI) ? Math.PI*2 : 0;
            } else {
                d += (d > 180) ? -360 : (d < -180) ? 360 : 0;
            }
            return Math.abs(d);
        }

        static distance(x1, y1, x2, y2) {
            let dx = x2-x1;
            let dy = y2-y1;
            return Math.sqrt(dx*dx + dy*dy);
        }

        static lineDistance(p1x, p1y, p2x, p2y, p3x, p3y) {
            // special case ... vertical line
            if (p1x === p2x) {
                return Math.abs(p3x-p1x);
            // special case ... horizontal line
            } else if (p1y === p2y) {
                return Math.abs(p3y-p1y);
            } else {
                // standard line equation
                // y = mx+b
                // converted to ax + by + c = 0 form
                // mx - y + b = 0
                // distance formula w/ vars from a,b,c form
                // d = Math.abs(a*p3x + b*p3y + c)/Math.sqrt(a^2+b^2)
                // converted to use m/b (a=>m b=>-1 c=>b)
                // d = Math.abs(m*p3x - p3y + b)/Math.sqrt(m^2+1)
                let m = (p2y - p1y)/(p2x-p1x);
                let b = (p1y-m*p1x);
                let d = Math.abs(m*p3x - p3y + b)/Math.sqrt(m*m+1);
                return d;
            }
        }

        static rotatePoint(cx, cy, pX, pY, angle) {
            var dx = pX - cx;
            var dy = pY - cy;
            var mag = Math.sqrt(dx * dx + dy * dy);
            let rads = angle * Math.PI/180;
            let x = mag * Math.cos(rads);
            let y = mag * Math.sin(rads);
            return {x: cx+x, y: cy+y};
        }

        static lerp(min, max, minw, maxw, v) {
            if (max === min) return 0;
            return minw + (maxw-minw) * (v-min)/(max-min);
        }

        static mlerp(v, ...args) {
            if ((args.length%2) || (args.length < 2)) return v;
            let min=args[0];
            let minw=args[1];
            let max=min, maxw=minw;
            for (let i=2; i<args.length-1; i+=2) {
                if (i !== 2) {
                    min = max;
                    minw = maxw;
                }
                max = args[i];
                maxw = args[i+1];
                if (v < max) break;
            }
            return minw + (maxw-minw) * (v-min)/(max-min);
        }

        static addAvgTerm(terms, avg, newTerm) {
            return (terms*avg + newTerm)/(terms+1);
        }

        static towards(x1,y1, x2,y2, d) {
            if (x1 === x2 && y1 === y2 || d === 0) return [x1, y1];
            let md = this.distance(x1,y1, x2,y2);
            let k = d/md;
            return [x1+(x2-x1)*k, y1+(y2-y1)*k];
        }

        static checkIntersectRectSegment(rminx, rminy, rmaxx, rmaxy, p1x, p1y, p2x, p2y) {
            // Find min and max X for the segment
            let minX = p1x;
            let maxX = p2x;
            if (p1x > p2x) {
                minX = p2x;
                maxX = p1x;
            }
            // Find the intersection of the segment's and rectangle's x-projections
            if (maxX > rmaxx) maxX = rmaxx;
            if (minX < rminx) minX = rminx;
            // If their projections do not intersect return false
            if (minX > maxX) return false;
            // Find corresponding min and max Y for min and max X we found before
            let minY = p1y;
            let maxY = p2y;
            let dx = p2x - p1x;
            if (Math.abs(dx) > 0.0000001) {
                let a = (p2y - p1y)/dx;
                let b = p1y - a*p1x;
                minY = a*minX + b;
                maxY = a*maxX + b;
            }
            if (minY > maxY) {
                let tmp = maxY;
                maxY = minY;
                minY = tmp;
            }
            // Find the intersection of the segment's and rectangle's y-projections
            if (maxY > rmaxy) maxY = rmaxy;
            if (minY < rminy) minY = rminy;
            // If Y-projections do not intersect return false
            if (minY > maxY) return false;
            return true;
        }

        static overlap(min1, max1, min2, max2) {
            let min = min1;
            let max = max1;
            if (max>max2) max = Math.max(max2,min1);
            if (min<min2) min = Math.min(min2,max1);
            return max-min;
        }

        static projectSegment(min1, max1, min2, max2) {
            let min = min1;
            let max = max1;
            if (max>max2) max = Math.max(max2,min1);
            if (min<min2) min = Math.min(min2,max1);
            return [min, max];
        }

        static invProjectSegment(smin, smax, pmin, pmax) {
            if (pmin<smin) pmin=smin;
            if (pmax>smax) pmax=smax;
            if (pmin>smin && pmax<smax) {
                return [smin, pmin, pmax, smax];
            }
            let min = (pmin>smin) ? smin : pmax;
            let max = (pmax<smax) ? smax : pmin;
            return [min, max];
        }

        /**
         * A function to return a sample within a given range, where the sample roughly fits a standard bell curve for standard distribution.
         * Based on maths from https://en.wikipedia.org/wiki/Box%E2%80%93Muller_transform
         * @param {*} min 
         * @param {*} mean 
         * @param {*} max 
         * @param {*} sdf - standard deviation factor.  Range between mean and min/max is divided by this to give approximation for standard deviation for curve.
         * @returns sample
         */
        static distSample(min, mean, max, sdf = 3) {
            let sample;
            let maxiters = 100;
            do {
                if (maxiters-- <= 0) break;
                var u = 1 - Math.random();
                var v = 1 - Math.random();
                let sd = Math.max(max - mean, mean - min) / sdf;
                sample = mean + Math.sqrt(-2 * Math.log(u)) * Math.cos(2.0 * Math.PI * v) * sd;

            } while (sample < min || sample > max);
            return sample;

        }

        static avg(...args) { 
            let sum = args.reduce((pv, cv) => pv+cv, 0);
            return sum/args.length;
        }

        static avgi(...args) { 
            let sum = args.reduce((pv, cv) => pv+cv, 0);
            return Math.round(sum/args.length);
        }

    }

    class XForm extends Gadget {

        // SCHEMA --------------------------------------------------------------
        static {
            // grip offsets
            // -- offset from grips, in pixels
            // -- applicable when grips are not overlapping
            this.$schema('gripOffsetLeft', {dflt: 0});
            this.$schema('gripOffsetRight', {dflt: 0});
            this.$schema('gripOffsetTop', {dflt: 0});
            this.$schema('gripOffsetBottom', {dflt: 0});
            // -- extend grip offsets to force aspect ratio of xform bounds based on given fixedWidth/fixedHeight
            // -- applicable when grips are not overlapping
            // -- if value is true, uses defined fixedWidth/Height to determine forced aspect ratio (defaults to 1:1)
            // -- if value is numeric, uses value as forced aspect ratio (width/height);
            this.$schema('gripOffsetForceRatio', {dflt: false});
            // origin
            // -- origin x/y offset (in pixels) (in parent space)
            // -- applicable when grips are overlapping
            this.$schema('x', {dflt: 0});
            this.$schema('y', {dflt: 0});
            // width/height
            // -- fixed dimensions of transform
            // -- applicable when grips are overlapping
            this.$schema('fixedWidth', {dflt: 0});
            this.$schema('fixedHeight', {dflt: 0});
            // grips
            // -- grips from parent transform, in percent (0-1)
            this.$schema('left', {dflt: 0});
            this.$schema('right', {dflt: 0});
            this.$schema('top', {dflt: 0});
            this.$schema('bottom', {dflt: 0});
            // origin
            // -- origin or pivot point of local transform, in percent of current grip dimensions
            // -- applicable when grips are not overlapping
            this.$schema('origx', { dflt: .5 });
            this.$schema('origy', { dflt: .5 });
            // -- scale to apply for this transform relative to parent
            this.$schema('scalex', { dflt: 1 });
            this.$schema('scaley', { dflt: 1 });
            // -- angle to apply for this transform relative to parent
            this.$schema('angle', { dflt: 0 });
            // -- manually set parent xform 
            this.$schema('parent', { link: true, serializable: false });
            // -- autogenerated bounds, regenerated upon xform changes, linking to parent, and gizmo hierarchy changes
            this.$schema('$boundsRegen', { eventable: false, dflt: true });
            this.$schema('$bounds', { eventable:false, dflt: (o) => new Bounds$1() });
            this.$schema('$savedTransform', { eventable:false, parser: (o) => null });
        }

        $on_modified(evt, key) {
            this.$boundsRegen = true;
        }

        get bounds() {
            if (this.$boundsRegen) {
                this.$boundsRegen = false;
                this.$bounds = this.computeBounds();
            }
            return this.$bounds;
        }

        constructor(spec={}) {
            let gripOffset = spec.gripOffset || 0;
            if (!('gripOffsetLeft' in spec)) spec.gripOffsetLeft = gripOffset;
            if (!('gripOffsetRight' in spec)) spec.gripOffsetRight = gripOffset;
            if (!('gripOffsetTop' in spec)) spec.gripOffsetTop = gripOffset;
            if (!('gripOffsetBottom' in spec)) spec.gripOffsetBottom = gripOffset;
            let grip = spec.grip || 0;
            if (!('left' in spec)) spec.left = grip;
            if (!('right' in spec)) spec.right = grip;
            if (!('top' in spec)) spec.top = grip;
            if (!('bottom' in spec)) spec.bottom = grip;
            let orig = ('orig' in spec) ? spec.orig : .5;
            if (!('origx' in spec)) spec.origx = orig;
            if (!('origy' in spec)) spec.origy = orig;
            let scale = spec.scale || 1;
            if (!('scalex' in spec)) spec.scalex = scale;
            if (!('scaley' in spec)) spec.scaley = scale;
            super(spec);
            // listen to changes to self
            this.at_modified.listen(this.$on_modified, this);
        }

        // grip positions relative to parent bounds/rect
        get gripLeft() {
            let p = this.parent;
            //if (p) return Math.round(p.minx + (p.width*this.left));
            if (p) return p.minx + (p.width*this.left);
            return 0;
        }

        get gripRight() {
            let p = this.parent;
            //if (p) return Math.round(p.maxx - (p.width*this.right));
            if (p) return p.maxx - (p.width*this.right);
            return 0;
        }
        get gripTop() {
            let p = this.parent;
            //if (p) return Math.round(p.miny + (p.height*this.top));
            if (p) return p.miny + (p.height*this.top);
            return 0;
        }
        get gripBottom() {
            let p = this.parent;
            //if (p) return Math.round(p.maxy - (p.height*this.bottom));
            if (p) return p.maxy - (p.height*this.bottom);
            return 0;
        }

        // grip dimensions in pixels
        get gripWidth() {
            let p = this.parent;
            //if (p) return Math.round(p.maxx - (p.width*this.right)) - Math.round(p.minx + (p.width*this.left));
            if (p) return (p.maxx - (p.width*this.right)) - (p.minx + (p.width*this.left));
            return 0;
        }
        get gripHeight() {
            let p = this.parent;
            //if (p) return Math.round(p.maxy - (p.height*this.bottom)) - Math.round(p.miny + (p.height*this.top));
            if (p) return (p.maxy - (p.height*this.bottom)) - (p.miny + (p.height*this.top));
            return 0;
        }

        // delta from parent origin to current origin in pixels
        get deltax() {
            let gl = this.gripLeft;
            let gr = this.gripRight;
            //if (gl === gr) {
            if (Mathf.approx(gl, gr)) {
                return gl + this.x;
            } else {
                let left = gl + this.gripOffsetLeft;
                let right = gr - this.gripOffsetRight;
                //return left + Math.round((right-left)*this.origx);
                return left + ((right-left)*this.origx);
            }
        }
        get deltay() {
            let gt = this.gripTop;
            let gb = this.gripBottom;
            //if (gt === gb) {
            if (Mathf.approx(gt, gb)) {
                return gt + this.y;
            } else {
                let top = gt + this.gripOffsetTop;
                let bottom = gb - this.gripOffsetBottom;
                //return top + Math.round((bottom-top)*this.origy);
                return top + ((bottom-top)*this.origy);
            }
        }

        // min/max x/y returns min/max of bounds/rect in local space
        get minx() {
            return this.bounds.x;
        }

        get miny() {
            return this.bounds.y;
        }

        get maxx() {
            return this.bounds.x+this.bounds.width;
        }

        get maxy() {
            return this.bounds.y+this.bounds.height;
        }

        get width() {
            return this.bounds.width;
        }

        get height() {
            return this.bounds.height;
        }

        // inverse scale of transform
        get iscalex() {
            return (this.scalex) ? 1/this.scalex : 0;
        }
        get iscaley() {
            return (this.scaley) ? 1/this.scaley : 0;
        }

        computeBounds() {
            let minx=0, miny=0, width=0, height=0;
            //if (this.gripLeft === this.gripRight) {
            if (Mathf.approx(this.gripLeft, this.gripRight)) {
                //minx = Math.round(-this.fixedWidth*this.origx);
                minx = (-this.fixedWidth*this.origx);
                width = this.fixedWidth;
            } else {
                let left = this.gripLeft + this.gripOffsetLeft;
                minx = left - this.deltax;
                let right = this.gripRight - this.gripOffsetRight;
                width = right - left;
            }
            //if (this.gripTop === this.gripBottom) {
            if (Mathf.approx(this.gripTop, this.gripBottom)) {
                //miny = Math.round(-this.fixedHeight*this.origy);
                miny = (-this.fixedHeight*this.origy);
                height = this.fixedHeight;
            } else {
                let top = this.gripTop + this.gripOffsetTop;
                miny = top - this.deltay;
                let bottom = this.gripBottom - this.gripOffsetBottom;
                height = bottom-top;
            }
            // -- handled forced ratio
            if (this.gripOffsetForceRatio) {
                let desiredRatio = (typeof this.gripOffsetForceRatio === 'number') ? 
                    this.gripOffsetForceRatio : 
                    (this.fixedWidth && this.fixedHeight) ? this.fixedWidth/this.fixedHeight : 1;
                let currentRatio = width/height;
                if (this.gripLeft !== this.gripRight) {
                    if (width && height) {
                        if (currentRatio>desiredRatio) {
                            let adjustedWidth = height * desiredRatio;
                            //minx += Math.round((width-adjustedWidth)*this.origx);
                            minx += ((width-adjustedWidth)*this.origx);
                            width = adjustedWidth;
                        }
                    }
                }
                if (this.gripTop !== this.gripBottom) {
                    if (width && height) {
                        if (currentRatio<desiredRatio) {
                            let adjustedHeight = width / desiredRatio;
                            //miny += Math.round((height-adjustedHeight)*this.origy);
                            miny += ((height-adjustedHeight)*this.origy);
                            height = adjustedHeight;
                        }
                    }
                }
            }
            return new Bounds$1({x:minx, y:miny, width:width, height:height});
        }

        // apply local coords, then scale, rotation, translation
        apply(ctx, chain=true) {
            if (chain && this.parent) this.parent.apply(ctx);
            let deltax = this.deltax;
            let deltay = this.deltay;
            this.$savedTransform = ctx.getTransform();
            if (deltax || deltay) ctx.translate(deltax, deltay);
            if (this.angle) ctx.rotate(this.angle);
            if (this.scalex !== 1|| this.scaley !== 1) ctx.scale(this.scalex, this.scaley);
        }

        // revert transform
        revert(ctx, chain=true) {
            // revert reverses order of operations
            ctx.setTransform(this.$savedTransform);
            if (chain && this.parent) this.parent.revert(ctx);
        }

        /**
         * translate world position to local position
         * @param {*} worldPos 
         */
        getLocal(worldPos, chain=true) {
            let localPos;
            // apply parent transform (if any)
            if (chain && this.parent) {
                localPos = this.parent.getLocal(worldPos);
            } else {
                localPos = new Vect$1(worldPos);
            }
            // apply local transforms
            let deltax = this.deltax;
            let deltay = this.deltay;
            if (deltax||deltay) localPos.sub({x:deltax, y:deltay});
            if (this.angle) localPos.rotate(-this.angle, true);
            if (this.scalex !== 1|| this.scaley !== 1) localPos.div({x:this.scalex, y:this.scaley});
            //return localPos.round();
            return localPos;
        }

        /**
         * translate local position to world position
         * @param {*} localPos 
         */
        getWorld(localPos, chain=true) {
            let worldPos = new Vect$1(localPos);
            // apply local transforms
            if (this.scalex !== 1 || this.scaley !== 1) worldPos.mult({x:this.scalex, y:this.scaley});
            if (this.angle) worldPos.rotate(this.angle, true);
            let deltax = this.deltax;
            let deltay = this.deltay;
            if (deltax || deltay) worldPos.add({x:deltax, y:deltay});
            // apply parent transform (if any)
            if (chain && this.parent) worldPos = this.parent.getWorld(worldPos);
            //return worldPos.round();
            return worldPos;
        }

        renderGrip(ctx, x, y, which='tl', opts={}) {
            let size=opts.gripSize || 5;
            ctx.beginPath();
            ctx.moveTo(x,y);
            switch (which) {
            case 'tl':
                ctx.lineTo(x-size*2,y-size);
                ctx.lineTo(x-size,y-size*2);
                break;
            case 'tr':
                ctx.lineTo(x+size*2,y-size);
                ctx.lineTo(x+size,y-size*2);
                break;
            case 'bl':
                ctx.lineTo(x-size*2,y+size);
                ctx.lineTo(x-size,y+size*2);
                break;
            case 'br':
                ctx.lineTo(x+size*2,y+size);
                ctx.lineTo(x+size,y+size*2);
                break;
            }
            ctx.fillStyle = opts.gripColor || 'rgba(255,0,255,.5';
            ctx.fill();
        }

        renderOrigin(ctx, x, y, opts={}) {
            let size = opts.originSize || 4;
            ctx.fillStyle = opts.originColor || 'rgba(255,0,0,.5)';
            ctx.fillRect(x-size, y-size, size*2, size*2);
        }

        renderBounds(ctx, left, top, width, height, opts={}) {
            ctx.setLineDash([5,5]);
            ctx.lineWidth = opts.border || 3;
            ctx.strokeStyle = opts.boundsColor || 'rgba(255,255,0,.5)';
            ctx.strokeRect(left, top, width, height);
            ctx.setLineDash([]);
        }

        render(ctx, chain=false, color="rgba(255,255,0,.5)", opts={}) {
            // get to local coordinate space
            if (chain && this.parent) this.parent.apply(ctx);
            // draw the grips
            if (this.parent) {
                this.renderGrip(ctx, this.gripLeft, this.gripTop, 'tl', opts);
                this.renderGrip(ctx, this.gripRight, this.gripTop, 'tr', opts);
                this.renderGrip(ctx, this.gripLeft, this.gripBottom, 'bl', opts);
                this.renderGrip(ctx, this.gripRight, this.gripBottom, 'br', opts);
            }
            // apply origin transform
            let deltax = this.deltax;
            let deltay = this.deltay;
            this.$savedTransform = ctx.getTransform();
            if (deltax || deltay) ctx.translate(deltax, deltay);
            // draw the origin
            this.renderOrigin(ctx, 0, 0, opts);
            // parentless grips follow origin
            if (!this.parent) {
                this.renderGrip(ctx, this.gripLeft, this.gripTop, 'tl', opts);
                this.renderGrip(ctx, this.gripRight, this.gripTop, 'tr', opts);
                this.renderGrip(ctx, this.gripLeft, this.gripBottom, 'bl', opts);
                this.renderGrip(ctx, this.gripRight, this.gripBottom, 'br', opts);
            }
            // apply local transform
            if (this.angle) ctx.rotate(this.angle);
            if (this.scalex !== 1|| this.scaley !== 1) ctx.scale(this.scalex, this.scaley);
            // draw the bounding rect of this transform
            this.renderBounds(ctx, this.minx, this.miny, this.width, this.height, opts);
            // revert transform
            ctx.setTransform(this.$savedTransform);
            if (chain && this.parent) this.parent.revert(ctx);
        }

        toString() {
            return Fmt$1.toString(this.constructor.name, this.minx, this.miny, this.width, this.height, this.x, this.y);
        }

    }

    // =========================================================================
    class Vect3 extends Gadget {
        // SCHEMA --------------------------------------------------------------
        static {
            this.$schema('x', { dflt: 0 });
            this.$schema('y', { dflt: 0 });
            this.$schema('z', { dflt: 0 });
        }

        // STATIC PROPERTIES ---------------------------------------------------
        static get zero() {
            return new Vect3();
        }

        static get maxValue() {
            return new Vect3({x:Number.MAX_SAFE_INTEGER, y:Number.MAX_SAFE_INTEGER, z:Number.MAX_SAFE_INTEGER});
        }

        // PROPERTIES ----------------------------------------------------------
        get mag() {
            return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
        }
        set mag(v) {
            this.normalize().smult(v);
        }
        get sqmag() {
            return this.x*this.x + this.y*this.y + this.z*this.z;
        }

        // STATIC METHODS ------------------------------------------------------
        static iVect3(obj) {
            return obj && ('x' in obj) && ('y' in obj) && ('z' in obj);
        }

        static add(...vs) {
            const r = new Vect3();
            for (const v of vs) {
                if (v) {
                    if ('x' in v) r.x += v.x;
                    if ('y' in v) r.y += v.y;
                    if ('z' in v) r.z += v.z;
                }
            }
            return r;
        }

        static sadd(v1, ...vs) {
            const r = new Vect3(v1);
            for (const v of vs) {
                r.x += v;
                r.y += v;
                r.z += v;
            }
            return r;
        }

        static sub(v1, ...vs) {
            const r = new Vect3(v1);
            for (const v of vs) {
                if (v) {
                    if ('x' in v) r.x -= v.x;
                    if ('y' in v) r.y -= v.y;
                    if ('z' in v) r.z -= v.z;
                }
            }
            return r;
        }

        static ssub(v1, ...vs) {
            const r = new Vect3(v1);
            for (const v of vs) {
                r.x -= v;
                r.y -= v;
                r.z -= v;
            }
            return r;
        }

        static mult(v1, ...vs) {
            const r = new Vect3(v1);
            for (const v of vs) {
                if (v) {
                    if ('x' in v) r.x *= v.x;
                    if ('y' in v) r.y *= v.y;
                    if ('z' in v) r.z *= v.z;
                }
            }
            return r;
        }

        static smult(v1, ...vs) {
            const r = new Vect3(v1);
            for (const v of vs) {
                r.x *= v;
                r.y *= v;
                r.z *= v;
            }
            return r;
        }

        static div(v1, ...vs) {
            const r = new Vect3(v1);
            for (const v of vs) {
                if (v) {
                    if ('x' in v) r.x /= v.x;
                    if ('y' in v) r.y /= v.y;
                    if ('z' in v) r.z /= v.z;
                }
            }
            return r;
        }

        static sdiv(v1, ...vs) {
            const r = new Vect3(v1);
            for (const v of vs) {
                r.x /= v;
                r.y /= v;
                r.z /= v;
            }
            return r;
        }

        static dot(v1, v2) {
            if (!v1 || !v2) return NaN;
            return ((v1.x||0)*(v2.x||0)) + ((v1.y||0)*(v2.y||0)) + ((v1.z||0)*(v2.z||0));
        }

        static _dist(x1, y1, z1, x2, y2, z2) {
            const dx = x2-x1;
            const dy = y2-y1;
            const dz = z2-z1;
            return Math.sqrt(dx*dx + dy*dy + dz*dz);
        }

        static dist(v1, v2) {
            if (!v1 || !v2) return NaN;
            const dx = (v2.x||0)-(v1.x||0);
            const dy = (v2.y||0)-(v1.y||0);
            const dz = (v2.z||0)-(v1.z||0);
            return Math.sqrt(dx*dx + dy*dy + dz*dz);
        }

        static mag(v1) {
            if (!v1) return NaN;
            return Math.sqrt((v1.x||0)*(v1.x||0) + (v1.y||0)*(v1.y||0) + (v1.z||0)*(v1.z||0));
        }

        static normalize(v1) {
            if (!v1) return null;
            let m = Math.sqrt((v1.x||0)*(v1.x||0) + (v1.y||0)*(v1.y||0) + (v1.z||0)*(v1.z||0));
            return new Vect3({x:(v1.x||0)/m, y:(v1.y||0)/m, z:(v1.z||0)/m});
        }

        // FIXME: add heading (given axis), rotate, angle

        static min(v1, ...vs) {
            const r = new Vect3(v1);
            for (const v of vs) {
                if (('x' in v) && (v.x < r.x)) r.x = v.x;
                if (('y' in v) && (v.y < r.y)) r.y = v.y;
                if (('z' in v) && (v.z < r.z)) r.z = v.z;
            }
            return r;
        }

        static max(v1, ...vs) {
            const r = new Vect3(v1);
            for (const v of vs) {
                if (('x' in v) && (v.x > r.x)) r.x = v.x;
                if (('y' in v) && (v.y > r.y)) r.y = v.y;
                if (('z' in v) && (v.z > r.z)) r.z = v.z;
            }
            return r;
        }

        static round(v1) {
            if (!v1) return null;
            return new Vect3({x:Math.round(v1.x || 0), y:Math.round(v1.y || 0), z:Math.round(v1.z || 0)});
        }

        static reflect(v, n) {
            //𝑟 = 𝑑−2(𝑑⋅𝑛)𝑛
            let dot = this.dot(v,n);
            return this.sub(this.smult(n, 2*dot), v);
        }

        static neg(v1) {
            if (!v1) return null;
            return new Vect3({x: ('x' in v1) ? -v1.x : 0, y: ('y' in v1) ? -v1.y: 0, z: ('z' in v1) ? -v1.z : 0});
        }

        static equals(v1, v2) {
            if (!v1 && !v2) return true;
            if (v1 && !v1 || !v1 && v2) return false;
            return ((v1.x === v2.x) && (v1.y === v2.y) && (v1.z === v2.z));
        }

        // METHODS -------------------------------------------------------------
        copy() {
            return new Vect3(this);
        }

        set(spec={}) {
            if (spec && ('x' in spec)) this.x = spec.x;
            if (spec && ('y' in spec)) this.y = spec.y;
            if (spec && ('z' in spec)) this.z = spec.z;
            return this;
        }

        add(...vs) {
            for (const v of vs) {
                if (v) {
                    if ('x' in v) this.x += v.x;
                    if ('y' in v) this.y += v.y;
                    if ('z' in v) this.z += v.z;
                }
            }
            return this;
        }

        sadd(...vs) {
            for (const v of vs) {
                this.x += v;
                this.y += v;
                this.z += v;
            }
            return this;
        }

        sub(...vs) {
            for (const v of vs) {
                if (v) {
                    if ('x' in v) this.x -= v.x;
                    if ('y' in v) this.y -= v.y;
                    if ('z' in v) this.z -= v.z;
                }
            }
            return this;
        }

        ssub(...vs) {
            for (const v of vs) {
                this.x -= v;
                this.y -= v;
                this.z -= v;
            }
            return this;
        }

        mult(...vs) {
            for (const v of vs) {
                if (v) {
                    if ('x' in v) this.x *= v.x;
                    if ('y' in v) this.y *= v.y;
                    if ('z' in v) this.z *= v.z;
                }
            }
            return this;
        }

        smult(...vs) {
            for (const v of vs) {
                this.x *= v;
                this.y *= v;
                this.z *= v;
            }
            return this;
        }

        div(...vs) {
            for (const v of vs) {
                if (v) {
                    if ('x' in v) this.x /= v.x;
                    if ('y' in v) this.y /= v.y;
                    if ('z' in v) this.z /= v.z;
                }
            }
            return this;
        }

        sdiv(...vs) {
            for (const v of vs) {
                this.x /= v;
                this.y /= v;
                this.z /= v;
            }
            return this;
        }

        dot(v2) {
            if (!v2) return NaN;
            return this.x*(v2.x||0) + this.y*(v2.y||0) + this.z*(v2.z||0);
        }

        dist(v2) {
            if (!v2) return NaN;
            const dx = (v2.x||0)-this.x;
            const dy = (v2.y||0)-this.y;
            const dz = (v2.z||0)-this.z;
            return Math.sqrt(dx*dx + dy*dy + dz*dz);
        }

        normalize() {
            let m = this.mag;
            if (m != 0) this.sdiv(m);
            return this;
        }

        round() {
            this.x = Math.round(this.x);
            this.y = Math.round(this.y);
            this.z = Math.round(this.z);
            return this;
        }

        reflect(n) {
            //𝑟 = 𝑑−2(𝑑⋅𝑛)𝑛
            let dot = this.dot(n);
            return this.neg().add(Vect3.smult(n, 2*dot));
        }

        neg() {
            this.x = -this.x;
            this.y = -this.y;
            this.z = -this.z;
            return this;
        }

        // FIXME
        heading(rad = false) {
            let a = Math.atan2(this.y, this.x);
            if (rad) return a;
            return a * 180 / Math.PI;
        }

        // FIXME
        rotate(angle, rad = false) {
            let ra = (rad) ? angle : angle * Math.PI / 180;
            ra += this.heading(true);
            let m = this.mag;
            this.x = Math.cos(ra) * m;
            this.y = Math.sin(ra) * m;
            return this;
        }

        // FIXME
        angle(xorv, y, rad = false) {
            let x2, y2;
            if (typeof xorv === 'number') {
                x2 = (xorv || 0);
                y2 = (y || 0);
            } else {
                x2 = xorv.x || 0;
                y2 = xorv.y || 0;
            }
            let a1 = Math.atan2(this.y, this.x);
            let a2 = Math.atan2(y2, x2);
            let angle = a2 - a1;
            // handle angles > 180
            if (Math.abs(angle) > Math.PI) {
                angle = (angle > 0) ? -(angle - Math.PI) : -(angle + Math.PI);
            }
            if (rad) return angle;
            return angle * 180 / Math.PI;
        }

        equals(v2) {
            if (!v2) return false;
            return (this.x === v2.x && this.y === v2.y && this.z === v2.z);
        }

        limit(max) {
            if (this.sqmag > max * max) {
                this.mag = max;
            }
            return this;
        }

        min(...vs) {
            for (const v of vs) {
                if (v) {
                    if (('x' in v) && (v.x < this.x)) this.x = v.x;
                    if (('y' in v) && (v.y < this.y)) this.y = v.y;
                    if (('z' in v) && (v.z < this.z)) this.z = v.z;
                }
            }
            return this;
        }

        max(...vs) {
            for (const v of vs) {
                if (v) {
                    if (('x' in v) && (v.x > this.x)) this.x = v.x;
                    if (('y' in v) && (v.y > this.y)) this.y = v.y;
                    if (('z' in v) && (v.z > this.z)) this.z = v.z;
                }
            }
            return this;
        }

        toString() {
            return Fmt$1.toString('Vect3', this.x, this.y, this.z);
        }

    }

    class Gizmo extends Gadget {

        static {
            this.$gid = 1;
        }
        static $getgid() {
            return this.$gid++;
        }

        // SCHEMA --------------------------------------------------------------
        /** @member {int} Gizmo#gid - unique gadget identifier*/
        static { this.$schema('gid', { order:-2, readonly: true, dflt: (o) => Gizmo.$getgid() }); }
        /** @member {string} Gizmo#tag - tag for this gizmo */
        static { this.$schema('tag', { order:-1, readonly: true, dflt: (o) => `${o.constructor.name}.${o.gid}` }); }
        static { this.$schema('parent', { link: false, serializable: false, parser: () => null }); }
        static { this.$schema('children', { link: true, parser: () => [] }); }

        $cpost(spec={}) {
            for (const el of (spec.children || [])) this.adopt(el);
        }

        adopt(child) {
            let self = this.$proxy;
            // ensure child is orphaned
            if (child.parent) {
                child.parent.orphan(child);
            }
            // avoid cycles in parent
            if (this.gzroot.gzfind((v) => v === child)) {
                throw new Error(`hierarchy loop detected ${child} already in root for ${this}`);
            }
            // avoid cycles in children
            let found = child.gzfind((v) => v === self);
            if (found) {
                throw new Error(`hierarchy loop detected ${child} already in children for: ${this}`);
            }
            // assign parent/child links
            child.parent = self;
            this.children.push(child);
        }

        orphan(child) {
            child.parent = null;
            let idx = this.children.indexOf(child);
            if (idx != -1) {
                this.children.splice(idx, 1);
            }
        }

        /**
         * find object in parent hierarchy (evaluating parent hierarchy)
         * @param {*} filter 
         */
        gzfindInParent(filter) {
            for (let parent = this.parent; parent; parent = parent.parent) {
                if (filter(parent)) return parent;
            }
            return null;
        }

        /**
         * find object in hierarchy (evaluating object and its children)
         * @param {*} obj 
         * @param {*} filter 
         */
        gzfind(filter) {
            if (filter(this)) return this;
            for (const child of this.children) {
                if (filter(child)) return child;
                let match = child.gzfind(filter);
                if (match) return match;
            }
            return null;
        }

        *gzforEachChild(filter=()=>true) {
            for (const child of (Array.from(this.children))) {
                if (!filter || filter(child)) yield child;
                yield *this.forEachChild(filter);
            }
        }

        /**
         * find root for given object
         * @param {*} obj 
         */
        get gzroot() {
            let gzo = this;
            while(gzo.parent) gzo = gzo.parent;
            return gzo;
        }

        toString() {
            return Fmt$1.toString(this.constructor.name, this.gid, this.tag);
        }

        destroy() {
            if (this.parent) this.parent.orphan(this);
            for (const child of (Array.from(this.children))) {
                child.destroy();
            }
            super.destroy();
        }

    }

    /**
     * game timer has two "time" variables
     * ticks: game clock measure of time.  this can be adjusted to "speed up" or "slow down" the game.
     * elapsed: actual milliseconds that have elapsed since last game timer
     * Timers operate on elapsed time.
     * Tickers operate on ticks.
     */

    class Timer extends Gadget {
        static {
            this.$schema('ttl', { eventable: false, dflt: 1000 });
            this.$schema('loop', { readonly: true, dflt: false });
            this.$schema('cb', { readonly: true, dflt: () => false });
            this.$schema('data', { readonly: true });
            this.$schema('$startTTL', { readonly: true, parser: (o,x) => o.ttl });
            this.$schema('$ticks', { eventable: false, parser: () => 0 });
        }

        $cpost(spec={}) {
            super.$cpost(spec);
            GadgetCtx.at_tocked.listen(this.$on_tocked, this);
        }

        destroy() {
            super.destroy();
            GadgetCtx.at_tocked.ignore(this.$on_tocked, this);
        }

        $on_tocked(evt) {
            this.ttl -= evt.elapsed;
            this.$ticks += evt.ticks;
            if (this.ttl <= 0) {
                let ticks = this.$ticks;
                let overflow = -this.ttl;
                if (this.loop) {
                    this.ttl += this.$startTTL;
                    this.$ticks = 0;
                    if (this.ttl < 0) this.ttl = 0;
                } else {
                    GadgetCtx.at_tocked.ignore(this.$on_tocked, this);
                }
                this.cb(Object.assign( {}, evt, this.data, { ticks: ticks, overflow: overflow, elapsed: this.$startTTL + overflow } ));
            }
        }

    }

    class Ticker extends Timer {
        static { this.$schema('$elapsed', { eventable: false, parser: () => 0 }); }

        $on_tocked(evt) {
            this.ttl -= evt.ticks;
            this.$elapsed += evt.elapsed;
            if (this.ttl <= 0) {
                let elapsed = this.$elapsed;
                let overflow = -this.ttl;
                if (this.loop) {
                    this.$elapsed = 0;
                    this.ttl += this.$startTTL;
                    if (this.ttl < 0) this.ttl = 0;
                } else {
                    GadgetCtx.at_tocked.ignore(this.$on_tocked);
                }
                this.cb(Object.assign( {}, evt, this.data, { ticks: this.$startTTL + overflow, overflow: overflow, elapsed: elapsed } ));
            }
        }
    }

    class System extends Gizmo {
        // STATIC VARIABLES ----------------------------------------------------
        static dfltIterateTTL = 200;
        static dfltMatchFcn = ((evt) => false);

        // SCHEMA --------------------------------------------------------------
        static {
            this.$schema('iterateTTL', { readonly: true, eventable: false, dflt: (o) => o.constructor.dfltIterateTTL });
            this.$schema('dbg', { eventable: false, dflt: false });
            this.$schema('active', { eventable: false, dflt: true });
            this.$schema('matchFcn', { readonly: true, eventable: false, dflt: (o) => o.constructor.dfltMatchFcn });
            this.$schema('$store', { link: false, readonly: true, parser: () => new Map()});
            this.$schema('$iterating', { eventable: false, parser: () => false });
            this.$schema('$timer', { order: 1, readonly: true, parser: (o,x) => new Timer({ttl: o.iterateTTL, cb: o.$on_timer, loop: true})});
        }

        // CONSTRUCTOR ---------------------------------------------------------
        $cpre(spec) {
            super.$cpre(spec);
            this.$on_timer = this.$on_timer.bind(this);
        }
        $cpost(spec) {
            super.$cpost(spec);
            // -- setup event handlers
            GadgetCtx.at_created.listen(this.$on_gizmoCreated, this, false, this.matchFcn);
            GadgetCtx.at_destroyed.listen(this.$on_gizmoDestroyed, this, false, this.matchFcn);
        }
        destroy() {
            this.$timer.destroy();
            super.destroy();
        }

        // EVENT HANDLERS ------------------------------------------------------
        $on_timer(evt) {
            if (!this.active) return;
            this.$iterating = true;
            this.$prepare(evt);
            for (const e of this.$store.values()) {
                this.$iterate(evt, e);
            }
            this.$finalize(evt);
            this.$iterating = false;
        }

        $on_gizmoCreated(evt) {
            if (this.dbg) console.log(`${this} onGizmoCreated: ${Fmt$1.ofmt(evt)} gid: ${evt.actor.gid}`);
            this.$store.set(evt.actor.gid, evt.actor);
        }

        $on_gizmoDestroyed(evt) {
            if (this.$store.has(evt.actor.gid)) {
                if (this.dbg) console.log(`${this} onGizmoDestroyed: ${Fmt$1.ofmt(evt)}`);
                this.$store.delete(evt.actor.gid);
            }
        }

        // METHODS -------------------------------------------------------------
        $prepare(evt) {
        }

        $iterate(evt, e) {
        }

        $finalize(evt) {
        }

    }

    class SfxSystem extends System {
        // SCHEMA --------------------------------------------------------------
        static {
            this.$schema('$ready', { serializeable:false, eventable:false, parser: () => false });
            this.$schema('$decodes', { eventable:false, serializeable:false, parser: (o,x) => ({}) });
            this.$schema('$audioCtx', { eventable: false, serializeable:false, parser: (o,x) => null });
            this.$schema('assets', { eventable:false, serializeable:false, readonly: true });
            this.$schema('$streams', { eventable:false, serializeable:false, parser: (o,x) => ([]) });
            this.$schema('$reqs', { eventable:false, serializeable:false, parser: (o,x) => ([]) });

            this.$schema('volumes', { eventable:false, serializeable:false, parser: (o,x) => (x.volumes || {}) });
            this.$schema('gains', { eventable:false, serializeable:false, parser: (o,x) => ({}) });
        }

        // STATIC VARIABLES ----------------------------------------------------
        static dfltVolume = 1;
        static dfltIterateTTL = 0;

        // STATIC METHODS ------------------------------------------------------
        static play( actor, tag, options={} ) {
            GadgetCtx.at_sfxed.trigger({
                actor:actor,
                assetTag:tag,
                options:options,
            });
        }

        static stop( actor, tag ) {
            GadgetCtx.at_sfxed.trigger({
                actor:actor,
                assetTag:tag,
                stop:true,
            });
        }

        // CONSTRUCTOR/DESTRUCTOR ----------------------------------------------
        $cpost(spec) {
            super.$cpost(spec);
            // setup event handlers
            GadgetCtx.at_sfxed.listen(this.$on_sfxed, this);
            // assign master volume
            if (!this.volumes.hasOwnProperty('master')) this.volumes.master = 1;
        }
        
        // EVENT HANDLERS ------------------------------------------------------
        $on_sfxed(evt) {
            // queue request
            this.$reqs.push(evt);
            this.active = true;
        }

        // METHODS -------------------------------------------------------------
        $prepare(evt) {
            // iterate through queued requests
            let reqs = this.$reqs;
            this.$reqs = [];
            for (const req of reqs) {
                if (req.stop) {
                    this.$stopRequest(req.actor, req.assetTag);
                } else {
                    this.$playRequest(req.actor, req.assetTag, req.options);
                }
            }
        }

        $finalize(evt) {
            this.active = false;
        }

        $initialize() {
            if (!GadgetCtx.interacted) return;
            this.$audioCtx = new AudioContext();
            this.$ready = true;
        }

        async $playRequest(actor, assetTag, options) {
            if (!options) options = {};
            if (!(this.$ready)) {
                this.$initialize();
                if (!this.$ready) return;
            }
            // lookup asset
            let sfx = (this.assets) ? this.assets.get(assetTag) : GadgetCtx.assets.get(assetTag);
            if (!sfx || !sfx.media) return;
            // decode asset (or pull from cache)
            let decoded;
            if (!this.$decodes[assetTag]) {
                // make a copy of audio buffer (can't be decoded twice)
                let buffer = new ArrayBuffer(sfx.media.data.byteLength);
                new Uint8Array(buffer).set(new Uint8Array(sfx.media.data));
                let p = this.$audioCtx.decodeAudioData(buffer);
                p.then((d) => decoded = d);
                await p;
                this.$decodes[assetTag] = decoded;
            } else {
                decoded = this.$decodes[assetTag];
            }
            // setup audio stream
            let stream = new AudioBufferSourceNode( this.$audioCtx, {
                buffer: decoded,
                loop: sfx.loop,
            });
            let link = stream;
            // setup sfx volume gain
            let volume = (options.hasOwnProperty('volume')) ? options.volume : (sfx.hasOwnProperty('volume')) ? sfx.volume : 1;
            if (volume !== 1) {
                let gainNode = this.$audioCtx.createGain();
                gainNode.gain.value = volume;
                link.connect(gainNode);
                link = gainNode;
            }
            // get/setup sfx channel
            let channel = (options.hasOwnProperty('channel')) ? options.channel : sfx.channel;
            if (!this.gains[channel]) {
                if (!this.volumes.hasOwnProperty(channel)) {
                    this.volumes[channel] = 1;
                }
                let gainNode = this.$audioCtx.createGain();
                gainNode.gain.value = this.volumes[channel];
                this.gains[channel] = gainNode;
                link.connect(gainNode);
                link = gainNode;
            } else {
                link.connect(this.gains[channel]);
                link = null;
            }
            // get/setup main volume
            if (link) {
                if (!this.gains.master) {
                    let gainNode = this.$audioCtx.createGain();
                    gainNode.gain.value = this.volumes.master;
                    this.gains.master = gainNode;
                    gainNode.connect(this.$audioCtx.destination);
                }
                link.connect(this.gains.master);
            }

            // track stream
            this.$streams.push({
                actor: actor.gid,
                assetTag: assetTag,
                stream: stream,
            });
            stream.addEventListener('ended', () => {
                let idx = this.$streams.findIndex((v) => v.stream === stream);
                if (idx !== -1) this.$streams.splice(idx, 1);
            });
            // play
            stream.start(0);
        }

        $stopRequest(actor, assetTag) {
            if (!actor) return;
            for (let i=this.$streams.length-1; i>=0; i--) {
                if (actor.gid !== this.$streams[i].actor) continue;
                if (assetTag && assetTag !== this.$streams[i].assetTag) continue;
                this.$streams.splice(i, 1);
            }
        }

        getVolume(tag) {
            return this.volumes[tag] || 1;
        }

        setVolume(tag, value) {
            if (this.gains[tag]) this.gains[tag].gain.value = value;
            this.volumes[tag] = value;
        }

    }

    /** ========================================================================
     * The base ui primitive.
     * -- derives from Gizmo
     * -- views can have parent/child relationships
     */
    class UiView extends Gizmo {

        // STATIC VARIABLES ----------------------------------------------------
        static { this.prototype.renderable = true; }

        // SCHEMA --------------------------------------------------------------
        static {
            this.$schema('xform', { order: -1, link: true, dflt: () => new XForm() });
            this.$schema('active', { dflt: true });
            this.$schema('visible', { dflt: true });
            this.$schema('mousable', { dflt: true });
            this.$schema('smoothing', { dflt: null });
            this.$schema('alpha', { dflt: 1 });
            this.$schema('dbg', { dflt: false, eventable: false });
            this.$schema('mask', { dflt: false });
            this.$schema('mousePriority', { dflt: 0 });
            this.$schema('hovered', { dflt: false });
            this.$schema('pressed', { dflt: false });
            this.$schema('blocking', { dflt: false });
            this.$schema('z', { dflt:0 });
            this.$schema('clickedSound');
            this.$schema('hoveredSound');
            this.$schema('unhoveredSound');
            this.$schema('at_clicked', { readonly:true, dflt: (o) => new EvtEmitter(o, 'clicked') });
            this.$schema('at_hovered', { readonly:true, dflt: (o) => new EvtEmitter(o, 'hovered') });
            this.$schema('at_unhovered', { readonly:true, dflt: (o) => new EvtEmitter(o, 'unhovered') });
            this.$schema('at_pressed', { readonly:true, dflt: (o) => new EvtEmitter(o, 'pressed') });
            this.$schema('at_unpressed', { readonly:true, dflt: (o) => new EvtEmitter(o, 'unpressed') });
        }

        // CONSTRUCTOR/DESTRUCTOR ----------------------------------------------
        $cpost(spec) {
            super.$cpost(spec);
            // register view events
            this.at_clicked.listen(this.$on_clicked, this);
            this.at_hovered.listen(this.$on_hovered, this);
            this.at_unhovered.listen(this.$on_unhovered, this);
        }

        // EVENT HANDLERS ------------------------------------------------------
        $on_clicked(evt) {
            if (this.clickedSound) SfxSystem.play(this, this.clickedSound);
        }

        $on_hovered(evt) {
            if (this.hoveredSound) SfxSystem.play(this, this.hoveredSound);
        }
        $on_unhovered(evt) {
            if (this.unhoveredSound) SfxSystem.play(this, this.unhoveredSound);
        }

        // STATIC METHODS ------------------------------------------------------
        static sortBy(a,b) {
            if (!a || !b) return 0;
            if (a.z === b.z) {
                return a.xform.y-b.xform.y;
            }
            return a.z-b.z;
        }

        static boundsFor(view) {
            if (!view || !view.xform) return new Bounds();
            let min, max;
            if (view.xform.angle) {
                // min/max the four points of the bounds of the view, given that the angle
                let p1 = view.xform.getWorld({x:view.xform.minx, y:view.xform.miny}, false);
                let p2 = view.xform.getWorld({x:view.xform.maxx, y:view.xform.miny}, false);
                let p3 = view.xform.getWorld({x:view.xform.minx, y:view.xform.maxy}, false);
                let p4 = view.xform.getWorld({x:view.xform.maxx, y:view.xform.maxy}, false);
                min = Vect.min(p1, p2, p3, p4);
                max = Vect.max(p1, p2, p3, p4);
            } else {
                min = view.xform.getWorld({x:view.xform.minx, y:view.xform.miny}, false);
                max = view.xform.getWorld({x:view.xform.maxx, y:view.xform.maxy}, false);
            }
            return new Bounds({ x:min.x-o.xform.minx, y:min.y-o.xform.miny, width:max.x-min.x, height:max.y-min.y }); 
        }

        // METHODS -------------------------------------------------------------
        adopt(child) {
            super.adopt(child);
            child.xform.parent = this.xform;
        }
        orphan(child) {
            super.orphan(child);
            child.xform.parent = null;
        }

        $prerender(ctx) {
        }
        $subrender(ctx) {
        }
        $postrender(ctx) {
        }
        $childrender(ctx) {
            for (const child of this.children) {
                child.render(ctx);
            }
        }

        render(ctx) {
            // for root views
            if (!this.parent) ctx.save();
            // don't render if not visible
            if (!this.visible) return;
            //if (this.dbg && this.dbg.xform) this.xform.render(ctx);
            // apply global context settings
            let savedAlpha = ctx.globalAlpha;
            ctx.globalAlpha *= this.alpha;
            let savedSmoothing = ctx.imageSmoothingEnabled;
            if (this.smoothing !== null) ctx.imageSmoothingEnabled = this.smoothing;
            // apply transform
            this.xform.apply(ctx, false);
            // handle masking
            if (this.mask) {
                // setup clip area
                ctx.save();
                ctx.beginPath();
                ctx.rect(this.xform.minx, this.xform.miny, this.xform.width, this.xform.height);
                ctx.clip();
            }
            // pre render, specific to subclass
            this.$prerender(ctx);
            // private render, specific to subclass
            this.$subrender(ctx);
            // child render
            this.$childrender(ctx);
            // post render, specific to subclass
            this.$postrender(ctx);
            // handle masking
            if (this.mask) {
                ctx.restore();
            }
            this.xform.revert(ctx, false);
            // revert global context settings
            ctx.globalAlpha = savedAlpha;
            ctx.imageSmoothingEnabled = savedSmoothing;
            if (this.dbg && this.dbg.xform) this.xform.render(ctx);
            if (!this.parent) ctx.restore();
        }

    }

    /**
     * Assets represent game resources such as textures, audio files, etc. used by the game.
     * Every asset is either linked to the current asset context (the asset context that is in scope when the asset was created)
     * or a global asset list.  Assets linked to the asset context will only be referencable while that asset context is in scope.  Global
     * assets are always referencable once loaded.
     * All assets will be cached within the asset context (or globally) and can be referenced by an asset tag.
     * Asset contents can contain media references.  Media references link an external file/url or data to be loaded with the asset.  Assets will
     * asynchronously load media references.
     * Assets and media references can also be preloaded during asset context advancement.
     */
    class Asset extends Gadget {

        static { this.prototype.assetable = true; };
        static _gid = 1;

        static { this.$schema('tag', { dflt: (o) => `${o.constructor.name}.${o.constructor._gid++}`}); }
        static { this.$schema('$loadable', { readonly:true, dflt:false, xkey:'loadable' }); }

        static from(src, spec={}) {
            let asset = new this(spec);
            return asset;
        }

        static async load(src, spec={}) {
            let asset = this.from(src, spec);
            return new Promise((resolve) => {
                asset.load().then(() => {
                    resolve(asset);
                });
            });
        }

        async load() {
            return Promise.resolve();
        }

        copy(overrides={}) {
            return new this.constructor(Object.assign({}, this, overrides));
        }

        toString() {
            return Fmt$1.toString(this.constructor.name, this.tag);
        }

    }

    /**
     * A sketch is the base abstract data object that represents something that can be drawn to the screen... 
     * - an image (sprite)
     * - an animation
     * - simple js primitives (e.g.: rectangle) for drawing
     * @extends Asset
     */
    class Sketch extends Asset {

        // STATIC PROPERTIES ---------------------------------------------------
        /**
         * @member {Sketch} - get a new instance of a default sketch, useful for null rendering.
         */
        static get zero() {
            return new Sketch();
        }

        // SCHEMA --------------------------------------------------------------
        /** @member {number} Sketch#width=0 - width of sketch */
        static { this.$schema('width', {dflt: 0, readonly:true}); }
        /** @member {number} Sketch#height=0 - height of sketch */
        static { this.$schema('height', {dflt: 0, readonly:true}); }
        /** @member {boolean} Sketch#active=false - indicates if sketch is active */
        static { this.$schema('active', {dflt: false}); }
        /** @member {boolean|null} Sketch#smoothing=nul - indicates if image smoothing should be applied to this sketch, true/false controls this sketch, null defers to current context setting */
        static { this.$schema('smoothing', {dflt: null}); }
        /** @member {float} Sketch#alpha=1 - transparency of sketch, 0 is not visible, 1 is no transparency */
        static { this.$schema('alpha', {dflt: 1}); }
        /** @member {integer} Sketch#ttl - time to live for sketch */
        static { this.$schema('ttl', {readonly: true, dflt: 0}); }
        /** @member {boolean} Sketch#done=false - if sketch has finished animation */
        static { this.$schema('done', {parser: () => false}); }
        static { this.$schema('fitter', { dflt: 'stretch' }); }
        static { this.$schema('alignx', { dflt: .5 }); }
        static { this.$schema('aligny', { dflt: .5 }); }

        // CONSTRUCTOR/DESTRUCTOR ----------------------------------------------
        destroy() {
            this.disable();
            super.destroy();
        }

        // METHODS -------------------------------------------------------------
        /**
         * enable is called when a sketch is first rendered to perform any actions necessary to allow for rendering and state management for the sketch.
         */
        enable() {
            this.active = true;
        }

        /**
         * disable is called to stop any state management for the sketch.
         */
        disable() {
            this.active = false;
        }

        /**
         * A sketch can be reset...
         */
        reset() {
        }

        /**
         * Any sketch can be rendered...
         * @param {canvasContext} ctx - canvas context on which to draw
         * @param {number} [x=0] - x position to render sketch at
         * @param {number} [y=0] - y position to render sketch at
         * @param {number} [width=0] - desired width to render, if unspecified, sketch will render at internal width
         * @param {number} [height=0] - desired height to render, if unspecified, sketch will render at internal height
         */
        render(ctx, x=0, y=0, width=0, height=0) {
            if (!this.active) this.enable();
            // apply global context settings
            let savedAlpha = ctx.globalAlpha;
            ctx.globalAlpha *= this.alpha;
            let savedSmoothing = ctx.imageSmoothingEnabled;
            if (this.smoothing !== null) ctx.imageSmoothingEnabled = this.smoothing;
            this.$fitSketch(ctx, x, y, width, height);
            // revert global context settings
            ctx.globalAlpha = savedAlpha;
            ctx.imageSmoothingEnabled = savedSmoothing;
        }

        $render(ctx, x=0, y=0, width=0, height=0) {
            // pre render, specific to subclass
            this.$prerender(ctx, x, y, width, height);
            // private render, specific to subclass
            this.$subrender(ctx, x, y, width, height);
            // post render, specific to subclass
            this.$postrender(ctx, x, y, width, height);
        }

        // METHODS -------------------------------------------------------------
        $fitSketch(ctx, x, y, width, height) {
            switch (this.fitter) {
                case 'none': {
                    let xo = Math.round((width - this.width)*this.alignx);
                    let yo = Math.round((height - this.height)*this.aligny);
                    this.$render(ctx, x + xo, y + yo, 0, 0);
                    break;
                }
                case 'ratio': {
                    let adjustedWidth = width;
                    let adjustedHeight = height;
                    if (width && height) {
                        let desiredRatio = (this.width && this.height) ? this.width/this.height : 1;
                        let currentRatio = width/height;
                        if (currentRatio>desiredRatio) {
                            adjustedWidth = height * desiredRatio;
                            x += Math.round((width-adjustedWidth)*this.alignx);
                        } else if (currentRatio<desiredRatio) {
                            adjustedHeight = width / desiredRatio;
                            y += Math.round((height-adjustedHeight)*this.aligny);
                        }
                    } else if (width) {
                        let desiredRatio = (this.width && this.height) ? this.width/this.height : 1;
                        adjustedHeight = width / desiredRatio;
                        y += Math.round((height-adjustedHeight)*this.aligny);
                    } else if (height) {
                        let desiredRatio = (this.width && this.height) ? this.width/this.height : 1;
                        adjustedWidth = height * desiredRatio;
                        x += Math.round((width-adjustedWidth)*this.alignx);
                    }
                    this.$render(ctx, x, y, adjustedWidth, adjustedHeight);
                    break;
                }
                case 'tile': {
                    if (!width || !height || !this.width || !this.height) return;
                    // clip to xform area
                    ctx.save();
                    ctx.beginPath();
                    ctx.rect(x, y, width, height);
                    ctx.clip();
                    // calculate/render tiled sketches
                    let wd = ((width % this.width)-this.width) * (this.alignx);
                    let hd = ((height % this.height)-this.height) * (this.aligny);
                    if (Math.abs(wd) >= this.width) wd = 0;
                    if (Math.abs(hd) >= this.height) hd = 0;
                    let xo, yo;
                    for (let i=0; i<=(width/this.width); i++) {
                        for (let j=0; j<=(height/this.height); j++) {
                            xo = wd + i*this.width;
                            yo = hd + j*this.height;
                            this.$render(ctx, x+xo, y+yo);
                        }
                    }
                    // restore context to remove clip
                    ctx.restore();
                    break;
                }
                case 'autotile': {
                    if (!width || !height || !this.width || !this.height) return;
                    let xtiles = (width > this.width) ? Math.floor(width/this.width) : 1;
                    let scaledWidth = width/xtiles;
                    let ytiles = (height > this.height) ? Math.floor(height/this.height) : 1;
                    let scaledHeight = height/ytiles;
                    for (let i=0; i<xtiles; i++) {
                        for (let j=0; j<ytiles; j++) {
                            let xo = i*scaledWidth;
                            let yo = j*scaledHeight;
                            this.$render(ctx, x+xo, y+yo, scaledWidth, scaledHeight);
                        }
                    }
                    break;
                }
                case 'stretch':
                default: {
                    this.$render(ctx, x, y, width, height);
                    break;
                }
            }
        }

        /**
         * prerender is an overrideable method that allows for subclasses to define specific actions to take prior to rendering.
         * @param {canvasContext} ctx - canvas context on which to draw
         * @param {number} [x=0] - x position to render sketch at
         * @param {number} [y=0] - y position to render sketch at
         * @param {number} [width=0] - desired width to render, if unspecified, sketch will render at internal width
         * @param {number} [height=0] - desired height to render, if unspecified, sketch will render at internal height
         * @abstract
         */
        $prerender(ctx, x=0, y=0, width=0, height=0) {
        }
        /**
         * subrender is an overrideable method that should be used for subclasses to define how their specific implementation of a sketch should be rendered.
         * @param {canvasContext} ctx - canvas context on which to draw
         * @param {number} [x=0] - x position to render sketch at
         * @param {number} [y=0] - y position to render sketch at
         * @param {number} [width=0] - desired width to render, if unspecified, sketch will render at internal width
         * @param {number} [height=0] - desired height to render, if unspecified, sketch will render at internal height
         * @abstract
         */
        $subrender(ctx, x=0, y=0, width=0, height=0) {
        }
        /**
         * postrender is an overrideable method that allows for subclasses to define specific actions to take after rendering.
         * @param {canvasContext} ctx - canvas context on which to draw
         * @param {number} [x=0] - x position to render sketch at
         * @param {number} [y=0] - y position to render sketch at
         * @param {number} [width=0] - desired width to render, if unspecified, sketch will render at internal width
         * @param {number} [height=0] - desired height to render, if unspecified, sketch will render at internal height
         * @abstract
         */
        $postrender(ctx, x=0, y=0, width=0, height=0) {
        }

        /**
         * convert to string
         */
        toString() {
            return Fmt$1.toString(this.constructor.name, this.tag);
        }

    }

    /** ========================================================================
     * A rectangle is a sketch primitive.
     */
    class Rect extends Sketch {

        // SCHEMA --------------------------------------------------------------
        static {
            this.$schema('border', {dflt: 0});
            this.$schema('borderColor', {dflt: 'black'});
            this.$schema('color', {dflt: 'rgba(127,127,127,.75'});
            this.$schema('joint', { dflt:'miter' });
            this.$schema('fill', {dflt: true});
            this.$schema('dash', {dflt: null});
        }

        // METHODS -------------------------------------------------------------
        $subrender(ctx, x=0, y=0, width=0, height=0) {
            // default width/height to internal width/height if not specified
            if (!width) width = this.width;
            if (!height) height = this.height;
            if (this.fill) {
                ctx.fillStyle = this.color;
                ctx.fillRect(x, y, width, height);
            }
            if (this.border) {
                ctx.lineWidth = this.border;
                ctx.lineJoin = this.joint;
                ctx.strokeStyle = this.borderColor;
                if (this.dash) ctx.setLineDash(this.dash);
                ctx.strokeRect(x, y, width, height);
                if (this.dash) ctx.setLineDash([]);
            }
        }

    }

    /** ========================================================================
     * A shape is a simple sketch primitive utilizing js Path2D to render a shape
     */
    class Shape extends Sketch {

        // SCHEMA --------------------------------------------------------------
        static {
            this.$schema('verts', {order:-2, dflt: () => [{x:0,y:0}, {x:20,y:0}, {x:20,y:20}, {x:0,y:20}], readonly:true});
            this.$schema('$xverts', {order:-1, dflt: (o) => o.verts});
            this.$schema('$min', { order:-1, readonly:true, getter: (o, ov) => Vect$1.min(...o.verts) });
            this.$schema('$max', { order:-1, readonly:true, getter: (o, ov) => Vect$1.max(...o.verts) });
            this.$schema('border', {dflt: 0});
            this.$schema('fill', {dflt: true});
            this.$schema('color', {dflt: 'rgba(127,127,127,.75'});
            this.$schema('borderColor', {dflt: 'black'});
            this.$schema('dash', { dflt:null });
            this.$schema('joint', { dflt:'miter' });
            this.$schema('$scalex', {dflt:1});
            this.$schema('$scaley', {dflt:1});
            this.$schema('$path', { readonly:true, getter: (o, ov) => o.constructor.toPath(o.$xverts)});
            this.$schema('width', { readonly:true, getter: (o, ov) => (o.$max.x-o.$min.x) });
            this.$schema('height', { readonly:true, getter: (o, ov) => (o.$max.y-o.$min.y) });
        }

        static toPath(verts) {
            let path = new Path2D();
            path.moveTo(verts[0].x, verts[0].y);
            for (let i=1; i<verts.length; i++) {
                let vert = verts[i];
                path.lineTo(vert.x, vert.y);
            }
            path.closePath();
            return path;
        }

        // METHODS -------------------------------------------------------------
        $subrender(ctx, x=0, y=0, width=0, height=0) {
            // default width/height to internal width/height if not specified
            if (!width) width = this.width;
            if (!height) height = this.height;
            // translate
            let cform = ctx.getTransform();
            if (x || y) ctx.translate(x, y);
            let scalex = 1, scaley = 1;
            if ((width && width !== this.width) || (height && height !== this.height)) {
                scalex = width/this.width;
                scaley = height/this.height;
                if (!Mathf.approx(scalex, this.$scalex) || !Mathf.approx(scaley, this.$scaley)) {
                    this.$scalex = scalex;
                    this.$scaley = scaley;
                    let delta = Vect$1.min(...this.verts);
                    // translate verts
                    this.$xverts = this.verts.map((v) => Vect$1.mult(Vect$1.sub(v, delta), {x:scalex,y:scaley}));
                }
            }
            if (this.fill) {
                ctx.fillStyle = this.color;
                ctx.fill(this.$path);
            }
            if (this.border) {
                if (this.dash) ctx.setLineDash(this.dash);
                ctx.lineWidth = this.border;
                ctx.lineJoin = this.joint;
                ctx.strokeStyle = this.borderColor;
                ctx.stroke(this.$path);
                if (this.dash) ctx.setLineDash([]);
            }
            ctx.setTransform(cform);
        }    
    }

    class UiToggle extends UiView {
        // SCHEMA --------------------------------------------------------------
        static {
            this.$schema('unpressedSketch', { link: true, dflt: (o) => new Rect({ borderColor:'blue', border:3, color:'rgba(255,255,255,.25)' }) });
            this.$schema('highlightSketch', { link: true, dflt: (o) => new Rect({ borderColor:'yellow', border:3, fill:false }) });
            this.$schema('pressedSketch', { link: true, dflt: (o) => new Rect({ borderColor:'blue', border:3, color: 'rgba(255,255,255,.75)' }) });
            this.$schema('iconSketch', { link: true, dflt: (o) => new Shape({ 
                fitter:'ratio',
                fill: true,
                joint:'round',
                verts: [ {x:2, y:19}, {x:5, y:16}, {x:10, y:21}, {x:26, y:5}, {x:29, y:8}, {x:10, y:27}, ],
                border: 3,
                borderColor: 'rgba(0,0,0,1)',
                color: 'rgba(255,255,255,1)'
            })});
            this.$schema('blankSketch', { link: true, dflt: (o) => new Shape({ 
                fitter:'ratio',
                fill: false,
                joint:'round',
                verts: [ {x:2, y:19}, {x:5, y:16}, {x:10, y:21}, {x:26, y:5}, {x:29, y:8}, {x:10, y:27}, ],
                border: 3,
                borderColor: 'rgba(0,0,0,.25)',
            })});
            this.$schema('value', { dflt:true });
            this.$schema('iconXForm', { readonly:true, parser: (o,x) => {
                let xform = (x.iconXForm) ? x.iconXForm : new XForm({grip: .1});
                xform.parent = o.xform;
                return xform;
            }});
        }

        // EVENT HANDLERS ------------------------------------------------------
        $on_clicked(evt) {
            super.$on_clicked(evt);
            this.value = !this.value;
        }

        // METHODS -------------------------------------------------------------
        $subrender(ctx) {
            // render active sketch
            if (this.value) {
                this.pressedSketch.render(ctx, this.xform.minx, this.xform.miny, this.xform.width, this.xform.height);
            } else {
                this.unpressedSketch.render(ctx, this.xform.minx, this.xform.miny, this.xform.width, this.xform.height);
            }
            // render highlight
            if (this.hovered) {
                this.highlightSketch.render(ctx, this.xform.minx, this.xform.miny, this.xform.width, this.xform.height);
            }
            // apply icon transform
            this.iconXForm.apply(ctx, false);
            // render icon
            if (this.value) {
                this.iconSketch.render(ctx, this.iconXForm.minx, this.iconXForm.miny, this.iconXForm.width, this.iconXForm.height);
            } else {
                this.blankSketch.render(ctx, this.iconXForm.minx, this.iconXForm.miny, this.iconXForm.width, this.iconXForm.height);
            }
            if (this.dbg && this.dbg.xform) this.iconXForm.render(ctx);
            this.iconXForm.revert(ctx, false);
        }

    }

    class TextFormat extends Gadget {
        static {
            this.$canvas = document.createElement('canvas');
            this.$ctx = this.$canvas.getContext('2d');
        }

        // SCHEMA --------------------------------------------------------------
        static {
            this.$schema('style', { dflt: 'normal' });
            this.$schema('variant', { dflt: 'normal' });
            this.$schema('weight', { dflt: 'normal' });
            this.$schema('size', { dflt: 12 });
            this.$schema('family', { dflt: 'sans-serif' });
            this.$schema('color', { dflt: 'black' });
            this.$schema('border', { dflt: 0 });
            this.$schema('borderColor', { dflt: 'white' });
            this.$schema('fill', { dflt: true });
            this.$schema('highlight', { dflt: false });
            this.$schema('highlightColor', { dflt: 'yellow' });
        }

        static parse(str) {
            let kvs = str.split(',');
            let spec = {};
            for (var [k,v] of kvs.map((v) => v.split('=', 2))) {
                switch (k) {
                    case 'B':
                    case 'b': {
                        spec.weight = 'bold';
                        break;
                    }
                    case 'I':
                    case 'i': {
                        spec.style = 'italic';
                        break;
                    }
                    case 'H':
                    case 'h': {
                        spec.highlight = true;
                        break;
                    }
                    case 'size': 
                    case 'border': 
                    case 'delta': 
                    {
                        spec[k] = parseInt(v);
                        break;
                    }
                    default: {
                        if (v) spec[k] = v;
                        break;
                    }
                }
            }
            return spec;
        }

        // CONSTRUCTOR ---------------------------------------------------------
        $cpre(spec={}) {
            spec.size = spec.size || 12;
            if ('delta' in spec) spec.size += spec.delta;
            super.$cpre(spec);
        }

        // PROPERTIES ----------------------------------------------------------
        get font() {
            return `${this.style} ${this.variant} ${this.weight} ${this.size}px ${this.family}`;
        }

        // METHODS -------------------------------------------------------------
        measure(text) {
            const ctx = this.constructor.$ctx;
            ctx.font = this.font;
            const metrics = ctx.measureText(text);
            let h = Math.max(0, metrics.fontBoundingBoxAscent) + Math.max(0, metrics.fontBoundingBoxDescent);
            let w = Math.max(0, metrics.actualBoundingBoxLeft) + Math.max(0, metrics.actualBoundingBoxRight);
            // if text ends with a trailing space, measureText strips that off when calculating...
            // cheat by adding a random character to text string and subtract width of that char to get total width
            if (text.endsWith(' ')) {
                // measure a space...
                const m1 = ctx.measureText(text+'x');
                const m2 = ctx.measureText('x');
                let m1w = Math.max(0, m1.actualBoundingBoxLeft) + Math.max(0, m1.actualBoundingBoxRight);
                let m2w = Math.max(0, m2.actualBoundingBoxLeft) + Math.max(0, m2.actualBoundingBoxRight);
                w = m1w-m2w;
            }
            // z is the delta between baseline (where text is rendered) and top of bounds
            return new Vect3({x:w, y:h, z:Math.max(0, metrics.fontBoundingBoxAscent)});
        }

        copy(overrides={}) {
            return new this.constructor(Object.assign({}, this, overrides));
        }

        toString() {
            return Fmt$1.toString(this.constructor.name, ...Object.entries(this).map((v) => v.join('=', v)));
        }

    }

    class $TextLine extends Gadget {
        static {
            this.$schema('fmt', { eventable:false, dflt:() => new TextFormat() });
            this.$schema('$ftext', { eventable:false, dflt:'' });
            this.$schema('$fmts', { eventable:false, dflt:() => [] });
            this.$schema('$bounds', { eventable:false, dflt:() => [] });
            this.$schema('$bases', { eventable:false, dflt:() => [] });
            this.$schema('x', { eventable:false, dflt:0 });
            this.$schema('y', { eventable:false, dflt:0 });
            this.$schema('idx', { eventable:false, dflt:0 });
            this.$schema('width', { eventable:false, dflt:0 });
            this.$schema('height', { eventable:false, dflt:0 });
        }

        get length() {
            return this.$ftext.length;
        }

        $cpost(spec) {
            super.$cpost(spec);
            let size = this.fmt.measure(' ');
            this.height = size.y;
        }

        $measureAt(idx) {
            let char = this.$ftext[idx];
            let fmt = this.$fmts[idx];
            let rchar = this.$ftext[idx+1];
            let size = fmt.measure(char);
            let kerning = 0;
            // measure kerning (space between this char and next)... 
            if (rchar) {
                let csize = fmt.measure(char+rchar);
                let rsize = fmt.measure(rchar);
                kerning = Math.max(0, csize.x-(rsize.x+size.x));
            }
            let width = size.x+kerning;
            // special case space at end of line... set width to zero
            if (char === ' ' && !rchar) width = 0;
            // special case ... newline
            if (char === '\n') width = 0;
            // z: baseline delta
            return new Vect3({ x:width, y:size.y, z:size.z });
        }

        push(char, fmt) {
            // add char at end of string
            let idx = this.$ftext.length;
            this.$ftext += char;
            this.$fmts[idx] = fmt;
            // update bounds of last char (recomputes last char's kerning)
            if (idx > 0) {
                let p = this.$measureAt(idx-1);
                let lastWidth = this.$bounds[idx-1].width;
                this.$bounds[idx-1].width = p.x;
                // adjust current x position for delta of previously computed width and new width
                this.width += (p.x-lastWidth);
            }
            // add bounds for new character and adjust current x
            let p = this.$measureAt(idx);
            if (p.y > this.height) this.height = p.y;
            this.$bounds[idx] = new Bounds$1({ x:this.width, y:0, width:p.x, height:p.y });
            this.$bases[idx] = p.z;
            this.width += p.x;
        }

        split(idx) {
            // local index
            let lidx = Mathf.clampInt(idx-this.idx, 0 , this.length-1);
            // create newline to hold split string
            let newline = new this.constructor({ idx:idx, fmt:this.$fmts[lidx] });
            // push characters from current string to newline
            for (let i=lidx; i<this.$ftext.length; i++) {
                newline.push(this.$ftext[i], this.$fmts[i]);
            }
            // adjust local line
            this.$ftext = this.$ftext.slice(0,lidx);
            this.$fmts.splice(lidx);
            this.$bounds.splice(lidx);
            if (lidx > 0) {
                let p = this.$measureAt(lidx-1);
                this.$bounds[lidx-1].width = p.x;
            }
            this.width = 0;
            this.height = 0;
            for (let i=0; i<this.$ftext.length; i++) {
                this.width += this.$bounds[i].width;
                if (this.$bounds[i].height > this.height) this.height = this.$bounds[i].height;
            }
            return newline;
        }

        render(ctx, x, y) {
            ctx.textAlign = 'left';
            ctx.textBaseline = 'alphabetic';
            for (let i=0; i<this.$ftext.length; i++) {
                let b = this.$bounds[i];
                let f = this.$fmts[i];
                let by = this.$bases[i];
                let cx = x+this.x+b.x;
                let cy = y+this.y+b.y;
                if (f.highlight) {
                    ctx.fillStyle = f.highlightColor;
                    ctx.fillRect(cx, cy, b.width, b.height);
                }
                ctx.font = f.font;
                if (f.fill) {
                    ctx.fillStyle = f.color;
                    ctx.fillText(this.$ftext[i], cx, cy+by);
                }
                if (f.border) {
                    ctx.lineWidth = f.border;
                    ctx.strokeStyle = f.borderColor;
                    ctx.strokeText(this.$ftext[i], cx, cy+by);
                }
            }
        }

        boundsAt(idx) {
            let lidx = Mathf.clampInt(idx-this.idx, 0 , this.length-1);
            let b = this.$bounds[lidx];
            return new Bounds$1({
                x:b.x+this.x,
                y:b.y+this.y,
                width:b.width,
                height:b.height,
            });
        }
    }

    class Text extends Sketch {
        // SCHEMA --------------------------------------------------------------
        static {
            this.$schema('wrapWidth', { order:-1, dflt:0 });
            this.$schema('parsable', { order:-1, readonly:true, dflt:true });
            this.$schema('fmt', { order:-1, dflt: () => new TextFormat()});
            this.$schema('text', { dflt: 'default text' });
            this.$schema('delimiter', { readonly:true, dflt:' ' });
            this.$schema('leadingPct', { readonly:true, dflt:.1 });
            this.$schema('fitter', { dflt: 'ratio' });
            this.$schema('wrap', { readonly:true, dflt:false });
            this.$schema('$savedWidth', { eventable:false, dflt:0 });
            this.$schema('$ftext', { eventable:false, parser: () => '' });
            this.$schema('$fmts', { eventable:false, parser: () => [] });
            this.$schema('$bounds', { eventable:false, parser: () => [] });
            this.$schema('$lines', { eventable:false, parser: () => [] });
            this.$schema('width', { eventable:false, dflt:(o,x) => o.wrapWidth });
            this.$schema('height', { eventable:false, dflt:0 });

            this.$schema('cursorOn', { dflt:false });
            this.$schema('cursorSketch', { link:true, dflt:() => new Rect({ fitter:'stretch', width:2, color:'rgba(255,255,255,.5)' })});
            this.$schema('cursorBlinkRate', { dflt:500 });
            this.$schema('cursorIdx', { dflt:0 });
            this.$schema('$cursorDim', { dflt:false, readonly:true, parser:(o) => o.fmt.measure('X') });
            this.$schema('$cursorVisible', { dflt:true });
            this.$schema('$cursorTimer', { eventable:false, serializable:false });

        }

        $cpost(spec) {
            super.$cpost(spec);
            this.$wrapWidth = this.wrapWidth;
            if (this.text) {
                this.$parse();
                this.$layout();
            }
            this.at_modified.listen(this.$on_modified, this);
        }

        $on_modified(evt) {
            if (this.text) {
                this.$parse();
                this.$layout();
            }
        }

        /**
         * $parse parses the current raw text and determines per-character formatting
         */
        $parse() {
            this.$ftext = '';
            this.$fmts = [];
            let fmtstack = [this.fmt];
            let ctrl = '';
            let inescape = false, inctrl=false;
            // parse character by character
            for (const char of this.text) {
                if (inescape) {
                    if (char !== '<') {
                        this.$ftext += '\\';
                        this.$fmts.push(fmtstack[0]);
                        this.$ftext += char;
                        this.$fmts.push(fmtstack[0]);
                    } else {
                        this.$ftext += char;
                        this.$fmts.push(fmtstack[0]);
                    }
                    inescape = false;
                } else if (inctrl) {
                    if (char === '>') {
                        if (ctrl.startsWith('/')) {
                            if (fmtstack.length > 1) fmtstack.shift();
                        } else {
                            let spec = TextFormat.parse(ctrl);
                            if (spec) {
                                let newFmt = fmtstack[0].copy(spec);
                                fmtstack.unshift(newFmt);
                            }
                        }
                        inctrl = false;
                        ctrl = '';
                    } else {
                        ctrl += char;
                    }
                } else {
                    if (this.parsable && char === '\\') {
                        inescape = true;
                    } else if (this.parsable && char === '<') {
                        inctrl = true;
                    } else {
                        this.$ftext += char;
                        this.$fmts.push(fmtstack[0]);
                    }
                }
            }
        }

        $layout() {
            this.$lines = [];
            let line = new $TextLine({ idx:0, fmt:this.fmt });
            let idx=0, delimIdx=-1;
            // current layout dimensions
            let width=0, height=0;
            for (idx=0; idx<this.$ftext.length; idx++) {
                let char = this.$ftext[idx];
                // push current character to line
                line.push(char, this.$fmts[idx]);
                // handle newline break
                if (this.parsable && (char === '\n')) {
                    // strip newline from formatted text string
                    // update local dimensions
                    height += (line.height * (1+this.leadingPct));
                    // current line is pushed to stack
                    this.$lines.push(line);
                    // newline is created
                    line = new $TextLine({ idx:idx, fmt:this.$fmts[idx], y:height });
                }
                // handle line wrapping
                if (this.wrap && this.$wrapWidth) {
                    // line width exceeds wrap width... need to wrap
                    if (line.width > this.$wrapWidth) {
                        // if a delimiter is set within current line...
                        // -- line is split at last delimiter
                        // -- otherwise, line is split at current character
                        let splitIdx = (delimIdx > line.idx) ? delimIdx+1 : idx;
                        let newline = line.split(splitIdx);
                        // update local dimensions
                        if (line.width > width) width = line.width;
                        height += (line.height * (1+this.leadingPct));
                        newline.y = height;
                        this.$lines.push(line);
                        line = newline;
                    }
                    // track last seen delimiter char
                    if (char === this.delimiter) delimIdx = idx;
                }
            }
            if (line.length) {
                // update local dimensions
                if (line.width > width) width = line.width;
                height += line.height;
                if (this.$lines.length) height += line.height*this.leadingPct;
                this.$lines.push(line);
            }
            // update line x positions based on alignment
            for (const line of this.$lines) {
                //line.x = Math.round((width - line.width)*this.alignx);
                line.x = Math.round((width - line.width)*this.alignx);
            }
            // finalize reported text dimensions
            this.width = width;
            this.height = height;
        }

        // METHODS -------------------------------------------------------------
        $fitSketch(ctx, x, y, width, height) {
            if (this.wrap && !(this.wrapWidth) && (this.$wrapWidth !== width)) {
                this.$wrapWidth = width;
                this.$layout();
            }
            super.$fitSketch(ctx, x, y, width, height);
        }

        $subrender(ctx, x=0, y=0, width=0, height=0) {
            // scale if necessary
            let ctxXform = ctx.getTransform();
            // text box positions
            if (x || y) ctx.translate(x, y);
            if ((width && width !== this.width) || (height && height !== this.height)) {
                let scalex = width/this.width;
                let scaley = height/this.height;
                ctx.scale(scalex, scaley);
            }
            for (const line of this.$lines) {
                line.render(ctx, 0, 0);
            }
            // cursor
            if (this.cursorSketch && this.cursorOn && this.cursorBlinkRate && !(this.$cursorTimer)) {
                this.$cursorTimer = new Timer({ttl:this.cursorBlinkRate, loop:true, cb:() => this.$cursorVisible = !this.$cursorVisible});
            }
            if (!this.cursorOn && this.$cursorTimer) {
                this.$cursorTimer.destroy();
                this.$cursorTimer = null;
            }
            if (this.cursorSketch && this.cursorOn && this.$cursorVisible) {
                let bounds;
                if (this.cursorIdx < this.$ftext.length) {
                    bounds = this.getCharBounds(this.cursorIdx);
                } else {
                    bounds = this.getCharBounds(this.$ftext.length-1);
                    bounds.x += bounds.width;
                    bounds.width = 0;
                }
                // cursor position and dimensions
                (bounds.width-this.$cursorDim.x) * this.cursorSketch.alignx;
                (bounds.height-this.$cursorDim.y) * this.cursorSketch.aligny;
                //this.cursorSketch.render(ctx, bounds.x+xoff, bounds.y.yoff, this.$cursorDim.x, this.$cursorDim.y);
                this.cursorSketch.render(ctx, bounds.x, bounds.y, bounds.width, bounds.height);
            }
            if (ctxXform) ctx.setTransform(ctxXform);
        }

        getCharBounds(idx) {
            if (idx < 0) idx = 0;
            if (idx > this.$ftext.length) idx = this.$ftext.length;
            for (const line of this.$lines) {
                if (idx-line.idx < line.length) {
                    return line.boundsAt(idx);
                }
            }
            return new Bounds$1();
        }

        toString() {
            return Fmt$1.toString(this.constructor.name, this.text);
        }

    }

    /** ========================================================================
     * A string of text rendered to the screen as a sketch.
     */
    class UiText extends UiView {
        // STATIC VARIABLES ----------------------------------------------------
        static lorem = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut ' + 
                       'labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris ' +
                       'nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit ' +
                       'esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in ' +
                       'culpa qui officia deserunt mollit anim id est laborum.';

        static get rlorem() {
            let len = Math.floor(Math.random()*this.lorem.length);
            return  this.lorem.slice(0, len);
        }

        static get rword() {
            let choices = this.lorem.split(' ');
            let idx = Math.floor(Math.random() * choices.length);
            return choices[idx];
        }

        static {
            this.$schema('$text', { order:-1, link:true, dflt: () => new Text({text: 'default text'}) });
            this.$schema('text', { dflt: 'default text', setter: (o,ov,v) => { o.$text.text = v; return v } });
        }

        // METHODS -------------------------------------------------------------
        $subrender(ctx) {
            if (this.$text) this.$text.render(ctx, this.xform.minx, this.xform.miny, this.xform.width, this.xform.height);
        }
    }

    class UiVerticalSpacer extends UiView {
        static { this.$schema('align', { dflt:.5 }); }
        static { this.$schema('size', { dflt:0 }); }
        static { this.$schema('spacer', { dflt:0 }); }
        static { this.$schema('$count', { eventable:false, dflt:0 }); }

        $cpost(spec) {
            super.$cpost(spec);
            this.$resize();
            this.$count = this.children.length;
        }

        $prerender(ctx) {
            if (this.$count !== this.children.length) {
                this.$count = this.children.length;
                this.$resize();
            }
        }

        $resize() {
            if (this.children && this.children.length) {
                // calculate size
                let size=0, maxSize=0;
                let spacer = this.spacer;
                if (this.size) {
                    size = this.size;
                    maxSize = this.children.length * size + (this.children.length-1)*spacer;
                } else {
                    size = (this.size) ? this.size : 1/this.children.length;
                    maxSize = 1;
                }
                let otop = 0;
                if (maxSize > 1) {
                    let factor = 1/maxSize;
                    size *= factor;
                    spacer *= factor;
                } else {
                    let delta = 1-maxSize;
                    otop = delta * this.align;
                }
                let total = size + spacer;
                for (let i=0; i<this.children.length; i++) {
                    let top = otop + total*i;
                    let bottom = 1-(top+size);
                    this.children[i].xform.top = top;
                    this.children[i].xform.bottom = bottom;
                }
            }
        }

    }

    class UiHorizontalSpacer extends UiVerticalSpacer {

        $resize() {
            if (this.children && this.children.length) {
                // calculate size
                let size=0, maxSize=0;
                let spacer = this.spacer;
                if (this.size) {
                    size = this.size;
                    maxSize = this.children.length * size + (this.children.length-1)*spacer;
                } else {
                    size = (this.size) ? this.size : 1/this.children.length;
                    maxSize = 1;
                }
                let oleft = 0;
                if (maxSize > 1) {
                    let factor = 1/maxSize;
                    size *= factor;
                    spacer *= factor;
                } else {
                    let delta = 1-maxSize;
                    oleft = delta * this.align;
                }
                let total = size + spacer;
                for (let i=0; i<this.children.length; i++) {
                    let left = oleft + total*i;
                    let right = 1-(left+size);
                    this.children[i].xform.left = left;
                    this.children[i].xform.right = right;
                }
            }
        }

    }

    class UiHorizontalSlider extends UiView {
        // SCHEMA --------------------------------------------------------------
        static {
            this.$schema('knobPct', { order:-2, dflt:.1, setter:(o,ov,v) => {
                if (o.knobXForm) {
                    o.knobXForm.left = o.value - o.value * v;
                    o.knobXForm.right = 1-o.value - (1-o.value)*v;
                }
                return v;
            }});
            this.$schema('value', { order:-1, dflt:.5, setter:(o,ov,v) => {
                v = Mathf.clamp(v, 0, 1);
                if (o.knobXForm) {
                    o.knobXForm.left = v - v * o.knobPct;
                    o.knobXForm.right = 1-v - (1-v)*o.knobPct;
                }
                return v;
            } });
            this.$schema('barSketch', { link:true, dflt:() => new Rect({ color:'rgba(255,255,255,.5)' }) });
            this.$schema('knobSketch', { link:true, dflt:() => new Rect({ color:'rgba(255,255,255,.5)', width:10, height:20, fitter:'stretch', tag:'knob' }) });
            this.$schema('barXForm', { readonly:true, parser: (o,x) => {
                let xform = (x.barXForm) ? x.barXForm : new XForm({ top:.1, bottom:.1 });
                xform.parent = o.xform;
                return xform;
            }});
            this.$schema('knobXForm', { readonly:true, parser: (o,x) => {
                let xform = (x.knobXForm) ? x.knobXForm : new XForm({ top:.05, bottom:.05 });
                xform.left = o.value - o.value * o.knobPct;
                xform.right = 1-o.value - (1-o.value)*o.knobPct;
                xform.parent = o.xform;
                return xform;
            }});
        }

        // CONSTRUCTOR ---------------------------------------------------------
        $cpost(spec={}) {
            super.$cpost(spec);
            this.at_pressed.listen(this.$on_pressed, this);
            this.at_unpressed.listen(this.$on_unpressed, this);
        }

        destroy() {
            GadgetCtx.at_moused.ignore(this.$on_moved, this);
            super.destroy();
        }

        // EVENT HANDLERS ------------------------------------------------------
        $on_pressed(evt) {
            let lmouse = this.xform.getLocal(evt.mouse);
            let v = this.$translateMouse(lmouse.x);
            this.value = v;
            GadgetCtx.at_moused.listen(this.$on_moved, this, false, (evt) => evt.tag === 'mousemoved');
        }
        $on_unpressed(evt) {
            GadgetCtx.at_moused.ignore(this.$on_moved, this);
        }
        $on_moved(evt) {
            let lmouse = this.xform.getLocal(evt.mouse);
            let v = this.$translateMouse(lmouse.x);
            this.value = v;
        }

        // METHODS -------------------------------------------------------------
        $translateMouse(x) {
            let v;
            if (x <= this.xform.minx) {
                v = 0;
            } else if (x >= this.xform.maxx) {
                v = 1;
            } else {
                v = Mathf.lerp(this.xform.minx, this.xform.maxx, 0, 1, x);
            }
            return v;
        }

        $subrender(ctx) {
            this.barXForm.apply(ctx, false);
            if (this.barSketch) this.barSketch.render(ctx, this.barXForm.minx, this.barXForm.miny, this.barXForm.width, this.barXForm.height);
            this.barXForm.revert(ctx, false);
            this.knobXForm.apply(ctx, false);
            if (this.knobSketch) this.knobSketch.render(ctx, this.knobXForm.minx, this.knobXForm.miny, this.knobXForm.width, this.knobXForm.height);
            this.knobXForm.revert(ctx, false);
        }

    }

    class UiVerticalSlider extends UiView {
        // SCHEMA --------------------------------------------------------------
        static {
            this.$schema('knobPct', { order:-2, dflt:.1, setter:(o,ov,v) => {
                if (o.knobXForm) {
                    o.knobXForm.top = o.value - o.value * v;
                    o.knobXForm.bottom = 1-o.value - (1-o.value)*v;
                }
                return v;
            } });
            this.$schema('value', { order:-1, dflt:.5, setter:(o,ov,v) => {
                v = Mathf.clamp(v, 0, 1);
                if (o.knobXForm) {
                    o.knobXForm.top = v - v * o.knobPct;
                    o.knobXForm.bottom = 1-v - (1-v)*o.knobPct;
                }
                return v;
            } });
            this.$schema('barSketch', { link:true, dflt:() => new Rect({ color:'rgba(255,255,255,.5)' }) });
            this.$schema('knobSketch', { link:true, dflt:() => new Rect({ color:'rgba(255,255,255,.5)', width:20, height:10, fitter:'stretch', tag:'knob' }) });
            this.$schema('barXForm', { readonly:true, parser: (o,x) => {
                let xform = (x.barXForm) ? x.barXForm : new XForm({ left:.1, right:.1 });
                xform.parent = o.xform;
                return xform;
            }});
            this.$schema('knobXForm', { readonly:true, parser: (o,x) => {
                let xform = (x.knobXForm) ? x.knobXForm : new XForm({ left:.05, right:.05, top:o.value, bottom:1-o.value });
                xform.top = o.value - o.value * o.knobPct;
                xform.bottom = 1-o.value - (1-o.value)*o.knobPct;
                xform.parent = o.xform;
                return xform;
            }});
        }

        // CONSTRUCTOR ---------------------------------------------------------
        $cpost(spec={}) {
            super.$cpost(spec);
            this.at_pressed.listen(this.$on_pressed, this);
            this.at_unpressed.listen(this.$on_unpressed, this);
        }

        destroy() {
            GadgetCtx.at_moused.ignore(this.$on_moved, this);
            super.destroy();
        }

        // EVENT HANDLERS ------------------------------------------------------
        $on_pressed(evt) {
            let lmouse = this.xform.getLocal(evt.mouse);
            let v = this.$translateMouse(lmouse.y);
            this.value = v;
            GadgetCtx.at_moused.listen(this.$on_moved, this, false, (evt) => evt.tag === 'mousemoved');
        }
        $on_unpressed(evt) {
            GadgetCtx.at_moused.ignore(this.$on_moved, this);
        }
        $on_moved(evt) {
            let lmouse = this.xform.getLocal(evt.mouse);
            let v = this.$translateMouse(lmouse.y);
            this.value = v;
            //console.log(`value: ${v} at_modified.listeners ${this.at_modified.$listeners}`);
        }

        // METHODS -------------------------------------------------------------
        $translateMouse(y) {
            let v;
            if (y <= this.xform.miny) {
                v = 0;
            } else if (y >= this.xform.maxy) {
                v = 1;
            } else {
                v = Mathf.lerp(this.xform.miny, this.xform.maxy, 0, 1, y);
            }
            return v;
        }

        $subrender(ctx) {
            this.barXForm.apply(ctx, false);
            if (this.barSketch) this.barSketch.render(ctx, this.barXForm.minx, this.barXForm.miny, this.barXForm.width, this.barXForm.height);
            this.barXForm.revert(ctx, false);
            this.knobXForm.apply(ctx, false);
            if (this.knobSketch) this.knobSketch.render(ctx, this.knobXForm.minx, this.knobXForm.miny, this.knobXForm.width, this.knobXForm.height);
            this.knobXForm.revert(ctx, false);
        }

    }

    class UiPanel extends UiView {

        // SCHEMA --------------------------------------------------------------
        static {
            this.$schema('sketch', { link: true, dflt: (o) => o.constructor.dfltSketch });
        }

        // STATIC PROPERTIES ---------------------------------------------------
        static get dfltSketch() {
            return new Rect({ color: 'rgba(255,255,255,.25)' });
        }

        // METHODS -------------------------------------------------------------
        $subrender(ctx) {
            if (this.sketch) this.sketch.render(ctx, this.xform.minx, this.xform.miny, this.xform.width, this.xform.height);
        }

    }

    class UiScroller extends UiView {
        static {
            this.$schema('verticalSliderXForm', { order:-2, readonly:true, parser: (o,x) => {
                let xform = (x.verticalSliderXForm) ? x.verticalSliderXForm : new XForm({ left:.9, bottom:.1 });
                xform.parent = o.xform;
                return xform;
            }});

            this.$schema('horizontalSliderXForm', { order:-2, readonly:true, parser: (o,x) => {
                let xform = (x.horizontalSliderXForm) ? x.horizontalSliderXForm : new XForm({ top:.9, right:.1 });
                xform.parent = o.xform;
                return xform;
            }});

            // modifiable internal scrollable xform properties
            this.$schema('width', { order:-1, dflt:0, setter: (o,ov,v) => {
                if (o.$scrollable) {
                    if (v) {
                        o.$scrollable.xform.fixedWidth = v;
                    } else {
                        o.$scrollable.xform.fixedWidth = o.xform.width;
                    }
                }
                return v;
            }});
            this.$schema('height', { order:-1, dflt:0, setter: (o,ov,v) => {
                if (o.$scrollable) {
                    if (v) {
                        o.$scrollable.xform.fixedHeight = v;
                    } else {
                        o.$scrollable.xform.fixedHeight = o.xform.height;
                    }
                }
                return v;
            }});
            this.$schema('origx', { order:-1, dflt:.5, setter: (o,ov,v) => {
                if (o.$scrollable) o.$scrollable.xform.origx = v;
                return v;
            }});
            this.$schema('origy', { order:-1, dflt:.5, setter: (o,ov,v) => {
                if (o.$scrollable) o.$scrollable.xform.origy = v;
                return v;
            }});
            this.$schema('scrollX', { order:-1, readonly:true, dflt: .5 });
            this.$schema('scrollY', { order:-1, readonly:true, dflt: .5 });

            this.$schema('minScroll', { readonly:true, dflt: .1 });
            this.$schema('maxScroll', { readonly:true, dflt: .9 });
            this.$schema('fitToWidth', { readonly:true, dflt: false });
            this.$schema('fitToHeight', { readonly:true, dflt: false });

            this.$schema('minScale', { readonly:true, dflt: .1 });
            this.$schema('maxScale', { readonly:true, dflt: 10 });

            this.$schema('$verticalSliderPanel', { order:-1, readonly:true, parser: (o,x) => {
                let view = new UiPanel({
                    xform:o.verticalSliderXForm,
                    sketch:null,
                    mousable:false,
                });
                return view;
            }});
            this.$schema('$verticalSlider', { readonly:true, parser: (o,x) => new UiVerticalSlider({ value:o.scrollY }) });
            this.$schema('$horizontalSliderPanel', { order:-1, readonly:true, parser: (o,x) => {
                let view = new UiPanel({
                    xform:o.horizontalSliderXForm,
                    sketch:null,
                    mousable:false,
                });
                return view;
            }});
            this.$schema('$horizontalSlider', { readonly:true, parser: (o,x) => new UiHorizontalSlider({value:o.scrollY}) });

            this.$schema('scrollable', { dflt:true });
            this.$schema('scrollRateX', { dflt:.01 });
            this.$schema('scrollRateY', { dflt:.01 });
            this.$schema('zoomable', { dflt:true });
            this.$schema('zoomRate', { dflt:.01 });
            this.$schema('zoomKey', { dflt:'Shift' });
            this.$schema('autohide', { dflt:true });
            this.$schema('$zoomed', { eventable:false, dflt:false });
            // the internal scrollable panel
            this.$schema('$scrollable', { readonly:true, parser: (o,x) => new UiPanel({
                sketch: null,
                xform: new XForm({
                    grip:.5, 
                    origx:o.origx, 
                    origy:o.origy, 
                    fixedWidth:o.width||o.xform.width, 
                    fixedHeight:o.height||o.xform.height
                }),
            })});
            // a sketch or a view that will act as the scrollable area.  
            // -- A view will be made a child of an internal scrollable panel, a
            // -- A sketch will override the default internal panel's sketch
            this.$schema('scrollable', { readonly:true, dflt: (o,x) => new Rect({ color:'rgba(127,127,127,.5', width:100, height:100, fitter:'none'}) });
            this.$schema('at_scrolled', { readonly:true, dflt: (o) => new EvtEmitter(o, 'scrolled') });

        }

        $cpost(spec) {
            super.$cpost(spec);
            // "adopt" scrollable region
            this.adopt(this.$scrollable);
            if (this.scrollable) {
                if (this.scrollable instanceof UiView) {
                    this.$scrollable.adopt(this.scrollable);
                } else if (this.scrollable instanceof Asset) {
                    this.$scrollable.sketch = this.scrollable;
                }
            }
            // adopt sliders
            this.adopt(this.$verticalSliderPanel);
            this.$verticalSliderPanel.adopt(this.$verticalSlider);
            this.adopt(this.$horizontalSliderPanel);
            this.$horizontalSliderPanel.adopt(this.$horizontalSlider);
            // setup event handlers
            this.$verticalSlider.at_modified.listen(this.$on_verticalSlider_modified, this, false, (evt) => (evt.key === 'value'));
            this.$horizontalSlider.at_modified.listen(this.$on_horizontalSlider_modified, this, false, (evt) => (evt.key === 'value'));
            this.at_modified.listen(this.$on_xform_modified, this, false, (evt) => evt.key.startsWith('xform'));
            this.at_scrolled.listen(this.$on_scrolled, this);
            if (this.zoomable) GadgetCtx.at_keyed.listen(this.$on_keyed, this);
        }

        destroy() {
            GadgetCtx.at_keyed.ignore(this.$on_keyed, this);
        }

        $on_keyed(evt) {
            if (evt.tag === 'keydowned') {
                if (evt.key === this.zoomKey) this.zoomed = true;
            } else if (evt.tag === 'keyupped') {
                if (evt.key === this.zoomKey) this.zoomed = false;
            }
        }

        $on_xform_modified(evt, key) {
            if (!this.width) this.$scrollable.xform.fixedWidth = this.xform.width;
            if (!this.height) this.$scrollable.xform.fixedHeight = this.xform.height;
        }

        $on_verticalSlider_modified(evt) {
            let overlap = (this.$scrollable.xform.height - this.xform.height);
            if (overlap > 0) {
                let y = (.5 - this.$verticalSlider.value) * overlap;
                this.$scrollable.xform.y = y;
            }
        }

        $on_horizontalSlider_modified(evt) {
            let overlap = (this.$scrollable.xform.width - this.xform.width);
            if (overlap > 0) {
                let x = (.5 - this.$horizontalSlider.value) * overlap;
                this.$scrollable.xform.x = x;
            }
        }

        $on_scrolled(evt) {
            if (this.zoomed) {
                this.$scrollable.xform.scalex *= (1+evt.scroll.y*this.zoomRate);
                this.$scrollable.xform.scaley *= (1+evt.scroll.y*this.zoomRate);
                if (this.$scrollable.xform.scalex < this.minScale) this.$scrollable.xform.scalex = this.minScale;
                if (this.$scrollable.xform.scaley < this.minScale) this.$scrollable.xform.scaley = this.minScale;
                if (this.$scrollable.xform.scalex > this.maxScale) this.$scrollable.xform.scalex = this.maxScale;
                if (this.$scrollable.xform.scaley > this.maxScale) this.$scrollable.xform.scaley = this.maxScale;
            } else if (this.scrollable) {
                let x = Mathf.clamp(this.$horizontalSlider.value + evt.scroll.x*this.scrollRateX, 0, 1);
                this.$horizontalSlider.value = x;
                let y = Mathf.clamp(this.$verticalSlider.value + evt.scroll.y*this.scrollRateY, 0, 1);
                this.$verticalSlider.value = y;
            }
        }

        $compute_scrollsize() {
            // width
            let sizex = this.xform.width/(this.$scrollable.xform.width*this.$scrollable.xform.scalex);
            this.$horizontalSlider.knobPct = Mathf.clamp(sizex, this.minScroll, this.maxScroll);
            if (sizex >= 1) {
                if (this.autohide) {
                    this.$horizontalSlider.active = false;
                    this.$horizontalSlider.visible = false;
                }
                this.$scrollable.xform.x = 0;
            } else {
                this.$horizontalSlider.active = true;
                this.$horizontalSlider.visible = true;
                let overlap = ((this.$scrollable.xform.width*this.$scrollable.xform.scalex) - this.xform.width);
                let x = (.5 - this.$horizontalSlider.value) * overlap;
                this.$scrollable.xform.x = x;
            }
            // height
            let sizey = this.xform.height/(this.$scrollable.xform.height*this.$scrollable.xform.scaley);
            this.$verticalSlider.knobPct = Mathf.clamp(sizey, this.minScroll, this.maxScroll);
            if (sizey >= 1) {
                if (this.autohide) {
                    this.$verticalSlider.active = false;
                    this.$verticalSlider.visible = false;
                }
                this.$scrollable.xform.y = 0;
            } else {
                this.$verticalSlider.active = true;
                this.$verticalSlider.visible = true;
                let overlap = ((this.$scrollable.xform.height*this.$scrollable.xform.scaley) - this.xform.height);
                let y = (.5 - this.$verticalSlider.value) * overlap;
                this.$scrollable.xform.y = y;
            }

        }

        $subrender(ctx) {
            this.$compute_scrollsize();
            if (this.scrollable instanceof UiView) {
                if (this.fitToWidth) this.$scrollable.xform.fixedWidth = this.scrollable.xform.width;
                if (this.fitToHeight) this.$scrollable.xform.fixedHeight = this.scrollable.xform.height;
            } else if (this.scrollable instanceof Asset) {
                if (this.fitToWidth) this.$scrollable.xform.fixedWidth = this.scrollable.width;
                if (this.fitToHeight) this.$scrollable.xform.fixedHeight = this.scrollable.height;
            }
        }

    }

    class UiInput extends UiPanel {
        // STATIC VARIABLES ----------------------------------------------------
        static dfltCharset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890 ';

        // SCHEMA --------------------------------------------------------------
        static {
            this.$schema('textFmt', { order:-2, dflt:() => new TextFormat(), eventable:false });
            this.$schema('text', { order:-1, dflt:'default text' });
            this.$schema('$text', { eventable:false, link:true, dflt: (o) => new Text({
                parsable:false, 
                text:o.text, 
                fmt:o.textFmt, 
                cursorIdx:o.text.length,
            }) });
            this.$schema('backgroundSketch', { link: true, dflt: () => new Rect({ color: 'rgba(255,255,255,.25)' }) });
            this.$schema('selectedSketch', { link: true, dflt: () => new Rect({ borderColor: 'yellow', border: 3, fill: false }) });
            this.$schema('textXForm', { readonly:true, dflt: () => new XForm({grip:.1}) });
            this.$schema('emptyText', { readonly: true, dflt: 'enter value' }),
            this.$schema('selectedFmt', { eventable:false });
            this.$schema('emptyFmt', { eventable:false, dflt:() => new TextFormat({ color:'gray', style:'italic' })});
            this.$schema('charset', { dflt: this.dfltCharset });
            this.$schema('$selected', { serializable:false, dflt:false });
        }

        // CONSTRUCTOR ---------------------------------------------------------
        $cpost(spec) {
            super.$cpost(spec);
            GadgetCtx.at_keyed.listen(this.$on_keyed, this, false, (evt) => evt.tag === 'keydowned');
            GadgetCtx.at_moused.listen(this.$on_otherClicked, this, false, (evt) => evt.tag === 'mouseclicked');
            let uitext = new UiText({
                xform:this.textXForm,
                text:this.text,
                $text:this.$text,
                mousable:false,
            });
            this.adopt(uitext);
        }

        // EVENT HANDLERS ------------------------------------------------------
        $on_clicked(evt) {
            if (!this.active) return;
            // activate/deactivate
            this.$selected = (!this.$selected);
            this.$text.cursorOn = this.$selected;
            super.$on_clicked(evt);
        }

        $on_otherClicked(evt) {
            if ((!this.hovered) && this.$selected) {
                this.$selected = false;
                this.$text.cursorOn = this.$selected;
            }
        }

        $on_keyed(evt) {
            if (!this.active) return;
            // ignore key events if not selected
            if (!this.$selected) return;
            // handle escape
            if (evt.key === 'Escape') {
                this.$selected = false;
                this.$text.cursorOn = this.$selected;
                return;
            }
            // handle backspace
            if (evt.key === 'Backspace') {
                if (this.$text.cursorIdx > 0) {
                    this.$text.cursorIdx = this.$text.cursorIdx-1;
                    this.text = Util.spliceStr(this.text, this.$text.cursorIdx, 1);
                }
                return;
            }
            // handle arrows
            if (evt.key === 'ArrowLeft') {
                if (this.$text.cursorIdx > 0) {
                    this.$text.cursorIdx = this.$text.cursorIdx-1;
                }
                return;
            }
            if (evt.key === 'ArrowRight') {
                if (this.$text.cursorIdx < this.text.length) {
                    this.$text.cursorIdx = this.$text.cursorIdx+1;
                }
                return;
            }
            if (evt.key === 'ArrowUp') {
                if (this.$text.cursorIdx !== 0) {
                    this.$text.cursorIdx = 0;
                }
                return;
            }
            if (evt.key === 'ArrowDown') {
                if (this.$text.cursorIdx !== this.text.length) {
                    this.$text.cursorIdx = this.text.length;
                }
                return;
            }
            // handle delete
            if (evt.key === 'Delete') {
                if (this.$text.cursorIdx < this.text.length) {
                    this.text = Util.spliceStr(this.text, this.$text.cursorIdx, 1);
                }
                return;
            }
            // ignore other meta keys
            if (evt.key.length > 1) return;
            let key = evt.key;
            // check charset
            if (!this.charset.includes(key)) return;
            // good to go...
            let left = this.text.slice(0, this.$text.cursorIdx);
            let right = this.text.slice(this.$text.cursorIdx);
            this.text = left + key + right;
            this.$text.cursorIdx = this.$text.cursorIdx+1;
        }

        // METHODS -------------------------------------------------------------

        $subrender(ctx) {
            // render sketch
            if (this.backgroundSketch) this.backgroundSketch.render(ctx, this.xform.minx, this.xform.miny, this.xform.width, this.xform.height);
            // render selected highlight
            if (this.$selected) {
                if (this.selectedSketch) this.selectedSketch.render(ctx, this.xform.minx, this.xform.miny, this.xform.width, this.xform.height);
                this.$text.text = this.text;
                if (this.selectedFmt) {
                    this.$text.fmt = this.selectedFmt;
                } else {
                    this.$text.fmt = this.textFmt;
                }
            } else {
                if (!this.text.length) {
                    this.$text.text = this.emptyText;
                    if (this.emptyFmt) this.$text.fmt = this.emptyFmt;
                } else {
                    this.$text.fmt = this.textFmt;
                }
            }
        }

    }

    class Direction {
        static none =           0;
        static north =          1<<0;
        static east =           1<<1;
        static south =          1<<2;
        static west =           1<<3;
        static northEast =      1<<4;
        static southEast =      1<<5;
        static northWest =      1<<6;
        static southWest =      1<<7;
        static up =             1<<8;
        static down =           1<<9;

        static northUp =        1<<10;
        static eastUp =         1<<11;
        static southUp =        1<<12;
        static westUp =         1<<13;
        static northEastUp =    1<<14;
        static southEastUp =    1<<15;
        static northWestUp =    1<<16;
        static southWestUp =    1<<17;
        static northDown =      1<<18;
        static eastDown =       1<<19;
        static southDown =      1<<20;
        static westDown =       1<<21;
        static northEastDown =  1<<22;
        static southEastDown =  1<<23;
        static northWestDown =  1<<24;
        static southWestDown =  1<<25;

        static cardinal =       Direction.north|Direction.south|Direction.east|Direction.west;
        static diagonal =       Direction.northWest|Direction.southWest|Direction.northEast|Direction.southEast;
        static any =            Direction.cardinal|Direction.diagonal;

        static all = [
            this.northWest,
            this.north,
            this.northEast,
            this.east,
            this.southEast,
            this.south,
            this.southWest,
            this.west,
        ];

        static all3d = [
            this.northWest,
            this.north,
            this.northEast,
            this.east,
            this.southEast,
            this.south,
            this.southWest,
            this.west,
            this.up,
            this.down,
            this.northWestUp,
            this.northUp,
            this.northEastUp,
            this.eastUp,
            this.southEastUp,
            this.southUp,
            this.southWestUp,
            this.westUp,
            this.northWestDown,
            this.northDown,
            this.northEastDown,
            this.eastDown,
            this.southEastDown,
            this.southDown,
            this.southWestDown,
            this.westDown,
        ];

        static opposites = {
            [this.northWest]:       this.southEast,
            [this.north]:           this.south,
            [this.northEast]:       this.southWest,
            [this.east]:            this.west,
            [this.southEast]:       this.northWest,
            [this.south]:           this.north,
            [this.southWest]:       this.northEast,
            [this.west]:            this.east,
            [this.up]:              this.down,
            [this.down]:            this.up,
            [this.northWestUp]:     this.southEastDown,
            [this.northUp]:         this.southDown,
            [this.northEastUp]:     this.southWestDown,
            [this.eastUp]:          this.westDown,
            [this.southEastUp]:     this.northWestDown,
            [this.southUp]:         this.northDown,
            [this.southWestUp]:     this.northEastDown,
            [this.westUp]:          this.eastDown,
            [this.northWestDown]:   this.southEastUp,
            [this.northDown]:       this.southUp,
            [this.northEastDown]:   this.southWestUp,
            [this.eastDown]:        this.westUp,
            [this.southEastDown]:   this.northWestUp,
            [this.southDown]:       this.northUp,
            [this.southWestDown]:   this.northEastUp,
            [this.westDown]:        this.eastUp,
        };

        static strMap = {
            [this.north]:       'north',
            [this.northEast]:   'northEast',
            [this.east]:        'east',
            [this.southEast]:   'southEast',
            [this.south]:       'south',
            [this.southWest]:   'southWest',
            [this.west]:        'west',
            [this.northWest]:   'northWest',
            [this.up]:          'up',
            [this.down]:        'down',
            [this.northUp]:     'northUp',
            [this.northEastUp]: 'northEastUp',
            [this.eastUp]:      'eastUp',
            [this.southEastUp]: 'southEastUp',
            [this.southUp]:     'southUp',
            [this.southWestUp]: 'southWestUp',
            [this.westUp]:      'westUp',
            [this.northWestUp]: 'northWestUp',
            [this.northDown]:     'northDown',
            [this.northEastDown]: 'northEastDown',
            [this.eastDown]:      'eastDown',
            [this.southEastDown]: 'southEastDown',
            [this.southDown]:     'southDown',
            [this.southWestDown]: 'southWestDown',
            [this.westDown]:      'westDown',
            [this.northWestDown]: 'northWestDown',
        };
        static abbrevMap = {
            [this.north]:       'n',
            [this.northEast]:   'ne',
            [this.east]:        'e',
            [this.southEast]:   'se',
            [this.south]:       's',
            [this.southWest]:   'sw',
            [this.west]:        'w',
            [this.northWest]:   'nw',
            [this.up]:          'u',
            [this.down]:        'd',
            [this.northUp]:     'nu',
            [this.northEastUp]: 'neu',
            [this.eastUp]:      'eu',
            [this.southEastUp]: 'seu',
            [this.southUp]:     'su',
            [this.southWestUp]: 'swu',
            [this.westUp]:      'wu',
            [this.northWestUp]: 'nwu',
            [this.northDown]:       'nd',
            [this.northEastDown]:   'ned',
            [this.eastDown]:        'ed',
            [this.southEastDown]:   'sed',
            [this.southDown]:       'sd',
            [this.southWestDown]:   'swd',
            [this.westDown]:        'wd',
            [this.northWestDown]:   'nwd',
        };

        static cardinals = [
            this.north,
            this.east,
            this.south,
            this.west,
        ];

        static cardinals3d = [
            this.north,
            this.east,
            this.south,
            this.west,
            this.up,
            this.down,
        ];

        static diagonals = [
            this.northEast,
            this.southEast,
            this.southWest,
            this.northWest,
        ];

        static diagonals3d = [
            this.northEast,
            this.southEast,
            this.southWest,
            this.northWest,
            this.northEastUp,
            this.southEastUp,
            this.southWestUp,
            this.northWestUp,
            this.northEastDown,
            this.southEastDown,
            this.southWestDown,
            this.northWestDown,
        ];

        static composites = {
            [this.northWest]: this.north|this.west,
            [this.northEast]: this.north|this.east,
            [this.southWest]: this.south|this.west,
            [this.southEast]: this.south|this.east,
        };

        static toString(dir) {
            return this.strMap[dir] || 'invalid';
        }

        static toAbbrev(dir) {
            return this.abbrevMap[dir] || 'X';
        }

        static maskToString(dir) {
            return Array.from(this.all.filter((v) => dir&v).map((v)=>this.toString(v))).join('|');
        }

        // kinds should be cardinals, diagonals, or all
        static nextInRotation(kinds, current, clockwise=true) {
            let idx = kinds.indexOf(current);
            if (idx === -1) return current;
            if (clockwise) {
                idx = (idx+1)%kinds.length;
                return kinds[idx];
            } else {
                idx = (kinds.length + idx - 1) % kinds.length;
                return kinds[idx];
            }
        }

        static westerly(dir) {
            return dir & (Direction.northWest|Direction.west|Direction.southWest);
        }

        static easterly(dir) {
            return dir & (Direction.northEast|Direction.east|Direction.southEast);
        }

        static cardinalFromXY(x, y) {
            let heading = Math.atan2(y, x);
            return this.cardinalFromHeading(heading);
        }

        static diagonalFromXY(x, y) {
            let heading = Math.atan2(y, x);
            return this.diagonalFromHeading(heading);
        }

        static diagonalFromHeading(heading) {
            // slice of the unit circle that each direction occupies
            let cardinalUnit = (2*Math.PI) / this.all.length;
            // to map values of -PI to PI to the direction index, first add PI (to give values in the range of 0 to 2*PI), then
            // divide by the 'cardinalUnit' or size of each directional slice of the unit circle.  Rounding this will give values
            // in the range from 0 to # of directions + 1.  Mod this by the # of directions to handle the special case of the 'west'
            // direction which occurs at the beginning of the range (-PI) and end of the range (PI) of values.
            let dir_i = (Math.round((heading + Math.PI) / cardinalUnit) + 7) % this.all.length;
            return this.all[dir_i];
        }

        static cardinalFromHeading(heading) {
            // slice of the unit circle that each direction occupies
            let cardinalUnit = (2*Math.PI) / this.cardinals.length;
            // to map values of -PI to PI to the direction index, first add PI (to give values in the range of 0 to 2*PI), then
            // divide by the 'cardinalUnit' or size of each directional slice of the unit circle.  Rounding this will give values
            // in the range from 0 to # of directions + 1.  Mod this by the # of directions to handle the special case of the 'west'
            // direction which occurs at the beginning of the range (-PI) and end of the range (PI) of values.
            let dir_i = (Math.round((heading + Math.PI) / cardinalUnit) + 3) % this.cardinals.length;
            return this.cardinals[dir_i];
        }

        static asHeading(dir) {
            switch (dir) {
            case this.north:
                return -Math.PI*.5;
            case this.south:
                return Math.PI*.5;
            case this.east:
                return 0;
            case this.west:
                return Math.PI;
            case this.northWest:
                return -Math.PI*.75;
            case this.northEast:
                return -Math.PI*.25;
            case this.southWest:
                return Math.PI*.75;
            case this.southEast:
                return Math.PI*.25;
            }
            return 0;
        }

        static asX(dir) {
            switch(dir) {
            case Direction.west:
            case Direction.northWest:
            case Direction.southWest:
            case Direction.westUp:
            case Direction.northWestUp:
            case Direction.southWestUp:
            case Direction.westDown:
            case Direction.northWestDown:
            case Direction.southWestDown:
                return -1;
            case Direction.east:
            case Direction.northEast:
            case Direction.southEast:
            case Direction.eastUp:
            case Direction.northEastUp:
            case Direction.southEastUp:
            case Direction.eastDown:
            case Direction.northEastDown:
            case Direction.southEastDown:
                return 1;
            }
            return 0;
        }

        static asY(dir) {
            switch(dir) {
            case Direction.north:
            case Direction.northWest:
            case Direction.northEast:
                return -1;
            case Direction.south:
            case Direction.southWest:
            case Direction.southEast:
                return 1;
            }
            return 0;
        }

        static asY(dir) {
            switch(dir) {
            case Direction.north:
            case Direction.northWest:
            case Direction.northEast:
            case Direction.northUp:
            case Direction.northWestUp:
            case Direction.northEastUp:
            case Direction.northDown:
            case Direction.northWestDown:
            case Direction.northEastDown:
                return -1;
            case Direction.south:
            case Direction.southWest:
            case Direction.southEast:
            case Direction.southUp:
            case Direction.southWestUp:
            case Direction.southEastUp:
            case Direction.southDown:
            case Direction.southWestDown:
            case Direction.southEastDown:
                return 1;
            }
            return 0;
        }

        static asZ(dir) {
            switch(dir) {
            case Direction.northUp:
            case Direction.northEastUp:
            case Direction.eastUp:
            case Direction.southEastUp:
            case Direction.southUp:
            case Direction.southWestUp:
            case Direction.westUp:
            case Direction.northWestUp:
                return 1;
            case Direction.northDown:
            case Direction.northEastDown:
            case Direction.eastDown:
            case Direction.southEastDown:
            case Direction.southDown:
            case Direction.southWestDown:
            case Direction.westDown:
            case Direction.northWestDown:
                return -1;
            }
            return 0;
        }

        static opposite(dir) {
            return this.opposites[dir] || 0;
        }

        static orthogonal(dir) {
            switch(dir) {
            case Direction.north:
                return Direction.east;
            case Direction.south:
                return Direction.west;
            case Direction.west:
                return Direction.north;
            case Direction.east:
                return Direction.south;
            case Direction.northWest:
                return Direction.northEast;
            case Direction.southEast:
                return Direction.southWest;
            case Direction.northEast:
                return Direction.southEast;
            case Direction.southWest:
                return Direction.northWest;
            }
            return Direction.none;
        }

        static adjacent(dir) {
            switch(dir) {
            case Direction.north:
                return [Direction.northWest, Direction.northEast]
            case Direction.south:
                return [Direction.southWest, Direction.southEast]
            case Direction.west:
                return [Direction.southWest, Direction.northWest]
            case Direction.east:
                return [Direction.southEast, Direction.northEast]
            case Direction.northWest:
                return [Direction.north, Direction.west]
            case Direction.southEast:
                return [Direction.south, Direction.east]
            case Direction.northEast:
                return [Direction.north, Direction.east]
            case Direction.southWest:
                return [Direction.south, Direction.west]
            }
            return [];
        }

        static *forEach(dirs) {
            for (const dir of this.all) {
                if (dir & dirs) yield dir;
            }
        }

        static distanceAlong(dir, x, y) {
            let dx = this.asX(dir)*x;
            let dy = this.asY(dir)*y;
            return Math.sqrt(dx*dx+dy*dy);
        }

    }

    /**
     * Implements a 2-dimensional grid array and methods for indexing and accessing data within
     * @extends Gadget
     */
    class GridArray extends Gadget {
        static directions = Array.from(Direction.all);

        /** @member {string} GridArray#cols=16 - columns in grid array */
        static { this.$schema('cols', { readonly: true, dflt: 16 }); }
        /** @member {string} GridArray#rows=16 - rows in grid array */
        static { this.$schema('rows', { readonly: true, dflt: 16 }); }
        /** @member {string} GridArray#length - length of flat array */
        static { this.$schema('length', { readonly: true, parser: (o,x) => o.cols*o.rows }); }
        /** @member {string} GridArray#entries - array storage */
        static { this.$schema('entries', { readonly: true, dflt: () => [] }); }

        // STATIC METHODS ------------------------------------------------------

        /**
         * @typedef {Object} ArrayIndex
         * @property {number} x - row index (i)
         * @property {number} y - column index (j)
        */

        /**
         * @typedef {Object} ArrayDimension
         * @property {number} x - number of columns
         * @property {number} y - number of rows
        */

        /**
         * Returns the column (i) and row (j) indices from the given flat index (idx)
         * @param {int} idx - flat array index
         * @param {ArrayDimension} dim - dimensions for the array
         * @returns {ArrayIndex} 
         */
        static _ijFromIdx(idx, dimx, dimy) {
            if (idx < 0) return {x:-1,y:-1};
            let i = idx % dimx;
            if (i>dimx) i = -1;
            let j = Math.floor(idx/dimx);
            if (j>dimy) j = -1;
            return {x:i, y:j};
        }
        static ijFromIdx(idx, dim) {
            if (!dim) return {x:-1,y:-1};
            return this._ijFromIdx(idx, dim.x, dim.y);
        }

        /**
         * Returns the flat index (idx) from the given column and row indices (i,j)
         * @param {ArrayIndex} ij - array index
         * @param {ArrayDimension} dim - dimensions for the array
         * @returns {int}
         */
        static _idxFromIJ(i, j, dimx, dimy) {
            if (i >= dimx || i<0) return -1;
            if (j >= dimy || j<0) return -1;
            return i + dimx*j;
        }
        static idxFromIJ(ij, dim) {
            if (!ij || !dim) return -1;
            return this._idxFromIJ(ij.x, ij.y, dim.x, dim.y);
        }

        /**
         * Returns the adjacent flat index based on given index and {@link Direction}
         * @param {int} idx - starting flat array index
         * @param {Direction} dir - direction of adjacent index requested
         * @param {ArrayDimension} dim - dimensions for the array
         * @returns {int}
         */
        static _idxFromDir(idx, dir, dimx, dimy) {
            let ij = this._ijFromIdx(idx, dimx, dimy);
            return this._idxFromIJ(ij.x + Direction.asX(dir), ij.y + Direction.asY(dir), dimx, dimy);
        }
        static idxFromDir(idx, dir, dim) {
            if (!dim) return -1;
            return this._idxFromDir(idx, dir, dim.x, dim.y);
        }

        /**
         * Generator that yields all (flat) indexes between two given points (indices) using Bresenham's line algorithm
         * @generator
         * @param {int} idx1 - flat index of point one
         * @param {int} idx2 - flat index of point two
         * @param {ArrayDimension} dim - dimensions for the array
         * @yields {int}
         */
        static *idxsBetween(idx1, idx2, dim) {
            if (!dim) return;
            let ij1 = this.ijFromIdx(idx1, dim);
            let ij2 = this.ijFromIdx(idx2, dim);
            for (const [i,j] of Util.pixelsInSegment(ij1.x, ij1.y, ij2.x, ij2.y)) {
                yield this._idxFromIJ(i, j, dim.x, dim.y);
            }
        }

        static *_idxsInRange(idx, range, dimx, dimy) {
            let cij = this._ijFromIdx(idx, dimx, dimy);
            let mini = Math.max(cij.x-range, 0);
            let maxi = Math.min(cij.x+range, dimx);
            let minj = Math.max(cij.y-range, 0);
            let maxj = Math.min(cij.y+range, dimy);
            for (let i=mini; i<=maxi; i++) {
                for (let j=minj; j<=maxj; j++) {
                    let d = Vect$1._dist(cij.x, cij.y, i, j);
                    if (d<=range) {
                        yield this._idxFromIJ(i, j, dimx, dimy);
                    }
                }
            }
        }
        static *idxsInRange(idx, range, dim) {
            if (!dim) return;
            yield *this._idxsInRange(idx, range, dim.x, dim.y);
        }

        /**
         * Determines if the given two indices are adjacent to each other.
         * @param {int} idx1 - index 1
         * @param {int} idx2 - index 2
         * @returns  {boolean}
         */
        static _idxsAdjacent(idx1, idx2, dimx, dimy) {
            for (const dir of this.constructor.directions) {
                if (this._idxFromDir(idx1, dir, dimx, dimy) === idx2) return true;
            }
            return false;
        }
        static idxsAdjacent(idx1, idx2, dim) {
            if (!dim) return false;
            return this._idxsAdjacent(idx1, idx2, dim.x, dim.y);
        }

        /**
         * Determines if the given two ij points are adjacent to each other.
         * @param {int} ij1 - indexed ij
         * @param {int} ij2 - indexed ij
         * @returns  {boolean}
         */
        static _ijAdjacent(i1, j1, i2, j2) {
            if (i1 === i2 && j1 === j2) return false;
            let di = Math.abs(i1-i2);
            let dj = Math.abs(j1-j2);
            return di<=1 && dj <=1;
        }
        static ijAdjacent(ij1, ij2) {
            if (!ij1 || !ij2) return false;
            return this._ijAdjacent(ij1.x, ij1.y, ij2.x, ij2.y);
        }

        /**
         * Resizes the given grid array and creates a new grid array and optionally shifts array entries based on given offsets.  Any out-of-bounds data is lost.
         * @param {GridArray} ga - grid array to resize
         * @param {ArrayDimension} dim - dimensions for the array
         * @param {i} cols - number of columns for new array
         * @param {i} rows - number of rows for new array
         * @param {i} [offi=0] - column offset for original array data
         * @param {i} [offj=0] - row offset for original array data
         * @returns {int}
         */
        static resize(ga, cols, rows, offi=0, offj=0) {
            // re-align data
            let nentries = new Array(rows*cols);
            for (let i=0; i<cols; i++) {
                for (let j=0; j<rows; j++) {
                    let oi = i+offi;
                    let oj = j+offj;
                    if (oi >= 0 && oi < this.cols && oj >= 0 && oj < this.rows) {
                        let oidx = this._idxFromIJ(oi, oj, ga.cols, ga.rows);
                        let nidx = this._idxFromIJ(i, j, cols, rows);
                        nentries[nidx] = ga.entries[oidx];
                    }
                }
            }
            return new GridArray({ rows: rows, cols: cols, entries: nentries });
        }

        // METHODS -------------------------------------------------------------

        /**
         * Returns the column and row indices ([i,j]) from the given flat index (idx)
         * @param {int} idx - flat array index
         * @returns {ArrayIndex} 
         */
        ijFromIdx(idx) {
            return this.constructor._ijFromIdx(idx, this.cols, this.rows);
        }

        /**
         * Returns the flat index (idx) from the given column and row indices (i,j)
         * @param {ArrayIndex} ij - array index
         * @returns {int}
         */
        _idxFromIJ(i,j) {
            return this.constructor._idxFromIJ(i, j, this.cols, this.rows);
        }
        idxFromIJ(ij) {
            if (!ij) return -1;
            return this.constructor._idxFromIJ(ij.x, ij.y, this.cols, this.rows);
        }

        /**
         * Returns the adjacent flat index based on given index and {@link Direction}
         * @param {int} idx - starting flat array index
         * @param {Direction} dir - direction of adjacent index requested
         * @returns {int}
         */
        idxFromDir(idx, dir) {
            return this.constructor._idxFromDir(idx, dir, this.cols, this.rows);
        }

        /**
         * Generator that yields all (flat) indexes between two given points (indices) using Bresenham's line algorithm
         * @generator
         * @param {int} idx1 - flat index of point one
         * @param {int} idx2 - flat index of point two
         * @yields {int}
         */
        *idxsBetween(idx1, idx2) {
            yield *this.constructor.idxsBetween(idx1, idx2, {x: this.cols, y:this.rows});
        }

        *idxsInRange(idx, range) {
            yield *this.constructor._idxsInRange(idx, range, this.cols, this.rows);
        }

        /**
         * Determines if the given two indices are adjacent to each other.
         * @param {int} idx1 - index 1
         * @param {int} idx2 - index 2
         * @returns  {boolean}
         */
        idxsAdjacent(idx1, idx2) {
            for (const dir of this.constructor.directions) {
                if (this.idxFromDir(idx1, dir) === idx2) return true;
            }
            return false;
        }

        /**
         * Determines if the given two ij points are adjacent to each other.
         * @param {int} ij1 - indexed ij
         * @param {int} ij2 - indexed ij
         * @returns  {boolean}
         */
        _ijAdjacent(i1, j1, i2, j2) {
            return this.constructor._ijAdjacent(i1, j1, i2, j2)
        }
        ijAdjacent(ij1, ij2) {
            if (!ij1 || !ij2) return false;
            return this.constructor.ijAdjacent(ij1, ij2)
        }

        // -- accessor methods
        /**
         * retrieve array value for the given column, row (i,j) indices
         * @param {ArrayIndex} ij - array index
         * @returns {*}
         */
        _getij(i, j) {
            let idx = this._idxFromIJ(i, j);
            return this.entries[idx];
        }
        getij(ij) {
            if (!ij) return null;
            let idx = this._idxFromIJ(ij.x, ij.y);
            return this.entries[idx];
        }

        /**
         * retrieve array value for the given flat index (idx)
         * @param {int} idx - flat index
         * @returns {*}
         */
        getidx(idx) {
            return this.entries[idx];
        }

        /**
         * set array value for the given column, row (i,j) indices
         * @param {ArrayIndex} ij - array index
         * @param {*} v - value to set
         */
        _setij(i, j, v) {
            let idx = this._idxFromIJ(i, j);
            if (idx !== -1) this.entries[idx] = v;
        }
        setij(ij, v) {
            if (!ij) return;
            let idx = this._idxFromIJ(ij.x, ij.y);
            if (idx !== -1) this.entries[idx] = v;
        }

        /**
         * set array value for the given flat index (idx)
         * @param {int} idx - flat index
         * @param {*} v - value to set
         */
        setidx(idx, v) {
            this.entries[idx] = v;
        }

        _delij(i, j, v) {
            const idx = this._idxFromIJ(i, j);
            delete this.entries[idx];
        }
        delij(ij, v) {
            if (!ij) return;
            this._delij(ij.x, ij.y, v);
        }

        delidx(idx, v) {
            delete this.entries[idx];
        }

        /**
         * clear all contents of the array
         */
        clear() {
            this.entries.splice(0);
        }

        // -- iterators
        /**
         * iterator that returns all array contents
         * @generator
         * @yields {*}
         */
        *[Symbol.iterator]() {
            for (let i=0; i<this.length; i++) {
                yield this.entries[i];
            }
        }

        /**
         * An array element filter is used to determine if a given array element matches and is used for array predicate functions.
         * @callback GridArray~filter
         * @param {*} v - value to be evaluated
         * @returns {boolean} - indicates if given value matches
         */

        /**
         * generator that returns all array elements that match the given filter
         * @param {GridArray~filter} filter 
         */
        *find(filter=(v) => true) {
            for (let i=0; i<this.length; i++) {
                let v = this.entries[i];
                if (filter(v)) yield [i, v];
            }
        }

        *neighborIdxs(idx) {
            for (const dir of this.constructor.directions) {
                let oidx = this.idxFromDir(idx, dir);
                if (oidx !== -1) yield oidx;
            }
        }

        *keys() {
            for (let i=0; i<this.length; i++) {
                if (this.entries[i]) yield i;
            }
        }

    }

    /**
     * Implements object buckets for each grid array entry.
     * @extends GridArray
     */
    class GridBucketArray extends GridArray {
        static {
            this.$schema('sortBy', { readonly: true });
        }

        *_getij(i, j) {
            let idx = this._idxFromIJ(i, j);
            if (this.entries[idx]) {
                yield *Array.from(this.entries[idx]);
            }
        }
        *getij(ij) {
            if (!ij) return;
            yield this._getij(ij.x, ij.y);
        }

        *getidx(idx) {
            if (this.entries[idx]) {
                yield *Array.from(this.entries[idx]);
            }
        }

        _setij(i, j, v) {
            const idx = this._idxFromIJ(i, j);
            if (!this.entries[idx]) this.entries[idx] = [];
            const entries = this.entries[idx];
            entries.push(v);
            if (this.sortBy) entries.sort(this.sortBy);
        }
        setij(ij, v) {
            if (!ij) return;
            this._setij(ij.x, ij.y, v);
        }

        setidx(idx, v) {
            if (!this.entries[idx]) this.entries[idx] = [];
            const entries = this.entries[idx];
            entries.push(v);
            if (this.sortBy) entries.sort(this.sortBy);
        }

        _delij(i, j, v) {
            const idx = this._idxFromIJ(i, j);
            entries = this.entries[idx];
            if (entries) {
                let i = entries.indexOf(v);
                if (i !== -1) entries.splice(i, 1);
                if (!entries.length) {
                    delete entries[idx];
                }
            }
        }
        delij(ij, v) {
            if (!ij) return;
            this._delij(ij.x, ij.y, v);
        }

        delidx(idx, v) {
            const entries = this.entries[idx];
            if (entries) {
                let i = entries.indexOf(v);
                if (i !== -1) entries.splice(i, 1);
                if (!entries.length) {
                    delete entries[idx];
                }
            }
        }

        *[Symbol.iterator]() {
            let found = new Set();
            for (let i=0; i<this.length; i++) {
                if (this.entries[i]) {
                    let entries = Array.from(this.entries[i]);
                    for (const gzo of entries) {
                        if (found.has(gzo.gid)) continue;
                        found.add(gzo.gid);
                        yield gzo;
                    }
                }
            }
        }

        *find(filter=(v) => true) {
            let found = new Set();
            for (let i=0; i<this.length; i++) {
                if (this.entries[i]) {
                    let entries = Array.from(this.entries[i]);
                    for (const gzo of entries) {
                        if (found.has(gzo.gid)) continue;
                        if (filter(gzo)) {
                            found.add(gzo.gid);
                            yield gzo;
                        }
                    }
                }
            }
        }

        first(filter=(v) => true) {
            for (let i=0; i<this.length; i++) {
                if (this.entries[i]) {
                    for (const gzo of this.entries[i]) {
                        if (filter(gzo)) return gzo;
                    }
                }
            }
            return null;
        }

        *findForIdx(gidxs, filter=(v) => true) {
            if (!Util.iterable(gidxs)) gidxs = [gidxs];
            const found = new Set();
            for (const idx of gidxs) {
                const entries = this.entries[idx] || [];
                for (const gzo of Array.from(entries)) {
                    if (found.has(gzo)) continue;
                    if (filter(gzo)) {
                        found.add(gzo);
                        yield gzo;
                    }
                }
            }
        }

        firstForIdx(gidxs, filter=(v) => true) {
            if (!Util.iterable(gidxs)) gidxs = [gidxs];
            for (const idx of gidxs) {
                let entries = this.entries[idx] || [];
                for (const gzo of entries) {
                    if (filter(gzo)) return gzo;
                }
            }
            return null;
        }

        *findForNeighbors(idx, filter=(v) => true, dirs=Direction.any) {
            for (const dir of this.constructor.directions) {
                if (!(dir & dirs)) continue;
                let oidx = this.idxFromDir(idx, dir);
                yield *this.findForIdx(oidx, filter);
            }
        }

        firstForNeighbors(idx, filter=(v) => true, dirs=Direction.any) {
            for (const dir of this.constructor.directions) {
                if (!(dir & dirs)) continue;
                let oidx = this.idxFromDir(idx, dir);
                let match = this.firstForIdx(oidx, filter);
                if (match) return match;
            }
            return null;
        }

    }

    class Hex extends Gadget {

        // SCHEMA --------------------------------------------------------------
        static {
            this.$schema('p', { dflt: () => { return {x:0,y:0}; }});
            this.$schema('size', { dflt: 32 });
        }

        static iHex(obj) {
            return obj && ('p' in obj) && ('size' in obj);
        }

        static _top(px, py, size) {
            const half = size*.5;
            const qtr = size*.25;
            return {
                p1: {x:px-half, y:py-qtr}, 
                p2: {x:px, y:py-half}, 
                p3: {x:px+half, y:py-qtr},
            };
        }
        static top(h) {
            if (!h) return null;
            return this._top(h.p.x, h.p.y, h.size);
        }

        static _mid(px, py, size) {
            const half = size*.5;
            const qtr = size*.25;
            return {
                minx: px-half, 
                miny: py-qtr, 
                maxx: px+half, 
                maxy: py+qtr
            };
        }

        static mid(h) {
            if (!h) return null;
            return this._mid(h.p.x, h.p.y, h.size);
        }

        static _bottom(px, py, size) {
            const half = size*.5;
            const qtr = size*.25;
            return {
                p1: {x:px+half, y:py+qtr}, 
                p2: {x:px, y:py+half}, 
                p3: {x:px-half, y:py+qtr},
            };
        }

        static bottom(h) {
            if (!h) return null;
            return this._bottom(h.p.x, h.p.y, h.size);
        }

        static _bounds(px, py, size) {
            const half = size*.5;
            return {
                minx: px-half, 
                miny: py-half, 
                maxx: px+half, 
                maxy: py+half, 
            };
        }
        static bounds(h) {
            if (!h) return null;
            return this._bounds(h.p.x, h.p.y, h.size);
        }

        get top() {
            return this.constructor.top(this);
        }

        get mid() {
            return this.constructor.mid(this);
        }

        get bottom() {
            return this.constructor.bottom(this);
        }

        get bounds() {
            return this.constructor.bounds(this);
        }

        toString() {
            return Fmt$1.toString(this.constructor.name, 
                (this.p) ? `${this.p.x},${this.p.y}` : this.p, 
                this.size);
        }
    }

    class Segment extends Gadget {

        // SCHEMA --------------------------------------------------------------
        static {
            this.$schema('p1', { dflt: () => { return { x:0, y:0 }; }});
            this.$schema('p2', { dflt: () => { return { x:0, y:0 }; }});
        }

        static _slope(p1x, p1y, p2x, p2y) {
            return (p2y - p1y)/(p2x-p1x);
        }
        static slope(s) {
            if (!s) return undefined;
            return this._slope(s.p1.x, s.p1.y, s.p2.x, s.p2.y);
        }

        static _intercept(p1x, p1y, p2x, p2y) {
            const m = this._slope(p1x, p1y, p2x, p2y);
            return (p1y-m*p1x);
        }
        static intercept(s) {
            if (!s) return undefined;
            return this._intercept(s.p1.x, s.p1.y, s.p2.x, s.p2.y);
        }

        static _min(p1x, p1y, p2x, p2y) {
            return {
                x: (p1x < p2x) ? p1x : p2x,
                y: (p1y < p2y) ? p1y : p2y,
            }
        }
        static min(s) {
            if (!s) return null;
            return this._min(s.p1.x, s.p1.y, s.p2.x, s.p2.y);
        }

        static _max(p1x, p1y, p2x, p2y) {
            return {
                x: (p1x > p2x) ? p1x : p2x,
                y: (p1y > p2y) ? p1y : p2y,
            }
        }
        static max(s) {
            if (!s) return null;
            return this._max(s.p1.x, s.p1.y, s.p2.x, s.p2.y);
        }

        static _bounds(p1x, p1y, p2x, p2y) {
            return {
                minx: Math.min(p1x, p2x),
                miny: Math.min(p1y, p2y),
                maxx: Math.max(p1x, p2x),
                maxy: Math.max(p1y, p2y),
            };
        }
        static bounds(s) {
            if (!s) return null;
            return this._bounds(t.p1.x, t.p1.y, t.p2.x, t.p2.y);
        }

        static iSegment(obj) {
            return obj && ('p1' in obj) && ('p2' in obj);
        }

        get min() {
            return this.constructor.min(this);
        }
        get max() {
            return this.constructor.max(this);
        }
        get slope() {
            return this.constructor.slope(this);
        }
        get intercept() {
            return this.constructor.intercept(this);
        }
        get bounds() {
            return this.constructor.bounds(this);
        }

        toString() {
            return Fmt$1.toString(this.constructor.name, 
                (this.p1) ? `${this.p1.x},${this.p1.y}` : this.p1, 
                (this.p2) ? `${this.p2.x},${this.p2.y}` : this.p2);
        }

    }

    class Tri extends Gadget {

        // SCHEMA --------------------------------------------------------------
        static {
            this.$schema('p1', { dflt: () => { return {x:0, y:0}; }});
            this.$schema('p2', { dflt: () => { return {x:0, y:0}; }});
            this.$schema('p3', { dflt: () => { return {x:0, y:0}; }});
        }

        static iTri(obj) {
            return obj && ('p1' in obj) && ('p2' in obj) && ('p3' in obj);
        }

        static _edge1(p1x, p1y, p2x, p2y, p3x, p3y) {
            return { 
                p1: {x:p1x, y:p1y},
                p2: {x:p2x, y:p2y},
            };
        }
        static edge1(t) {
            if (!t) return null;
            return this._edge1(t.p1.x, t.p1.y, t.p2.x, t.p2.y, t.p3.x, t.p3.y);
        }

        static _edge2(p1x, p1y, p2x, p2y, p3x, p3y) {
            return { 
                p1: {x:p2x, y:p2y},
                p2: {x:p3x, y:p3y},
            };
        }
        static edge2(t) {
            if (!t) return null;
            return this._edge2(t.p1.x, t.p1.y, t.p2.x, t.p2.y, t.p3.x, t.p3.y);
        }

        static _edge3(p1x, p1y, p2x, p2y, p3x, p3y) {
            return { 
                p1: {x:p3x, y:p3y},
                p2: {x:p1x, y:p1y},
            };
        }
        static edge3(t) {
            if (!t) return null;
            return this._edge3(t.p1.x, t.p1.y, t.p2.x, t.p2.y, t.p3.x, t.p3.y);
        }

        static _min(p1x, p1y, p2x, p2y, p3x, p3y) {
            return {
                x: Math.min(p1x, p2x, p3x),
                y: Math.min(p1y, p2y, p3y),
            }
        }
        static min(t) {
            if (!t) return null;
            return this._min(t.p1.x, t.p1.y, t.p2.x, t.p2.y, t.p3.x, t.p3.y);
        }

        static _max(p1x, p1y, p2x, p2y, p3x, p3y) {
            return {
                x: Math.max(p1x, p2x, p3x),
                y: Math.max(p1y, p2y, p3y),
            }
        }
        static max(t) {
            if (!t) return null;
            return this._max(t.p1.x, t.p1.y, t.p2.x, t.p2.y, t.p3.x, t.p3.y);
        }

        static _bounds(p1x, p1y, p2x, p2y, p3x, p3y) {
            return {
                minx: Math.min(p1x, p2x, p3x),
                miny: Math.min(p1y, p2y, p3y),
                maxx: Math.max(p1x, p2x, p3x),
                maxy: Math.max(p1y, p2y, p3y),
            };
        }
        static bounds(t) {
            if (!t) return null;
            return this._bounds(t.p1.x, t.p1.y, t.p2.x, t.p2.y, t.p3.x, t.p3.y);
        }

        get edge1() {
            return this.constructor.edge1(this);
        }
        get edge2() {
            return this.constructor.edge2(this);
        }
        get edge3() {
            return this.constructor.edge3(this);
        }
        get bounds() {
            return this.constructor.bounds(this);
        }
        get min() {
            return this.constructor.min(this);
        }
        get max() {
            return this.constructor.max(this);
        }

        toString() {
            return Fmt$1.toString(this.constructor.name, 
                (this.p1) ? `${this.p1.x},${this.p1.y}` : this.p1, 
                (this.p2) ? `${this.p2.x},${this.p2.y}` : this.p2, 
                (this.p3) ? `${this.p3.x},${this.p3.y}` : this.p3);
        }

    }

    class Contains {

        static _segment(sp1x, sp1y, sp2x, sp2y, px, py, inclusive=true) {
            const cp = (py - sp1y) * (sp2x - sp1x) - (px - sp1x) * (sp2y - sp1y);
            if (!Mathf.approx(cp, 0)) return false;
            const sminx = (sp1x < sp2x) ? sp1x : sp2x;
            const smaxx = (sp1x > sp2x) ? sp1x : sp2x;
            const sminy = (sp1y < sp2y) ? sp1y : sp2y;
            const smaxy = (sp1y > sp2y) ? sp1y : sp2y;
            if (inclusive) {
                return (sminx <= px && px <= smaxx && sminy <= py && py <= smaxy);
            } else {
                return (sminx < px && px < smaxx && sminy < py && py < smaxy);
            }
        }
        static segment(s, p, inclusive=true) {
            if (!Segment.iSegment(s) || !Vect$1.iVect(p)) return false;
            return this._segment(s.p1.x, s.p1.y, s.p2.x, s.p2.y, p.x, p.y, inclusive);
        }

        static _tri(tp1x, tp1y, tp2x, tp2y, tp3x, tp3y, px, py, inclusive=true) {
            const dX = px - tp3x;
            const dY = py - tp3y;
            const dX21 = tp3x - tp2x;
            const dY12 = tp2y - tp3y;
            const D = dY12 * (tp1x - tp3x) + dX21 * (tp1y - tp3y);
            const s = dY12 * dX + dX21 * dY;
            const t = (tp3y - tp1y) * dX + (tp1x - tp3x) * dY;
            if (inclusive) {
                if (D < 0) return s <= 0 && t <= 0 && s + t >= D;
                return s >= 0 && t >= 0 && s + t <= D;
            } else {
                if (D < 0) return s < 0 && t < 0 && s + t > D;
                return s > 0 && t > 0 && s + t < D;
            }
        }
        static tri(t, p, inclusive=true) {
            if (!Tri.iTri(t) || !Vect$1.iVect(p)) return false;
            return this._tri(t.p1.x, t.p1.y, t.p2.x, t.p2.y, t.p3.x, t.p3.y, p.x, p.y, inclusive);
        }

        static _bounds(bminx, bminy, bmaxx, bmaxy, px, py, inclusive=true) {
            if (inclusive) {
                return px >= bminx && px <= bmaxx &&
                    py >= bminy && py <= bmaxy;
            } else {
                return px > bminx && px < bmaxx &&
                    py > bminy && py < bmaxy;
            }
        }
        static bounds(b, p, inclusive=true) {
            if (!Bounds$1.iBounds(b) || !Vect$1.iVect(p)) return false;
            return this._bounds(
                b.minx, b.miny, b.maxx, b.maxy, 
                p.x, p.y, inclusive);
        }


        static _hex(hpx, hpy, hsize, px, py, inclusive=true) {
            const mid = Hex._mid(hpx, hpy, hsize);
            if (this._bounds(
                mid.minx, mid.miny, mid.maxx, mid.maxy, 
                px, py, inclusive)) return true;
            const top = Hex._top(hpx, hpy, hsize);
            if (this._tri(
                top.p1.x, top.p1.y, top.p2.x, top.p2.y, top.p3.x, top.p3.y, 
                px, py, inclusive)) return true;
            const bottom = Hex._bottom(hpx, hpy, hsize);
            if (this._tri(
                bottom.p1.x, bottom.p1.y, bottom.p2.x, bottom.p2.y, bottom.p3.x, bottom.p3.y, 
                px, py, inclusive)) return true;
            return false;
        }
        static hex(h, p, inclusive=true) {
            if (!Hex.iHex(h) || !Vect$1.iVect(p)) return false;
            return this._hex(
                h.p.x, h.p.y, h.size, 
                p.x, p.y, inclusive);
        }

    }

    class Overlaps {

        static _segments(s1p1x, s1p1y, s1p2x, s1p2y, s2p1x, s2p1y, s2p2x, s2p2y, inclusive=true) {
            // colinear test
            const m1 = Segment._slope(s1p1x, s1p1y, s1p2x, s1p2y);
            const m2 = Segment._slope(s2p1x, s2p1y, s2p2x, s2p2y);
            const b1 = Segment._intercept(s1p1x, s1p1y, s1p2x, s1p2y);
            const b2 = Segment._intercept(s2p1x, s2p1y, s2p2x, s2p2y);
            if (inclusive && Mathf.approx(m1, m2) && Mathf.approx(b1, b2)) {
                if (s1p1x >= s2p1x && s1p1x <= s2p2x && s1p1y >= s2p1y && s1p1y <= s2p2y) return true;
                if (s1p2x >= s2p1x && s1p2x <= s2p2x && s1p2y >= s2p1y && s1p2y <= s2p2y) return true;
                if (s2p1x >= s1p1x && s2p1x <= s1p2x && s2p1y >= s1p1y && s2p1y <= s1p2y) return true;
                if (s2p2x >= s1p1x && s2p2x <= s1p2x && s2p2y >= s1p1y && s2p2y <= s1p2y) return true;
            }
            const bx = s1p2x-s1p1x;
            const by = s1p2y-s1p1y;
            const dx = s2p2x-s2p1x;
            const dy = s2p2y-s2p1y;
            const bDotDPerp = bx * dy - by * dx;
            if (bDotDPerp == 0) return false;
            const cx = s2p1x-s1p1x;
            const cy = s2p1y-s1p1y;
            const t = (cx * dy - cy * dx) / bDotDPerp;
            if (inclusive) {
                if (t < 0 || t > 1) return false;
            } else {
                if (t <= 0 || t >= 1) return false;
            }
            const u = (cx * by - cy * bx) / bDotDPerp;
            if (inclusive) {
                if (u < 0 || u > 1) return false;
            } else {
                if (u <= 0 || u >= 1) return false;
            }
            //let intersection = Vect.add(s1.p1, Vect.smult(b, t));
            // intersection = Vector2.Sum(a1, Vector2.Multiply(b, t));
            return true;
        }
        static segments(s1, s2, inclusive=true) {
            if (!Segment.iSegment(s1) || !Segment.iSegment(s2)) return false;
            return this._segments(
                s1.p1.x, s1.p1.y, s1.p2.x, s1.p2.y, 
                s2.p1.x, s2.p1.y, s2.p2.x, s2.p2.y, inclusive);
        }

        static _tris( t1p1x, t1p1y, t1p2x, t1p2y, t1p3x, t1p3y, t2p1x, t2p1y, t2p2x, t2p2y, t2p3x, t2p3y, inclusive=true) {
            // check bounding box of tri vs given bounds
            const t1min = Tri._min(t1p1x, t1p1y, t1p2x, t1p2y, t1p3x, t1p3y);
            const t1max = Tri._max(t1p1x, t1p1y, t1p2x, t1p2y, t1p3x, t1p3y);
            const t2min = Tri._min(t2p1x, t2p1y, t2p2x, t2p2y, t2p3x, t2p3y);
            const t2max = Tri._max(t2p1x, t2p1y, t2p2x, t2p2y, t2p3x, t2p3y);
            if (!this._bounds(
                t1min.x, t1min.y, t1max.x, t1max.y, 
                t2min.x, t2min.y, t2max.x, t2max.y, inclusive)) return false;
            // check intersection of triangle edges
            if (this.segments( 
                Tri._edge1(t1p1x, t1p1y, t1p2x, t1p2y, t1p3x, t1p3y), 
                Tri._edge1(t2p1x, t2p1y, t2p2x, t2p2y, t2p3x, t2p3y), inclusive )) return true;
            if (this.segments( 
                Tri._edge1(t1p1x, t1p1y, t1p2x, t1p2y, t1p3x, t1p3y), 
                Tri._edge2(t2p1x, t2p1y, t2p2x, t2p2y, t2p3x, t2p3y), inclusive )) return true;
            if (this.segments( 
                Tri._edge1(t1p1x, t1p1y, t1p2x, t1p2y, t1p3x, t1p3y), 
                Tri._edge3(t2p1x, t2p1y, t2p2x, t2p2y, t2p3x, t2p3y), inclusive )) return true;
            if (this.segments( 
                Tri._edge2(t1p1x, t1p1y, t1p2x, t1p2y, t1p3x, t1p3y), 
                Tri._edge1(t2p1x, t2p1y, t2p2x, t2p2y, t2p3x, t2p3y), inclusive )) return true;
            if (this.segments( 
                Tri._edge2(t1p1x, t1p1y, t1p2x, t1p2y, t1p3x, t1p3y), 
                Tri._edge2(t2p1x, t2p1y, t2p2x, t2p2y, t2p3x, t2p3y), inclusive )) return true;
            if (this.segments( 
                Tri._edge2(t1p1x, t1p1y, t1p2x, t1p2y, t1p3x, t1p3y), 
                Tri._edge3(t2p1x, t2p1y, t2p2x, t2p2y, t2p3x, t2p3y), inclusive )) return true;
            if (this.segments( 
                Tri._edge3(t1p1x, t1p1y, t1p2x, t1p2y, t1p3x, t1p3y), 
                Tri._edge1(t2p1x, t2p1y, t2p2x, t2p2y, t2p3x, t2p3y), inclusive )) return true;
            if (this.segments( 
                Tri._edge3(t1p1x, t1p1y, t1p2x, t1p2y, t1p3x, t1p3y), 
                Tri._edge2(t2p1x, t2p1y, t2p2x, t2p2y, t2p3x, t2p3y), inclusive )) return true;
            if (this.segments( 
                Tri._edge3(t1p1x, t1p1y, t1p2x, t1p2y, t1p3x, t1p3y), 
                Tri._edge3(t2p1x, t2p1y, t2p2x, t2p2y, t2p3x, t2p3y), inclusive )) return true;
            // check if entirely within each other
            if (Contains._tri(
                t1p1x, t1p1y, t1p2x, t1p2y, t1p3x, t1p3y, 
                t2p1x, t2p1y, inclusive)) return true;
            if (Contains._tri(
                t2p1x, t2p1y, t2p2x, t2p2y, t2p3x, t2p3y, 
                t1p1x, t1p1y, inclusive)) return true;
            return false;
        }
        static tris(t1, t2, inclusive=true) {
            if (!Tri.iTri(t1) || !Tri.iTri(t2)) return false;
            return this._tris(
                t1.p1.x, t1.p1.y, t1.p2.x, t1.p2.y, t1.p3.x, t1.p3.y, 
                t2.p1.x, t2.p1.y, t2.p2.x, t2.p2.y, t2.p3.x, t2.p3.y, inclusive);
        }

        static _bounds(b1minx, b1miny, b1maxx, b1maxy, b2minx, b2miny, b2maxx, b2maxy, inclusive) {
            let minx = Math.max(b1minx, b2minx);
            let maxx = Math.min(b1maxx, b2maxx);
            let miny = Math.max(b1miny, b2miny);
            let maxy = Math.min(b1maxy, b2maxy);
            if (inclusive) {
                return maxx >= minx && maxy >= miny;
            } else {
                return maxx > minx && maxy > miny;
            }
        }
        static bounds(b1, b2, inclusive) {
            if (!Bounds$1.iBounds(b1) || !Bounds$1.iBounds(b2)) return false;
            return this._bounds(
                b1.minx, b1.miny, b1.maxx, b1.maxy, 
                b2.minx, b2.miny, b2.maxx, b2.maxy, inclusive);
        }

        static _triBounds( tp1x, tp1y, tp2x, tp2y, tp3x, tp3y, bminx, bminy, bmaxx, bmaxy, inclusive=true) {
            // check bounding box of tri vs given bounds
            let tb = Tri._bounds(tp1x, tp1y, tp2x, tp2y, tp3x, tp3y);
            if (!this._bounds(
                bminx, bminy, bmaxx, bmaxy, 
                tb.minx, tb.miny, tb.maxx, tb.maxy, inclusive)) return false;
            // check if any point of the tri is within the bounds...
            if (Contains._bounds(
                bminx, bminy, bmaxx, bmaxy, 
                tp1x, tp1y, inclusive)) return true;
            if (Contains._bounds(
                bminx, bminy, bmaxx, bmaxy, 
                tp2x, tp2y, inclusive)) return true;
            if (Contains._bounds(
                bminx, bminy, bmaxx, bmaxy, 
                tp3x, tp3y, inclusive)) return true;
            // check edge intersections
            if (this.segments( 
                Tri._edge1(tp1x, tp1y, tp2x, tp2y, tp3x, tp3y), 
                Bounds$1._edge1(bminx, bminy, bmaxx, bmaxy), inclusive )) return true;
            if (this.segments( 
                Tri._edge1(tp1x, tp1y, tp2x, tp2y, tp3x, tp3y), 
                Bounds$1._edge2(bminx, bminy, bmaxx, bmaxy), inclusive )) return true;
            if (this.segments( 
                Tri._edge1(tp1x, tp1y, tp2x, tp2y, tp3x, tp3y), 
                Bounds$1._edge3(bminx, bminy, bmaxx, bmaxy), inclusive )) return true;
            if (this.segments( 
                Tri._edge1(tp1x, tp1y, tp2x, tp2y, tp3x, tp3y), 
                Bounds$1._edge4(bminx, bminy, bmaxx, bmaxy), inclusive )) return true;
            if (this.segments( 
                Tri._edge2(tp1x, tp1y, tp2x, tp2y, tp3x, tp3y), 
                Bounds$1._edge1(bminx, bminy, bmaxx, bmaxy), inclusive )) return true;
            if (this.segments( 
                Tri._edge2(tp1x, tp1y, tp2x, tp2y, tp3x, tp3y), 
                Bounds$1._edge2(bminx, bminy, bmaxx, bmaxy), inclusive )) return true;
            if (this.segments( 
                Tri._edge2(tp1x, tp1y, tp2x, tp2y, tp3x, tp3y), 
                Bounds$1._edge3(bminx, bminy, bmaxx, bmaxy), inclusive )) return true;
            if (this.segments( 
                Tri._edge2(tp1x, tp1y, tp2x, tp2y, tp3x, tp3y), 
                Bounds$1._edge4(bminx, bminy, bmaxx, bmaxy), inclusive )) return true;
            if (this.segments( 
                Tri._edge3(tp1x, tp1y, tp2x, tp2y, tp3x, tp3y), 
                Bounds$1._edge1(bminx, bminy, bmaxx, bmaxy), inclusive )) return true;
            if (this.segments( 
                Tri._edge3(tp1x, tp1y, tp2x, tp2y, tp3x, tp3y), 
                Bounds$1._edge2(bminx, bminy, bmaxx, bmaxy), inclusive )) return true;
            if (this.segments( 
                Tri._edge3(tp1x, tp1y, tp2x, tp2y, tp3x, tp3y), 
                Bounds$1._edge3(bminx, bminy, bmaxx, bmaxy), inclusive )) return true;
            if (this.segments( 
                Tri._edge3(tp1x, tp1y, tp2x, tp2y, tp3x, tp3y), 
                Bounds$1._edge4(bminx, bminy, bmaxx, bmaxy), inclusive )) return true;
            // finally check if bounds is entirely within triangle
            if (Contains._tri(
                tp1x, tp1y, tp2x, tp2y, tp3x, tp3y, 
                bminx, bminy, inclusive)) return true;
            return false;
        }
        static triBounds(t, b, inclusive=true) {
            if (!Tri.iTri(t) || !Bounds$1.iBounds(b)) return false;
            return this._triBounds(
                t.p1.x, t.p1.y, t.p2.x, t.p2.y, t.p3.x, t.p3.y, 
                b.minx, b.miny, b.maxx, b.maxy, inclusive);
        }

        static _hexs(h1px, h1py, h1size, h2px, h2py, h2size, inclusive=true) {
            const m1 = Hex._mid(h1px, h1py, h1size);
            const m2 = Hex._mid(h2px, h2py, h2size);
            if (this.bounds(m1, m2, inclusive)) return true;
            const t1 = Hex._top(h1px, h1py, h1size);
            const b1 = Hex._bottom(h1px, h1py, h1size);
            if (this.triBounds(t1, m2, inclusive)) return true;
            if (this.triBounds(b1, m2, inclusive)) return true;
            const t2 = Hex._top(h2px, h2py, h2size);
            const b2 = Hex._bottom(h2px, h2py, h2size);
            if (this.triBounds(t2, m1, inclusive)) return true;
            if (this.triBounds(b2, m1, inclusive)) return true;
            if (this.tris(t1, b2, inclusive)) return true;
            if (this.tris(t2, b1, inclusive)) return true;
            return false;
        }
        static hexs(h1, h2, inclusive=true) {
            if (!Hex.iHex(h1) || !Hex.iHex(h2)) return false;
            return this._hexs(
                h1.p.x, h1.p.y, h1.size, 
                h2.p.x, h2.p.y, h2.size, inclusive);
        }

        static _hexBounds(hpx, hpy, hsize, bminx, bminy, bmaxx, bmaxy, inclusive=true) {
            const hb = Hex._bounds(hpx, hpy, hsize);
            // check bounding box of hex vs given bounds
            if (!this._bounds(
                bminx, bminy, bmaxx, bmaxy, 
                hb.minx, hb.miny, hb.maxx, hb.maxy, inclusive)) return false;
            // check hex mid vs. bounds
            let hm = Hex._mid(hpx, hpy, hsize);
            if (this._bounds(
                bminx, bminy, bmaxx, bmaxy, 
                hm.minx, hm.miny, hm.maxx, hm.maxy, inclusive)) return true;
            // check hex top/bottom vs. bounds
            let top = Hex._top(hpx, hpy, hsize);
            if (this._triBounds(
                top.p1.x, top.p1.y, top.p2.x, top.p2.y, top.p3.x, top.p3.y, 
                bminx, bminy, bmaxx, bmaxy, inclusive)) return true;
            let btm = Hex._bottom(hpx, hpy, hsize);
            if (this._triBounds(
                btm.p1.x, btm.p1.y, btm.p2.x, btm.p2.y, btm.p3.x, btm.p3.y, 
                bminx, bminy, bmaxx, bmaxy, inclusive)) return true;
            return false;
        }
        static hexBounds(h, b, inclusive=true) {
            if (!Hex.iHex(h) || !Bounds$1.iBounds(b)) return false;
            return this._hexBounds(
                h.p.x, h.p.y, h.size, 
                b.minx, b.miny, b.maxx, b.maxy);
        }

        static _hexTri(hpx, hpy, hsize, tp1x, tp1y, tp2x, tp2y, tp3x, tp3y, inclusive=true) {
            // check bounding box of hex vs tri
            let hb = Hex._bounds(hpx, hpy, hsize);
            let tb = Tri._bounds(tp1x, tp1y, tp2x, tp2y, tp3x, tp3y);
            if (!this.bounds(tb, hb, inclusive)) return false;
            // check hex mid vs. tri
            let hm = Hex._mid(hpx, hpy, hsize);
            if (this._triBounds(tp1x, tp1y, tp2x, tp2y, tp3x, tp3y, hm.minx, hm.miny, hm.maxx, hm.maxy, inclusive)) return true;
            // check hex top/bottom vs. tri
            let top = Hex._top(hpx, hpy, hsize);
            if (this._tris(
                tp1x, tp1y, tp2x, tp2y, tp3x, tp3y,
                top.p1.x, top.p1.x, top.p2.x, top.p2.y, top.p3.x, top.p3.y,
                inclusive)) return true;
            let btm = Hex._bottom(hpx, hpy, hsize);
            if (this._tris(
                tp1x, tp1y, tp2x, tp2y, tp3x, tp3y,
                btm.p1.x, btm.p1.x, btm.p2.x, btm.p2.y, btm.p3.x, btm.p3.y,
                inclusive)) return true;
            return false;
        }
        static hexTri(h, t, inclusive=true) {
            if (!Hex.iHex(h) || !Tri.iTri(t)) return false;
            return this._hexTri(
                h.p.x, h.p.y, h.size,
                t.p1.x, t.p1.y, t.p2.x, t.p2.y, t.p3.x, t.p3.y,
                inclusive,
            );
        }

    }

    // FIXME
    class Intersect {

        static tris(tri1, tri2) {
        }

        static bounds(b1, b2) {
        }

        static triBounds(tri, bounds) {
        }
    }

    /** ========================================================================
     * A grid-based object (gizmo) storage bucket which allows for quick lookups of game elements based on location.
     */

    class Grid extends GridBucketArray {
        static dfltCols = 8;
        static dfltRows = 8;

        static {
            this.$schema('boundsFor', { readonly:true, dflt:() => ((v) => ((v && ('bounds' in v)) ? v.bounds : new Bounds$1(v))) }),
            this.$schema('dbg', { eventable:false, dflt:false });
            this.$schema('rowSize', { dflt:(o,x) => ('size' in x) ? x.size : 32 });
            this.$schema('colSize', { dflt:(o,x) => ('size' in x) ? x.size : 32 });
            this.$schema('$gzoIdxMap', { readonly:true, parser: () => new Map() });
            this.$schema('$oob', { readonly:true, parser: () => new Set() });
            this.$schema('minx', { dflt:0 });
            this.$schema('miny', { dflt:0 });
        }

        // STATIC METHODS ------------------------------------------------------
        static _ijFromPoint(px, py, dimx, dimy, sizex, sizey) {
            let i = Math.floor(px/sizex);
            if (i < 0 || i > dimx) i = -1;
            let j = Math.floor(py/sizey);
            if (j < 0 || j > dimy) j = -1;
            return {x:i, y:j};
        }
        static ijFromPoint(p, dim, size) {
            if (!p || !dim || !size) return { x:-1, y:-1 };
            return this._ijFromPoint(p.x, p.y, dim.x, dim.y, size.x, size.y);
        }

        static _pointFromIJ(i, j, dimx, dimy, sizex, sizey, center=false) {
            if (i<0 || i>=dimx || j<0 || j>=dimy) return {x:-1, y:-1}
            let x = (i * sizex) + ((center) ? sizex*.5 : 0);
            let y = (j * sizey) + ((center) ? sizey*.5 : 0);
            return {x:x, y:y};
        }
        static pointFromIJ(ij, dim, size, center=false) {
            if (!ij || !dim || !size) return { x:-1, y:-1 };
            return this._pointFromIJ(ij.x, ij.y, dim.x, dim.y, size.x, size.y, center);
        }

        static _pointFromIdx(idx, dimx, dimy, sizex, sizey, center=false) {
            if (idx<0 || idx>(dimx*dimy)) return { x:-1, y:-1 };
            let x = ((idx % dimx) * sizex) + ((center) ? sizex*.5 : 0);
            let y = (Math.floor(idx/dimx) * sizey) + ((center) ? sizey*.5 : 0);
            return {x:x, y:y};
        }
        static pointFromIdx(idx, dim, size, center=false) {
            if (!dim || !size) return { x:-1, y:-1 };
            return this._pointFromIdx(idx, dim.x, dim.y, size.x, size.y, center);
        }

        static _idxsFromBounds(bminx, bminy, bmaxx, bmaxy, dimx, dimy, sizex, sizey) {
            let minij = this._ijFromPoint(bminx, bminy, dimx, dimy, sizex, sizey);
            let maxij = this._ijFromPoint(Math.max(bminx, bmaxx-1), Math.max(bminy, bmaxy-1), dimx, dimy, sizex, sizey);
            let gidxs = [];
            for (let i=Math.max(0, minij.x); i<=Math.min(dimx-1, maxij.x); i++) {
                for (let j=Math.max(0, minij.y); j<=Math.min(dimy-1, maxij.y); j++) {
                    let idx = this._idxFromIJ(i, j, dimx, dimy);
                    gidxs.push(idx);
                }
            }
            return gidxs;
        }
        static idxsFromBounds(b, dim, size) {
            if (!b || !dim || !size) return [];
            return this._idxsFromBounds(b.minx, b.miny, b.maxx, b.maxy, dim.x, dim.y, size.x, size.y);
        }

        static _idxFromPoint(px, py, dimx, dimy, sizex, sizey) {
            let ij = this._ijFromPoint(px, py, dimx, dimy, sizex, sizey);
            return this._idxFromIJ(ij.x, ij.y, dimx, dimy);
        }
        static idxFromPoint(p, dim, size) {
            if (!p || !dim || !size) return -1;
            return this._idxFromPoint(p.x, p.y, dim.x, dim.y, size.x, size.y);
        }

        // METHODS -------------------------------------------------------------
        _ijFromPoint(px, py) {
            return this.constructor._ijFromPoint(px-this.minx, py-this.miny, this.cols, this.rows, this.colSize, this.rowSize);
        }
        ijFromPoint(p) {
            if (!p) return {x:-1,y:-1};
            return this.constructor._ijFromPoint(p.x-this.minx, p.y-this.miny, this.cols, this.rows, this.colSize, this.rowSize);
        }

        _idxFromPoint(px, py) {
            return this.constructor._idxFromPoint(px-this.minx, py-this.miny, this.cols, this.rows, this.colSize, this.rowSize);
        }
        idxFromPoint(p) {
            if (!p) return -1;
            return this.constructor._idxFromPoint(p.x-this.minx, p.y-this.miny, this.cols, this.rows, this.colSize, this.rowSize);
        }

        pointFromIdx(idx, center=false) {
            let p = this.constructor._pointFromIdx(idx, this.cols, this.rows, this.colSize, this.rowSize, center);
            p.x += this.minx;
            p.y += this.miny;
            return p;
        }

        _pointFromIJ(i, j, center=false) {
            let p = this.constructor._pointFromIJ(i, j, this.cols, this.rows, this.colSize, this.rowSize, center);
            p.x += this.minx;
            p.y += this.miny;
            return p;
        }
        pointFromIJ(ij, center=false) {
            if (!ij) return {x:-1, y:-1};
            let p = this.constructor._pointFromIJ(ij.x, ij.y, this.cols, this.rows, this.colSize, this.rowSize, center);
            p.x += this.minx;
            p.y += this.miny;
            return p;
        }

        idxof(gzo) {
            let gidx = this.$gzoIdxMap.get(gzo.gid) || [];
            return gidx.slice();
        }

        includes(gzo) {
            return this.$gzoIdxMap.has(gzo.gid);
        }

        idxsFromGzo(gzo) {
            let b = this.boundsFor(gzo);
            return this.constructor._idxsFromBounds(b.minx-this.minx, b.miny-this.miny, b.maxx-this.minx, b.maxy-this.miny, this.cols, this.rows, this.colSize, this.rowSize);
        }

        *_findForPoint(px, py, filter=(v) => true) {
            let gidx = this.constructor._idxFromPoint(px-this.minx, py-this.miny, this.cols, this.rows, this.colSize, this.rowSize);
            let found = new Set();
            for (const gzo of this.findForIdx(gidx, filter)) {
                let ob = this.boundsFor(gzo);
                if (!found.has(gzo) && Contains._bounds(ob.minx, ob.miny, ob.maxx, ob.maxy, px, py)) {
                    found.add(gzo);
                    yield gzo;
                }
            }
        }
        *findForPoint(p, filter=(v) => true) {
            if (!p) return;
            yield *this._findForPoint(p.x, p.y, filter);
        }

        _firstForPoint(px, py, filter=(v) => true) {
            let gidx = this.constructor._idxFromPoint(px-this.minx, py-this.miny, this.cols, this.rows, this.colSize, this.rowSize);
            for (const gzo of this.findForIdx(gidx, filter)) {
                let ob = this.boundsFor(gzo);
                if (Contains._bounds(ob.minx, ob.miny, ob.maxx, ob.maxy, px, py)) return gzo;
            }
            return null;
        }
        firstForPoint(p, filter=(v) => true) {
            if (!p) return null;
            return this._firstForPoint(p.x, p.y, filter);
        }

        *_findForBounds(bminx, bminy, bmaxx, bmaxy, filter=(v) => true) {
            let gidxs = this.constructor._idxsFromBounds(bminx-this.minx, bminy-this.miny, bmaxx-this.minx, bmaxy-this.miny, this.cols, this.rows, this.colSize, this.rowSize);
            let found = new Set();
            for (const gzo of this.findForIdx(gidxs, filter)) {
                let ob = this.boundsFor(gzo);
                if (!found.has(gzo) && Overlaps._bounds(ob.minx, ob.miny, ob.maxx, ob.maxy, bminx, bminy, bmaxx, bmaxy)) {
                    found.add(gzo);
                    yield gzo;
                }
            }
        }
        *findForBounds(bounds, filter=(v) => true) {
            if (!bounds) return;
            yield *this._findForBounds(bounds.minx, bounds.miny, bounds.maxx, bounds.maxy, filter);
        }

        _firstForBounds(bminx, bminy, bmaxx, bmaxy, filter=(v) => true) {
            let gidxs = this.constructor._idxsFromBounds(bminx-this.minx, bminy-this.miny, bmaxx-this.minx, bmaxy-this.miny, this.cols, this.rows, this.colSize, this.rowSize);
            for (const gzo of this.findForIdx(gidxs, filter)) {
                let ob = this.boundsFor(gzo);
                if (Overlaps._bounds(ob.minx, ob.miny, ob.maxx, ob.maxy, bminx, bminy, bmaxx, bmaxy)) return gzo;
            }
            return null;
        }
        firstForBounds(bounds, filter=(v) => true) {
            if (!bounds) return null;
            return this._firstForBounds(bounds.minx, bounds.miny, bounds.maxx, bounds.maxy, filter);
        }

        add(gzo) {
            let gidx = this.idxsFromGzo(gzo);
            if (!gidx.length) {
                this.$oob.add(gzo);
            } else {
                // assign object to grid
                for (const idx of gidx) this.setidx(idx, gzo);
            }
            // assign gizmo gidx
            this.$gzoIdxMap.set(gzo.gid, gidx);
            if (this.dbg) console.log(`grid add ${gzo} w/ idx: ${gidx}`);
        }

        remove(gzo) {
            if (!gzo) return;
            let gidx = this.$gzoIdxMap.get(gzo.gid) || [];
            this.$gzoIdxMap.delete(gzo.gid);
            this.$oob.delete(gzo);
            // remove object from grid
            for (const idx of gidx) this.delidx(idx, gzo);
        }

        recheck(gzo) {
            if (!gzo) return;
            let ogidx = this.$gzoIdxMap.get(gzo.gid) || [];
            let gidx = this.idxsFromGzo(gzo) || [];
            let modified = false;
            if (!Util.arraysEqual(ogidx, gidx)) {
                if (this.dbg) console.log(`----- Grid.recheck: ${gzo} old ${ogidx} new ${gidx}`);
                // remove old
                for (const idx of ogidx) this.delidx(idx, gzo);
                // add new
                for (const idx of gidx) this.setidx(idx, gzo);
                // assign new gidx
                this.$gzoIdxMap.set(gzo.gid, gidx);
                modified = true;
            } else {
                // resort
                for (const idx of gidx) {
                    if (this.sortBy) this.entries[idx].sort(this.sortBy);
                }
            }
            if (gidx.length && this.$oob.has(gzo)) {
                this.$oob.delete(gzo);
            }
            return modified;
        }

        resize(bounds, cols, rows) {
            let gzos = Array.from(this);
            // handle grid array resize
            if (this.cols != cols || this.rows != rows) super.resize(cols, rows);
            // handle spatial resize
            this.minx = bounds.minx;
            this.miny = bounds.miny;
            this.colSize = bounds.width/cols;
            this.rowSize = bounds.height/rows;
            // recheck position of all assigned objects
            for (const gzo of gzos) this.recheck(gzo);
            // recheck position of all out-of-bounds objects
            for (const gzo of Array.from(this.$oob)) {
                this.recheck(gzo);
            }
        }

        render(ctx, x=0, y=0, color='rgba(0,255,255,.5)', occupiedColor='red') {
            ctx.translate(x+this.minx,y+this.miny);
            for (let i=0; i<this.cols; i++) {
                for (let j=0; j<this.rows; j++) {
                    let idx = this._idxFromIJ(i, j);
                    let entries = this.entries[idx] || [];
                    ctx.strokeStyle = (entries.length) ? occupiedColor : color;
                    //ctx.setLineDash([5,5]);
                    ctx.lineWidth = 1;
                    ctx.strokeRect(i*this.colSize, j*this.rowSize, this.colSize, this.rowSize);
                    //ctx.setLineDash([]);
                }
            }
            ctx.translate(-x-this.minx,-y-this.miny);
        }

        toString() {
            return Fmt$1.toString(this.constructor.name, this.cols, this.rows);
        }

    }

    class HexArray extends GridArray {
        static directions = [ Direction.northWest, Direction.northEast, Direction.east, Direction.southEast, Direction.southWest, Direction.west ];

        static _idxFromDir(idx, dir, dimx, dimy) {
            let ij = this._ijFromIdx(idx, dimx, dimy);
            let oi=0, oj=0;
            switch (dir) {
                case Direction.northWest:
                    if (ij.y%2 === 0) oi = -1;
                    oj = -1;
                    break;
                case Direction.northEast:
                    if (ij.y%2) oi = 1;
                    oj = -1;
                    break;
                case Direction.west:
                    oi = -1;
                    break;
                case Direction.east:
                    oi = 1;
                    break;
                case Direction.southWest:
                    if (ij.y%2 === 0) oi = -1;
                    oj = 1;
                    break;
                case Direction.southEast:
                    if (ij.y%2) oi = 1;
                    oj = 1;
                    break;
                default:
                    return -1;
            }
            return this._idxFromIJ(ij.x+oi, ij.y+oj, dimx, dimy);
        }

        static _ijAdjacent(i1, j1, i2, j2) {
            if (i1 === i2 && j1 === j2) return false;
            let di = Math.abs(i1-i2);
            let dj = Math.abs(j1-j2);
            if (dj === 0 && di<=1) return true;
            if (dj <= 1) {
                if (j1%2) {
                    return ((i1===i2) || (i1===i2-1));
                } else {
                    return ((i1===i2+1) || (i1===i2));
                }
            }
            return false;
        }

    }

    class HexBucketArray extends GridBucketArray {
        static directions = [ Direction.northWest, Direction.northEast, Direction.east, Direction.southEast, Direction.southWest, Direction.west ];

        static _idxFromDir(idx, dir, dimx, dimy) {
            let ij = this._ijFromIdx(idx, dimx, dimy);
            let oi=0, oj=0;
            switch (dir) {
                case Direction.northWest:
                    if (ij.y%2 === 0) oi = -1;
                    oj = -1;
                    break;
                case Direction.northEast:
                    if (ij.y%2) oi = 1;
                    oj = -1;
                    break;
                case Direction.west:
                    oi = -1;
                    break;
                case Direction.east:
                    oi = 1;
                    break;
                case Direction.southWest:
                    if (ij.y%2 === 0) oi = -1;
                    oj = 1;
                    break;
                case Direction.southEast:
                    if (ij.y%2) oi = 1;
                    oj = 1;
                    break;
                default:
                    return -1;
            }
            return this._idxFromIJ(ij.x+oi, ij.y+oj, dimx, dimy);
        }

        static _ijAdjacent(i1, j1, i2, j2) {
            if (i1 === i2 && j1 === j2) return false;
            let di = Math.abs(i1-i2);
            let dj = Math.abs(j1-j2);
            if (dj === 0 && di<=1) return true;
            if (dj <= 1) {
                if (j1%2) {
                    return ((i1===i2) || (i1===i2-1));
                } else {
                    return ((i1===i2+1) || (i1===i2));
                }
            }
            return false;
        }

    }

    class HexGrid extends HexBucketArray {

        // SCHEMA --------------------------------------------------------------
        static {
            this.$schema('boundsFor', { readonly:true, dflt:() => ((v) = ((v && ('bounds' in v)) ? v.bounds : new Bounds(v))) }),
            this.$schema('dbg', { eventable:false, dflt:false });
            this.$schema('rowSize', { dflt:(o,x) => ('size' in x) ? x.size : 32 });
            this.$schema('colSize', { dflt:(o,x) => ('size' in x) ? x.size : 32 });
            this.$schema('$gzoIdxMap', { readonly:true, parser: () => new Map() });
            this.$schema('$oob', { readonly:true, parser: () => new Set() });
            this.$schema('minx', { dflt:0 });
            this.$schema('miny', { dflt:0 });
        }

        // STATIC METHODS ------------------------------------------------------
        static _ijFromPoint(px, py, dimx, dimy, sizex, sizey) {
            let qtry = sizey*.25;
            let halfx = sizex*.5;
            // if point is within mid section of hex, use i/j derived from column/row sizes
            let j = Math.floor(py/sizey);
            let offx = (j%2) ? halfx : 0;
            let i = Math.floor((px-offx)/sizex);
            let xm = (px-offx) % sizex;
            let ym = py % sizey;
            // if point lies within top section/bounds of hex... it could belong to one of three hex regions
            // check left half
            if (ym < qtry) {
                if (xm < halfx) {
                    // check if it belongs to hex to northwest
                    if ((halfx-xm) > 2*ym) {
                        if (!offx) i -= 1;
                        j -= 1;
                    }
                // check right half
                } else {
                    // check if it belongs to hex to northeast
                    if (xm-halfx > (2*ym)) {
                        if (offx) i += 1;
                        j -= 1;
                    }
                }
            }
            if (i < 0 || i>=dimx) i = -1;
            if (j < 0 || j>=dimy) j = -1;
            return {x:i, y:j};
        }
        static ijFromPoint(p, dim, size) {
            if (!p || !dim || !size) return {x:-1, y:-1};
            return this._ijFromPoint(p.x, p.y, dim.x, dim.y, size.x, size.y);
        }

        static _pointFromIJ(i, j, dimx, dimy, sizex, sizey, center=false) {
            let halfx = sizex*.5;
            let x = sizex*i + ((center) ? halfx : 0) + ((j%2) ? halfx : 0);
            let y = sizey*j + ((center) ? (sizey*2/3) : 0);
            return {x:x, y:y};
        }
        static pointFromIJ(ij, dim, size, center=false) {
            if (!ij || !dim || !size) return null;
            return this._pointFromIJ(ij.x, ij.y, dim.x, dim.y, size.x, size.y, center);
        }

        static _pointFromIdx(idx, dimx, dimy, sizex, sizey, center=false) {
            let ij = this._ijFromIdx(idx, dimx, dimy);
            return this._pointFromIJ(ij.x, ij.y, dimx, dimy, sizex, sizey, center);
        }
        static pointFromIdx(idx, dim, size) {
            if (!ij || !dim || !size) return null;
            return this._PointFromIdx(idx, dim.x, dim.y, sizex, sizey, minx, miny)
        }

        static _idxsFromBounds(bminx, bminy, bmaxx, bmaxy, dimx, dimy, sizex, sizey) {
            let qtry = sizey/3;
            let halfx = sizex*.5;
            let qmini = Math.floor(bminx/halfx);
            let qminj = Math.floor(bminy/qtry);
            let mminx = bminx%halfx;
            let mminy = bminy%qtry;
            let qmaxi = Math.floor((bmaxx-1)/halfx);
            let qmaxj = Math.floor((bmaxy-1)/qtry);
            let mmaxx = (bmaxx-1)%halfx;
            let mmaxy = (bmaxy-1)%qtry;
            let idxs = [];
            let j = Math.floor((bminy)/sizey);
            for ( let qj=qminj; qj<=qmaxj; qj++) {
                let mqj = (qj%3);
                let ioff = (qj%6) > 2;
                let i = (ioff) ? (qmini-1) >> 1 : qmini >> 1;
                let idx;
                for (let qi=qmini; qi<=qmaxi; qi++) {
                    let mqi = (!ioff) ? (qi%2) : ((qi+1)%2);
                    idx = this._idxFromIJ(i,j,dimx,dimy);
                    // hex top left
                    if (mqi === 0 && mqj === 0) {
                        // along the top most row
                        if (qj === qminj) {
                            if ((halfx-mminx) > 2*mminy) {
                                idx = this._idxFromIJ((ioff) ? i : i-1, j-1, dimx, dimy);
                                if (idx !== -1) idxs.push(idx);
                            }
                        } else if (qj === qmaxj && qi === qmaxi) {
                            if ((halfx-mmaxx) <= 2*mmaxy) {
                                idx = this._idxFromIJ(i, j, dimx, dimy);
                                if (idx !== -1) idxs.push(idx);
                            }
                        }
                        // we have more quadrants to the right or below...
                        if (qi !== qmaxi || qj !== qmaxj) {
                            idx = this._idxFromIJ(i,j,dimx,dimy);
                            if (idx !== -1) idxs.push(idx);
                        // special case... check if bounds is within one quadrant
                        } else {
                            if ((halfx-mmaxx) <= (2*mminy)) {
                                idx = this._idxFromIJ(i,j,dimx,dimy);
                                if (idx !== -1) idxs.push(idx);
                            }
                        }
                    // hex top right
                    } else if (mqi === 1 && mqj === 0) {
                        // top most right
                        if (qi === qmaxi && qj === qminj) {
                            if (mmaxx > (2*mminy)) {
                                idx = this._idxFromIJ((ioff) ? i+1 : i,j-1,dimx,dimy);
                                if (idx !== -1) idxs.push(idx);
                            }
                        }
                        // at left edge w/ tiles below
                        if (qi === qmini && qi !== qmaxi) {
                            idx = this._idxFromIJ(i,j,dimx,dimy);
                            if (idx !== -1) idxs.push(idx);
                        // special case... check if bounds is within one quadrant
                        } else if (qi === qmini && qj === qmaxj) {
                            if (mminx <= (2*mmaxy)) {
                                idx = this._idxFromIJ(i,j,dimx,dimy);
                                if (idx !== -1) idxs.push(idx);
                            }
                        }
                    // hex mid
                    } else {
                        // top row is mid
                        if (qj === qminj) {
                            idx = this._idxFromIJ(i,j,dimx,dimy);
                            if (idx !== -1) idxs.push(idx);
                        }
                    }
                    if (mqi > 0 && qi !== qmaxi) i++;
                }
                if (mqj > 1) j++;
            }
            idxs.sort((a,b) => a-b);
            return idxs;
        }
        static idxsFromBounds(b, dim, size) {
            if (!b || !dim || !size) return [];
            return this._idxsFromBounds(b.minx, b.miny, b.maxx, b.maxy, dim.x, dim.y, size.x, size.y);
        }

        static _idxFromPoint(px, py, dimx, dimy, sizex, sizey) {
            let ij = this._ijFromPoint(px, py, dimx, dimy, sizex, sizey);
            return this._idxFromIJ(ij.x, ij.y, dimx, dimy);
        }
        static idxFromPoint(p, dim, size) {
            if (!p || !dim || !size) return -1;
            return this._idxFromPoint(p.x, p.y, dim.x, dim.y, size.x, size.y);
        }

        // METHODS -------------------------------------------------------------
        _ijFromPoint(px, py) {
            return this.constructor._ijFromPoint(px-this.minx, py-this.miny, this.cols, this.rows, this.colSize, this.rowSize);
        }
        ijFromPoint(p) {
            if (!p) return {x:-1,y:-1};
            return this.constructor._ijFromPoint(p.x-this.minx, p.y-this.miny, this.cols, this.rows, this.colSize, this.rowSize);
        }

        _idxFromPoint(px, py) {
            return this.constructor._idxFromPoint(px-this.minx, py-this.miny, this.cols, this.rows, this.colSize, this.rowSize);
        }
        idxFromPoint(p) {
            if (!p) return -1;
            return this.constructor._idxFromPoint(p.x-this.minx, p.y-this.miny, this.cols, this.rows, this.colSize, this.rowSize);
        }

        pointFromIdx(idx, center=false) {
            let p = this.constructor._pointFromIdx(idx, this.cols, this.rows, this.colSize, this.rowSize, center);
            p.x += this.minx;
            p.y += this.miny;
            return p;
        }

        _pointFromIJ(i, j, center=false) {
            let p = this.constructor._pointFromIJ(i, j, this.cols, this.rows, this.colSize, this.rowSize, center);
            p.x += this.minx;
            p.y += this.miny;
            return p;
        }
        pointFromIJ(ij, center=false) {
            if (!ij) return {x:-1, y:-1};
            let p = this.constructor._pointFromIJ(ij.x, ij.y, this.cols, this.rows, this.colSize, this.rowSize, center);
            p.x += this.minx;
            p.y += this.miny;
            return p;
        }

        idxof(gzo) {
            let gidx = this.$gzoIdxMap.get(gzo.gid) || [];
            return gidx.slice();
        }

        includes(gzo) {
            return this.$gzoIdxMap.has(gzo.gid);
        }

        idxsFromGzo(gzo) {
            let b = this.boundsFor(gzo);
            return this.constructor._idxsFromBounds(b.minx-this.minx, b.miny-this.miny, b.maxx-this.minx, b.maxy-this.miny, this.cols, this.rows, this.colSize, this.rowSize);
        }


        *_findForPoint(px, py, filter=(v) => true) {
            let gidx = this.constructor._idxFromPoint(px-this.minx, py-this.miny, this.cols, this.rows, this.colSize, this.rowSize);
            let found = new Set();
            for (const gzo of this.findForIdx(gidx, filter)) {
                let ob = this.boundsFor(gzo);
                if (!found.has(gzo) && Contains._bounds(ob.minx, ob.miny, ob.maxx, ob.maxy, px, py)) {
                    found.add(gzo);
                    yield gzo;
                }
            }
        }
        *findForPoint(p, filter=(v) => true) {
            if (!p) return;
            yield *this._findForPoint(p.x, p.y, filter);
        }

        _firstForPoint(px, py, filter=(v) => true) {
            let gidx = this.constructor._idxFromPoint(px-this.minx, py-this.miny, this.cols, this.rows, this.colSize, this.rowSize);
            for (const gzo of this.findForIdx(gidx, filter)) {
                let ob = this.boundsFor(gzo);
                if (Contains._bounds(ob.minx, ob.miny, ob.maxx, ob.maxy, px, py)) return gzo;
            }
            return null;
        }
        firstForPoint(p, filter=(v) => true) {
            if (!p) return null;
            return this._firstForPoint(p.x, p.y, filter);
        }

        *_findForBounds(bminx, bminy, bmaxx, bmaxy, filter=(v) => true) {
            let gidxs = this.constructor._idxsFromBounds(bminx-this.minx, bminy-this.miny, bmaxx-this.minx, bmaxy-this.miny, this.cols, this.rows, this.colSize, this.rowSize);
            let found = new Set();
            for (const gzo of this.findForIdx(gidxs, filter)) {
                let ob = this.boundsFor(gzo);
                if (!found.has(gzo) && Overlaps._bounds(ob.minx, ob.miny, ob.maxx, ob.maxy, bminx, bminy, bmaxx, bmaxy)) {
                    found.add(gzo);
                    yield gzo;
                }
            }
        }
        *findForBounds(bounds, filter=(v) => true) {
            if (!bounds) return;
            yield *this._findForBounds(bounds.minx, bounds.miny, bounds.maxx, bounds.maxy, filter);
        }

        _firstForBounds(bminx, bminy, bmaxx, bmaxy, filter=(v) => true) {
            let gidxs = this.constructor._idxsFromBounds(bminx-this.minx, bminy-this.miny, bmaxx-this.minx, bmaxy-this.miny, this.cols, this.rows, this.colSize, this.rowSize);
            for (const gzo of this.findForIdx(gidxs, filter)) {
                let ob = this.boundsFor(gzo);
                if (Overlaps._bounds(ob.minx, ob.miny, ob.maxx, ob.maxy, bminx, bminy, bmaxx, bmaxy)) return gzo;
            }
            return null;
        }
        firstForBounds(bounds, filter=(v) => true) {
            if (!bounds) return null;
            return this._firstForBounds(bounds.minx, bounds.miny, bounds.maxx, bounds.maxy, filter);
        }

        add(gzo) {
            let gidx = this.idxsFromGzo(gzo);
            if (!gidx.length) {
                this.$oob.add(gzo);
            } else {
                // assign object to grid
                for (const idx of gidx) this.setidx(idx, gzo);
            }
            // assign gizmo gidx
            this.$gzoIdxMap.set(gzo.gid, gidx);
            if (this.dbg) console.log(`grid add ${gzo} w/ idx: ${gidx}`);
        }

        remove(gzo) {
            if (!gzo) return;
            let gidx = this.$gzoIdxMap.get(gzo.gid) || [];
            this.$gzoIdxMap.delete(gzo.gid);
            this.$oob.delete(gzo);
            // remove object from grid
            for (const idx of gidx) this.delidx(idx, gzo);
        }

        recheck(gzo) {
            if (!gzo) return;
            let ogidx = this.$gzoIdxMap.get(gzo.gid) || [];
            let gidx = this.idxsFromGzo(gzo) || [];
            let modified = false;
            if (!Util.arraysEqual(ogidx, gidx)) {
                if (this.dbg) console.log(`----- Grid.recheck: ${gzo} old ${ogidx} new ${gidx}`);
                // remove old
                for (const idx of ogidx) this.delidx(idx, gzo);
                // add new
                for (const idx of gidx) this.setidx(idx, gzo);
                // assign new gidx
                this.$gzoIdxMap.set(gzo.gid, gidx);
                modified = true;
            } else {
                // resort
                for (const idx of gidx) {
                    if (this.sortBy) this.entries[idx].sort(this.sortBy);
                }
            }
            if (gidx.length && this.$oob.has(gzo)) {
                this.$oob.delete(gzo);
            }
            return modified;
        }

        resize(bounds, cols, rows) {
            let gzos = Array.from(this);
            // handle grid array resize
            if (this.cols != cols || this.rows != rows) super.resize(cols, rows);
            // handle spatial resize
            this.minx = bounds.minx;
            this.miny = bounds.miny;
            this.colSize = bounds.width/cols;
            this.rowSize = bounds.height/rows;
            // recheck position of all assigned objects
            for (const gzo of gzos) this.recheck(gzo);
            // recheck position of all out-of-bounds objects
            for (const gzo of Array.from(this.$oob)) {
                this.recheck(gzo);
            }
        }

        render(ctx, x=0, y=0, width=0, height=0, color='rgba(0,255,255,.5)', occupiedColor='red') {
            let halfx = Math.round(this.colSize*.5);
            let halfy = Math.round(this.rowSize*2/3);
            let qtry = Math.round(this.rowSize/3);
            let path = new Path2D();
            path.moveTo(-halfx, -qtry);
            path.lineTo(0, -halfy);
            path.lineTo(halfx, -qtry);
            path.lineTo(halfx, qtry);
            path.lineTo(0, halfy);
            path.lineTo(-halfx, qtry);
            path.closePath();
            for (let i=0; i<this.cols; i++) {
                for (let j=0; j<this.rows; j++) {
                    let d = this._pointFromIJ(i, j, true);
                    let idx = this._idxFromIJ(i, j);
                    let entries = this.entries[idx] || [];
                    ctx.translate(x+d.x, y+d.y);
                    ctx.strokeStyle = (entries.length) ? occupiedColor : color;
                    ctx.lineWidth = 1;
                    ctx.stroke(path);
                    ctx.translate(-(x+d.x), -(y+d.y));
                }
            }
        }

        toString() {
            return Fmt$1.toString(this.constructor.name, this.cols, this.rows);
        }
        
    }

    class GameModel extends Gizmo {
        static {
            this.$schema('x', { dflt:0 });
            this.$schema('y', { dflt:0 });
            this.$schema('z', { dflt:0 });
            this.$schema('sketch', { link:true, dflt:new Rect({color:'green', width:16, height:16}) });
            this.prototype.alignx = .5;
            this.prototype.aligny = .5;
            this.prototype.gridable = true;
        }

        static sortBy(a,b) {
            if (!a || !b) return 0;
            if (a.z === b.z) {
                return a.y-b.y;
            }
            return a.z-b.z;
        }

        static boundsFor(m) {
            if (!m) return new Bounds$1();
            if (m.sketch) {
                let x = m.x - (m.sketch.width*m.alignx);
                let y = m.y - (m.sketch.height*m.aligny);
                return new Bounds$1({
                    x:x,
                    y:y,
                    width:m.sketch.width,
                    height:m.sketch.height,
                });
            }
            return new Bounds$1({
                x:m.x,
                y:m.y,
            });
        }

        render(ctx) {
            if (this.sketch) {
                let width = this.sketch.width;
                let height = this.sketch.height;
                let x = this.x - (width*this.alignx);
                let y = this.y - (height*this.aligny);
                this.sketch.render(ctx, x, y);
            }
        }

    }

    class UiGrid extends UiView {
        static {
            // the boundsFor is responsible for translating an object bounds to local grid space.  Object transformation is based on local coordinate space of the UI grid
            // which needs to be translated to a zero-based coordinate space of the underlying storage grid
            this.$schema('boundsFor', { readonly:true, dflt:() => GameModel.boundsFor });
            this.$schema('sortBy', { readonly:true, dflt:() => GameModel.sortBy });
            this.$schema('createFilter', { readonly:true, dflt:() => (gzo) => gzo.gridable });
            this.$schema('renderFilter', { eventable:false, dflt:() => ((idx, view) => true) });
            this.$schema('optimizeRender', { eventable:false, dflt:true });
            this.$schema('$chunks', { parser: (o,x) => {
                if (x.chunks) return x.chunks;
                const rows = x.rows || 8;
                const cols = x.cols || 8;
                const xgrid = {
                    rows: rows,
                    cols: cols,
                    colSize: o.xform.width/cols,
                    rowSize: o.xform.height/rows,
                    boundsFor: o.boundsFor,
                    sortBy: o.sortBy,
                };
                if (x.hex) {
                    return new HexGrid(xgrid);
                } else {
                    return new Grid(xgrid);
                }
            }});
            this.$schema('$revision', { parser:(o,x) => 0 });
            this.$schema('$rerender', { parser:(o,x) => true });
            this.$schema('$chunkUpdates', { readonly:true, parser: (o,x) => new Set()});
            this.$schema('$chunkCanvas', { readonly:true, parser: (o,x) => document.createElement('canvas') });
            this.$schema('$chunkCtx', { readonly:true, parser: (o,x) => o.$chunkCanvas.getContext('2d') });
            this.$schema('$gridCanvas', { readonly:true, parser: (o,x) => document.createElement('canvas') });
            this.$schema('$gridCtx', { readonly:true, parser: (o,x) => o.$gridCanvas.getContext('2d') });
            this.$schema('length', { readonly:true, getter: (o,x) => o.$chunks.length });
        }

        // CONSTRUCTOR/DESTRUCTOR ----------------------------------------------

        $cpost(spec) {
            super.$cpost(spec);
            // -- resize offscreen canvases
            this.$gridCanvas.width = this.xform.width;
            this.$gridCanvas.height = this.xform.height;
            this.$chunkCanvas.width = this.$chunks.colSize;
            this.$chunkCanvas.height = this.$chunks.rowSize;
            // handle view creation event handling
            if (this.createFilter) {
                GadgetCtx.at_created.listen(this.$on_viewCreated, this, false, (evt) => this.createFilter(evt.actor));
            }
            this.at_modified.listen(this.$on_modified, this, false, (evt) => evt.key.startsWith('xform'));
        }

        destroy() {
            GadgetCtx.ignore(this.$on_viewCreated, this);
        }

        // EVENT HANDLERS ------------------------------------------------------
        $on_modified(evt) {
            this.resize();
        }

        $on_viewCreated(evt) {
            this.add(evt.actor);
        }

        $on_viewModified(evt) {
            let view = evt.actor;
            let needsUpdate = evt.render;
            // -- keep track of grid indices that need to be rerendered (e.g.: all grid indices associated with updated view before and after rechecking grid)
            let gidxs = this.$chunks.idxof(view);
            for (const idx of gidxs) {
                needsUpdate = true;
                this.$chunkUpdates.add(idx);
            }
            // -- recheck grid to update grid position
            this.$chunks.recheck(view);
            gidxs = this.idxof(view);
            for (const idx of gidxs) {
                needsUpdate = true;
                this.$chunkUpdates.add(idx);
            }
            if (needsUpdate) this.$revision = this.$revision + 1;
        }

        $on_viewDestroyed(evt) {
            this.remove(evt.actor);
        }

        // METHODS -------------------------------------------------------------

        // grid proxy functions
        _ijFromPoint(x, y) { return this.$chunks._ijFromPoint(x, y); }
        ijFromPoint(p) { return this.$chunks.ijFromPoint(p); }
        _idxFromPoint(x, y) { return this.$chunks._idxFromPoint(x, y) }
        idxFromPoint(p) { return this.$chunks.idxFromPoint(p); }
        pointFromIdx(idx, center=false) { return this.$chunks.pointFromIdx(idx, center); }
        _pointFromIJ(i, j, center=false) { return this.$chunks._pointFromIJ(i, j, center); }
        pointFromIJ(ij, center=false) { return this.$chunks.pointFromIJ(ij, center); }
        *_findForPoint(x, y, filter=(v) => true) { yield *this.$chunks._findForPoint(x, y, filter); }
        *findForPoint(p, filter=(v) => true) { yield *this.$chunks.findForPoint(p, filter); }
        _firstForPoint(x, y, filter=(v) => true) { return this.$chunks._firstForPoint(x, y, filter); }
        firstForPoint(p, filter=(v) => true) { return this.$chunks.firstForPoint(p, filter); }
        *_findForBounds(bminx, bminy, bmaxx, bmaxy, filter=(v) => true) { yield *this.$chunks._findForBounds(bminx, bminy, bmaxx, bmaxy, filter); }
        *findForBounds(b, filter=(v) => true) { yield *this.$chunks.findForBounds(b, filter); }
        _firstForBounds(bminx, bminy, bmaxx, bmaxy, filter=(v) => true) { return this.$chunks._firstForBounds(bminx, bminy, bmaxx, bmaxy, filter); }
        firstForBounds(b, filter=(v) => true) { return this.$chunks.firstForBounds(b, filter); }
        idxsFromGzo(gzo) { return this.$chunks.idxsFromGzo(gzo); }
        ijFromIdx(idx) { return this.$chunks.ijFromIdx(idx); }
        _idxFromIJ(i,j) { return this.$chunks._idxFromIJ(i,j); }
        idxFromIJ(ij) { return this.$chunks.idxFromIJ(ij); }
        idxFromDir(idx, dir) { return this.$chunks.idxFromDir(idx, dir); }
        idxsAdjacent(idx1, idx2) { return this.$chunks.idxsAdjacent(idx1, idx2); }
        *idxsBetween(idx1, idx2) { yield *this.$chunks.idxsBetween(idx1, idx2); }
        includes(gzo) { return this.$chunks.includes(gzo); }
        idxof(gzo) { return this.$chunks.idxof(gzo); }
        *[Symbol.iterator]() { yield *this.$chunks; }
        *keys() { yield *this.$chunks.keys(); }
        *_getij(i, j) { yield *this.$chunks._getij(i,j); }
        *getij(ij) { yield *this.$chunks.getij(ij); }
        *getidx(idx) { yield *this.$chunks.getidx(idx); }
        *find(filter=(v) => true) { yield *this.$chunks.find(filter); }
        first(filter=(v) => true) { return this.$chunks.first(filter); }
        *findForIdx(gidxs, filter=(v) => true) { yield *this.$chunks.findForIdx(gidxs, filter); }
        firstForIdx(gidxs, filter=(v) => true) { return this.$chunks.firstForIdx(gidxs, filter); }
        *findForNeighbors(idx, filter=(v) => true, dirs=Direction.any) { yield *this.$chunks.findForNeighbors(idx, filter, dirs); }
        firstForNeighbors(idx, filter=(v) => true, dirs=Direction.any) { return this.$chunks.firstForNeighbors(idx, filter, dirs); }

        add(gzo) {
            // FIXME
            //gzo.xform._parent = this.xform;
            // add to grid
            this.$chunks.add(gzo);
            // retrieve idxs
            let gidxs = this.$chunks.idxof(gzo);
            let needsUpdate = false;
            // assign object to grid
            for (const idx of gidxs) {
                needsUpdate = true;
                // update list of updated chunks
                this.$chunkUpdates.add(idx);
            }
            // listen for gizmo events
            if (gzo.at_modified) gzo.at_modified.listen(this.$on_viewModified, this);
            if (gzo.at_destroyed) gzo.at_destroyed.listen(this.$on_viewDestroyed, this);
            // if chunkUpdates have been set, trigger update for grid
            if (needsUpdate) this.$revision = this.$revision + 1;
        }

        remove(gzo) {
            if (!gzo) return;
            // retrieve idxs for gzo
            const gidxs = this.$chunks.idxof(gzo);
            // remove from grid
            this.$chunks.remove(gzo);
            // ignore gizmo events
            if (gzo.at_modified) gzo.at_modified.ignore(this.$on_viewModified, this);
            if (gzo.at_destroyed) gzo.at_destroyed.ignore(this.$on_viewDestroyed, this);
            let needsUpdate = false;
            for (const idx of gidxs) {
                needsUpdate = true;
                this.$chunkUpdates.add(idx);
            }
            if (needsUpdate) this.$revision = this.$revision + 1;
        }

        resize() {
            if ( (this.xform.minx !== this.$chunks.minx) || 
                 (this.xform.miny !== this.$chunks.miny) || 
                 (this.xform.width !== this.$gridCanvas.width) || 
                 (this.xform.height !== this.$gridCanvas.height)) {
                // resize grid
                this.$chunks.resize(this.xform, this.$chunks.cols, this.$chunks.rows);
                this.$gridCanvas.width = this.xform.width;
                this.$gridCanvas.height = this.xform.height;
                this.$chunkCanvas.width = this.$chunks.colSize;
                this.$chunkCanvas.height = this.$chunks.rowSize;
                this.$rerender = true;
            }
        }

        renderChunk(idx, dx, dy) {
            if (!this.$chunkCanvas.width || !this.$chunkCanvas.height) return;
            // everything from the grid 'chunk' is rendered to an offscreen chunk canvas
            let chunkOffset = this.$chunks.pointFromIdx(idx);
            // FIXME bounds on optimized rendering...
            /*
            if (this.parent && this.optimizeRender) {
                const min = this.xform.getWorld({x:chunkOffset.x+dx, y:chunkOffset.y+dy}, false);
                const max = this.xform.getWorld({x:chunkOffset.x+dx+this.$chunks.colSize, y:chunkOffset.y+dy+this.$chunks.rowSize}, false);
                if (!Overlaps.bounds(this.parent.xform.bounds, {minx:min.x, miny:min.y, maxx: max.x, maxy:max.y})) {
                    //if (this.dbg) console.log(`-- chunk: ${idx} ${t.x},${t.y} is out of bounds against ${this.xform.bounds}`);
                    return;
                }
            }
            */
            this.$chunkCtx.clearRect( 0, 0, this.$chunks.colSize, this.$chunks.rowSize );
            this.$chunkCtx.translate(-chunkOffset.x, -chunkOffset.y);
            // iterate through all views at given idx
            for (const view of this.getidx(idx)) {
                if (this.renderFilter(idx, view)) {
                    view.render(this.$chunkCtx);
                }
            }
            this.$chunkCtx.translate(chunkOffset.x, chunkOffset.y);
            // -- resulting chunk is rendered to grid canvas
            let tx = chunkOffset.x-dx;
            let ty = chunkOffset.y-dy;
            this.$gridCtx.clearRect(tx, ty, this.$chunks.colSize, this.$chunks.rowSize);
            this.$gridCtx.drawImage(this.$chunkCanvas, tx, ty);
        }

        $subrender(ctx) {
            // compute delta between xform space and grid space
            let dx = this.xform.minx;
            let dy = this.xform.miny;
            // render any updated chunks
            if (this.$rerender) {
                this.$chunkUpdates.clear();
                this.$rerender = false;
                for (let idx=0; idx<this.$chunks.length; idx++) {
                    this.renderChunk(idx, dx, dy);
                }
            } else {
                let chunkUpdates = Array.from(this.$chunkUpdates);
                this.$chunkUpdates.clear();
                for (const idx of chunkUpdates) {
                    this.renderChunk(idx, dx, dy);
                }
            }
            // render grid canvas
            if (this.$gridCanvas.width && this.$gridCanvas.height) ctx.drawImage(this.$gridCanvas, dx, dy);
            // overlay grid
            if (this.dbg && this.dbg.grid) {
                this.$chunks.render(ctx, 0, 0);
            }
        }


    }

    /** ========================================================================
     * class representing base canvas as a UI view
     */
    class UiCanvas extends UiView {
        // STATIC VARIABLES ----------------------------------------------------
        static { this.prototype.canvasable = true; }

        // STATIC PROPERTIES ---------------------------------------------------
        static getCanvas(id='game.canvas', fit=true) {
            let canvas = document.getElementById(id);
            if (!canvas) {
                canvas = document.createElement('canvas');
                canvas.id = id;
                canvas.constructed = true;
                document.body.appendChild(canvas);
            }
            if (!GadgetCtx.interacted) canvas.addEventListener('click', () => GadgetCtx.interacted = true, {once: true});
            if (fit) {
                canvas.width = window.innerWidth;
                canvas.height = window.innerHeight;
            }
            return canvas;
        }

        // SCHEMA --------------------------------------------------------------
        static {
            this.$schema('canvasId', { order: -3, readonly: true, dflt:'game.canvas' });
            this.$schema('fitToWindow', { order: -3, readonly: true, dflt: true });
            this.$schema('canvas', { order: -2, dflt: (o) => o.constructor.getCanvas(o.canvasId, o.fitToWindow) });
            this.$schema('xform', { order: -1, link: true, dflt: (o) => new XForm({ origx:0, origy:0, fixedWidth:o.canvas.width, fixedHeight:o.canvas.height }) });
            this.$schema('ctx', { parser: (o,x) => o.canvas.getContext('2d') });
        }

        // CONSTRUCTOR/DESTRUCTOR ----------------------------------------------
        $cpost(spec) {
            super.$cpost(spec);
            if (!this.fitToWindow) {
                this.canvas.width = this.xform.fixedWidth;
                this.canvas.height = this.xform.fixedHeight;
            } else {
                this.xform.fixedWidth = this.canvas.width;
                this.xform.fixedHeight = this.canvas.height;
            }
            // -- setup event handlers
            if (this.fitToWindow) {
                this.$on_windowResized = this.$on_windowResized.bind(this);
                window.addEventListener('resize', this.$on_windowResized); // resize when window resizes
            }
            this.at_modified.listen(this.$on_xformUpdated, this, false, (evt) => evt.key.startsWith('xform'));
        }

        destroy() {
            if (this.canvas && this.canvas.constructed) this.canvas.remove();
            window.removeEventListener('resize', this.$on_windowResized);
            super.destroy();
        }

        // METHODS -------------------------------------------------------------
        $on_windowResized() {
            let width = window.innerWidth;
            let height = window.innerHeight;
            this.canvas.width = width;
            this.canvas.height = height;
            this.xform.fixedWidth = width;
            this.xform.fixedHeight = height;
            console.error(`== set xform w: ${width} proxy: ${this.xform.$proxy}`);
        }  

        $on_xformUpdated(evt) {
            if (this.fitToWindow) {
                this.xform.$target.fixedWidth.value = this.canvas.width;
                this.xform.$target.fixedHeight.value = this.canvas.height;
            } else {
                this.canvas.width = this.xform.fixedWidth;
                this.canvas.height = this.xform.fixedHeight;
            }
        }

    }

    class UiButton extends UiPanel {
        // SCHEMA --------------------------------------------------------------
        static {
            this.$schema('fmt', { order:-2, dflt:() => new TextFormat(), eventable:false });
            this.$schema('$text', { order:-1, eventable:false, link:true, dflt: (o) => new Text({text: 'default text', fmt:o.fmt}) });
            // button sketches
            this.$schema('unpressedSketch', { link: true, dflt: (o) => new Rect({ borderColor:'blue', border:3, color:'rgba(255,255,255,.25)' }) });
            this.$schema('highlightSketch', { link: true, dflt: (o) => new Rect({ borderColor:'yellow', border:3, fill:false }) });
            this.$schema('pressedSketch', { link: true, dflt: (o) => new Rect({ borderColor:'blue', border:3, color: 'rgba(255,255,255,.75)' }) });
            this.$schema('inactiveSketch', { link: true, dflt: (o) => new Rect({ borderColor:'rgba(55,55,55,.5)', border:3, color: 'rgba(127,127,127,.25)' }) });
            // button text
            this.$schema('textXForm', { readonly:true, dflt: () => new XForm({grip:.1}) });
            this.$schema('text', { dflt:'default text', setter: (o,ov,v) => { o.$text.text = v; return v } });
            this.$schema('highlightFmt', { eventable:false });
            this.$schema('inactiveFmt', { eventable:false });
            this.$schema('highlighted', { dflt:false });
        }

        $cpost(spec) {
            super.$cpost(spec);
            let uitext = new UiText({
                xform:this.textXForm,
                text:this.text,
                $text:this.$text,
                mousable:false,
            });
            this.adopt(uitext);
        }

        // METHODS -------------------------------------------------------------
        $subrender(ctx) {
            // render inactive
            if (!this.active) {
                if (this.inactiveFmt) this.$text.fmt = this.inactiveFmt;
                if (this.inactiveSketch) this.inactiveSketch.render(ctx, this.xform.minx, this.xform.miny, this.xform.width, this.xform.height);
            } else {
                // render pressed/unpressed sketch
                if (this.hovered && this.pressed) {
                    if (this.pressedSketch) this.pressedSketch.render(ctx, this.xform.minx, this.xform.miny, this.xform.width, this.xform.height);
                } else {
                    if (this.unpressedSketch) this.unpressedSketch.render(ctx, this.xform.minx, this.xform.miny, this.xform.width, this.xform.height);
                }
                // render highlight
                if (this.highlighted || (this.hovered && !this.pressed)) {
                    if (this.highlightSketch) this.highlightSketch.render(ctx, this.xform.minx, this.xform.miny, this.xform.width, this.xform.height);
                    if (this.highlightFmt) {
                        this.$text.fmt = this.highlightFmt;
                    } else {
                        this.$text.fmt = this.fmt;
                    }
                } else {
                    this.$text.fmt = this.fmt;
                }
            }
        }

    }

    class Tiler extends Sketch {
        static {
            this.$schema('gridSize', { order:-1, readonly:true, dflt: () => new Vect$1({x:10, y:10}) });
            this.$schema('tileSize', { order:-1, readonly:true, dflt: () => new Vect$1({x:32, y:32}) });
            this.$schema('assetMap', { readonly:true });
            this.$schema('$grid', { parser: (o) => new GridArray({ cols:o.gridSize.x, rows:o.gridSize.y }) });
            this.$schema('$gridCanvas', { readonly: true, parser: (o,x) => {
                let canvas = document.createElement('canvas');
                canvas.width = o.gridSize.x*o.tileSize.x;
                canvas.height = o.gridSize.y*o.tileSize.y;
                return canvas;
            }});
            this.$schema('$gridCtx', { readonly: true, parser: (o,x) => o.$gridCanvas.getContext('2d') });
            this.$schema('$assetCache', { readonly: true, parser: () => new Map()});
            this.$schema('$modifiedIdxs', { readonly: true, parser: () => new Set()});
            this.$schema('$modified', { dflt:false });
            this.$schema('width', { readonly:true, getter: (o) => o.tileSize.x*o.gridSize.x });
            this.$schema('height', { readonly:true, getter: (o) => o.tileSize.y*o.gridSize.y });
        }

        $renderIdx(idx) {
            let ij = this.$grid.ijFromIdx(idx);
            let x = ij.x*this.tileSize.x;
            let y = ij.y*this.tileSize.y;
            // clear current index
            this.$gridCtx.clearRect(x, y, this.tileSize.x, this.tileSize.y);
            // pull asset
            let tag = this.$grid.getidx(idx);
            if (this.assetMap) tag = this.assetMap(tag);
            if (!tag) return;
            let asset = this.$assetCache.get(idx);
            // cache hit
            if (asset) {
                // validate cache asset still matches grid asset
                if (asset.tag !== tag) asset = null;
            }
            // handle cache miss or invalidated cache
            if (!asset) {
                asset = GadgetCtx.assets.get(tag);
                if (asset) this.$assetCache.set(idx, asset);
            }
            // render asset to grid
            asset.render(this.$gridCtx, x,y, this.tileSize.x, this.tileSize.y);
        }

        $renderModified() {
            let modified = Array.from(this.$modifiedIdxs);
            this.$modifiedIdxs.clear();
            this.$modified = false;
            for (const idx of modified) {
                this.$renderIdx(idx);
            }
        }

        $subrender(ctx, x=0, y=0, width=0, height=0) {
            // render modified indices
            if (this.$modified) this.$renderModified();
            // translate/scale
            let ctxXform = ctx.getTransform();
            if (x || y) ctx.translate(x, y);
            if ((width && width !== this.width) || (height && height !== this.height)) {
                let scalex = width/this.width;
                let scaley = height/this.height;
                ctx.scale(scalex, scaley);
            }
            // draw canvas
            ctx.drawImage(this.$gridCanvas, 0, 0);
            // restore
            ctx.setTransform(ctxXform);
        }

        _getij(i, j) {
            return this.$grid._getij(i,j);
        }
        getij(ij) {
            return this.$grid.getij(ij);
        }
        getidx(idx) {
            return this.$grid.getidx(idx);
        }

        _setij(i, j, v) {
            let idx = this.$grid._idxFromIJ(i, j);
            this.setidx(idx, v);
        }
        setij(ij, v) {
            let idx = this.$grid.idxFromIJ(ij);
            this.setidx(idx, v);
        }
        setidx(idx, v) {
            if (idx !== -1 && idx<this.$grid.length) {
                if (this.$grid.getidx(idx) === v) return;
                this.$modified = true;
                this.$modifiedIdxs.add(idx);
                this.$grid.setidx(idx, v);
            }
        }

    }

    /**
     * Media assets are any assets loaded from a file, URI, or data buffer
     * The given source is asynchronously loaded and stored to the data element.
     */
    class Media extends Asset {
        static { this.$schema('src', { readonly: true }); }
        static { this.$schema('data', {}); }
        static { this.$schema('tag', { order: 1, dflt: (o) => o.src }); }

        static from(src) {
            let mediaSpec;
            if (typeof src === 'string') {
                mediaSpec = { src: src };
            } else if (src.$gzx) {
                mediaSpec = src.args[0];
            } else {
                mediaSpec = src;
            }
            let media = new this(mediaSpec);
            return media;
        }

        static async load(src) {
            return new Promise((resolve) => {
                let media = this.from(src);
                media.load().then(() => {
                    resolve(media);
                });
            });
        }

        constructor(...args) {
            super(...args);
            if (!this.data) this.load();
        }

        async load() {
            if (this.tag in GadgetCtx.media) {
                return Promise.resolve(GadgetCtx.media[this.tag]).then((rslt) => {
                    this.data = rslt;
                });
            }
            let promise = new Promise((resolve, reject) => {
                const req = new XMLHttpRequest();
                req.crossOrigin = 'Anonymous';
                req.responseType = 'arraybuffer';
                req.addEventListener('load', () => {
                    this.data = req.response;
                    return resolve( req.response );
                });
                req.addEventListener('error', err => { console.error('error: ' + Fmt.ofmt(err)); reject(err); });
                req.open('GET', this.src, true);
                req.setRequestHeader('Cache-Control', 'no-store');
                req.send();
            });
            GadgetCtx.media[this.tag] = promise;
            return promise;
        }

    }

    class ImageMedia extends Media {
        static { this.$schema('scalex', { dflt: 1 }); }
        static { this.$schema('scaley', { dflt: 1 }); }
        static { this.$schema('smoothing', { dflt: true }); }
        static { this.$schema('width', { dflt: 0 }); }
        static { this.$schema('height', { dflt: 0 }); }
        static { this.$schema('x', { dflt: 0 }); }
        static { this.$schema('y', { dflt: 0 }); }

        static {
            this.$canvas = document.createElement('canvas');
            this.$ctx = this.$canvas.getContext('2d');
        }

        $cpre(spec) {
            if ('scale' in spec) {
                let scale = spec.scale;
                if (!('scalex' in spec)) spec.scalex = scale;
                if (!('scaley' in spec)) spec.scaley = scale;
            }
        }

        static async loadFromSource(src) {
            let promise = new Promise((resolve, reject) => {
                const img = new Image();
                img.addEventListener("load", () => {
                    resolve(img);
                });
                img.addEventListener("error", err => reject(err));
                img.src = src;
            });
            return promise;
        }

        async load() {
            // load from source
            let promise;
            // file loading can be cached to asset context -- cache lookup
            if (this.tag in GadgetCtx.media) {
                promise = GadgetCtx.media[this.tag];
            } else {
                promise = new Promise((resolve, reject) => {
                    const img = new Image();
                    img.addEventListener("load", () => {
                        resolve(img);
                    });
                    img.addEventListener("error", err => reject(err));
                    img.src = this.src;
                });
                // file loading can be cached to asset context -- cache store
                GadgetCtx.media[this.tag] = promise;
            }

            // if scaling, translation, or snipping is required, write image from source to internal canvas, then capture that canvas to a new image
            if (this.scalex !== 1 || this.scaley !== 1 || this.width !== 0 || this.height !== 0 || this.x !== 0 || this.y !== 0) {
                promise = promise.then(img => {
                    let canvas = this.constructor.$canvas;
                    //console.log(`this: ${this} constructor: ${this.constructor} $canvas: ${this.constructor.$canvas}`)
                    let ctx = this.constructor.$ctx;
                    let width = (this.width) ? this.width : img.width;
                    let height = (this.height) ? this.height : img.height;
                    canvas.width = width * this.scalex;
                    canvas.height = height * this.scaley;
                    ctx.clearRect(0, 0, canvas.width, canvas.height);
                    let savedSmoothing = ctx.imageSmoothingEnabled;
                    ctx.imageSmoothingEnabled = this.smoothing;
                    ctx.drawImage(img, this.x, this.y, width, height, 0, 0, canvas.width, canvas.height);
                    ctx.imageSmoothingEnabled = savedSmoothing;
                    return this.constructor.loadFromSource(canvas.toDataURL());
                });
            }
            // store resulting image to media
            promise.then((img) => {
                this.data = img;
            });
            return promise;
        }
    }

    /** ========================================================================
     * A sprite is a sketch used to render a JS image.
     */
    class Sprite extends Sketch {
        // SCHEMA --------------------------------------------------------------
        static {
            this.$schema('media', {readonly:true});
            this.$schema('width', {readonly:true, getter: ((o,ov) => ((o.media && o.media.data) ? o.media.data.width : 0))});
            this.$schema('height', {readonly:true, getter: ((o,ov) => ((o.media && o.media.data) ? o.media.data.height : 0))});
        }

        static from(src, spec={}) {
            let media;
            if (src instanceof ImageMedia) {
                media = src;
            } else {
                media = ImageMedia.from(src);
            }
            let asset = new this(Object.assign({}, spec, { media: media }));
            return asset;
        }

        // METHODS -------------------------------------------------------------
        $subrender(ctx, x=0, y=0, width=0, height=0) {
            if (!this.media || !this.media.data) return;
            // scale if necessary
            if ((width && width !== this.width) || (height && height !== this.height)) {
                if (this.width && this.height) {
                    // src dims
                    let sw = this.width;
                    let sh = this.height;
                    // dst dims
                    let dw = width;
                    let dh = height;
                    ctx.drawImage(this.media.data, 
                        0, 0, sw, sh, 
                        x, y, dw, dh);
                }
            } else {
                ctx.drawImage(this.media.data, x, y);
            }
        }

        async load() {
            if (this.media) {
                return this.media.load();
            } else {
                return Promise.resolve();
            }
        }

    }

    /**
     * PRNG and related utility functions
     * Original seed/randint/randfloat functions from: Blixt @ https://gist.github.com/blixt/f17b47c62508be59987b
     */
    class Prng {

        // STATIC VARIABLES ----------------------------------------------------
        static main = new Prng();

        // STATIC METHODS ------------------------------------------------------
        static seed(v) {
            return this.main.seed(v);
        }
        static mix(v) {
            return this.main.mix(v);
        }
        static random() {
            return this.main.random();
        }
        static randomInt() {
            return this.main.randomInt();
        }
        static rangeInt(min, max) {
            return this.main.rangeInt(min, max);
        }
        static jitter(base, pct) {
            return this.main.jitter(base, pct);
        }
        static range(min, max) {
            return this.main.range(min, max);
        }
        static choose(arr) {
            return this.main.choose(arr);
        }
        static flip(pct=.5) {
            return this.main.flip(pct);
        }
        static shuffle(iter) {
            return this.main.shuffle(iter);
        }
        static chooseWeightedOption(arr) {
            return this.main.chooseWeightedOption(arr);
        }

        // CONSTRUCTOR ---------------------------------------------------------
        constructor(seed=1) {
            this.state = seed;
        }

        /**
         * Creates a pseudo-random value generator. The seed must be an integer.
         *
         * Uses an optimized version of the Park-Miller PRNG.
         * http://www.firstpr.com.au/dsp/rand31/
         */
        seed(v) {
            const last = this.state;
            this.state = v % 2147483647;
            if (this.state <= 0) this.state += 2147483646;
            return last;
        }

        /**
         * Mix in a seed value to the current PRNG state
         * @param {*} v 
         * @returns 
         */
        mix(v) {
            const last = this.state;
            this.state = (this.state + v) % 2147483647;
            if (this.state <= 0) this.state += 2147483646;
            return last;
        }

        /**
         * Returns a pseudo-random value between 1 and 2^32 - 2.
         */
        randomInt() {
            return this.state = this.state * 16807 % 2147483647;
        }

        rangeInt(min, max) {
            let v = this.randomInt();
            v %= (Math.abs(max-min)+1);
            return v+Math.min(min,max);
        }

        jitter(base, pct) {
            let v = base * pct * this.random();
            return (this.random() > .5) ? base + v : base - v;
        }

        range(min, max) {
            if (max <= min) return min;
            let v = this.random();
            v *= (max-min);
            return v+min;
        }

        choose(arr) {
            if (!arr || !arr.length) return undefined;
            if (arr.length === 1) return arr[0];
            let choice = this.rangeInt(0,arr.length-1);
            return arr[choice];
        }

        flip(pct=.5) {
            return this.random() < pct;
        }

        shuffle(iter) {
            let shuffled = [];
            let choices = Array.from(iter);
            while (choices.length) {
                let i = this.rangeInt(0, choices.length-1);
                shuffled.push(choices[i]);
                choices.splice(i, 1);
            }
            return shuffled;
        }

        chooseWeightedOption(arr) {
            // count weights
            if (!arr || !arr.length) return null;
            if (arr.length === 1) return arr[0];
            let weights = arr.reduce((pv, cv) => pv+(cv.weight||1), 0);
            let choice = this.random() * weights;
            for (let i=0, t=0; i<arr.length; i++) {
                let w = arr[i].weight || 1;
                if (choice >= t && choice < t+w) {
                    return arr[i];
                }
                t += w;
            }
            return arr[arr.length-1];
        }

        /**
         * Returns a pseudo-random floating point number in range [0, 1).
         */
        random() {
            // We know that result of next() will be 1 to 2147483646 (inclusive).
            return (this.randomInt() - 1) / 2147483646;
        };

    }

    class SketchMixer extends Sketch {

        static {
            this.$schema('variations', { readonly: true, dflt:() => [] });
            this.$schema('$sketch', { readonly:true, parser:(o,x) => Prng.choose(o.variations)});
        }

        render(ctx, x=0, y=0, width=0, height=0) {
            if (this.$sketch) this.$sketch.render(ctx, x, y, width, height);
        }

        async load() {
            return Promise.all(this.variations.map((x) => x.load()));
        }

        copy(overrides={}) {
            let variations = (this.variations || []).map((x) => x.copy());
            return new this.constructor(Object.assign({}, this, { variations: variations}, overrides));
        }
    }

    class SheetTemplate extends Gadget {
        static { this.$schema('mediaDir', { dflt:'media' }); }
        static { this.$schema('width', { dflt:32 }); }
        static { this.$schema('height', { dflt:32 }); }
        static { this.$schema('xoff', { dflt:0 }); }
        static { this.$schema('yoff', { dflt:0 }); }

        spriteFromIJ(tag, src, ij, overrides={}) {
            let width = overrides.width || this.width;
            let height = overrides.width || this.height;
            let media = ImageMedia.xspec({
                src:`${this.mediaDir}/${src}.png`, 
                width:width,
                height:height,
                x:this.xoff + this.width*ij.x, 
                y:this.yoff + this.height*ij.y,
            });
            let asset = Sprite.xspec({
                tag:tag,
                media:media,
            });
            return asset;
        }

        mixerFromIJs(tag, src, ijs, overrides={}) {
            let variations = [];
            let i = 0;
            for (const ij of ijs) {
                i++;
                let vtag = `${tag}.v${i}`;
                variations.push(this.spriteFromIJ(vtag, src, ij, overrides));
            }
            //console.log(`${Fmt.ofmt(variations)}`);
            return SketchMixer.xspec({ 
                tag:tag,
                variations:variations,
            });
        }
    }

    /**
     * +---+---+---+---+---+---+---+---+---+---+---+
     * |   | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 |
     * +---+---+---+---+---+---+---+---+---+---+---+
     * | 0 |   |   |   |ctl| t | t |ctr|   |   |   |
     * +---+---+---+---+---+---+---+---+---+---+---+
     * | 1 |   |   |   | l |   |   | r |   |   |   |
     * +---+---+---+---+---+---+---+---+---+---+---+
     * | 2 |   |   |ctl|jtl|       |jtr|ctr|   |   |
     * +---+---+---+---+---+   m   +---+---+---+---+
     * | 3 |ctl| t |jtl|   |       |   |jtr| t |ctr|
     * +---+---+---+---+---+-------+---+---+---+---+
     * | 4 | l |   |       |       |       | m | r |
     * +---+---+---+   m   |   m   |   m   +---+---+
     * | 5 | l |   |       |       |       | m | r |
     * +---+---+---+---+---+-------+---+---+---+---+
     * | 6 |cbl| b |jbl|   |       |   |jbr| b |cbr|
     * +---+---+---+---+---+   m   +---+---+---+---+
     * | 7 |   |   |cbl|jbl|       |jbr|cbr|   |   |
     * +---+---+---+---+---+---+---+---+---+---+---+
     * | 8 |   |   |   | l |   |   | r |   |   |   |
     * +---+---+---+---+---+---+---+---+---+---+---+
     * | 9 |   |   |   |cbl| b | b |cbr|   |   |   |
     * +---+---+---+---+---+---+---+---+---+---+---+
     */
    class AutotilerMap extends Gadget {
        static {
            this.$schema('base',    { dflt: [{x:4,y:2}, {x:2,y:4}, {x:4,y:4}, {x:6,y:4}, {x:4,y:6}] });
            this.$schema('ctl',     { dflt: [{x:3,y:0}, {x:2,y:2}, {x:0,y:3}] });
            this.$schema('t',       { dflt: [{x:4,y:0}, {x:5,y:0}, {x:1,y:3}, {x:8,y:3}] });
            this.$schema('ctr',     { dflt: [{x:6,y:0}, {x:7,y:2}, {x:9,y:3}] });
            this.$schema('r',       { dflt: [{x:6,y:1}, {x:9,y:4}, {x:9,y:4}, {x:9,y:5}] });
            this.$schema('jtr',     { dflt: [{x:6,y:2}, {x:7,y:3}] });
            this.$schema('cbr',     { dflt: [{x:9,y:6}, {x:7,y:7}, {x:6,y:9}] });
            this.$schema('b',       { dflt: [{x:1,y:6}, {x:8,y:6}, {x:4,y:9}, {x:5,y:9}] });
            this.$schema('jbr',     { dflt: [{x:7,y:6}, {x:6,y:7}] });
            this.$schema('cbl',     { dflt: [{x:0,y:6}, {x:2,y:7}, {x:3,y:9}] });
            this.$schema('l',       { dflt: [{x:3,y:1}, {x:0,y:4}, {x:0,y:5}, {x:3,y:8}] });
            this.$schema('jbl',     { dflt: [{x:2,y:6}, {x:3,y:7}] });
            this.$schema('jtl',     { dflt: [{x:3,y:2}, {x:2,y:3}] });
        }

        entries() {
            return Object.entries(this);
        }
    }

    class AutotilerTemplate extends SheetTemplate {
        static { this.$schema('width', { dflt:16 }); }
        static { this.$schema('height', { dflt:16 }); }
        static { this.$schema('map',     { dflt: () => new AutotilerMap() }); }

        static from(src, tag, spec={}) {
            let tmp = new this(spec);
            return tmp.sketches(src, tag);
        }

        sketches(src, tag) {
            if (!tag) tag = src;
            let xspecs = [];
            // push spec for base sketch
            xspecs.push(this.mixerFromIJs(tag, src, this.map.base, {width:this.width*2, height:this.height*2}));
            // push specs for each of the "sides" of the autotiler map
            for (const [which,ijs] of this.map.entries()) {
                if (which === 'base') continue;
                let mtag = `${tag}_${which}`;
                xspecs.push(this.mixerFromIJs(mtag, src, ijs));
            }
            return xspecs;
        }

    }

    class SystemMgr extends Gizmo {
        // SCHEMA --------------------------------------------------------------
        static {
            this.$schema('dbg', { dflt: false });
            this.$schema('$systems', { link: false, parser: () => ({}) });
        }

        // CONSTRUCTOR ---------------------------------------------------------
        $cpost(spec) {
            super.$cpost(spec);
            GadgetCtx.at_created.listen(this.$on_systemCreated, this, false, (evt) => evt.actor && evt.actor instanceof System);
            GadgetCtx.at_destroyed.listen(this.$on_systemDestroyed, this, false, (evt) => evt.actor && evt.actor instanceof System);
        }

        // EVENT HANDLERS ------------------------------------------------------
        $on_systemCreated(evt) {
            let system = evt.actor;
            // pre-existing?
            if (this.$systems[system.tag]) if (this.dbg) console.log(`${this} replacing system for tag: ${system.tag}`);
            if (this.dbg) console.log(`${this} adding system: ${system} tag: ${system.tag}`);
            this.$systems[system.tag] = system;
        }

        $on_systemDestroyed(evt) {
            let system = evt.actor;
            if (system.tag in this.$systems) {
                delete this.$systems[system.tag];
            }
        }

        // METHODS -------------------------------------------------------------
        get(tag) {
            return this.$systems[tag];
        }

    }

    /**
     * A generic game state class that provides building blocks for game state transitions.  For example, a title screen, a main menu screen, and the 
     * main game play scene can all be managed by separate states.  Each state can manage UI elements, handle player inputs, and setup event handlers that 
     * will only be active when the state has active and in a 'active' state.  The {@link Game} class includes a {@link StateMgr} that is used to keep an 
     * inventory of available states and which state is currently active.  Only one state can be active at a time.  The game state has an internal state 
     * to track the progression of the state.  Possible internal state values are as follows:
     * - inactive: starting and/or idle state
     * - active: state is active
     */
    class GameState extends Gizmo {
        // STATIC VARIABLES ----------------------------------------------------
        static xassets = [];

        // SCHEMA --------------------------------------------------------------
        static {
            this.$schema('dbg', { dflt:false});
            this.$schema('xassets', { dflt:(o) => o.constructor.xassets });
            this.$schema('$state', { dflt:'inactive'});
            this.$schema('at_transitioned', { readonly:true, dflt: (o) => new EvtEmitter(o, 'transitioned') });
        }

        // CONSTRUCTOR ---------------------------------------------------------
        $cpost(spec) {
            super.$cpost(spec);
            // state-specific initialization
            this.$init();
            this.$state = 'inactive';
        }

        // METHODS -------------------------------------------------------------
        /**
         * init is called only once during state lifetime (when state is first created, before any other setup)
         * - intended to create required state/variables for the given game state
         * - override init() for state specific init functionality
         */
        $init() {
        }

        /**
         * prepare is called every time a state transitions from inactive to active and should contain state specific
         * logic to execute the game state.
         * @param {*} data - game specific data used during state setup
         * @returns Promise
         */
        async $prepare(data) {
            return Promise.resolve();
        }

        /**
         * start is called by the {@link StateMgr} when a state needs to be started.  Start executes prepare functions as needed
         * based on game state.  State will transition from inactive to active.
         * @param {*} data - game specific data used during state setup
         * @returns { Promise }
         */
        async start(data) {
            // prepare
            if (this.$state === 'inactive') {
                if (this.dbg) console.log(`${this} starting prepare`);
                // setup state assets
                GadgetCtx.assets.push(this.xassets);
                await GadgetCtx.assets.load();
                await this.$prepare(data);
                if (this.dbg) console.log(`${this} prepare complete`);

                this.$state = 'active';
                this.at_transitioned.trigger( { state:'active' });
            }
            return Promise.resolve();
        }

        /**
         * stop is called by the {@link StateMgr} to stop a state.  The state will transition from 'active' to 'inactive'.
         * @returns { Promise }
         */
        async stop() {
            if (this.$state === 'active') {
                this.$state = 'inactive';
                // clean up state assets
                GadgetCtx.assets.pop();
                this.at_transitioned.trigger( { state:'inactive' });
            }
            return Promise.resolve();
        }

        toString() {
            return Fmt$1.toString(this.constructor.name, this.tag);
        }

    }

    class StateMgr extends Gizmo {

        static start(state, data) {
            GadgetCtx.at_gizmoed.trigger({ tag:'desired', state:state, data:data });
        }
            
        // SCHEMA --------------------------------------------------------------
        static {
            this.$schema( 'dbg', { dflt:false });
            this.$schema( '$states', { parser:() => ({}) });
            this.$schema( '$current' );
        }

        // CONSTRUCTOR ---------------------------------------------------------
        $cpost(spec) {
            super.$cpost(spec);
            GadgetCtx.at_created.listen(this.$on_created, this, false, (evt) => evt.actor instanceof GameState);
            GadgetCtx.at_destroyed.listen(this.$on_destroyed, this, false, (evt) => evt.actor instanceof GameState);
            GadgetCtx.at_gizmoed.listen(this.$on_desired, this, false, (evt) => evt.tag === 'desired');
        }

        // EVENT HANDLERS ------------------------------------------------------
        $on_created(evt) {
            let state = evt.actor;
            // pre-existing?
            if (this.dbg && this.$states[state.tag]) console.log(`${this} replacing state for tag: ${state.tag}`);
            if (this.dbg) console.log(`${this} adding state: ${state} tag: ${state.tag}`);
            this.$states[state.tag] = state;
        }

        $on_destroyed(evt) {
            let state = evt.actor;
            if (state.tag in this.$states) {
                delete this.$states[state.tag];
                if (this.$current && (this.$current.tag === state.tag)) {
                    this.$current = null;
                }
            }
        }

        $on_desired(evt) {
            let newState = evt.state;
            let data = evt.data;
            if (this.dbg) console.log(`${this} onStateWanted: ${Fmt$1.ofmt(evt)} current: ${this.$current} new: ${newState}`);
            if (newState && newState !== this.$current) {
                new Timer({ttl: 0, cb: () => {this.start(newState, data);}});
            }
        }

        // METHODS -------------------------------------------------------------
        get(tag) {
            return this.$states[tag];
        }

        start(tag, data) {
            if (this.dbg) console.log(`${this} starting state: ${tag} with ${Fmt$1.ofmt(data)}`);
            let state = this.$states[tag];
            if (!state) {
                console.error(`invalid state: ${tag}`);
                return;
            }
            // stop current state
            if (this.$current) {
                this.$current.stop();
            }
            // start new state
            state.start(data);
            this.$current = state;
        }

    }

    /** ========================================================================
     * Audio sound effect asset
     */
    class Sfx extends Asset {

        // SCHEMA --------------------------------------------------------------
        static {
            this.$schema('media', { readonly:true });
            this.$schema('channel', { readonly:true, dflt:'sfx' });
            this.$schema('loop', { readonly:true, dflt:false });
            this.$schema('volume', { readonly:true, dflt:1 });
        }

        static from(src, spec={}) {
            let media;
            if (src instanceof Media) {
                media = src;
            } else {
                media = Media.from(src);
            }
            let asset = new this(Object.assign({}, spec, { media:media }));
            return asset;
        }

        // METHODS -------------------------------------------------------------
        async load() {
            if (this.media) {
                return this.media.load();
            } else {
                return Promise.resolve();
            }
        }

    }

    class RenderSystem extends System {

        // STATIC VARIABLES ----------------------------------------------------
        static dfltIterateTTL = 0;
        static dfltMatchFcn = (evt) => evt.actor.canvasable;
        static { this.$schema('$stayActive', { eventable: false, parser: () => false }); }

        // EVENT HANDLERS ------------------------------------------------------
        $on_gizmoCreated(evt) {
            this.$store.set(evt.actor.gid, evt.actor);
            this.active = true;
            evt.actor.at_modified.listen(this.$on_viewModified, this);
            if (this.$iterating) this.$stayActive = true;
        }
        $on_gizmoDestroyed(evt) {
            this.$store.delete(evt.actor.gid);
            this.active = true;
            if (this.$iterating) this.$stayActive = true;
        }
        $on_viewModified(evt) {
            this.active = true;
            if (this.$iterating) this.$stayActive = true;
        }

        // METHODS -------------------------------------------------------------
        $iterate(evt, e) {
            // clear canvas
            e.ctx.clearRect(0, 0, e.canvas.width, e.canvas.height);
            // render
            e.render(e.ctx);
        }

        $finalize() {
            if (this.$stayActive) {
                this.$stayActive = false;
            } else {
                this.active = false;
            }
        }

    }

    class Random {
        static random() {
            return Math.random();
        }

        static randomInt() {
            return Math.random() * Number.MAX_SAFE_INTEGER;
        }

        static rangeInt(min, max) {
            return Math.floor(Math.random() * (Math.abs(max-min)+1)) + Math.min(min,max);
        }

        static jitter(base, pct) {
            let v = base * pct * Math.random();
            return (Math.random() > .5) ? base + v : base - v;
        }

        static range(min, max) {
            return Math.random() * Math.abs(max-min) + Math.min(min,max);
        }

        static choose(arr) {
            if (arr.length === 0) return undefined
            if (arr.length === 1) return arr[0];
            let choice = Math.floor(Math.random() * arr.length);
            return arr[choice];
        }

        static flip(pct=.5) {
            return (Math.random() < pct);
        }

        static shuffle(iter) {
            let shuffled = [];
            let choices = Array.from(iter);
            while (choices.length) {
                let i = this.rangeInt(0, choices.length-1);
                shuffled.push(choices[i]);
                choices.splice(i, 1);
            }
            return shuffled;
        }

        static chooseWeightedOption(arr) {
            // count weights
            if (!arr || !arr.length) return null;
            if (arr.length === 1) return arr[0];
            let weights = arr.reduce((pv, cv) => (pv.weight||1)+(cv.weight||1), 0);
            let choice = Math.random() * weights;
            for (let i=0, t=0; i<arr.length; i++) {
                let w = arr[i].weight || 1;
                if (choice >= t && choice < t+w) {
                    return arr[i];
                }
                t += w;
            }
            return arr[arr.length-1];
        }

    }

    class CachingProperty extends GadgetProperty{

        $check() {
            return true;
        }

        $compute() {
            return null;
        }

        $getter() {
            if (this.$check()) this.$compute();
            return this.$value;
        }

    }

    class DependentProperty extends CachingProperty {
        static deps = [];

        constructor(gzd, xprop={}, xgzd={}) {
            super(gzd, xprop, xgzd);
            this.$deps = ('deps' in xprop) ? xprop.deps : this.constructor.deps;
            this.$lasts = {};
        }

        $check() {
            let recompute = false;
            for (const dep of this.$deps) {
                if (this.$gzd[dep] != this.$lasts[dep]) {
                    recompute = true;
                    this.$lasts[dep] = this.$gzd[dep];
                }
            }
            return recompute;
        }
    }

    class MouseSystem extends System {
        // STATIC VARIABLES ----------------------------------------------------
        static dfltIterateTTL = 0;
        static dfltMatchFcn = (evt) => evt.actor.mousable;

        static { this.$schema('canvasId', { order: -2, readonly: true, dflt:'game.canvas' }); }
        static { this.$schema('canvas', { order: -1, dflt: (o) => UiCanvas.getCanvas(o.canvasId, o.fitToWindow) }); }
        static { this.$schema('pressed', { dflt:false }); };
        static { this.$schema('clicked', { dflt:false }); };
        static { this.$schema('position', { readonly:true, dflt: () => new Vect$1() }); };
        static { this.$schema('scroll', { readonly:true, dflt: () => new Vect$1() }); };

        // CONSTRUCTOR/DESTRUCTOR ----------------------------------------------
        $cpost(spec={}) {
            super.$cpost(spec);
            // -- register event handlers
            this.$on_moved = this.$on_moved.bind(this);
            this.$on_clicked = this.$on_clicked.bind(this);
            this.$on_pressed = this.$on_pressed.bind(this);
            this.$on_unpressed = this.$on_unpressed.bind(this);
            this.$on_wheeled = this.$on_wheeled.bind(this);
            this.canvas.addEventListener('mousemove', this.$on_moved);
            this.canvas.addEventListener('click', this.$on_clicked);
            this.canvas.addEventListener('mousedown', this.$on_pressed);
            this.canvas.addEventListener('mouseup', this.$on_unpressed);
            this.canvas.addEventListener('wheel', this.$on_wheeled);
        }
        destroy() {
            this.canvas.removeEventListener('mousemove', this.$on_moved);
            this.canvas.removeEventListener('click', this.$on_clicked);
            this.canvas.removeEventListener('mousedown', this.$on_pressed);
            this.canvas.removeEventListener('mouseup', this.$on_unpressed);
            super.destroy();
        }

        // EVENT HANDLERS ------------------------------------------------------
        $on_wheeled(sevt) {
            sevt.preventDefault();
            //console.log(`on wheeled: ${Fmt.ofmt(sevt)} wheeling: ${this.$wheeling} delta: ${sevt.deltaX},${sevt.deltaY},${sevt.deltaZ}`);
            this.scrolled = true;
            this.active = true;
            this.scroll.x += sevt.deltaX;
            this.scroll.y += sevt.deltaY;
        }

        $on_clicked(sevt) {
            // capture event data...
            let data = { tag:'mouseclicked', old: this.position.copy(), mouse: new Vect$1({x:sevt.offsetX, y:sevt.offsetY}) };
            // update mouse state
            this.position.x = sevt.offsetX;
            this.position.y = sevt.offsetY;
            this.active = true;
            this.clicked = true;
            // trigger event
            GadgetCtx.at_moused.trigger(data);
        }

        $on_moved(sevt) {
            // capture event data...
            let data = { tag:'mousemoved', old: this.position.copy(), mouse: new Vect$1({x:sevt.offsetX, y:sevt.offsetY}) };
            // update mouse state
            this.position.x = sevt.offsetX;
            this.position.y = sevt.offsetY;
            this.active = true;
            // trigger event
            GadgetCtx.at_moused.trigger(data);
        }

        $on_pressed(sevt) {
            this.pressed = true;
            this.active = true;
        }

        $on_unpressed(sevt) {
            this.pressed = false;
            this.active = true;
        }

        // METHODS -------------------------------------------------------------
        $prepare(evt) {
            this.targets = [];
        }

        $iterate(evt, e) {
            // skip inactive entities
            if (!e.active) return;
            if (e.gzfindInParent((v) => !v.active)) return;
            // determine if view bounds contains mouse point (mouse position is in world coords)
            // -- translate to local position
            let lpos = e.xform.getLocal(this.position);
            let contains = Contains.bounds(e.xform, lpos);
            if (contains) this.targets.push(e);
            if (e.hovered && !contains) {
                e.hovered = false;
                if (e.at_unhovered) e.at_unhovered.trigger({ mouse:this.position });
                if (this.dbg) console.log(`${this} mouse unhovered: ${e}`);
            }
            // FIXME
            //if (e.pressed && (!contains || !this.pressed)) {
            if (e.pressed && (!this.pressed)) {
                e.pressed = false;
                if (e.at_unpressed) e.at_unpressed.trigger({ mouse:this.position });
                if (this.dbg) console.log(`${this} mouse unpressed: ${e}`);
            }
        }

        $finalize(evt) {
            // handle targets (click, enter, down)
            this.targets.sort((a,b) => b.mousePriority-a.mousePriority);
            for (const e of this.targets) {
                // trigger clicked
                if (this.clicked) {
                    if (this.dbg) console.log(`${this} mouse clicked: ${e}`);
                    if (e.at_clicked) e.at_clicked.trigger({ mouse:this.position });
                }
                if (!e.hovered) {
                    e.hovered = true;
                    if (e.at_hovered) e.at_hovered.trigger({ mouse:this.position });
                    if (this.dbg) console.log(`${this} mouse hovered: ${e}`);
                }
                if (this.pressed && !e.pressed) {
                    e.pressed = true;
                    if (e.at_pressed) e.at_pressed.trigger({ mouse:this.position });
                    if (this.dbg) console.log(`${this} mouse pressed: ${e}`);
                }
                if (this.scrolled && e.at_scrolled) {
                    e.at_scrolled.trigger({ scroll:this.scroll.copy() });
                    // only one element can be scrolled at a time
                    break;
                }
                if (e.blocking) break;
            }
            // reset scroll
            this.scroll.x = 0;
            this.scroll.y = 0;
            this.scrolled = false;
            // mouse system is only active if a mouse event is received
            this.active = false;
            this.clicked = false;
        }

    }

    class KeySystem extends System {

        static {
            this.$schema('$pressed', { link: false, readonly: true, parser: () => new Set()});
        }

        $cpost(spec) {
            super.$cpost(spec);
            this.$on_keyDown = this.$on_keyDown.bind(this);
            this.$on_keyUp = this.$on_keyUp.bind(this);
            document.addEventListener('keydown', this.$on_keyDown);
            document.addEventListener('keyup', this.$on_keyUp);
        }

        destroy() {
            super.destroy();
            document.removeEventListener('keydown', this.$on_keyDown);
            document.removeEventListener('keyup', this.$on_keyUp);
        }

        $on_keyDown(sevt) {
            sevt.preventDefault();
            if (!GadgetCtx.interacted) GadgetCtx.interacted = true;
            if (!this.$pressed.has(sevt.key)) {
                this.$pressed.add(sevt.key);
                if (this.dbg) console.log(`${this} key down: ${sevt.key}`);
                GadgetCtx.at_keyed.trigger({
                    tag:'keydowned',
                    key:sevt.key,
                });
            }
        }

        $on_keyUp(sevt) {
            sevt.preventDefault();
            if (this.$pressed.has(sevt.key)) {
                if (this.dbg) console.log(`${this} evt.key up: ${sevt.key}`);
                this.$pressed.delete(sevt.key);
                GadgetCtx.at_keyed.trigger({
                    tag:'keyupped',
                    key:sevt.key,
                });
            }
        }

        get(key) {
            return (this.$pressed.has(key)) ? 1 : 0;
        }

    }

    /**
     * class for static/global game state management, including initial game loading of assets, initializating and starting of global game state
     * @extends Gizmo
     */
    class Game extends Gizmo {
        // STATIC VARIABLES ----------------------------------------------------

        /**
         * xassets is an array of {@link GizmoSpec} specifications that define assets for the game.  These definitions
         * will be parsed and loaded during game startup.  Override this static variable in subclasses to define assets for specific game logic.
         * @static
         */
        static xassets = [];
        static xdflts = [];

        // SCHEMA --------------------------------------------------------------
        /** @member {*} Game#dbg - enables debugging for gizmo */
        static { this.$schema('dbg', { eventable: false, dflt: false}); }
        /** @member {string} Game#name - name for game */
        static { this.$schema('name', { dflt: this.name, readonly: true}); }
        /** @member {int} Game#maxDeltaTime - max value for a single frame delta time */
        static { this.$schema('maxDeltaTime', { eventable: false, dflt: 50 }); }
        /** @member {int} Game#frame - frame counter */
        static { this.$schema('$frame', { eventable: false, parser: () => 0}); }
        /** @member {float} Game#lastUpdate - time of last update */
        static { this.$schema('lastUpdate', { eventable: false, dflt: 0}); }
        /** @member {SystemMgr} Game#systems - game systems {@link System} */
        static { this.$schema('systems', { readonly: true, parser: (o,x) => new SystemMgr()}); }
        /** @member {StateMgr} Game#states - game states {@link GameState} */
        static { this.$schema('states', { readonly: true, parser:(o,x) => new StateMgr() }); }
        static { this.$schema('xdflts', {dflt: (o) => o.constructor.xdflts}); }
        static { this.$schema('xassets', {dflt: (o) => o.constructor.xassets}); }
        /** @member {bool} Game#ticksPerMS - game clock runs on ticks per ms */
        static { this.$schema('ticksPerMS', {dflt: 1}); }
        static { this.$schema('$elapsedRollover', {parser: () => 0}); }

        // CONSTRUCTOR ---------------------------------------------------------
        $cpre(spec) {
            super.$cpre(spec);
            this.$loop = this.$loop.bind(this);
            GadgetCtx.game = this;
        }

        // METHODS -------------------------------------------------------------
        async $doinit() {
            if (this.dbg) console.log(`${this.name} starting initialization`);
            // init contexts
            // -- defaults
            GadgetCtx.dflts.assign(this.xdflts);
            // -- assets
            GadgetCtx.assets.push(this.xassets);
            // game init
            await this.$init();
            if (this.dbg) console.log(`${this.name} initialization complete`);
            return Promise.resolve();
        }

        /**
         * init is called during game startup to perform any initialization that is required before assets are loaded.  
         * Override to perform game specific initialization.
         * @returns {Promise}
         */
        async $init() {
            return Promise.resolve();
        }

        async $doload() {
            if (this.dbg) console.log(`${this.name} starting loading`);
            await GadgetCtx.assets.load();
            await this.$load();
            if (this.dbg) console.log(`${this.name} loading complete`);
            return Promise.resolve();
        }

        /**
         * load is called during game startup to perform game loading functions.  
         * @returns {Promise}
         */
        async $load() {
            return Promise.resolve();
        }

        $prepareSystems() {
            new KeySystem({ dbg:false });
            new MouseSystem({ dbg:false });
            new RenderSystem({ dbg:false });
            new SfxSystem({ dbg:false });
        }

        async $doprepare() {
            if (this.dbg) console.log(`${this.name} starting prepare`);
            // -- bring game systems online
            this.$prepareSystems();
            // -- game specific prepare
            await this.$prepare();
            if (this.dbg) console.log(`${this.name} prepare complete`);
            return Promise.resolve();
        }

        /**
         * prepare is the final stage of game startup.  This method should be overwritten to provide game-specific
         * logic to start your game.
         * @returns {Promise}
         */
        async $prepare() {
            return Promise.resolve();
        }

        /**
         * start is called to start the game.  It will call init, load, and prepare in order and wait for each stage to complete.  Then the main
         * game loop is started.
         * @returns {Promise}
         */
        async start() {
            // initialization
            await this.$doinit();
            // load
            await this.$doload();
            // prepare
            await this.$doprepare();
            GadgetCtx.at_gizmoed.trigger({ actor:this, tag:'started' });
            // start the game loop
            window.requestAnimationFrame(this.$loop);
            return Promise.resolve();
        }

        $loop(timestamp) {
            // increment frame counter
            this.$frame++;
            // compute elapsed
            const elapsed = Math.min(this.maxDeltaTime, timestamp - this.lastUpdate);
            this.lastUpdate = timestamp;
            // compute ticks on the game clock
            let ticksTotal = (elapsed+this.$elapsedRollover)*this.ticksPerMS;
            let ticks = Math.floor(ticksTotal);
            this.$elapsedRollover = Math.round((ticksTotal - ticks)/this.ticksPerMS);
            // trigger tock event
            GadgetCtx.at_tocked.trigger({ elapsed:parseInt(elapsed), ticks:ticks, frame:this.$frame });
            // next iteration
            window.requestAnimationFrame(this.$loop);
        }

    }

    //         ctl #t# #t# ctr
    //         #l# #m# #m# #r#
    // ctl #t# jtl #m# #m# jtr #t# ctr
    // #l# #m# #m# #m# #m# #m# #m# #r#
    // #l# #m# #m# #m# #m# #m# #m# #r#
    // cbl #b# jbl #m# #m# jbr #b# cbr
    //         #l# #m# #m# #r#
    //         cbl #b# #b# cbr

    const WEST =                    1;
    const NORTHWEST =               2;
    const NORTH =                   3;
    const NORTHEAST =               4;
    const EAST =                    5;
    const SOUTHEAST =               6;
    const SOUTH =                   7;
    const SOUTHWEST =               8;

    const WEST_NORTH =              9;
    const WEST_NORTHWEST =          10;
    const NORTH_WEST =              11;
    const NORTH_NORTHWEST =         12;
    const NORTHWEST_WEST =          13;
    const NORTHWEST_NORTH =         14;
    const WEST_NORTH_NORTHWEST =    15;
    const WEST_NORTHWEST_NORTH =    16;
    const NORTH_WEST_NORTHWEST =    17;
    const NORTH_NORTHWEST_WEST =    18;
    const NORTHWEST_WEST_NORTH =    19;
    const NORTHWEST_NORTH_WEST =    20;

    const EAST_NORTH =              9;
    const EAST_NORTHEAST =          10;
    const NORTH_EAST =              11;
    const NORTH_NORTHEAST =         12;
    const NORTHEAST_EAST =          13;
    const NORTHEAST_NORTH =         14;
    const EAST_NORTH_NORTHEAST =    15;
    const EAST_NORTHEAST_NORTH =    16;
    const NORTH_EAST_NORTHEAST =    17;
    const NORTH_NORTHEAST_EAST =    18;
    const NORTHEAST_EAST_NORTH =    19;
    const NORTHEAST_NORTH_EAST =    20;

    const WEST_SOUTH =              9;
    const WEST_SOUTHWEST =          10;
    const SOUTH_WEST =              11;
    const SOUTH_SOUTHWEST =         12;
    const SOUTHWEST_WEST =          13;
    const SOUTHWEST_SOUTH =         14;
    const WEST_SOUTH_SOUTHWEST =    15;
    const WEST_SOUTHWEST_SOUTH =    16;
    const SOUTH_WEST_SOUTHWEST =    17;
    const SOUTH_SOUTHWEST_WEST =    18;
    const SOUTHWEST_WEST_SOUTH =    19;
    const SOUTHWEST_SOUTH_WEST =    20;

    const EAST_SOUTH =              9;
    const EAST_SOUTHEAST =          10;
    const SOUTH_EAST =              11;
    const SOUTH_SOUTHEAST =         12;
    const SOUTHEAST_EAST =          13;
    const SOUTHEAST_SOUTH =         14;
    const EAST_SOUTH_SOUTHEAST =    15;
    const EAST_SOUTHEAST_SOUTH =    16;
    const SOUTH_EAST_SOUTHEAST =    17;
    const SOUTH_SOUTHEAST_EAST =    18;
    const SOUTHEAST_EAST_SOUTH =    19;
    const SOUTHEAST_SOUTH_EAST =    20;

    class $TileOverlay extends Gadget {
        static {
            this.$schema('idx', {readonly:true });
            this.$schema('grid', { readonly:true });
            this.$schema('priorityMap', { readonly:true, dflt:() => { return ({}); } });
            this.$schema('assetMap', { readonly:true });
            this.$schema('halfSize', { readonly:true, dflt: () => new Vect$1({x:16, y:16}) });

            this.$schema('$tl_mask', { eventable:false });
            this.$schema('$tr_mask', { eventable:false });
            this.$schema('$bl_mask', { eventable:false });
            this.$schema('$br_mask', { eventable:false });

            this.$schema('$tl_west', { eventable:false, link:true });
            this.$schema('$tl_northWest', { eventable:false, link:true });
            this.$schema('$tl_north', { eventable:false, link:true });

            this.$schema('$tr_north', { eventable:false, link:true });
            this.$schema('$tr_northEast', { eventable:false, link:true });
            this.$schema('$tr_east', { eventable:false, link:true });

            this.$schema('$br_east', { eventable:false, link:true });
            this.$schema('$br_southEast', { eventable:false, link:true });
            this.$schema('$br_south', { eventable:false, link:true });

            this.$schema('$bl_south', { eventable:false, link:true });
            this.$schema('$bl_southWest', { eventable:false, link:true });
            this.$schema('$bl_west', { eventable:false, link:true });
        }

        $cpost(spec) {
            super.$cpost(spec);
            this.$compute();
        }

        $resolveSketch(which, tag, side) {
            let assetTag = `${tag}_${side}`;
            //console.log(`which:${which} assettag:${assetTag}`);
            if (!(this[which]) || this[which].tag !== assetTag) {
                this[which] = GadgetCtx.assets.get(assetTag);
            }
        }

        /**
         * top left
         * 
         * XXX|XXX    |    XXX|       |XXX XXX|    XXX|XXX    |XXX XXX|XXX
         * ---+--- ---+--- ---+--- ---+--- ---+--- ---+--- ---+--- ---+---
         * XXX|??? XXX|#r#    |cbr    |#b# XXX|#r#    |#b# XXX|jbr XXX|jbr
         */
        $computeTopLeft(priority) {
            // lookup neighbor info
            let t_west = this.grid.getidx(this.grid.idxFromDir(this.idx, Direction.west));
            let p_west = this.priorityMap[t_west] || 0;
            let t_north = this.grid.getidx(this.grid.idxFromDir(this.idx, Direction.north));
            let p_north = this.priorityMap[t_north] || 0;
            let t_northWest = this.grid.getidx(this.grid.idxFromDir(this.idx, Direction.northWest));
            let p_northWest = this.priorityMap[t_northWest] || 0;
            if (this.assetMap) t_west = this.assetMap[t_west];
            if (this.assetMap) t_north = this.assetMap[t_north];
            if (this.assetMap) t_northWest = this.assetMap[t_northWest];
            //console.log(`north:${t_north}|${p_north} northWest:${t_northWest}|${p_northWest} west:${t_west}|${p_west}`);
            // -- west overlap
            if (p_west > priority) {
                let side;
                if (p_west === p_north) {
                    side = 'jbr';
                } else {
                    side = 'r';
                }
                this.$resolveSketch('$tl_west', t_west, side);
            } else {
                this.$tl_west = null;
            }
            // -- northWest overlap
            if (p_northWest > priority) {
                let side;
                if ((p_northWest === p_west) && (p_northWest === p_north)) {
                    side = 'jbr';
                } else if (p_northWest === p_north) {
                    side = 'b';
                } else if (p_northWest === p_west) {
                    side = 'r';
                } else {
                    side = 'cbr';
                }
                this.$resolveSketch('$tl_northWest', t_northWest, side);
            } else {
                this.$tl_northWest = null;
            }
            // -- north overlap
            if (p_north > priority) {
                let side;
                if (p_north === p_west) {
                    side = 'jbr';
                } else {
                    side = 'b';
                }
                this.$resolveSketch('$tl_north', t_north, side);
            } else {
                this.$tl_north = null;
            }
            // compute order
            if (this.$tl_north && this.$tl_northWest && this.$tl_west) {
                if ((p_north <= p_northWest) && (p_north <= p_west)) {
                    if (p_northWest <= p_west) {
                        this.$tl_mask = NORTH_NORTHWEST_WEST;
                    } else {
                        this.$tl_mask = NORTH_WEST_NORTHWEST;
                    }
                } else if ((p_west <= p_northWest) && (p_west <= p_north)) {
                    if (p_northWest <= p_north) {
                        this.$tl_mask = WEST_NORTHWEST_NORTH;
                    } else {
                        this.$tl_mask = WEST_NORTH_NORTHWEST;
                    }
                } else {
                    if (p_west <= p_north) {
                        this.$tl_mask = NORTHWEST_WEST_NORTH;
                    } else {
                        this.$tl_mask = NORTHWEST_NORTH_WEST;
                    }
                }
            } else if (this.$tl_north && this.$tl_northWest) {
                if (p_north <= p_northWest) {
                    this.$tl_mask = NORTH_NORTHWEST;
                } else {
                    this.$tl_mask = NORTHWEST_NORTH;
                }
            } else if (this.$tl_northWest && this.$tl_west) {
                if (p_northWest <= p_west) {
                    this.$tl_mask = NORTHWEST_WEST;
                } else {
                    this.$tl_mask = WEST_NORTHWEST;
                }
            } else if (this.$tl_north && this.$tl_west) {
                if (p_north <= p_west) {
                    this.$tl_mask = NORTH_WEST;
                } else {
                    this.$tl_mask = WEST_NORTH;
                }
            } else if (this.$tl_north) {
                    this.$tl_mask = NORTH;
            } else if (this.$tl_northWest) {
                    this.$tl_mask = NORTHWEST;
            } else if (this.$tl_west) {
                    this.$tl_mask = WEST;
            } else {
                this.$tl_mask = 0;
            }
        }

        /**
         * top right
         * 
         * XXX|XXX    |       |XXX XXX|       |XXX XXX|XXX XXX|    XXX|XXX
         * ---+--- ---+--- ---+--- ---+--- ---+--- ---+--- ---+--- ---+---
         * ???|XXX #l#|XXX cbl|    #b#|    #l#|XXX #b#|    jbl|XXX jbl|XXX
         */
        $computeTopRight(priority) {
            // lookup neighbor info
            let t_east = this.grid.getidx(this.grid.idxFromDir(this.idx, Direction.east));
            let p_east = this.priorityMap[t_east] || 0;
            let t_north = this.grid.getidx(this.grid.idxFromDir(this.idx, Direction.north));
            let p_north = this.priorityMap[t_north] || 0;
            let t_northEast = this.grid.getidx(this.grid.idxFromDir(this.idx, Direction.northEast));
            let p_northEast = this.priorityMap[t_northEast] || 0;
            if (this.assetMap) t_east = this.assetMap[t_east];
            if (this.assetMap) t_north = this.assetMap[t_north];
            if (this.assetMap) t_northEast = this.assetMap[t_northEast];
            //console.log(`north:${t_north}|${p_north} northEast:${t_northEast}|${p_northEast} east:${t_east}|${p_east}`);
            // -- east overlap
            if (p_east > priority) {
                let side;
                if (p_east === p_north) {
                    side = 'jbl';
                } else {
                    side = 'l';
                }
                this.$resolveSketch('$tr_east', t_east, side);
            } else {
                this.$tr_east = null;
            }
            // -- northEast overlap
            if (p_northEast > priority) {
                let side;
                if ((p_northEast === p_east) && (p_northEast === p_north)) {
                    side = 'jbl';
                } else if (p_northEast === p_north) {
                    side = 'b';
                } else if (p_northEast === p_east) {
                    side = 'l';
                } else {
                    side = 'cbl';
                }
                this.$resolveSketch('$tr_northEast', t_northEast, side);
            } else {
                this.$tr_northEast = null;
            }
            // -- north overlap
            if (p_north > priority) {
                let side;
                if (p_north === p_east) {
                    side = 'jbl';
                } else {
                    side = 'b';
                }
                this.$resolveSketch('$tr_north', t_north, side);
            } else {
                this.$tr_north = null;
            }
            // compute order
            if (this.$tr_north && this.$tr_northEast && this.$tr_east) {
                if ((p_north <= p_northEast) && (p_north <= p_east)) {
                    if (p_northEast <= p_east) {
                        this.$tr_mask = NORTH_NORTHEAST_EAST;
                    } else {
                        this.$tr_mask = NORTH_EAST_NORTHEAST;
                    }
                } else if ((p_east <= p_northEast) && (p_east <= p_north)) {
                    if (p_northEast <= p_north) {
                        this.$tr_mask = EAST_NORTHEAST_NORTH;
                    } else {
                        this.$tr_mask = EAST_NORTH_NORTHEAST;
                    }
                } else {
                    if (p_east <= p_north) {
                        this.$tr_mask = NORTHEAST_EAST_NORTH;
                    } else {
                        this.$tr_mask = NORTHEAST_NORTH_EAST;
                    }
                }
            } else if (this.$tr_north && this.$tr_northEast) {
                if (p_north <= p_northEast) {
                    this.$tr_mask = NORTH_NORTHEAST;
                } else {
                    this.$tr_mask = NORTHEAST_NORTH;
                }
            } else if (this.$tr_northEast && this.$tr_east) {
                if (p_northEast <= p_east) {
                    this.$tr_mask = NORTHEAST_EAST;
                } else {
                    this.$tr_mask = EAST_NORTHEAST;
                }
            } else if (this.$tr_north && this.$tr_east) {
                if (p_north <= p_east) {
                    this.$tr_mask = NORTH_EAST;
                } else {
                    this.$tr_mask = EAST_NORTH;
                }
            } else if (this.$tr_north) {
                    this.$tr_mask = NORTH;
            } else if (this.$tr_northEast) {
                    this.$tr_mask = NORTHEAST;
            } else if (this.$tr_east) {
                    this.$tr_mask = EAST;
            } else {
                this.$tr_mask = 0;
            }
        }

        /**
         * bottom left
         * 
         * XXX|??? XXX|#r#    |ctr    |#t# XXX|#r#    |#t# XXX|jtr XXX|jtr
         * ---+--- ---+--- ---+--- ---+--- ---+--- ---+--- ---+--- ---+---
         * XXX|XXX    |    XXX|       |XXX XXX|    XXX|XXX    |XXX XXX|XXX
         */
        $computeBottomLeft(priority) {
            // lookup neighbor info
            let t_west = this.grid.getidx(this.grid.idxFromDir(this.idx, Direction.west));
            let p_west = this.priorityMap[t_west] || 0;
            let t_south = this.grid.getidx(this.grid.idxFromDir(this.idx, Direction.south));
            let p_south = this.priorityMap[t_south] || 0;
            let t_southWest = this.grid.getidx(this.grid.idxFromDir(this.idx, Direction.southWest));
            let p_southWest = this.priorityMap[t_southWest] || 0;
            if (this.assetMap) t_west = this.assetMap[t_west];
            if (this.assetMap) t_south = this.assetMap[t_south];
            if (this.assetMap) t_southWest = this.assetMap[t_southWest];
            //console.log(`south:${t_south}|${p_south} southWest:${t_southWest}|${p_southWest} west:${t_west}|${p_west}`);
            // -- west overlap
            if (p_west > priority) {
                let side;
                if (p_west === p_south) {
                    side = 'jtr';
                } else {
                    side = 'r';
                }
                this.$resolveSketch('$bl_west', t_west, side);
            } else {
                this.$bl_west = null;
            }
            // -- southWest overlap
            if (p_southWest > priority) {
                let side;
                if ((p_southWest === p_west) && (p_southWest === p_south)) {
                    side = 'jtr';
                } else if (p_southWest === p_south) {
                    side = 't';
                } else if (p_southWest === p_west) {
                    side = 'r';
                } else {
                    side = 'ctr';
                }
                this.$resolveSketch('$bl_southWest', t_southWest, side);
            } else {
                this.$bl_southWest = null;
            }
            // -- south overlap
            if (p_south > priority) {
                let side;
                if (p_south === p_west) {
                    side = 'jtr';
                } else {
                    side = 't';
                }
                this.$resolveSketch('$bl_south', t_south, side);
            } else {
                this.$bl_south = null;
            }
            // compute order
            if (this.$bl_south && this.$bl_southWest && this.$bl_west) {
                if ((p_south <= p_southWest) && (p_south <= p_west)) {
                    if (p_southWest <= p_west) {
                        this.$bl_mask = SOUTH_SOUTHWEST_WEST;
                    } else {
                        this.$bl_mask = SOUTH_WEST_SOUTHWEST;
                    }
                } else if ((p_west <= p_southWest) && (p_west <= p_south)) {
                    if (p_southWest <= p_south) {
                        this.$bl_mask = WEST_SOUTHWEST_SOUTH;
                    } else {
                        this.$bl_mask = WEST_SOUTH_SOUTHWEST;
                    }
                } else {
                    if (p_west <= p_south) {
                        this.$bl_mask = SOUTHWEST_WEST_SOUTH;
                    } else {
                        this.$bl_mask = SOUTHWEST_SOUTH_WEST;
                    }
                }
            } else if (this.$bl_south && this.$bl_southWest) {
                if (p_south <= p_southWest) {
                    this.$bl_mask = SOUTH_SOUTHWEST;
                } else {
                    this.$bl_mask = SOUTHWEST_SOUTH;
                }
            } else if (this.$bl_southWest && this.$bl_west) {
                if (p_southWest <= p_west) {
                    this.$bl_mask = SOUTHWEST_WEST;
                } else {
                    this.$bl_mask = WEST_SOUTHWEST;
                }
            } else if (this.$bl_south && this.$bl_west) {
                if (p_south <= p_west) {
                    this.$bl_mask = SOUTH_WEST;
                } else {
                    this.$bl_mask = WEST_SOUTH;
                }
            } else if (this.$bl_south) {
                    this.$bl_mask = SOUTH;
            } else if (this.$bl_southWest) {
                    this.$bl_mask = SOUTHWEST;
            } else if (this.$bl_west) {
                    this.$bl_mask = WEST;
            } else {
                this.$bl_mask = 0;
            }
        }

        /**
         * bottom right
         * 
         * ???|XXX #l#|XXX ctl|    #t#|    #l#|XXX #t#|    jtl|XXX jtl|XXX
         * ---+--- ---+--- ---+--- ---+--- ---+--- ---+--- ---+--- ---+---
         * XXX|XXX    |       |XXX XXX|       |XXX XXX|XXX XXX|    XXX|XXX
         */
        $computeBottomRight(priority) {
            // lookup neighbor info
            let t_east = this.grid.getidx(this.grid.idxFromDir(this.idx, Direction.east));
            let p_east = this.priorityMap[t_east] || 0;
            let t_south = this.grid.getidx(this.grid.idxFromDir(this.idx, Direction.south));
            let p_south = this.priorityMap[t_south] || 0;
            let t_southEast = this.grid.getidx(this.grid.idxFromDir(this.idx, Direction.southEast));
            let p_southEast = this.priorityMap[t_southEast] || 0;
            if (this.assetMap) t_east = this.assetMap[t_east];
            if (this.assetMap) t_south = this.assetMap[t_south];
            if (this.assetMap) t_southEast = this.assetMap[t_southEast];
            // console.log(`south:${t_south}|${p_south} southEast:${t_southEast}|${p_southEast} east:${t_east}|${p_east}`);
            // -- east overlap
            if (p_east > priority) {
                let side;
                if (p_east === p_south) {
                    side = 'jtl';
                } else {
                    side = 'l';
                }
                this.$resolveSketch('$br_east', t_east, side);
            } else {
                this.$br_east = null;
            }
            // -- southEast overlap
            if (p_southEast > priority) {
                let side;
                if ((p_southEast === p_east) && (p_southEast === p_south)) {
                    side = 'jtl';
                } else if (p_southEast === p_south) {
                    side = 't';
                } else if (p_southEast === p_east) {
                    side = 'l';
                } else {
                    side = 'ctl';
                }
                this.$resolveSketch('$br_southEast', t_southEast, side);
            } else {
                this.$br_southEast = null;
            }
            // -- south overlap
            if (p_south > priority) {
                let side;
                if (p_south === p_east) {
                    side = 'jtl';
                } else {
                    side = 't';
                }
                this.$resolveSketch('$br_south', t_south, side);
            } else {
                this.$br_south = null;
            }
            // compute order
            if (this.$br_south && this.$br_southEast && this.$br_east) {
                if ((p_south <= p_southEast) && (p_south <= p_east)) {
                    if (p_southEast <= p_east) {
                        this.$br_mask = SOUTH_SOUTHEAST_EAST;
                    } else {
                        this.$br_mask = SOUTH_EAST_SOUTHEAST;
                    }
                } else if ((p_east <= p_southEast) && (p_east <= p_south)) {
                    if (p_southEast <= p_south) {
                        this.$br_mask = EAST_SOUTHEAST_SOUTH;
                    } else {
                        this.$br_mask = EAST_SOUTH_SOUTHEAST;
                    }
                } else {
                    if (p_east <= p_south) {
                        this.$br_mask = SOUTHEAST_EAST_SOUTH;
                    } else {
                        this.$br_mask = SOUTHEAST_SOUTH_EAST;
                    }
                }
            } else if (this.$br_south && this.$br_southEast) {
                if (p_south <= p_southEast) {
                    this.$br_mask = SOUTH_SOUTHEAST;
                } else {
                    this.$br_mask = SOUTHEAST_SOUTH;
                }
            } else if (this.$br_southEast && this.$br_east) {
                if (p_southEast <= p_east) {
                    this.$br_mask = SOUTHEAST_EAST;
                } else {
                    this.$br_mask = EAST_SOUTHEAST;
                }
            } else if (this.$br_south && this.$br_east) {
                if (p_south <= p_east) {
                    this.$br_mask = SOUTH_EAST;
                } else {
                    this.$br_mask = EAST_SOUTH;
                }
            } else if (this.$br_south) {
                    this.$br_mask = SOUTH;
            } else if (this.$br_southEast) {
                    this.$br_mask = SOUTHEAST;
            } else if (this.$br_east) {
                    this.$br_mask = EAST;
            } else {
                this.$br_mask = 0;
            }
        }

        $compute() {
            let tag = this.grid.getidx(this.idx);
            let priority = this.priorityMap[tag] || 0;
            this.$computeTopLeft(priority);
            this.$computeTopRight(priority);
            this.$computeBottomLeft(priority);
            this.$computeBottomRight(priority);
        }

        render(ctx, x=0, y=0, width=0, height=0) {
            //console.log(`render[${this.idx}]: ${x},${y} ${width},${height} ${this.$tl_mask},${this.$tr_mask},${this.$bl_mask},${this.$br_mask}`);
            let hwidth = width/2;
            let hheight = height/2;
            // top left
            let sx = x;
            let sy = y;
            switch (this.$tl_mask) {
                case WEST:
                    this.$tl_west.render(ctx, sx, sy, hwidth, hheight);
                    break;
                case NORTHWEST:
                    this.$tl_northWest.render(ctx, sx, sy, hwidth, hheight);
                    break;
                case NORTH:
                    this.$tl_north.render(ctx, sx, sy, hwidth, hheight);
                    break;
                case WEST_NORTH:
                    this.$tl_west.render(ctx, sx, sy, hwidth, hheight);
                    this.$tl_north.render(ctx, sx, sy, hwidth, hheight);
                    break;
                case NORTH_WEST:
                    this.$tl_north.render(ctx, sx, sy, hwidth, hheight);
                    this.$tl_west.render(ctx, sx, sy, hwidth, hheight);
                    break;
                case WEST_NORTHWEST:
                    this.$tl_west.render(ctx, sx, sy, hwidth, hheight);
                    this.$tl_northWest.render(ctx, sx, sy, hwidth, hheight);
                    break;
                case NORTHWEST_WEST:
                    this.$tl_northWest.render(ctx, sx, sy, hwidth, hheight);
                    this.$tl_west.render(ctx, sx, sy, hwidth, hheight);
                    break;
                case NORTH_NORTHWEST:
                    this.$tl_north.render(ctx, sx, sy, hwidth, hheight);
                    this.$tl_northWest.render(ctx, sx, sy, hwidth, hheight);
                    break;
                case NORTHWEST_NORTH:
                    this.$tl_northWest.render(ctx, sx, sy, hwidth, hheight);
                    this.$tl_north.render(ctx, sx, sy, hwidth, hheight);
                    break;
                case WEST_NORTH_NORTHWEST:
                    this.$tl_west.render(ctx, sx, sy, hwidth, hheight);
                    this.$tl_north.render(ctx, sx, sy, hwidth, hheight);
                    this.$tl_northWest.render(ctx, sx, sy, hwidth, hheight);
                    break;
                case WEST_NORTHWEST_NORTH:
                    this.$tl_west.render(ctx, sx, sy, hwidth, hheight);
                    this.$tl_northWest.render(ctx, sx, sy, hwidth, hheight);
                    this.$tl_north.render(ctx, sx, sy, hwidth, hheight);
                    break;
                case NORTH_WEST_NORTHWEST:
                    this.$tl_north.render(ctx, sx, sy, hwidth, hheight);
                    this.$tl_west.render(ctx, sx, sy, hwidth, hheight);
                    this.$tl_northWest.render(ctx, sx, sy, hwidth, hheight);
                    break;
                case NORTH_NORTHWEST_WEST:
                    this.$tl_north.render(ctx, sx, sy, hwidth, hheight);
                    this.$tl_northWest.render(ctx, sx, sy, hwidth, hheight);
                    this.$tl_west.render(ctx, sx, sy, hwidth, hheight);
                    break;
                case NORTHWEST_WEST_NORTH:
                    this.$tl_northWest.render(ctx, sx, sy, hwidth, hheight);
                    this.$tl_west.render(ctx, sx, sy, hwidth, hheight);
                    this.$tl_north.render(ctx, sx, sy, hwidth, hheight);
                    break;
                case NORTHWEST_NORTH_WEST:
                    this.$tl_northWest.render(ctx, sx, sy, hwidth, hheight);
                    this.$tl_north.render(ctx, sx, sy, hwidth, hheight);
                    this.$tl_west.render(ctx, sx, sy, hwidth, hheight);
                    break;
            }

            // top right
            sx = x + this.halfSize.x;
            sy = y;
            switch (this.$tr_mask) {
                case EAST:
                    this.$tr_east.render(ctx, sx, sy, hwidth, hheight);
                    break;
                case NORTHEAST:
                    this.$tr_northEast.render(ctx, sx, sy, hwidth, hheight);
                    break;
                case NORTH:
                    this.$tr_north.render(ctx, sx, sy, hwidth, hheight);
                    break;
                case EAST_NORTH:
                    this.$tr_east.render(ctx, sx, sy, hwidth, hheight);
                    this.$tr_north.render(ctx, sx, sy, hwidth, hheight);
                    break;
                case NORTH_EAST:
                    this.$tr_north.render(ctx, sx, sy, hwidth, hheight);
                    this.$tr_east.render(ctx, sx, sy, hwidth, hheight);
                    break;
                case EAST_NORTHEAST:
                    this.$tr_east.render(ctx, sx, sy, hwidth, hheight);
                    this.$tr_northEast.render(ctx, sx, sy, hwidth, hheight);
                    break;
                case NORTHEAST_EAST:
                    this.$tr_northEast.render(ctx, sx, sy, hwidth, hheight);
                    this.$tr_east.render(ctx, sx, sy, hwidth, hheight);
                    break;
                case NORTH_NORTHEAST:
                    this.$tr_north.render(ctx, sx, sy, hwidth, hheight);
                    this.$tr_northEast.render(ctx, sx, sy, hwidth, hheight);
                    break;
                case NORTHEAST_NORTH:
                    this.$tr_northEast.render(ctx, sx, sy, hwidth, hheight);
                    this.$tr_north.render(ctx, sx, sy, hwidth, hheight);
                    break;
                case EAST_NORTH_NORTHEAST:
                    this.$tr_east.render(ctx, sx, sy, hwidth, hheight);
                    this.$tr_north.render(ctx, sx, sy, hwidth, hheight);
                    this.$tr_northEast.render(ctx, sx, sy, hwidth, hheight);
                    break;
                case EAST_NORTHEAST_NORTH:
                    this.$tr_east.render(ctx, sx, sy, hwidth, hheight);
                    this.$tr_northEast.render(ctx, sx, sy, hwidth, hheight);
                    this.$tr_north.render(ctx, sx, sy, hwidth, hheight);
                    break;
                case NORTH_EAST_NORTHEAST:
                    this.$tr_north.render(ctx, sx, sy, hwidth, hheight);
                    this.$tr_east.render(ctx, sx, sy, hwidth, hheight);
                    this.$tr_northEast.render(ctx, sx, sy, hwidth, hheight);
                    break;
                case NORTH_NORTHEAST_EAST:
                    this.$tr_north.render(ctx, sx, sy, hwidth, hheight);
                    this.$tr_northEast.render(ctx, sx, sy, hwidth, hheight);
                    this.$tr_east.render(ctx, sx, sy, hwidth, hheight);
                    break;
                case NORTHEAST_EAST_NORTH:
                    this.$tr_northEast.render(ctx, sx, sy, hwidth, hheight);
                    this.$tr_east.render(ctx, sx, sy, hwidth, hheight);
                    this.$tr_north.render(ctx, sx, sy, hwidth, hheight);
                    break;
                case NORTHEAST_NORTH_EAST:
                    this.$tr_northEast.render(ctx, sx, sy, hwidth, hheight);
                    this.$tr_north.render(ctx, sx, sy, hwidth, hheight);
                    this.$tr_east.render(ctx, sx, sy, hwidth, hheight);
                    break;
            }

            // bottom left
            sx = x;
            sy = y + this.halfSize.y;
            switch (this.$bl_mask) {
                case WEST:
                    this.$bl_west.render(ctx, sx, sy, hwidth, hheight);
                    break;
                case SOUTHWEST:
                    this.$bl_southWest.render(ctx, sx, sy, hwidth, hheight);
                    break;
                case SOUTH:
                    this.$bl_south.render(ctx, sx, sy, hwidth, hheight);
                    break;
                case WEST_SOUTH:
                    this.$bl_west.render(ctx, sx, sy, hwidth, hheight);
                    this.$bl_south.render(ctx, sx, sy, hwidth, hheight);
                    break;
                case SOUTH_WEST:
                    this.$bl_south.render(ctx, sx, sy, hwidth, hheight);
                    this.$bl_west.render(ctx, sx, sy, hwidth, hheight);
                    break;
                case WEST_SOUTHWEST:
                    this.$bl_west.render(ctx, sx, sy, hwidth, hheight);
                    this.$bl_southWest.render(ctx, sx, sy, hwidth, hheight);
                    break;
                case SOUTHWEST_WEST:
                    this.$bl_southWest.render(ctx, sx, sy, hwidth, hheight);
                    this.$bl_west.render(ctx, sx, sy, hwidth, hheight);
                    break;
                case SOUTH_SOUTHWEST:
                    this.$bl_south.render(ctx, sx, sy, hwidth, hheight);
                    this.$bl_southWest.render(ctx, sx, sy, hwidth, hheight);
                    break;
                case SOUTHWEST_SOUTH:
                    this.$bl_southWest.render(ctx, sx, sy, hwidth, hheight);
                    this.$bl_south.render(ctx, sx, sy, hwidth, hheight);
                    break;
                case WEST_SOUTH_SOUTHWEST:
                    this.$bl_west.render(ctx, sx, sy, hwidth, hheight);
                    this.$bl_south.render(ctx, sx, sy, hwidth, hheight);
                    this.$bl_southWest.render(ctx, sx, sy, hwidth, hheight);
                    break;
                case WEST_SOUTHWEST_SOUTH:
                    this.$bl_west.render(ctx, sx, sy, hwidth, hheight);
                    this.$bl_southWest.render(ctx, sx, sy, hwidth, hheight);
                    this.$bl_south.render(ctx, sx, sy, hwidth, hheight);
                    break;
                case SOUTH_WEST_SOUTHWEST:
                    this.$bl_south.render(ctx, sx, sy, hwidth, hheight);
                    this.$bl_west.render(ctx, sx, sy, hwidth, hheight);
                    this.$bl_southWest.render(ctx, sx, sy, hwidth, hheight);
                    break;
                case SOUTH_SOUTHWEST_WEST:
                    this.$bl_south.render(ctx, sx, sy, hwidth, hheight);
                    this.$bl_southWest.render(ctx, sx, sy, hwidth, hheight);
                    this.$bl_west.render(ctx, sx, sy, hwidth, hheight);
                    break;
                case SOUTHWEST_WEST_SOUTH:
                    this.$bl_southWest.render(ctx, sx, sy, hwidth, hheight);
                    this.$bl_west.render(ctx, sx, sy, hwidth, hheight);
                    this.$bl_south.render(ctx, sx, sy, hwidth, hheight);
                    break;
                case SOUTHWEST_SOUTH_WEST:
                    this.$bl_southWest.render(ctx, sx, sy, hwidth, hheight);
                    this.$bl_south.render(ctx, sx, sy, hwidth, hheight);
                    this.$bl_west.render(ctx, sx, sy, hwidth, hheight);
                    break;
            }

            // bottom right
            sx = x + this.halfSize.x;
            sy = y + this.halfSize.y;
            switch (this.$br_mask) {
                case EAST:
                    this.$br_east.render(ctx, sx, sy, hwidth, hheight);
                    break;
                case SOUTHEAST:
                    this.$br_southEast.render(ctx, sx, sy, hwidth, hheight);
                    break;
                case SOUTH:
                    this.$br_south.render(ctx, sx, sy, hwidth, hheight);
                    break;
                case EAST_SOUTH:
                    this.$br_east.render(ctx, sx, sy, hwidth, hheight);
                    this.$br_south.render(ctx, sx, sy, hwidth, hheight);
                    break;
                case SOUTH_EAST:
                    this.$br_south.render(ctx, sx, sy, hwidth, hheight);
                    this.$br_east.render(ctx, sx, sy, hwidth, hheight);
                    break;
                case EAST_SOUTHEAST:
                    this.$br_east.render(ctx, sx, sy, hwidth, hheight);
                    this.$br_southEast.render(ctx, sx, sy, hwidth, hheight);
                    break;
                case SOUTHEAST_EAST:
                    this.$br_southEast.render(ctx, sx, sy, hwidth, hheight);
                    this.$br_east.render(ctx, sx, sy, hwidth, hheight);
                    break;
                case SOUTH_SOUTHEAST:
                    this.$br_south.render(ctx, sx, sy, hwidth, hheight);
                    this.$br_southEast.render(ctx, sx, sy, hwidth, hheight);
                    break;
                case SOUTHEAST_SOUTH:
                    this.$br_southEast.render(ctx, sx, sy, hwidth, hheight);
                    this.$br_south.render(ctx, sx, sy, hwidth, hheight);
                    break;
                case EAST_SOUTH_SOUTHEAST:
                    this.$br_east.render(ctx, sx, sy, hwidth, hheight);
                    this.$br_south.render(ctx, sx, sy, hwidth, hheight);
                    this.$br_southEast.render(ctx, sx, sy, hwidth, hheight);
                    break;
                case EAST_SOUTHEAST_SOUTH:
                    this.$br_east.render(ctx, sx, sy, hwidth, hheight);
                    this.$br_southEast.render(ctx, sx, sy, hwidth, hheight);
                    this.$br_south.render(ctx, sx, sy, hwidth, hheight);
                    break;
                case SOUTH_EAST_SOUTHEAST:
                    this.$br_south.render(ctx, sx, sy, hwidth, hheight);
                    this.$br_east.render(ctx, sx, sy, hwidth, hheight);
                    this.$br_southEast.render(ctx, sx, sy, hwidth, hheight);
                    break;
                case SOUTH_SOUTHEAST_EAST:
                    this.$br_south.render(ctx, sx, sy, hwidth, hheight);
                    this.$br_southEast.render(ctx, sx, sy, hwidth, hheight);
                    this.$br_east.render(ctx, sx, sy, hwidth, hheight);
                    break;
                case SOUTHEAST_EAST_SOUTH:
                    this.$br_southEast.render(ctx, sx, sy, hwidth, hheight);
                    this.$br_east.render(ctx, sx, sy, hwidth, hheight);
                    this.$br_south.render(ctx, sx, sy, hwidth, hheight);
                    break;
                case SOUTHEAST_SOUTH_EAST:
                    this.$br_southEast.render(ctx, sx, sy, hwidth, hheight);
                    this.$br_south.render(ctx, sx, sy, hwidth, hheight);
                    this.$br_east.render(ctx, sx, sy, hwidth, hheight);
                    break;
            }

        }
    }

    class Autotiler extends Tiler {
        static {
            this.$schema('priorityMap', { dflt:() => { return ({}); } });
            this.$schema('$overlays', { readonly:true, link:true, parser:() => [] });
        }

        setidx(idx, v) {
            if (idx !== -1 && idx<this.$grid.length) {
                if (this.$grid.getidx(idx) === v) return;
                this.$modified = true;
                this.$modifiedIdxs.add(idx);
                for (const nidx of this.$grid.neighborIdxs(idx)) {
                    this.$modifiedIdxs.add(nidx);
                }
                this.$grid.setidx(idx, v);
            }
        }

        $renderIdx(idx) {
            let ij = this.$grid.ijFromIdx(idx);
            let x = ij.x*this.tileSize.x;
            let y = ij.y*this.tileSize.y;
            // clear current index
            this.$gridCtx.clearRect(x, y, this.tileSize.x, this.tileSize.y);
            // pull asset
            let tag = this.$grid.getidx(idx);
            if (this.assetMap) tag = this.assetMap[tag];
            if (tag) {
                let asset = this.$assetCache.get(idx);
                // cache hit
                if (asset) {
                    // validate cache asset still matches grid asset
                    if (asset.tag !== tag) asset = null;
                }
                // handle cache miss or invalidated cache
                if (!asset) {
                    asset = GadgetCtx.assets.get(tag);
                    if (asset) this.$assetCache.set(idx, asset);
                }
                // render asset to grid
                asset.render(this.$gridCtx, x,y, this.tileSize.x, this.tileSize.y);
            }
            // render overlay
            if (!this.$overlays[idx]) {
                this.$overlays[idx] = new $TileOverlay({
                    idx:idx,
                    grid:this.$grid,
                    assetMap:this.assetMap,
                    priorityMap:this.priorityMap,
                    halfSize:Vect$1.smult(this.tileSize, .5),
                });
            } else {
                this.$overlays[idx].$compute();
            }
            this.$overlays[idx].render(this.$gridCtx, x, y, this.tileSize.x, this.tileSize.y);
        }

    }

    // =========================================================================
    /**
     * An animator is responsible for driving animations based on state of a parent object passed through event updates
     * @extends Sketch
     */
    class Animator extends Sketch {

        // SCHEMA --------------------------------------------------------------
        /** @member {Object} Animator#sketches - sketch state mapping <state:sketch> */
        static { this.$schema('sketches', { dflt: {}, readonly:true, link: false }); }
        /** @member {Object} Animator#transitions - map of transitions  { <target state>: [ { from: <source state>, sketch: <sketch> }, ... ]} */
        static { this.$schema('transitions', { dflt: {}, readonly:true, link: false }); }
        /** @member {Object} Animator#state - current animator state, tracks to target state */
        static { this.$schema('state', { dflt: 'idle' });  }
        /** @member {Object} Animator#sketch - current animator sketch */
        static { this.$schema('sketch', { link: true, parser: ((o,x) => ((o.sketches) ? o.sketches[o.state] : null)) }); }
        /** @member {Object} Animator#width - width of current animator sketch*/
        static { this.$schema('width', { readonly:true, getter: ((o,ov) => ((o.sketch) ? o.sketch.width : 0)) }); }
        /** @member {Object} Animator#height - height of current animator sketch*/
        static { this.$schema('height', { readonly:true, getter: ((o,ov) => ((o.sketch) ? o.sketch.height : 0)) }); }
        /** @member {integer} Sketch#ttl - time to live for current animator sketch */
        static { this.$schema('ttl', { readonly:true, getter: (o,ov) => ( (o.sketch) ? o.sketch.ttl : 0 )}); }
        /** @member {integer} Sketch#done - is current animator sketch marked as done */
        static { this.$schema('done', { readonly:true, getter: (o,ov) => ( (o.sketch) ? o.sketch.done : false )}); }

        $cpost(spec) {
            super.$cpost(spec);
            this.at_modified.listen(this.$on_stateModified, this, false, (evt) => (evt.key == 'state'));
        }

        $on_stateModified(evt) {
            this.start(this.state);
        }

        static from(srcs, spec={}) {
            let sketches = {};
            if (typeof srcs === 'object') {
                for (const [k,src] of Object.entries(srcs)) {
                    // source is media
                    if (src instanceof ImageMedia) {
                        sketches[k] = Sprite.from(src);
                    // source is an asset
                    } else if (src instanceof Asset) {
                        sketches[k] = src;
                    // source is a string or media spec ...
                    } else {
                        sketches[k] = Sprite.from(src);
                    }
                }
            }
            let asset = new this(Object.assign({}, spec, { sketches: sketches }));
            return asset;
        }

        // METHODS -------------------------------------------------------------
        start(state) {
            if (state in this.sketches) {
                if (this.sketch) this.sketch.disable();
                let targetSketch = this.sketches[state];
                let transition = false;
                // check for transition
                if (this.sketch && state in this.transitions) {
                    // find best
                    let possibles = this.transitions[state];
                    let match;
                    for (const possible of possibles) {
                        if (!possible.sketch) return;
                        if (possible.from === this.state) {
                            match = possible.sketch;
                            break;
                        } else if ( !possible.from ) {
                            match = possible.sketch;
                        }
                    }
                    if (match) {
                        match.reset();
                        if (!match.done) {
                            transition = true;
                            targetSketch = match;
                        }
                    }
                }
                this.sketch = targetSketch;
                this.sketch.reset();
                if (transition) {
                    this.sketch.at_modified.listen(() => {
                        if (this.state === state) {
                            this.sketch.disable();
                            this.sketch = this.sketches[state];
                            this.sketch.reset();
                            this.sketch.enable();
                        }
                    }, this, true, (evt) => (evt.key === 'done'));
                }
                this.sketch.enable();
            }
        }

        /**
         * enable the animator and current animator sketch
         */
        enable() {
            if (!this.active) {
                this.start(this.state);
                if (this.sketch) this.sketch.enable();
            }
            super.enable();
        }

        /**
         * disable the animator and current animator sketch
         */
        disable() {
            // disable current sketch
            if (this.sketch) this.sketch.disable();
            super.disable();
        }

        async load() {
            return Promise.all(
                [
                    ...(Object.values(this.sketches || {})).map((x) => {
                        return x.load();
                    }), 
                    ...Object.values(this.transitions || {}).map((x) => {
                        return ((x.sketch) ? x.sketch.load() : Promise.resolve())
                    }),
                ]
            );
        }

        copy(overrides={}) {
            let sketches = Object.fromEntries(Object.entries(this.sketches || {}).map(([k,v]) => [k, v.copy()]));
            let transitions = Object.fromEntries(Object.entries(this.transitions || {}).map(([k,v]) => {
                let matches = [];
                for (const match of v) {
                    let nmatch = Object.assign({}, match);
                    if (nmatch.sketch) nmatch.sketch = nmatch.sketch.copy();
                    matches.push(nmatch);
                }
                return [ k, matches];
            }));
            return new this.constructor(Object.assign({}, this, { sketches: sketches, transitions: transitions }, overrides));
        }

        /**
         * render the animator
         * @param {canvasContext} ctx - canvas context on which to draw
         * @param {number} [x=0] - x position to render sketch at
         * @param {number} [y=0] - y position to render sketch at
         * @param {number} [width=0] - desired width to render, if unspecified, sketch will render at internal width
         * @param {number} [height=0] - desired height to render, if unspecified, sketch will render at internal height
         */
        $subrender(ctx, x=0, y=0, width=0, height=0) {
            if (this.sketch) this.sketch.render(ctx, x, y, width, height);
        }

    }

    // =========================================================================
    /** 
     * An animation is a sketch used to render a series of animation cels (sketches).
     * @extends Sketch
     */
    class Animation extends Sketch {
        // SCHEMA --------------------------------------------------------------
        /** @member {Sketch[]} Animation#sketches - array of cels/sketches to animate */
        static { this.$schema('sketches', { order:-1, dflt: [], readonly: true }); }
        /** @member {boolean} Animation#loop - should the animation be looped */
        static { this.$schema('loop', { dflt: true }); }
        /** @member {boolean} Animation#timer - timer for this animation */
        static { this.$schema('$timer', { link: true, serializable: false, eventable: false }); }
        /** @member {boolean} Animation#sketchIdx - index of current animation frame */
        static { this.$schema('sketchIdx', { eventable: false, dflt: 0 }); }
        /** @member {boolean} Animation#sketch - the current animation frame/sketch */
        static { this.$schema('sketch', { link: true, parser: ((o,x) => ((o.sketches && o.sketches.length) ? o.sketches[o.sketchIdx] : null)) }); }
        /** @member {boolean} Animation#width - width of current animation frame */
        static { this.$schema('width', { readonly:true, getter: ((o,ov) => ((o.sketch) ? o.sketch.width : 0)) }); }
        /** @member {boolean} Animation#height - height of current animation frame */
        static { this.$schema('height', { readonly:true, getter: ((o,ov) => ((o.sketch) ? o.sketch.height : 0)) }); }
        /** @member {integer} Sketch#ttl - time to live for current animation frame */
        static { this.$schema('ttl', { readonly:true, getter: (o,ov) => ( o.sketches.reduce((pv, cv) => pv+cv.ttl, 0 )) }); }

        static from(srcs, spec={}) {
            let sketches = [];
            if (!Array.isArray(srcs)) srcs = [srcs];
            for (const src of srcs) {
                // source is media
                if (src instanceof ImageMedia) {
                    sketches.push(Sprite.from(src));
                // source is an asset
                } else if (src.assetable) {
                    sketches.push(src);
                // source is a string or media spec ...
                } else {
                    sketches.push(Sprite.from(src));
                }
            }
            let asset = new this(Object.assign({}, spec, { sketches: sketches }));
            return asset;
        }

        // CONSTRUCTOR/DESTRUCTOR ----------------------------------------------
        /**
         * Animation constructor
         * @param {Object} spec - object with key/value pairs used to pass properties to the constructor
         */
        $cpre(spec) {
            let sketches = spec.sketches || [];
            if (spec.jitter) spec.sketchIdx = Random.rangeInt(0, sketches.length-1);
            this.$on_timer = this.$on_timer.bind(this);
            super.$cpre(spec);
        }
        destroy() {
            super.destroy();
        }

        // EVENT HANDLERS ------------------------------------------------------
        /**
         * $on_timer is an event callback executed when the animation loop timer is done with each animation frame
         * @param {Evt} evt 
         */
        $on_timer(evt) {
            this.$timer = null;
            // advance frame accounting for timer overflow
            let overflow = evt.overflow || 0;
            do {
                let ok = this.advance();
                // if frame does not advance, last frame has been hit and we are not looping... signal we are done and exit
                if (!ok) {
                    if (!this.done) this.done = true;
                    break;
                }
                // otherwise, continue to advance cels while cel ttl is < overflow
                if (this.sketch.ttl >= overflow) {
                    this.$timer = new Ticker({ttl: this.sketch.ttl-overflow, cb: this.$on_timer});
                    break;
                } else {
                    overflow -= this.sketch.ttl;
                }
            } while (overflow > 0);
        }

        // METHODS -------------------------------------------------------------
        /**
         * enable the animation by creating/starting the animation timer
         */
        enable() {
            if (!this.active) {
                if (this.sketch) this.sketch.enable();
                // start timer
                if ((!this.done) && (this.sketches.length > 1 || !this.loop)) {
                    this.$timer = new Ticker({ttl: this.sketch.ttl, cb: this.$on_timer});
                }
            }
            super.enable();
        }

        /**
         * disable the animation by stopping the animation timer
         */
        disable() {
            // disable current sketch
            if (this.sketch) this.sketch.disable();
            // stop timer
            if (this.$timer) {
                this.$timer.destroy();
                this.$timer = null;
            }
            super.disable();
        }

        /**
         * reset the animation
         */
        reset() {
            this.sketchIdx = 0;
            this.done = false;
        }

        advance() {
            if (!this.sketches && !this.sketches.length) return false;
            let idx = this.sketchIdx + 1;
            if (idx >= this.sketches.length) {
                if (!this.loop) return false;
                idx = 0;
            }
            if (idx !== this.sketchIdx) {
                this.sketch.disable();
                this.sketchIdx = idx;
                this.sketch = this.sketches[this.sketchIdx];
                this.sketch.enable();
            }
            return true;
        }

        rewind() {
            if (!this.sketches && !this.sketches.length) return false;
            let idx = this.sketchIdx - 1;
            if (idx < 0) {
                if (!this.loop) return false;
                idx = this.sketches.length-1;
            }
            if (idx !== this.sketchIdx) {
                this.sketch.disable();
                this.sketchIdx = idx;
                this.sketch = this.sketches[this.sketchIdx];
                this.sketch.enable();
            }
            return true;
        }

        async load() {
            return Promise.all(this.sketches.map((x) => x.load()));
        }

        copy(overrides={}) {
            let sketches = (this.sketches || []).map((x) => x.copy());
            return new this.constructor(Object.assign({}, this, { sketches: sketches}, overrides));
        }

        /**
         * subrender renders the current animation frame
         * @param {canvasContext} ctx - canvas context on which to draw
         * @param {number} [x=0] - x position to render sketch at
         * @param {number} [y=0] - y position to render sketch at
         * @param {number} [width=0] - desired width to render, if unspecified, sketch will render at internal width
         * @param {number} [height=0] - desired height to render, if unspecified, sketch will render at internal height
         */
        $subrender(ctx, x=0, y=0, width=0, height=0) {
            if (this.sketch) this.sketch.render(ctx, x, y, width, height);
        }

    }

    exports.$TileOverlay = $TileOverlay;
    exports.Animation = Animation;
    exports.Animator = Animator;
    exports.Asset = Asset;
    exports.Autotiler = Autotiler;
    exports.AutotilerMap = AutotilerMap;
    exports.AutotilerTemplate = AutotilerTemplate;
    exports.Bounds = Bounds$1;
    exports.CachingProperty = CachingProperty;
    exports.Contains = Contains;
    exports.DependentProperty = DependentProperty;
    exports.Direction = Direction;
    exports.Evt = Evt;
    exports.EvtEmitter = EvtEmitter;
    exports.Fmt = Fmt$1;
    exports.Gadget = Gadget;
    exports.GadgetArray = GadgetArray;
    exports.GadgetAssets = GadgetAssets;
    exports.GadgetCtx = GadgetCtx;
    exports.GadgetGenerator = GadgetGenerator;
    exports.GadgetProperty = GadgetProperty;
    exports.Game = Game;
    exports.GameModel = GameModel;
    exports.GameState = GameState;
    exports.Gizmo = Gizmo;
    exports.Grid = Grid;
    exports.GridArray = GridArray;
    exports.GridBucketArray = GridBucketArray;
    exports.Hex = Hex;
    exports.HexArray = HexArray;
    exports.HexBucketArray = HexBucketArray;
    exports.HexGrid = HexGrid;
    exports.ImageMedia = ImageMedia;
    exports.Intersect = Intersect;
    exports.KeySystem = KeySystem;
    exports.Mathf = Mathf;
    exports.Media = Media;
    exports.MouseSystem = MouseSystem;
    exports.Overlaps = Overlaps;
    exports.Prng = Prng;
    exports.Random = Random;
    exports.Rect = Rect;
    exports.RenderSystem = RenderSystem;
    exports.Segment = Segment;
    exports.Sfx = Sfx;
    exports.SfxSystem = SfxSystem;
    exports.Shape = Shape;
    exports.SheetTemplate = SheetTemplate;
    exports.Sketch = Sketch;
    exports.SketchMixer = SketchMixer;
    exports.Sprite = Sprite;
    exports.StateMgr = StateMgr;
    exports.System = System;
    exports.SystemMgr = SystemMgr;
    exports.Text = Text;
    exports.TextFormat = TextFormat;
    exports.Ticker = Ticker;
    exports.Tiler = Tiler;
    exports.Timer = Timer;
    exports.Tri = Tri;
    exports.UiButton = UiButton;
    exports.UiCanvas = UiCanvas;
    exports.UiGrid = UiGrid;
    exports.UiHorizontalSlider = UiHorizontalSlider;
    exports.UiHorizontalSpacer = UiHorizontalSpacer;
    exports.UiInput = UiInput;
    exports.UiPanel = UiPanel;
    exports.UiScroller = UiScroller;
    exports.UiText = UiText;
    exports.UiToggle = UiToggle;
    exports.UiVerticalSlider = UiVerticalSlider;
    exports.UiVerticalSpacer = UiVerticalSpacer;
    exports.UiView = UiView;
    exports.Util = Util;
    exports.Vect = Vect$1;
    exports.Vect3 = Vect3;
    exports.XForm = XForm;

    return exports;

})({});
