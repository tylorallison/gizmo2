export { Sketch };

import { Asset } from './asset.js';
import { Fmt } from './fmt.js';

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
    static { this.$schema('width', {dflt: 0, readonly: true}); }
    /** @member {number} Sketch#height=0 - height of sketch */
    static { this.$schema('height', {dflt: 0, readonly: true}); }
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
        return Fmt.toString(this.constructor.name, this.tag);
    }

}
