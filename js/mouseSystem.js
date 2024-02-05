export { MouseSystem };

import { System } from './system.js';
import { UiCanvas } from './uiCanvas.js';
import { Vect } from './vect.js';
import { Contains } from './intersect.js';
import { Fmt } from './fmt.js';
import { EvtEmitter } from '../../gizmo2/js/evt.js';
import { GadgetCtx } from './gadget.js';

class MouseSystem extends System {
    // STATIC VARIABLES ----------------------------------------------------
    static dfltIterateTTL = 0;
    static dfltMatchFcn = (evt) => evt.actor.mousable;

    static { this.$schema('canvasId', { order: -2, readonly: true, dflt:'game.canvas' }); }
    static { this.$schema('canvas', { order: -1, dflt: (o) => UiCanvas.getCanvas(o.canvasId, o.fitToWindow) }); }
    static { this.$schema('pressed', { dflt:false }) };
    static { this.$schema('clicked', { dflt:false }) };
    static { this.$schema('position', { readonly:true, dflt: () => new Vect() }) };

    // CONSTRUCTOR/DESTRUCTOR ----------------------------------------------
    $cpost(spec={}) {
        super.$cpost(spec);
        // -- register event handlers
        this.$on_moved = this.$on_moved.bind(this);
        this.$on_clicked = this.$on_clicked.bind(this);
        this.$on_pressed = this.$on_pressed.bind(this);
        this.$on_unpressed = this.$on_unpressed.bind(this);
        this.canvas.addEventListener('mousemove', this.$on_moved);
        this.canvas.addEventListener('click', this.$on_clicked);
        this.canvas.addEventListener('mousedown', this.$on_pressed);
        this.canvas.addEventListener('mouseup', this.$on_unpressed);
        this.canvas.addEventListener('wheel', this.$on_wheeled);
    }
    destroy() {
        this.canvas.removeEventListener('mousemove', this.$on_moved);
        this.canvas.removeEventListener('click', this.$on_clicked);
        this.canvas.removeEventListener('mousedown', this.$on_pressed);
        this.canvas.removeEventListener('mouseup', this.$on_unpressed);
        super.destroy();
    }

    // EVENT HANDLERS ------------------------------------------------------
    $on_wheeled(sevt) {
        console.log(`on wheeled: ${Fmt.ofmt(sevt)}`);
        sevt.preventDefault();
    }

    $on_clicked(sevt) {
        // capture event data...
        let data = { tag:'mouseclicked', old: this.position.copy(), mouse: new Vect({x:sevt.offsetX, y:sevt.offsetY}) };
        // update mouse state
        this.position.x = sevt.offsetX;
        this.position.y = sevt.offsetY;
        this.active = true;
        this.clicked = true;
        // trigger event
        GadgetCtx.at_moused.trigger(data);
    }

    $on_moved(sevt) {
        // capture event data...
        let data = { tag:'mousemoved', old: this.position.copy(), mouse: new Vect({x:sevt.offsetX, y:sevt.offsetY}) };
        // update mouse state
        this.position.x = sevt.offsetX;
        this.position.y = sevt.offsetY;
        this.active = true;
        // trigger event
        GadgetCtx.at_moused.trigger(data);
    }

    $on_pressed(sevt) {
        this.pressed = true;
        this.active = true;
    }

    $on_unpressed(sevt) {
        this.pressed = false;
        this.active = true;
    }

    // METHODS -------------------------------------------------------------
    $prepare(evt) {
        this.targets = [];
    }

    $iterate(evt, e) {
        // skip inactive entities
        if (!e.active) return;
        if (e.findInParent((v) => !v.active)) return;
        // determine if view bounds contains mouse point (mouse position is in world coords)
        // -- translate to local position
        let lpos = e.xform.getLocal(this.position);
        let contains = Contains.bounds(e.xform, lpos);
        if (contains) this.targets.push(e);
        if (e.hovered && !contains) {
            e.hovered = false;
            if (e.at_unhovered) e.at_unhovered.trigger({ mouse:this.position });
            if (this.dbg) console.log(`${this} mouse unhovered: ${e}`);
        }
        // FIXME
        //if (e.pressed && (!contains || !this.pressed)) {
        if (e.pressed && (!this.pressed)) {
            e.pressed = false;
            if (e.at_unpressed) e.at_unpressed.trigger({ mouse:this.position });
            if (this.dbg) console.log(`${this} mouse unpressed: ${e}`);
        }
    }

    $finalize(evt) {
        // handle targets (click, enter, down)
        this.targets.sort((a,b) => b.mousePriority-a.mousePriority);
        for (const e of this.targets) {
            // trigger clicked
            if (this.clicked) {
                if (this.dbg) console.log(`${this} mouse clicked: ${e}`);
                if (e.at_clicked) e.at_clicked.trigger({ mouse:this.position });
            }
            if (!e.hovered) {
                e.hovered = true;
                if (e.at_hovered) e.at_hovered.trigger({ mouse:this.position });
                if (this.dbg) console.log(`${this} mouse hovered: ${e}`);
            }
            if (this.pressed && !e.pressed) {
                e.pressed = true;
                if (e.at_pressed) e.at_pressed.trigger({ mouse:this.position });
                if (this.dbg) console.log(`${this} mouse pressed: ${e}`);
            }
            if (e.blocking) break;
        }
        // mouse system is only active if a mouse event is received
        this.active = false;
        this.clicked = false;
    }

}
