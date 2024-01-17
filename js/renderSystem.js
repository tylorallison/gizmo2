export { RenderSystem };

import { System } from './system.js';
import { Fmt } from './fmt.js';

class RenderSystem extends System {

    // STATIC VARIABLES ----------------------------------------------------
    static dfltIterateTTL = 0;
    static dfltMatchFcn = (evt) => evt.actor.canvasable;
    static { this.$schema('$stayActive', { eventable: false, parser: () => false }); }

    // EVENT HANDLERS ------------------------------------------------------
    $on_gizmoCreated(evt) {
        this.$store.set(evt.actor.gid, evt.actor);
        this.active = true;
        evt.actor.at_modified.listen(this.$on_viewModified, this);
        if (this.$iterating) this.$stayActive = true;
    }
    $on_gizmoDestroyed(evt) {
        this.store.delete(evt.actor.gid);
        this.active = true;
        if (this.$iterating) this.$stayActive = true;
    }
    $on_viewModified(evt) {
        this.active = true;
        if (this.$iterating) this.$stayActive = true;
    }

    // METHODS -------------------------------------------------------------
    $iterate(evt, e) {
        console.log(`render iterate dim: ${e.canvas.width},${e.canvas.height}`);
        // clear canvas
        e.ctx.clearRect(0, 0, e.canvas.width, e.canvas.height);
        // render
        e.render(e.ctx);
    }

    $finalize() {
        if (this.$stayActive) {
            this.$stayActive = false;
        } else {
            this.active = false;
        }
    }

}
