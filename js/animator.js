export { Animator };

import { Sketch } from './sketch.js';
import { ImageMedia } from './media.js';
import { Asset } from './asset.js';
import { Sprite } from './sprite.js';
import { Fmt } from './fmt.js';

// =========================================================================
/**
 * An animator is responsible for driving animations based on state of a parent object passed through event updates
 * @extends Sketch
 */
class Animator extends Sketch {

    // SCHEMA --------------------------------------------------------------
    /** @member {Object} Animator#sketches - sketch state mapping <state:sketch> */
    static { this.$schema('sketches', { dflt: {}, readonly: true, link: false }); }
    /** @member {Object} Animator#transitions - map of transitions  { <target state>: [ { from: <source state>, sketch: <sketch> }, ... ]} */
    static { this.$schema('transitions', { dflt: {}, readonly: true, link: false }); }
    /** @member {Object} Animator#state - current animator state, tracks to target state */
    static { this.$schema('state', { dflt: 'idle' });  }
    /** @member {Object} Animator#sketch - current animator sketch */
    static { this.$schema('sketch', { link: true, parser: ((o,x) => ((o.sketches) ? o.sketches[o.state] : null)) }); }
    /** @member {Object} Animator#width - width of current animator sketch*/
    static { this.$schema('width', { readonly: true, getter: ((o,ov) => ((o.sketch) ? o.sketch.width : 0)) }); }
    /** @member {Object} Animator#height - height of current animator sketch*/
    static { this.$schema('height', { readonly: true, getter: ((o,ov) => ((o.sketch) ? o.sketch.height : 0)) }); }
    /** @member {integer} Sketch#ttl - time to live for current animator sketch */
    static { this.$schema('ttl', { readonly: true, getter: (o,ov) => ( (o.sketch) ? o.sketch.ttl : 0 )}); }
    /** @member {integer} Sketch#done - is current animator sketch marked as done */
    static { this.$schema('done', { readonly: true, getter: (o,ov) => ( (o.sketch) ? o.sketch.done : false )}); }

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
