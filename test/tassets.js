import { ImageMedia } from '../js/media.js';
import { Sprite } from '../js/sprite.js';
import { Asset } from '../js/asset.js';
import { GadgetAssets, GadgetCtx } from '../js/gadget.js';

describe('an collection of assets', () => {
    var gctx;
    var assets;
    beforeEach(() => {
        gctx = new GadgetCtx();
        GadgetCtx.current = gctx;
        assets = new GadgetAssets();
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

    it('can add and load raw assets', async ()=>{
        assets.push(Sprite.from('../media/sprite.png', { tag: 'sprite'}));
        await assets.load();
        let asset = assets.get('sprite');
        expect(asset instanceof Asset).toBeTruthy();
        expect(asset.height).toEqual(48);
        expect(asset.width).toEqual(96);
    });

    it('can load/unload assets', async ()=>{
        let xasset = Sprite.from('../media/sprite.png', { tag: 'sprite'});
        assets.push(xasset);
        await assets.load();
        let asset = assets.get('sprite');
        expect(asset instanceof Asset).toBeTruthy();
        expect(asset.height).toEqual(48);
        expect(asset.width).toEqual(96);
        assets.pop();
        asset = assets.get('sprite');
        expect(asset).toBeFalsy();
    });

});