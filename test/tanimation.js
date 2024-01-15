import { Rect } from '../js/rect.js';
import { Animation } from '../js/animation.js';
import { UiView } from '../js/uiView.js';
import { ImageMedia } from '../js/media.js';
import { Sprite } from '../js/sprite.js';
import { GadgetCtx } from '../js/gadget.js';

class TSketchView extends UiView {
    static {
        this.$schema('sketch', { link: true });
    }
}

describe('an animation', () => {

    let anim, view, tevt, gctx;
    beforeEach(() => {
        gctx = new GadgetCtx();
        GadgetCtx.current = gctx;
        anim = new Animation({jitter: true, sketches: [
            new Rect({ tag: 'rect.blue', color: 'blue', borderColor: 'red', border: 2, width: 20, height: 20, ttl: 100 }),
            new Rect({ tag: 'rect.green', color: 'green', borderColor: 'red', border: 2, width: 20, height: 20, ttl: 100 }),
        ]});
        view = new TSketchView({ sketch: anim });
        tevt = null;
        view.at_modified.listen((evt) => tevt=evt);
    });

    it('animation stops when view is destroyed', ()=>{
        expect(tevt).toEqual(null);
        anim.enable();
        tevt = null;
        gctx.at_tocked.trigger({ticks:100, elapsed:100});
        expect(tevt.tag).toEqual('modified');
        view.destroy();
        tevt = null;
        gctx.at_tocked.trigger({ticks:100, elapsed:100});
        expect(tevt).toEqual(null);
    });

    it('can be async loaded from list of URLs', async ()=>{
        let asset = await Animation.load(['../media/sprite.png', '../media/sprite.png']);
        expect(asset.sketches instanceof Array).toBeTruthy();
        expect(asset.sketches.length).toEqual(2);
        expect(asset.sketches[0].height).toEqual(48);
        expect(asset.sketches[0].width).toEqual(96);
        expect(asset.sketches[1].height).toEqual(48);
        expect(asset.sketches[1].width).toEqual(96);
    });

    it('can be async loaded from single URL', async ()=>{
        let asset = await Animation.load('../media/sprite.png');
        expect(asset.sketches instanceof Array).toBeTruthy();
        expect(asset.sketches.length).toEqual(1);
        expect(asset.sketches[0].height).toEqual(48);
        expect(asset.sketches[0].width).toEqual(96);
    });

    it('can be async loaded from list of image medias', async ()=>{
        let asset = await Animation.load([ImageMedia.from('../media/sprite.png'), ImageMedia.from('../media/sprite.png')]);
        expect(asset.sketches instanceof Array).toBeTruthy();
        expect(asset.sketches.length).toEqual(2);
        expect(asset.sketches[0].height).toEqual(48);
        expect(asset.sketches[0].width).toEqual(96);
        expect(asset.sketches[1].height).toEqual(48);
        expect(asset.sketches[1].width).toEqual(96);
    });

    it('can be async loaded from single image media', async ()=>{
        let asset = await Animation.load(ImageMedia.from('../media/sprite.png'));
        expect(asset.sketches instanceof Array).toBeTruthy();
        expect(asset.sketches.length).toEqual(1);
        expect(asset.sketches[0].height).toEqual(48);
        expect(asset.sketches[0].width).toEqual(96);
    });

    it('can be async loaded from list of sketches', async ()=>{
        let asset = await Animation.load([Sprite.from('../media/sprite.png'), Sprite.from('../media/sprite.png')]);
        expect(asset.sketches instanceof Array).toBeTruthy();
        expect(asset.sketches.length).toEqual(2);
        expect(asset.sketches[0].height).toEqual(48);
        expect(asset.sketches[0].width).toEqual(96);
        expect(asset.sketches[1].height).toEqual(48);
        expect(asset.sketches[1].width).toEqual(96);
    });

    it('can be async loaded from single sketch', async ()=>{
        let asset = await Animation.load(Sprite.from('../media/sprite.png'));
        expect(asset.sketches instanceof Array).toBeTruthy();
        expect(asset.sketches.length).toEqual(1);
        expect(asset.sketches[0].height).toEqual(48);
        expect(asset.sketches[0].width).toEqual(96);
    });

    it('can be created using from helper', async ()=>{
        let asset = Animation.from(['../media/sprite.png', ImageMedia.from('../media/sprite.png'), Sprite.from('../media/sprite.png')]);
        await asset.load();
        expect(asset.sketches instanceof Array).toBeTruthy();
        expect(asset.sketches.length).toEqual(3);
    });

    it('can be created using constructor', async ()=>{
        let asset = new Animation({sketches: [Sprite.from('../media/sprite.png'), Sprite.from('../media/sprite.png')]});
        await asset.load();
        expect(asset.sketches instanceof Array).toBeTruthy();
        expect(asset.sketches.length).toEqual(2);
    });

});
