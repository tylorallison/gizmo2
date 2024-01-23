export { UiView };

import { EvtEmitter } from './evt.js';
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
        this.$schema('mousePriority', { dflt: 0 });
        this.$schema('hovered', { dflt: false });
        this.$schema('pressed', { dflt: false });
        this.$schema('blocking', { dflt: false });
        this.$schema('clickedSound');
        this.$schema('hoveredSound');
        this.$schema('unhoveredSound');
        this.$schema('at_clicked', { readonly:true, dflt: () => new EvtEmitter(this, 'clicked') });
        this.$schema('at_hovered', { readonly:true, dflt: () => new EvtEmitter(this, 'hovered') });
        this.$schema('at_unhovered', { readonly:true, dflt: () => new EvtEmitter(this, 'unhovered') });
        this.$schema('at_pressed', { readonly:true, dflt: () => new EvtEmitter(this, 'pressed') });
        this.$schema('at_unpressed', { readonly:true, dflt: () => new EvtEmitter(this, 'unpressed') });
    }

    // CONSTRUCTOR/DESTRUCTOR ----------------------------------------------
    $cpost(spec) {
        super.$cpost(spec);
        // register view events
        this.at_clicked.listen(this.$on_clicked, this);
        this.at_hovered.listen(this.$on_hovered, this);
        this.at_unhovered.listen(this.$on_unhovered, this);
    }

    adopt(child) {
        super.adopt(child);
        child.xform.parent = this.xform;
    }
    orphan(child) {
        super.orphan(child);
        child.xform.parent = null;
    }
    
    // EVENT HANDLERS ------------------------------------------------------
    $on_clicked(evt) {
        //if (this.clickedSound) SfxSystem.playSfx(this, this.mouseClickedSound);
    }

    $on_hovered(evt) {
        //if (this.hoveredSound) SfxSystem.playSfx(this, this.mouseEnteredSound);
    }
    $on_unhovered(evt) {
        //if (this.unhoveredSound) SfxSystem.playSfx(this, this.mouseExitedSound);
    }

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
