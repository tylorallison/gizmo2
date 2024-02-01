export { UiHorizontalSlider };

import { Rect } from './rect.js';
import { UiView } from './uiView.js';
import { XForm } from './xform.js';

/*
import { Fmt } from './fmt.js';
import { Hierarchy } from './hierarchy.js';
import { Rect } from './rect.js';
import { Mathf } from './math.js';
import { Vect } from './vect.js';
import { Events } from './event.js';
import { MouseSystem } from './systems/mouseSystem.js';
*/


class UiHorizontalSlider extends UiView {
    // SCHEMA --------------------------------------------------------------
    static {
        this.$schema('value', { order:-1, dflt:.5 });
        this.$schema('barSketch', { link:true, dflt:() => new Rect({ color:'rgba(255,255,255,.5)' }) });
        this.$schema('knobSketch', { link:true, dflt:() => new Rect({ color:'rgba(255,255,255,.5)', width:10, height:20, fitter:'ratio', tag:'knob' }) });
        this.$schema('barXForm', { readonly:true, parser: (o,x) => {
            let xform = (x.barXForm) ? x.barXForm : new XForm({ top:.3, bottom:.3 });
            xform.parent = o.xform;
            return xform;
        }});
        this.$schema('knobXForm', { readonly:true, parser: (o,x) => {
            let xform = (x.knobXForm) ? x.knobXForm : new XForm({ top:.2, bottom:.2, left:o.value, right:1-o.value });
            xform.parent = o.xform;
            return xform;
        }});
    }

    // CONSTRUCTOR ---------------------------------------------------------
    $cpost(spec={}) {
        super.$cpost(spec);
        //this.onMouseDown = this.onMouseDown.bind(this);
        //this.onMouseUp = this.onMouseUp.bind(this);
        //this.onMouseMove = this.onMouseMove.bind(this);
        //this.onRooted = this.onRooted.bind(this);
        //this.evt.listen(this.constructor.evtMouseDown, this.onMouseDown);
        //this.evt.listen(this.constructor.evtMouseUp, this.onMouseUp);
        //this.evt.listen(this.constructor.evtRooted, this.onRooted);
    }

    destroy() {
        /*
        Events.ignore(MouseSystem.evtMoved, this.onMouseMove);
        this.evt.ignore(this.constructor.evtMouseDown, this.onMouseDown);
        this.evt.ignore(this.constructor.evtMouseUp, this.onMouseUp);
        this.evt.ignore(this.constructor.evtRooted, this.onRooted);
        this._unlinkSketch('_bar');
        this._unlinkSketch('_knob');
        */
        super.destroy();
    }

    // PROPERTIES ----------------------------------------------------------
    /*
    get value() {
        return this._value;
    }
    set value(v) {
        if (v !== this._value) {
            this._value = v;
            this.knobXform.left = this._value - this._value * this.knobWidthPct;
            this.knobXform.right = 1-this._value - (1-this._value)*this.knobWidthPct;
            this.evt.trigger(this.constructor.evtUpdated, {actor: this, update: { value: v }});
        }
    }
    */

    // EVENT HANDLERS ------------------------------------------------------
    onMouseDown(evt) {
        Events.listen(MouseSystem.evtMoved, this.onMouseMove);
    }
    onMouseUp(evt) {
        Events.ignore(MouseSystem.evtMoved, this.onMouseMove);
        let lmouse = this.xform.getLocal(new Vect(evt.mouse.x, evt.mouse.y));
        let v = Mathf.clamp(this.translateMouse(lmouse.x), 0, 1);
        this.value = v;
    }
    onMouseMove(evt) {
        let lmouse = this.xform.getLocal(new Vect(evt.x, evt.y));
        let v = Mathf.clamp(this.translateMouse(lmouse.x), 0, 1);
        this.value = v;
    }
    onRooted(evt) {
        if (evt.actor !== this) return;
        //dec.evt.trigger(dec.constructor.evtRooted, {actor: dec, root: this.root(parent)});
        this.evt.trigger(this.constructor.evtUpdated);
    }

    // METHODS -------------------------------------------------------------

    /*
    translateMouse(x) {
        let v;
        if (x <= this.xform.minx+this.knobXform.width) {
            v = 0;
        } else if (x >= this.xform.maxx-this.knobXform.width) {
            v = 1;
        } else {
            v = Mathf.lerp(this.xform.minx+this.knobXform.width, this.xform.maxx-this.knobXform.width, 0, 1, x);
        }
        return v;
    }
    */

    $subrender(ctx) {
        this.barXForm.apply(ctx, false);
        if (this.barSketch) this.barSketch.render(ctx, this.barXForm.minx, this.barXForm.miny, this.barXForm.width, this.barXForm.height);
        this.barXForm.revert(ctx, false);
        this.knobXForm.apply(ctx, false);
        console.log(`knob xform: ${this.knobXForm}`);
        if (this.knobSketch) this.knobSketch.render(ctx, this.knobXForm.minx, this.knobXForm.miny, this.knobXForm.width, this.knobXForm.height);
        this.knobXForm.revert(ctx, false);
    }

}