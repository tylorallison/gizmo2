export { UiView };

import { EvtEmitter } from './evt.js';
import { Gizmo } from './gizmo.js';
import { SfxSystem } from './sfxSystem.js';
import { XForm } from './xform.js';

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
