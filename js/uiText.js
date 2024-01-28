export { UiText };

import { Bounds } from './bounds.js';
import { Text } from './text.js';
import { UiView } from './uiView.js';

/** ========================================================================
 * A string of text rendered to the screen as a sketch.
 */
class UiText extends UiView {
    // STATIC VARIABLES ----------------------------------------------------
    static lorem = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut ' + 
                   'labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris ' +
                   'nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit ' +
                   'esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in ' +
                   'culpa qui officia deserunt mollit anim id est laborum.';

    static get rlorem() {
        let len = Math.floor(Math.random()*this.lorem.length);
        return  this.lorem.slice(0, len);
    }

    static get rword() {
        let choices = this.lorem.split(' ');
        let idx = Math.floor(Math.random() * choices.length);
        return choices[idx];
    }

    static {
        this.$schema('$text', { order:-1, link:true, dflt: () => new Text({text: 'default text'}) });
        this.$schema('text', { dflt: 'default text', setter: (o,v) => { o.$text.text = v; return v } });
    }

    // METHODS -------------------------------------------------------------
    $subrender(ctx) {
        if (this.$text) this.$text.render(ctx, this.xform.minx, this.xform.miny, this.xform.width, this.xform.height);
    }
}
