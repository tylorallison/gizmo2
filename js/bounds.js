export { Bounds };

import { Vect } from './vect.js';
import { Fmt } from './fmt.js';
import { Gadget } from './gadget.js';

// =========================================================================
class Bounds extends Gadget {
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
        return new Vect({x:this.x, y:this.y});
    }

    get maxx() {
        return this.x + this.width;
    }
    get maxy() {
        return this.y + this.height;
    }
    get max() {
        return new Vect({x:this.x + this.width, y:this.y + this.height});
    }

    get midx() {
        return this.x + (this.width * .5);
    }
    get midy() {
        return this.y + (this.height * .5);
    }
    get mid() {
        return new Vect({x:this.x + (this.width * .5), y:this.y + (this.height * .5)});
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
        return Fmt.toString('Bounds', this.x, this.y, this.maxx, this.maxy, this.width, this.height);
    }
}
