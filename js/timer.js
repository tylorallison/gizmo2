export { Timer, Ticker };
import { Gadget } from './gadget.js';
import { GadgetCtx } from './gadget.js';

/**
 * game timer has two "time" variables
 * ticks: game clock measure of time.  this can be adjusted to "speed up" or "slow down" the game.
 * elapsed: actual milliseconds that have elapsed since last game timer
 * Timers operate on elapsed time.
 * Tickers operate on ticks.
 */

class Timer extends Gadget {
    static {
        this.$schema('ttl', { eventable: false, dflt: 1000 });
        this.$schema('loop', { readonly: true, dflt: false });
        this.$schema('cb', { readonly: true, dflt: () => false });
        this.$schema('data', { readonly: true });
        this.$schema('$startTTL', { readonly: true, parser: (o,x) => o.ttl });
        this.$schema('$ticks', { eventable: false, parser: () => 0 });
    }

    $cpost(spec={}) {
        super.$cpost(spec);
        GadgetCtx.at_tocked.listen(this.$on_tocked, this);
    }

    destroy() {
        super.destroy();
        GadgetCtx.at_tocked.ignore(this.$on_tocked);
    }

    $on_tocked(evt) {
        this.ttl -= evt.elapsed;
        this.$ticks += evt.ticks;
        if (this.ttl <= 0) {
            let ticks = this.$ticks;
            let overflow = -this.ttl;
            if (this.loop) {
                this.ttl += this.$startTTL;
                this.$ticks = 0;
                if (this.ttl < 0) this.ttl = 0;
            } else {
                GadgetCtx.at_tocked.ignore(this.$on_tocked);
            }
            this.cb(Object.assign( {}, evt, this.data, { ticks: ticks, overflow: overflow, elapsed: this.$startTTL + overflow } ));
        }
    }

}

class Ticker extends Timer {
    static { this.$schema('$elapsed', { eventable: false, parser: () => 0 }); }

    $on_tocked(evt) {
        this.ttl -= evt.ticks;
        this.$elapsed += evt.elapsed;
        if (this.ttl <= 0) {
            let elapsed = this.$elapsed;
            let overflow = -this.ttl;
            if (this.loop) {
                this.$elapsed = 0;
                this.ttl += this.$startTTL;
                if (this.ttl < 0) this.ttl = 0;
            } else {
                GadgetCtx.at_tocked.ignore(this.$on_tocked);
            }
            this.cb(Object.assign( {}, evt, this.data, { ticks: this.$startTTL + overflow, overflow: overflow, elapsed: elapsed } ));
        }
    }
}