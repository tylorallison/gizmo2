export { StateMgr };

import { Fmt } from './fmt.js';
import { GadgetCtx } from './gadget.js';
import { GameState } from './gameState.js';
import { Gizmo } from './gizmo.js';
import { Timer } from './timer.js';


class StateMgr extends Gizmo {

    static start(state, data) {
        GadgetCtx.at_gizmoed.trigger({ tag:'desired', state:state, data:data });
    }
        
    // SCHEMA --------------------------------------------------------------
    static {
        this.$schema( 'dbg', { dflt:false });
        this.$schema( '$states', { parser:() => ({}) });
        this.$schema( '$current' );
    }

    // CONSTRUCTOR ---------------------------------------------------------
    $cpost(spec) {
        super.$cpost(spec);
        GadgetCtx.at_created.listen(this.$on_created, this, false, (evt) => evt.actor instanceof GameState);
        GadgetCtx.at_destroyed.listen(this.$on_destroyed, this, false, (evt) => evt.actor instanceof GameState);
        GadgetCtx.at_gizmoed.listen(this.$on_desired, this, false, (evt) => evt.tag === 'desired');
    }

    // EVENT HANDLERS ------------------------------------------------------
    $on_created(evt) {
        let state = evt.actor;
        // pre-existing?
        if (this.dbg && this.$states[state.tag]) console.log(`${this} replacing state for tag: ${state.tag}`);
        if (this.dbg) console.log(`${this} adding state: ${state} tag: ${state.tag}`);
        this.$states[state.tag] = state;
    }

    $on_destroyed(evt) {
        let state = evt.actor;
        if (state.tag in this.$states) {
            delete this.$states[state.tag];
            if (this.$current && (this.$current.tag === state.tag)) {
                this.$current = null;
            }
        }
    }

    $on_desired(evt) {
        let newState = evt.state;
        let data = evt.data;
        if (this.dbg) console.log(`${this} onStateWanted: ${Fmt.ofmt(evt)} current: ${this.$current} new: ${newState}`);
        if (newState && newState !== this.$current) {
            new Timer({ttl: 0, cb: () => {this.start(newState, data)}});
        }
    }

    // METHODS -------------------------------------------------------------
    get(tag) {
        return this.$states[tag];
    }

    start(tag, data) {
        if (this.dbg) console.log(`${this} starting state: ${tag} with ${Fmt.ofmt(data)}`);
        let state = this.$states[tag];
        if (!state) {
            console.error(`invalid state: ${tag}`);
            return;
        }
        // stop current state
        if (this.$current) {
            this.$current.stop();
        }
        // start new state
        state.start(data);
        this.$current = state;
    }

}
