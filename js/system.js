export { System }

import { Fmt } from './fmt.js';
import { GadgetCtx } from './gadget.js';
import { Gizmo } from './gizmo.js';
import { Timer } from './timer.js';

class System extends Gizmo {
    // STATIC VARIABLES ----------------------------------------------------
    static dfltIterateTTL = 200;
    static dfltMatchFcn = (() => false);

    // SCHEMA --------------------------------------------------------------
    static {
        this.$schema('iterateTTL', { eventable: false, dflt: (o) => o.constructor.dfltIterateTTL });
        this.$schema('dbg', { eventable: false, dflt: false });
        this.$schema('active', { eventable: false, dflt: true });
        this.$schema('matchFcn', { eventable: false, dflt: (o) => o.constructor.dfltMatchFcn });
        this.$schema('$store', { link: false, readonly: true, parser: () => new Map()});
        this.$schema('$iterating', { eventable: false, parser: () => false });
        this.$schema('$timer', { order: 1, readonly: true, parser: (o,x) => new Timer({ttl: o.iterateTTL, cb: o.$on_timer, loop: true})});
    }

    // CONSTRUCTOR ---------------------------------------------------------
    $cpre(spec) {
        super.$cpre(spec);
        this.$on_timer = this.$on_timer.bind(this);
    }
    $cpost(spec) {
        super.$cpost(spec);
        // -- setup event handlers
        GadgetCtx.at_created.listen(this.$on_gizmoCreated, this);
        GadgetCtx.at_destroyed.listen(this.$on_gizmoDestroyed, this);
    }
    destroy() {
        this.$timer.destroy();
        super.destroy();
    }

    // EVENT HANDLERS ------------------------------------------------------
    $on_timer(evt) {
        if (!this.active) return;
        this.$iterating = true;
        this.$prepare(evt);
        for (const e of this.$store.values()) {
            this.$iterate(evt, e);
        }
        this.$finalize(evt);
        this.$iterating = false;
    }

    $on_gizmoCreated(evt) {
        if (this.matchFcn(evt.actor)) {
            if (this.dbg) console.log(`${this} onGizmoCreated: ${Fmt.ofmt(evt)} gid: ${evt.actor.gid}`);
            this.$store.set(evt.actor.gid, evt.actor);
        }
    }

    $on_gizmoDestroyed(evt) {
        if (this.$store.has(evt.actor.gid)) {
            if (this.dbg) console.log(`${this} onGizmoDestroyed: ${Fmt.ofmt(evt)}`);
            this.$store.delete(evt.actor.gid);
        }
    }

    // METHODS -------------------------------------------------------------
    $prepare(evt) {
    }

    $iterate(evt, e) {
    }

    $finalize(evt) {
    }

}
