export { KeySystem }

import { GadgetCtx } from './gadget.js';
import { System } from './system.js';

class KeySystem extends System {

    static {
        this.$schema('$pressed', { link: false, readonly: true, parser: () => new Map()});
    }

    $cpost(spec) {
        super.$cpost(spec);
        this.$on_keyDown = this.$on_keyDown.bind(this);
        this.$on_keyUp = this.$on_keyUp.bind(this);
        document.addEventListener('keydown', this.$on_keyDown);
        document.addEventListener('keyup', this.$on_keyUp);
    }

    destroy() {
        super.destroy();
        document.removeEventListener('keydown', this.$on_keyDown);
        document.removeEventListener('keyup', this.$on_keyUp);
    }

    $on_keyDown(sevt) {
        sevt.preventDefault();
        if (!GadgetCtx.interacted) GadgetCtx.interacted = true;
        if (!this.$pressed.has(sevt.key)) {
            if (this.dbg) console.log(`${this} key down: ${sevt.key}`);
            GadgetCtx.at_keyed.trigger({
                tag:'keydowned',
                key:sevt.key,
            });
        }
    }

    $on_keyUp(sevt) {
        sevt.preventDefault();
        if (this.$pressed.has(sevt.key)) {
            if (this.dbg) console.log(`${this} evt.key up: ${sevt.key}`);
            this.$pressed.delete(sevt.key);
            GadgetCtx.at_keyed.trigger({
                tag:'keyupped',
                key:sevt.key,
            });
        }
    }

    get(key) {
        return (this.$pressed.has(key)) ? 1 : 0;
    }

}
