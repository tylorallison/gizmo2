export { Direction };

class Direction {
    static none =           0;
    static north =          1<<0;
    static east =           1<<1;
    static south =          1<<2;
    static west =           1<<3;
    static northEast =      1<<4;
    static southEast =      1<<5;
    static northWest =      1<<6;
    static southWest =      1<<7;
    static up =             1<<8;
    static down =           1<<9;

    static northUp =        1<<10;
    static eastUp =         1<<11;
    static southUp =        1<<12;
    static westUp =         1<<13;
    static northEastUp =    1<<14;
    static southEastUp =    1<<15;
    static northWestUp =    1<<16;
    static southWestUp =    1<<17;
    static northDown =      1<<18;
    static eastDown =       1<<19;
    static southDown =      1<<20;
    static westDown =       1<<21;
    static northEastDown =  1<<22;
    static southEastDown =  1<<23;
    static northWestDown =  1<<24;
    static southWestDown =  1<<25;

    static cardinal =       Direction.north|Direction.south|Direction.east|Direction.west;
    static diagonal =       Direction.northWest|Direction.southWest|Direction.northEast|Direction.southEast;
    static any =            Direction.cardinal|Direction.diagonal;

    static all = [
        this.northWest,
        this.north,
        this.northEast,
        this.east,
        this.southEast,
        this.south,
        this.southWest,
        this.west,
    ];

    static all3d = [
        this.northWest,
        this.north,
        this.northEast,
        this.east,
        this.southEast,
        this.south,
        this.southWest,
        this.west,
        this.up,
        this.down,
        this.northWestUp,
        this.northUp,
        this.northEastUp,
        this.eastUp,
        this.southEastUp,
        this.southUp,
        this.southWestUp,
        this.westUp,
        this.northWestDown,
        this.northDown,
        this.northEastDown,
        this.eastDown,
        this.southEastDown,
        this.southDown,
        this.southWestDown,
        this.westDown,
    ];

    static opposites = {
        [this.northWest]:       this.southEast,
        [this.north]:           this.south,
        [this.northEast]:       this.southWest,
        [this.east]:            this.west,
        [this.southEast]:       this.northWest,
        [this.south]:           this.north,
        [this.southWest]:       this.northEast,
        [this.west]:            this.east,
        [this.up]:              this.down,
        [this.down]:            this.up,
        [this.northWestUp]:     this.southEastDown,
        [this.northUp]:         this.southDown,
        [this.northEastUp]:     this.southWestDown,
        [this.eastUp]:          this.westDown,
        [this.southEastUp]:     this.northWestDown,
        [this.southUp]:         this.northDown,
        [this.southWestUp]:     this.northEastDown,
        [this.westUp]:          this.eastDown,
        [this.northWestDown]:   this.southEastUp,
        [this.northDown]:       this.southUp,
        [this.northEastDown]:   this.southWestUp,
        [this.eastDown]:        this.westUp,
        [this.southEastDown]:   this.northWestUp,
        [this.southDown]:       this.northUp,
        [this.southWestDown]:   this.northEastUp,
        [this.westDown]:        this.eastUp,
    };

    static strMap = {
        [this.north]:       'north',
        [this.northEast]:   'northEast',
        [this.east]:        'east',
        [this.southEast]:   'southEast',
        [this.south]:       'south',
        [this.southWest]:   'southWest',
        [this.west]:        'west',
        [this.northWest]:   'northWest',
        [this.up]:          'up',
        [this.down]:        'down',
        [this.northUp]:     'northUp',
        [this.northEastUp]: 'northEastUp',
        [this.eastUp]:      'eastUp',
        [this.southEastUp]: 'southEastUp',
        [this.southUp]:     'southUp',
        [this.southWestUp]: 'southWestUp',
        [this.westUp]:      'westUp',
        [this.northWestUp]: 'northWestUp',
        [this.northDown]:     'northDown',
        [this.northEastDown]: 'northEastDown',
        [this.eastDown]:      'eastDown',
        [this.southEastDown]: 'southEastDown',
        [this.southDown]:     'southDown',
        [this.southWestDown]: 'southWestDown',
        [this.westDown]:      'westDown',
        [this.northWestDown]: 'northWestDown',
    };
    static abbrevMap = {
        [this.north]:       'n',
        [this.northEast]:   'ne',
        [this.east]:        'e',
        [this.southEast]:   'se',
        [this.south]:       's',
        [this.southWest]:   'sw',
        [this.west]:        'w',
        [this.northWest]:   'nw',
        [this.up]:          'u',
        [this.down]:        'd',
        [this.northUp]:     'nu',
        [this.northEastUp]: 'neu',
        [this.eastUp]:      'eu',
        [this.southEastUp]: 'seu',
        [this.southUp]:     'su',
        [this.southWestUp]: 'swu',
        [this.westUp]:      'wu',
        [this.northWestUp]: 'nwu',
        [this.northDown]:       'nd',
        [this.northEastDown]:   'ned',
        [this.eastDown]:        'ed',
        [this.southEastDown]:   'sed',
        [this.southDown]:       'sd',
        [this.southWestDown]:   'swd',
        [this.westDown]:        'wd',
        [this.northWestDown]:   'nwd',
    };

    static cardinals = [
        this.north,
        this.east,
        this.south,
        this.west,
    ];

    static cardinals3d = [
        this.north,
        this.east,
        this.south,
        this.west,
        this.up,
        this.down,
    ];

    static diagonals = [
        this.northEast,
        this.southEast,
        this.southWest,
        this.northWest,
    ];

    static diagonals3d = [
        this.northEast,
        this.southEast,
        this.southWest,
        this.northWest,
        this.northEastUp,
        this.southEastUp,
        this.southWestUp,
        this.northWestUp,
        this.northEastDown,
        this.southEastDown,
        this.southWestDown,
        this.northWestDown,
    ];

    static composites = {
        [this.northWest]: this.north|this.west,
        [this.northEast]: this.north|this.east,
        [this.southWest]: this.south|this.west,
        [this.southEast]: this.south|this.east,
    };

    static toString(dir) {
        return this.strMap[dir] || 'invalid';
    }

    static toAbbrev(dir) {
        return this.abbrevMap[dir] || 'X';
    }

    static maskToString(dir) {
        return Array.from(this.all.filter((v) => dir&v).map((v)=>this.toString(v))).join('|');
    }

    // kinds should be cardinals, diagonals, or all
    static nextInRotation(kinds, current, clockwise=true) {
        let idx = kinds.indexOf(current);
        if (idx === -1) return current;
        if (clockwise) {
            idx = (idx+1)%kinds.length;
            return kinds[idx];
        } else {
            idx = (kinds.length + idx - 1) % kinds.length;
            return kinds[idx];
        }
    }

    static westerly(dir) {
        return dir & (Direction.northWest|Direction.west|Direction.southWest);
    }

    static easterly(dir) {
        return dir & (Direction.northEast|Direction.east|Direction.southEast);
    }

    static cardinalFromXY(x, y) {
        let heading = Math.atan2(y, x);
        return this.cardinalFromHeading(heading);
    }

    static diagonalFromXY(x, y) {
        let heading = Math.atan2(y, x);
        return this.diagonalFromHeading(heading);
    }

    static diagonalFromHeading(heading) {
        // slice of the unit circle that each direction occupies
        let cardinalUnit = (2*Math.PI) / this.all.length;
        // to map values of -PI to PI to the direction index, first add PI (to give values in the range of 0 to 2*PI), then
        // divide by the 'cardinalUnit' or size of each directional slice of the unit circle.  Rounding this will give values
        // in the range from 0 to # of directions + 1.  Mod this by the # of directions to handle the special case of the 'west'
        // direction which occurs at the beginning of the range (-PI) and end of the range (PI) of values.
        let dir_i = (Math.round((heading + Math.PI) / cardinalUnit) + 7) % this.all.length;
        return this.all[dir_i];
    }

    static cardinalFromHeading(heading) {
        // slice of the unit circle that each direction occupies
        let cardinalUnit = (2*Math.PI) / this.cardinals.length;
        // to map values of -PI to PI to the direction index, first add PI (to give values in the range of 0 to 2*PI), then
        // divide by the 'cardinalUnit' or size of each directional slice of the unit circle.  Rounding this will give values
        // in the range from 0 to # of directions + 1.  Mod this by the # of directions to handle the special case of the 'west'
        // direction which occurs at the beginning of the range (-PI) and end of the range (PI) of values.
        let dir_i = (Math.round((heading + Math.PI) / cardinalUnit) + 3) % this.cardinals.length;
        return this.cardinals[dir_i];
    }

    static asHeading(dir) {
        switch (dir) {
        case this.north:
            return -Math.PI*.5;
        case this.south:
            return Math.PI*.5;
        case this.east:
            return 0;
        case this.west:
            return Math.PI;
        case this.northWest:
            return -Math.PI*.75;
        case this.northEast:
            return -Math.PI*.25;
        case this.southWest:
            return Math.PI*.75;
        case this.southEast:
            return Math.PI*.25;
        }
        return 0;
    }

    static asX(dir) {
        switch(dir) {
        case Direction.west:
        case Direction.northWest:
        case Direction.southWest:
        case Direction.westUp:
        case Direction.northWestUp:
        case Direction.southWestUp:
        case Direction.westDown:
        case Direction.northWestDown:
        case Direction.southWestDown:
            return -1;
        case Direction.east:
        case Direction.northEast:
        case Direction.southEast:
        case Direction.eastUp:
        case Direction.northEastUp:
        case Direction.southEastUp:
        case Direction.eastDown:
        case Direction.northEastDown:
        case Direction.southEastDown:
            return 1;
        }
        return 0;
    }

    static asY(dir) {
        switch(dir) {
        case Direction.north:
        case Direction.northWest:
        case Direction.northEast:
            return -1;
        case Direction.south:
        case Direction.southWest:
        case Direction.southEast:
            return 1;
        }
        return 0;
    }

    static asY(dir) {
        switch(dir) {
        case Direction.north:
        case Direction.northWest:
        case Direction.northEast:
        case Direction.northUp:
        case Direction.northWestUp:
        case Direction.northEastUp:
        case Direction.northDown:
        case Direction.northWestDown:
        case Direction.northEastDown:
            return -1;
        case Direction.south:
        case Direction.southWest:
        case Direction.southEast:
        case Direction.southUp:
        case Direction.southWestUp:
        case Direction.southEastUp:
        case Direction.southDown:
        case Direction.southWestDown:
        case Direction.southEastDown:
            return 1;
        }
        return 0;
    }

    static asZ(dir) {
        switch(dir) {
        case Direction.northUp:
        case Direction.northEastUp:
        case Direction.eastUp:
        case Direction.southEastUp:
        case Direction.southUp:
        case Direction.southWestUp:
        case Direction.westUp:
        case Direction.northWestUp:
            return 1;
        case Direction.northDown:
        case Direction.northEastDown:
        case Direction.eastDown:
        case Direction.southEastDown:
        case Direction.southDown:
        case Direction.southWestDown:
        case Direction.westDown:
        case Direction.northWestDown:
            return -1;
        }
        return 0;
    }

    static opposite(dir) {
        return this.opposites[dir] || 0;
    }

    static orthogonal(dir) {
        switch(dir) {
        case Direction.north:
            return Direction.east;
        case Direction.south:
            return Direction.west;
        case Direction.west:
            return Direction.north;
        case Direction.east:
            return Direction.south;
        case Direction.northWest:
            return Direction.northEast;
        case Direction.southEast:
            return Direction.southWest;
        case Direction.northEast:
            return Direction.southEast;
        case Direction.southWest:
            return Direction.northWest;
        }
        return Direction.none;
    }

    static adjacent(dir) {
        switch(dir) {
        case Direction.north:
            return [Direction.northWest, Direction.northEast]
        case Direction.south:
            return [Direction.southWest, Direction.southEast]
        case Direction.west:
            return [Direction.southWest, Direction.northWest]
        case Direction.east:
            return [Direction.southEast, Direction.northEast]
        case Direction.northWest:
            return [Direction.north, Direction.west]
        case Direction.southEast:
            return [Direction.south, Direction.east]
        case Direction.northEast:
            return [Direction.north, Direction.east]
        case Direction.southWest:
            return [Direction.south, Direction.west]
        }
        return [];
    }

    static *forEach(dirs) {
        for (const dir of this.all) {
            if (dir & dirs) yield dir;
        }
    }

    static distanceAlong(dir, x, y) {
        let dx = this.asX(dir)*x;
        let dy = this.asY(dir)*y;
        return Math.sqrt(dx*dx+dy*dy);
    }

}