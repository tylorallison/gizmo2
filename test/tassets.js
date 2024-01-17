import { Assets } from '../js/assets.js';
import { ImageMedia } from '../js/media.js';
import { Sprite } from '../js/sprite.js';
import { Asset } from '../js/asset.js';
import { GadgetCtx } from '../js/gadget.js';

xdescribe('an collection of assets', () => {
    var gctx;
    var assets;
    beforeEach(() => {
        gctx = new GadgetCtx();
        GadgetCtx.current = gctx;
        assets = new Assets();
    });

    it('can add and load assets by spec', async ()=>{
        assets.push(Sprite.xspec({
            media: ImageMedia.xspec({src: '../media/sprite.png'}),
            tag: 'sprite',
        }));
        await assets.load();
        let asset = assets.get('sprite');
        expect(asset instanceof Asset).toBeTruthy();
        expect(asset.height).toEqual(48);
        expect(asset.width).toEqual(96);
    });

    xit('can add and load raw assets', async ()=>{
        Assets.add(Sprite.from('../media/sprite.png', { tag: 'sprite'}));
        await Assets.advance();
        let asset = Assets.get('sprite');
        expect(asset instanceof Asset).toBeTruthy();
        expect(asset.height).toEqual(48);
        expect(asset.width).toEqual(96);
    });

    xit('can load/unload assets', async ()=>{
        let xasset = Sprite.from('../media/sprite.png', { tag: 'sprite'});
        Assets.add(xasset);
        await Assets.advance();
        let asset = Assets.get('sprite');
        expect(asset instanceof Asset).toBeTruthy();
        expect(asset.height).toEqual(48);
        expect(asset.width).toEqual(96);
        Assets.delete(xasset);
        asset = Assets.get('sprite');
        expect(asset).toBeFalsy();
    });

});