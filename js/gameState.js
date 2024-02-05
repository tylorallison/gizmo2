export { GameState };

import { EvtEmitter } from './evt.js';
import { Fmt } from './fmt.js';
import { GadgetCtx } from './gadget.js';
import { Gizmo } from './gizmo.js';
import { Util } from './util.js';

/**
 * A generic game state class that provides building blocks for game state transitions.  For example, a title screen, a main menu screen, and the 
 * main game play scene can all be managed by separate states.  Each state can manage UI elements, handle player inputs, and setup event handlers that 
 * will only be active when the state has active and in a 'active' state.  The {@link Game} class includes a {@link StateMgr} that is used to keep an 
 * inventory of available states and which state is currently active.  Only one state can be active at a time.  The game state has an internal state 
 * to track the progression of the state.  Possible internal state values are as follows:
 * - inactive: starting and/or idle state
 * - active: state is active
 */
class GameState extends Gizmo {
    // STATIC VARIABLES ----------------------------------------------------
    static xassets = [];

    // SCHEMA --------------------------------------------------------------
    static {
        this.$schema('dbg', { dflt:false});
        this.$schema('xassets', { dflt:(o) => o.constructor.xassets });
        this.$schema('$state', { dflt:'inactive'});
        this.$schema('at_transitioned', { readonly:true, dflt: (o) => new EvtEmitter(o, 'transitioned') });
    }

    // CONSTRUCTOR ---------------------------------------------------------
    $cpost(spec) {
        super.$cpost(spec);
        // state-specific initialization
        this.init();
        this.$state = 'inactive';
    }

    // METHODS -------------------------------------------------------------
    /**
     * init is called only once during state lifetime (when state is first created, before any other setup)
     * - intended to create required state/variables for the given game state
     * - override init() for state specific init functionality
     */
    init() {
    }

    /**
     * prepare is called every time a state transitions from inactive to active and should contain state specific
     * logic to execute the game state.
     * @param {*} data - game specific data used during state setup
     * @returns Promise
     */
    async prepare(data) {
        return Promise.resolve();
    }

    /**
     * start is called by the {@link StateMgr} when a state needs to be started.  Start executes prepare functions as needed
     * based on game state.  State will transition from inactive to active.
     * @param {*} data - game specific data used during state setup
     * @returns { Promise }
     */
    async start(data) {
        // prepare
        if (this.$state === 'inactive') {
            // prepare
            await this.prepare(data);
            if (this.dbg) console.log(`${this} starting prepare`);
            // setup state assets
            GadgetCtx.assets.push(this.xassets);
            await GadgetCtx.assets.load();
            await this.prepare(data);
            if (this.dbg) console.log(`${this} prepare complete`);

            this.$state = 'active';
            this.at_transitioned.trigger( { state:'active' });
        }
        return Promise.resolve();
    }

    /**
     * stop is called by the {@link StateMgr} to stop a state.  The state will transition from 'active' to 'inactive'.
     * @returns { Promise }
     */
    async stop() {
        if (this.$state === 'active') {
            this.$state = 'inactive';
            // clean up state assets
            GadgetCtx.assets.pop();
            this.at_transitioned.trigger( { state:'inactive' });
        }
        return Promise.resolve();
    }

    toString() {
        return Fmt.toString(this.constructor.name, this.tag);
    }

}
