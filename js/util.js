export { Util };

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
                node[token] = {}
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
        var hash = 0, i, chr;
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