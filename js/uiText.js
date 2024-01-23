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

    /*
    // FIXME:remove?
    getCursorBounds(idx) {
        if (this.needsLayout) {
            this.needsLayout = false;
            this.layout();
        }
        if (!this.tokens.length) {
            let tsize = this.fmt.measure(' ');
            return new Bounds({x:0,y:0, width:tsize.x, height:tsize.y});
        }
        // FIXME: assumes single token
        if (idx < 0) idx = 0;
        let token = this.tokens[0];
        if (idx > token.text.length) idx = token.text.length;
        let substr = this.text.slice(0,idx);
        let spacing = token.fmt.measure(substr);
        let bounds = this.bounds[0];
        let tx = (bounds.width) ? (bounds.width-token.width)*this.alignx : 0;
        let ty = (bounds.height) ? (bounds.height-token.height)*this.aligny : 0;
        return new Bounds({x:this.bounds[0].x + spacing.x + tx, y:this.bounds[0].y + ty, width: token.width, height:token.height});
    }
    */

    $subrender(ctx) {
        if (this.$text) this.$text.render(ctx, this.xform.minx, this.xform.miny, this.xform.width, this.xform.height);
    }
}
