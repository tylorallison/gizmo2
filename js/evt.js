export { Evt, EvtListener, EvtEmitter };

import { Fmt } from './fmt.js';
//import { GizmoCtx } from './gizmoCtx.js';

/** ========================================================================
 * represents an instance of an event that is triggered, along w/ associated event data
 */
class Evt {
    // CONSTRUCTOR ---------------------------------------------------------
    constructor(actor, tag, atts={}) {
        Object.assign(this, atts);
        this.tag = tag;
        this.actor = actor;
    }

    // METHODS -------------------------------------------------------------
    toString() {
        return Fmt.toString(this.constructor.name, Fmt.ofmt(this));
    }
}

class EvtListener {
    constructor(fcn, once=false, filter=undefined, priority=0) {
        this.fcn = fcn;
        this.priority = priority;
        this.once = once;
        this.filter = filter;
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

    trigger(atts) {
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
            listener.fcn(evt);
        }
        let links = this.findLinksForEvt(emitter, evt.tag);
        if (links.length) {
            // sort listeners
            links.sort((a,b) => a.priority-b.priority);
            // delete any listener from emitter if marked w/ once attribute
            for (const link of links.filter((v) => v.once && (!v.filter || v.filter(evt)))) {
                this.delLink(link);
            }
            // trigger callback for each listener
            for (const link of links) {
                if (link.filter && !link.filter(evt)) continue;
                link.fcn(evt);
            }
        }
    }

    listen(fcn, receiver, once=false, filter=undefined, priority=0) {
        // bind receiver function
        if (receiver) fcn = fcn.bind(receiver);
        let listener = new EvtListener(fcn, once, filter, priority);
        this.$listeners.push(listener);
        this.$listeners.sort((a,b) => a.priority-b.priority);
    }

    ignore(fcn) {
        let idx = this.$listeners.indexOf(listener);
        if (idx !== -1) this.$listeners.splice(idx, 1);
    }

    clear() {
        this.$listeners.splice(0,this.$listeners.length);
    }

}

//const Evts = new EvtCtx();
