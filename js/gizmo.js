export { Gizmo };

import { Fmt } from './fmt.js';
import { Gadget } from './gadget.js';

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
        return Fmt.toString(this.constructor.name, this.gid, this.tag);
    }

    destroy() {
        if (this.parent) this.parent.orphan(this);
        for (const child of (Array.from(this.children))) {
            child.destroy();
        }
        super.destroy();
    }

}