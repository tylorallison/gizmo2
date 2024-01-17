export { Evt, EvtEmitter };

import { Fmt } from './fmt.js';

/** ========================================================================
 * represents an instance of an event that is triggered, along w/ associated event data
 */
class Evt {
    // CONSTRUCTOR ---------------------------------------------------------
    constructor(actor, tag, atts={}) {
        this.tag = tag;
        this.actor = actor;
        Object.assign(this, atts);
    }

    // METHODS -------------------------------------------------------------
    toString() {
        return Fmt.toString(this.constructor.name, Fmt.ofmt(this));
    }
}

class $EvtListener {
    constructor(fcn, boundfcn, once=false, filter=undefined, priority=0, ctx=undefined) {
        this.fcn = fcn;
        this.boundfcn = boundfcn;
        this.priority = priority;
        this.once = once;
        this.filter = filter;
        this.ctx = ctx;
    }
    toString() {
        return Fmt.toString(this.constructor.name, this.priority, this.once);
    }
}

class EvtEmitter {

    constructor(actor, tag='event') {
        this.$actor = actor;
        this.$tag = tag;
        this.$listeners = []
    }

    trigger(atts={}) {
        // no listeners... no work...
        if (!this.$listeners.length) return;
        // build event
        let evt = new Evt(this.$actor, this.$tag, atts);
        // -- listeners
        const listeners = Array.from(this.$listeners)
        for (const listener of listeners) {
            // check for listener filter
            if (listener.filter && !listener.filter(evt)) continue;
            // delete any listener from emitter if marked w/ once attribute
            if (listener.once) {
                let idx = this.$listeners.indexOf(listener);
                if (idx !== -1) this.$listeners.splice(idx, 1);
            }
            // execute listener callback
            listener.boundfcn(evt, listener.ctx);
        }
    }

    listen(fcn, receiver, once=false, filter=undefined, priority=0, ctx=undefined) {
        let boundfcn = (receiver) ? fcn.bind(receiver) : fcn;
        let listener = new $EvtListener(fcn, boundfcn, once, filter, priority, ctx);
        this.$listeners.push(listener);
        this.$listeners.sort((a,b) => a.priority-b.priority);
    }

    ignore(fcn) {
        let idx = this.$listeners.findIndex((v) => v.fcn === fcn);
        if (idx !== -1) this.$listeners.splice(idx, 1);
    }

    clear() {
        this.$listeners.splice(0,this.$listeners.length);
    }

}