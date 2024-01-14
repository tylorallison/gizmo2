export { SystemMgr };

import { Gizmo } from './gizmo.js';
import { System } from './system.js';

class SystemMgr extends Gizmo {
    // SCHEMA --------------------------------------------------------------
    static {
        this.schema('dbg', { dflt: false });
        this.schema('systems', { link: false, parser: () => ({}) });
    }

    // CONSTRUCTOR ---------------------------------------------------------
    cpost(spec) {
        Gizmo.at_created.listen(this.$on_systemCreated, this, false, (evt) => evt.actor && evt.actor instanceof System);
        Gizmo.at_destroyed.listen(this.$on_systemDestroyed, this, false, (evt) => evt.actor && evt.actor instanceof System);
    }

    // EVENT HANDLERS ------------------------------------------------------
    $on_systemCreated(evt) {
        let system = evt.actor;
        // pre-existing?
        if (this.systems[system.tag]) if (this.dbg) console.log(`${this} replacing system for tag: ${system.tag}`);
        if (this.dbg) console.log(`${this} adding system: ${system} tag: ${system.tag}`);
        this.systems[system.tag] = system;
    }

    $on_systemDestroyed(evt) {
        let system = evt.actor;
        if (system.tag in this.systems) {
            delete this.systems[system.tag];
        }
    }

    // METHODS -------------------------------------------------------------
    get(tag) {
        return this.systems[tag];
    }

}
