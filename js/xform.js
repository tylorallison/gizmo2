export { XForm };

import { Bounds } from './bounds.js';
import { Fmt } from './fmt.js';
import { Gadget } from './gadget.js';
import { Mathf } from './math.js';
import { Vect } from './vect.js';

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
        this.$schema('$bounds', { eventable:false, dflt: (o) => new Bounds() });
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
        return new Bounds({x:minx, y:miny, width:width, height:height});
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
            localPos = new Vect(worldPos);
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
        let worldPos = new Vect(localPos);
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
        return Fmt.toString(this.constructor.name, this.minx, this.miny, this.width, this.height, this.x, this.y);
    }

}
