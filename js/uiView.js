export { UiView };

import { Fmt } from './fmt.js';
import { Gizmo } from './gizmo.js';
//import { SfxSystem } from './sfxSystem.js';
import { XForm } from './xform.js';

/** ========================================================================
 * The base ui primitive.
 * -- derives from Gizmo
 * -- views can have parent/child relationships
 */
class UiView extends Gizmo {

    // STATIC VARIABLES ----------------------------------------------------
    static { this.prototype.mousable = true; }
    static { this.prototype.renderable = true; }

    // SCHEMA --------------------------------------------------------------
    static {
        this.$schema('xform', { order: -1, link: true, dflt: () => new XForm() });
        this.$schema('active', { dflt: true });
        this.$schema('visible', { dflt: true });
        this.$schema('smoothing', { dflt: null });
        this.$schema('alpha', { dflt: 1 });
        this.$schema('dbg', { dflt: false, eventable: false });
        this.$schema('mask', { dflt: false });
        this.$schema('mouseOver', { dflt: false });
        this.$schema('mousePressed', { dflt: false });
        this.$schema('mousePriority', { dflt: 0 });
        this.$schema('mouseBlock', { dflt: false });
        this.$schema('mouseClickedSound');
        this.$schema('mouseEnteredSound');
        this.$schema('mouseExitedSound');
    }

    // CONSTRUCTOR/DESTRUCTOR ----------------------------------------------

    adopt(child) {
        super.adopt(child);
        child.xform.parent = this.xform;
    }
    orphan(child) {
        super.orphan(child);
        child.xform.parent = null;
    }
    
    // EVENT HANDLERS ------------------------------------------------------
    /*
    $onMouseClicked(evt) {
        //if (this.mouseClickedSound) SfxSystem.playSfx(this, this.mouseClickedSound);
    }

    $onMouseEntered(evt) {
        //if (this.mouseEnteredSound) SfxSystem.playSfx(this, this.mouseEnteredSound);
    }
    $onMouseExited(evt) {
        //if (this.mouseExitedSound) SfxSystem.playSfx(this, this.mouseExitedSound);
    }
    */

    // METHODS -------------------------------------------------------------

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
