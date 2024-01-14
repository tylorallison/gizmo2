export { UiCanvas };

import { UiView } from './uiView.js';
import { XForm } from './xform.js';

/** ========================================================================
 * class representing base canvas as a UI view
 */
class UiCanvas extends UiView {
    // STATIC VARIABLES ----------------------------------------------------
    static { this.prototype.canvasable = true; }

    // STATIC PROPERTIES ---------------------------------------------------
    static getCanvas(id, fit=true) {
        let canvas = document.getElementById(id);
        if (!canvas) {
            canvas = document.createElement('canvas');
            canvas.id = id;
            canvas.constructed = true;
            document.body.appendChild(canvas);
        }
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
    }  

    $on_xformUpdated(evt) {
        if (this.fitToWindow) {
            this.xform.$target.fixedWidth = this.canvas.width;
            this.xform.$target.fixedHeight = this.canvas.height;
        } else {
            this.canvas.width = this.xform.fixedWidth;
            this.canvas.height = this.xform.fixedHeight;
        }
    }

}
