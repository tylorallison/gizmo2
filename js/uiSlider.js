export { UiHorizontalSlider, UiVerticalSlider };

import { GadgetCtx } from './gadget.js';
import { Mathf } from './math.js';
import { Rect } from './rect.js';
import { UiView } from './uiView.js';
import { XForm } from './xform.js';

class UiHorizontalSlider extends UiView {
    // SCHEMA --------------------------------------------------------------
    static {
        this.$schema('knobPct', { order:-2, dflt:.1, setter:(o,ov,v) => {
            if (o.knobXForm) {
                o.knobXForm.left = o.value - o.value * v;
                o.knobXForm.right = 1-o.value - (1-o.value)*v;
            }
            return v;
        }});
        this.$schema('value', { order:-1, dflt:.5, setter:(o,ov,v) => {
            v = Mathf.clamp(v, 0, 1);
            if (o.knobXForm) {
                o.knobXForm.left = v - v * o.knobPct;
                o.knobXForm.right = 1-v - (1-v)*o.knobPct;
            }
            return v;
        } });
        this.$schema('barSketch', { link:true, dflt:() => new Rect({ color:'rgba(255,255,255,.5)' }) });
        this.$schema('knobSketch', { link:true, dflt:() => new Rect({ color:'rgba(255,255,255,.5)', width:10, height:20, fitter:'stretch', tag:'knob' }) });
        this.$schema('barXForm', { readonly:true, parser: (o,x) => {
            let xform = (x.barXForm) ? x.barXForm : new XForm({ top:.1, bottom:.1 });
            xform.parent = o.xform;
            return xform;
        }});
        this.$schema('knobXForm', { readonly:true, parser: (o,x) => {
            let xform = (x.knobXForm) ? x.knobXForm : new XForm({ top:.05, bottom:.05 });
            xform.left = o.value - o.value * o.knobPct;
            xform.right = 1-o.value - (1-o.value)*o.knobPct;
            xform.parent = o.xform;
            return xform;
        }});
    }

    // CONSTRUCTOR ---------------------------------------------------------
    $cpost(spec={}) {
        super.$cpost(spec);
        this.at_pressed.listen(this.$on_pressed, this);
        this.at_unpressed.listen(this.$on_unpressed, this);
    }

    destroy() {
        GadgetCtx.at_moused.ignore(this.$on_moved, this);
        super.destroy();
    }

    // EVENT HANDLERS ------------------------------------------------------
    $on_pressed(evt) {
        let lmouse = this.xform.getLocal(evt.mouse);
        let v = this.$translateMouse(lmouse.x);
        this.value = v;
        GadgetCtx.at_moused.listen(this.$on_moved, this, false, (evt) => evt.tag === 'mousemoved');
    }
    $on_unpressed(evt) {
        GadgetCtx.at_moused.ignore(this.$on_moved, this);
    }
    $on_moved(evt) {
        let lmouse = this.xform.getLocal(evt.mouse);
        let v = this.$translateMouse(lmouse.x);
        this.value = v;
    }

    // METHODS -------------------------------------------------------------
    $translateMouse(x) {
        let v;
        if (x <= this.xform.minx) {
            v = 0;
        } else if (x >= this.xform.maxx) {
            v = 1;
        } else {
            v = Mathf.lerp(this.xform.minx, this.xform.maxx, 0, 1, x);
        }
        return v;
    }

    $subrender(ctx) {
        this.barXForm.apply(ctx, false);
        if (this.barSketch) this.barSketch.render(ctx, this.barXForm.minx, this.barXForm.miny, this.barXForm.width, this.barXForm.height);
        this.barXForm.revert(ctx, false);
        this.knobXForm.apply(ctx, false);
        if (this.knobSketch) this.knobSketch.render(ctx, this.knobXForm.minx, this.knobXForm.miny, this.knobXForm.width, this.knobXForm.height);
        this.knobXForm.revert(ctx, false);
    }

}

class UiVerticalSlider extends UiView {
    // SCHEMA --------------------------------------------------------------
    static {
        this.$schema('knobPct', { order:-2, dflt:.1, setter:(o,ov,v) => {
            if (o.knobXForm) {
                o.knobXForm.top = o.value - o.value * v;
                o.knobXForm.bottom = 1-o.value - (1-o.value)*v;
            }
            return v;
        } });
        this.$schema('value', { order:-1, dflt:.5, setter:(o,ov,v) => {
            v = Mathf.clamp(v, 0, 1);
            if (o.knobXForm) {
                o.knobXForm.top = v - v * o.knobPct;
                o.knobXForm.bottom = 1-v - (1-v)*o.knobPct;
            }
            return v;
        } });
        this.$schema('barSketch', { link:true, dflt:() => new Rect({ color:'rgba(255,255,255,.5)' }) });
        this.$schema('knobSketch', { link:true, dflt:() => new Rect({ color:'rgba(255,255,255,.5)', width:20, height:10, fitter:'stretch', tag:'knob' }) });
        this.$schema('barXForm', { readonly:true, parser: (o,x) => {
            let xform = (x.barXForm) ? x.barXForm : new XForm({ left:.1, right:.1 });
            xform.parent = o.xform;
            return xform;
        }});
        this.$schema('knobXForm', { readonly:true, parser: (o,x) => {
            let xform = (x.knobXForm) ? x.knobXForm : new XForm({ left:.05, right:.05, top:o.value, bottom:1-o.value });
            xform.top = o.value - o.value * o.knobPct;
            xform.bottom = 1-o.value - (1-o.value)*o.knobPct;
            xform.parent = o.xform;
            return xform;
        }});
    }

    // CONSTRUCTOR ---------------------------------------------------------
    $cpost(spec={}) {
        super.$cpost(spec);
        this.at_pressed.listen(this.$on_pressed, this);
        this.at_unpressed.listen(this.$on_unpressed, this);
    }

    destroy() {
        GadgetCtx.at_moused.ignore(this.$on_moved, this);
        super.destroy();
    }

    // EVENT HANDLERS ------------------------------------------------------
    $on_pressed(evt) {
        let lmouse = this.xform.getLocal(evt.mouse);
        let v = this.$translateMouse(lmouse.y);
        this.value = v;
        GadgetCtx.at_moused.listen(this.$on_moved, this, false, (evt) => evt.tag === 'mousemoved');
    }
    $on_unpressed(evt) {
        GadgetCtx.at_moused.ignore(this.$on_moved, this);
    }
    $on_moved(evt) {
        let lmouse = this.xform.getLocal(evt.mouse);
        let v = this.$translateMouse(lmouse.y);
        this.value = v;
        //console.log(`value: ${v} at_modified.listeners ${this.at_modified.$listeners}`);
    }

    // METHODS -------------------------------------------------------------
    $translateMouse(y) {
        let v;
        if (y <= this.xform.miny) {
            v = 0;
        } else if (y >= this.xform.maxy) {
            v = 1;
        } else {
            v = Mathf.lerp(this.xform.miny, this.xform.maxy, 0, 1, y);
        }
        return v;
    }

    $subrender(ctx) {
        this.barXForm.apply(ctx, false);
        if (this.barSketch) this.barSketch.render(ctx, this.barXForm.minx, this.barXForm.miny, this.barXForm.width, this.barXForm.height);
        this.barXForm.revert(ctx, false);
        this.knobXForm.apply(ctx, false);
        if (this.knobSketch) this.knobSketch.render(ctx, this.knobXForm.minx, this.knobXForm.miny, this.knobXForm.width, this.knobXForm.height);
        this.knobXForm.revert(ctx, false);
    }

}