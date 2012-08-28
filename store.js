/*

	store.js

    saving and loading Snap! projects

	written by Jens Mönig
	jens@moenig.org

	Copyright (C) 2012 by Jens Mönig

	This file is part of Snap!. 

	Snap! is free software: you can redistribute it and/or modify
	it under the terms of the GNU Affero General Public License as
	published by the Free Software Foundation, either version 3 of
	the License, or (at your option) any later version.

	This program is distributed in the hope that it will be useful,
	but WITHOUT ANY WARRANTY; without even the implied warranty of
	MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
	GNU Affero General Public License for more details.

	You should have received a copy of the GNU Affero General Public License
	along with this program.  If not, see <http://www.gnu.org/licenses/>.


	prerequisites:
	--------------
	needs morphic.js, xml.js, and most of Snap!'s other modules


	hierarchy
	---------
	the following tree lists all constructors hierarchically,
	indentation indicating inheritance. Refer to this list to get a
	contextual overview:

        XML_Serializer
            SnapSerializer


    credits
    -------
    Nathan Dinsmore contributed to the design and implemented a first
    working version of a complete XMLSerializer. I have taken much of the
    overall design and many of the functions and methods in this file from
    Nathan's fine original prototype.
    
*/

/*global modules, XML_Element, XML_Serializer, VariableFrame, StageMorph,
SpriteMorph, WatcherMorph, Point, CustomBlockDefinition, Context,
ReporterBlockMorph, CommandBlockMorph, HatBlockMorph, RingMorph, contains,
detect, CustomCommandBlockMorph, CustomReporterBlockMorph, Color, List,
newCanvas, Costume, Sound, Audio, IDE_Morph, ScriptsMorph, BlockMorph,
ArgMorph, InputSlotMorph, TemplateSlotMorph, CommandSlotMorph,
FunctionSlotMorph, MultiArgMorph, ColorSlotMorph, nop*/

// Global stuff ////////////////////////////////////////////////////////

modules.store = '2012-August-13';


// XML_Serializer ///////////////////////////////////////////////////////
/*
    I am an abstract protype for my heirs.

    I manage object identities and keep track of circular data structures.
    Objects are "touched" and a property named "serializationID" is added
    to each, representing an index integer in the list, starting with 1.
*/

// XML_Serializer instance creation:

function XML_Serializer() {
    this.contents = [];
}

// XML_Serializer preferences settings:

XML_Serializer.prototype.idProperty = 'serializationID';
XML_Serializer.prototype.version = 1; // increment on structural change

// XML_Serializer accessing:

XML_Serializer.prototype.serialize = function (object) {
    // public: answer an XML string representing the given object
    var xml;
    this.flush(); // in case an error occurred in an earlier attempt
    xml = this.store(object);
    this.flush();
    return xml;
};

XML_Serializer.prototype.store = function (object) {
    // private
    if (object[this.idProperty]) {
        return this.format('<ref id="@"></ref>', object[this.idProperty]);
    }
    this.add(object);
    return object.toXML(this).replace(
        '~',
        this.format('id="@"', object[this.idProperty])
    );
};

XML_Serializer.prototype.add = function (object) {
    // private - mark the object with a serializationID property and add it
    if (object[this.idProperty]) { // already present
        return -1;
    }
    this.contents.push(object);
    object[this.idProperty] = this.contents.length;
    return this.contents.length;
};


XML_Serializer.prototype.at = function (integer) {
    // private
    return this.contents[integer - 1];
};

XML_Serializer.prototype.flush = function () {
    // private - free all objects and empty my contents
    var myself = this;
    this.contents.forEach(function (obj) {
        delete obj[myself.idProperty];
    });
    this.contents = [];
};

// XML_Serializer formatting:

XML_Serializer.prototype.escape = XML_Element.prototype.escape;
XML_Serializer.prototype.unescape = XML_Element.prototype.unescape;


XML_Serializer.prototype.format = function (string) {
    // private
    var myself = this,
        i = -1,
        values = arguments,
        value;

    return string.replace(/[@$%]([\d]+)?/g, function (spec, index) {
        index = parseInt(index, 10);
        value = values[(isNaN(index) ? (i += 1) : index) + 1];
        return spec === '@' ?
                myself.escape(value)
                    : spec === '$' ?
                        myself.escape(value, true)
                            : value;
    });
};

// XML_Serializer loading:

XML_Serializer.prototype.load = function (xmlString) {
    // public - answer a new object which is represented by the given
    // XML string.
    nop(xmlString);
    throw new Error(
        'loading should be implemented in heir of XML_Serializer'
    );
};

XML_Serializer.prototype.parse = function (xmlString) {
    // private - answer an XML_Element representing the given XML String
    var element = new XML_Element();
    element.parseString(xmlString);
    return element;
};

// SnapSerializer ////////////////////////////////////////////////////////////

var SnapSerializer;

// SnapSerializer inherits from XML_Serializer:

SnapSerializer.prototype = new XML_Serializer();
SnapSerializer.prototype.constructor = SnapSerializer;
SnapSerializer.uber = XML_Serializer.prototype;

// SnapSerializer constants:

SnapSerializer.prototype.thumbnailSize = new Point(160, 120);

SnapSerializer.prototype.watcherLabels = {
    xPosition: 'x position',
    yPosition: 'y position',
    direction: 'direction',
    getScale: 'size',
    getLastAnswer: 'answer',
    getTimer: 'timer',
    getCostumeIdx: 'costume #'
};

SnapSerializer.prototype.blocks = {

    // Motion

    forward: {
        type: 'command',
        category: 'motion',
        spec: 'move %n steps'
    },

    turn: {
        type: 'command',
        category: 'motion',
        spec: 'turn %clockwise %n degrees'
    },

    turnLeft: {
        type: 'command',
        category: 'motion',
        spec: 'turn %counterclockwise %n degrees'
    },

    setHeading: {
        type: 'command',
        category: 'motion',
        spec: 'point in direction %dir'
    },

    doFaceTowards: {
        type: 'command',
        category: 'motion',
        spec: 'point towards %dst'
    },

    gotoXY: {
        type: 'command',
        category: 'motion',
        spec: 'go to x: %n y: %n'
    },

    doGotoObject: {
        type: 'command',
        category: 'motion',
        spec: 'go to %dst'
    },

    doGlide: {
        type: 'command',
        category: 'motion',
        spec: 'glide %n secs to x: %n y: %n'
    },

    changeXPosition: {
        type: 'command',
        category: 'motion',
        spec: 'change x by %n'
    },

    setXPosition: {
        type: 'command',
        category: 'motion',
        spec: 'set x to %n'
    },

    changeYPosition: {
        type: 'command',
        category: 'motion',
        spec: 'change y by %n'
    },

    setYPosition: {
        type: 'command',
        category: 'motion',
        spec: 'set y to %n'
    },

    bounceOffEdge: {
        type: 'command',
        category: 'motion',
        spec: 'if on edge, bounce'
    },

    xPosition: {
        type: 'reporter',
        category: 'motion',
        spec: 'x position'
    },

    yPosition: {
        type: 'reporter',
        category: 'motion',
        spec: 'y position'
    },

    direction: {
        type: 'reporter',
        category: 'motion',
        spec: 'direction'
    },

    // Looks

    doSwitchToCostume: {
        type: 'command',
        category: 'looks',
        spec: 'switch to costume %cst'
    },

    doWearNextCostume: {
        type: 'command',
        category: 'looks',
        spec: 'next costume'
    },

    getCostumeIdx: {
        type: 'reporter',
        category: 'looks',
        spec: 'costume #'
    },

    doSayFor: {
        type: 'command',
        category: 'looks',
        spec: 'say %s for %n secs'
    },

    bubble: {
        type: 'command',
        category: 'looks',
        spec: 'say %s'
    },

    doThinkFor: {
        type: 'command',
        category: 'looks',
        spec: 'think %s for %n secs'
    },

    doThink: {
        type: 'command',
        category: 'looks',
        spec: 'think %s'
    },

    changeEffect: {
        type: 'command',
        category: 'looks',
        spec: 'change %eff effect by %n'
    },

    setEffect: {
        type: 'command',
        category: 'looks',
        spec: 'set %eff effect to %n'
    },

    clearEffects: {
        type: 'command',
        category: 'looks',
        spec: 'clear graphic effects'
    },

    changeScale: {
        type: 'command',
        category: 'looks',
        spec: 'change size by %n'
    },

    setScale: {
        type: 'command',
        category: 'looks',
        spec: 'set size to %n %'
    },

    getScale: {
        type: 'reporter',
        category: 'looks',
        spec: 'size'
    },

    show: {
        type: 'command',
        category: 'looks',
        spec: 'show'
    },

    hide: {
        type: 'command',
        category: 'looks',
        spec: 'hide'
    },

    comeToFront: {
        type: 'command',
        category: 'looks',
        spec: 'go to front'
    },

    goBack: {
        type: 'command',
        category: 'looks',
        spec: 'go back %n layers'
    },

    // Looks - Debugging primitives for development mode

    alert: {
        type: 'command',
        category: 'looks',
        spec: 'alert %mult%s'
    },

    log: {
        type: 'command',
        category: 'looks',
        spec: 'console log %mult%s'
    },

    // Sound

    playSound: {
        type: 'command',
        category: 'sound',
        spec: 'play sound %snd'
    },

    doPlaySoundUntilDone: {
        type: 'command',
        category: 'sound',
        spec: 'play sound %snd until done'
    },

    doStopAllSounds: {
        type: 'command',
        category: 'sound',
        spec: 'stop all sounds'
    },

    // Pen

    clear: {
        type: 'command',
        category: 'pen',
        spec: 'clear'
    },

    down: {
        type: 'command',
        category: 'pen',
        spec: 'pen down'
    },

    up: {
        type: 'command',
        category: 'pen',
        spec: 'pen up'
    },

    setColor: {
        type: 'command',
        category: 'pen',
        spec: 'set pen color to %clr'
    },

    changeHue: {
        type: 'command',
        category: 'pen',
        spec: 'change pen color by %n'
    },

    setHue: {
        type: 'command',
        category: 'pen',
        spec: 'set pen color to %n'
    },

    changeBrightness: {
        type: 'command',
        category: 'pen',
        spec: 'change pen shade by %n'
    },

    setBrightness: {
        type: 'command',
        category: 'pen',
        spec: 'set pen shade to %n'
    },

    changeSize: {
        type: 'command',
        category: 'pen',
        spec: 'change pen size by %n'
    },

    setSize: {
        type: 'command',
        category: 'pen',
        spec: 'set pen size to %n'
    },

    doStamp: {
        type: 'command',
        category: 'pen',
        spec: 'stamp'
    },

    // Control

    receiveGo: {
        type: 'hat',
        category: 'control',
        spec: 'when %greenflag clicked'
    },

    receiveKey: {
        type: 'hat',
        category: 'control',
        spec: 'when %key key pressed'
    },

    receiveClick: {
        type: 'hat',
        category: 'control',
        spec: 'when I am clicked'
    },

    receiveMessage: {
        type: 'hat',
        category: 'control',
        spec: 'when I receive %msg'
    },

    doBroadcast: {
        type: 'command',
        category: 'control',
        spec: 'broadcast %msg'
    },

    doBroadcastAndWait: {
        type: 'command',
        category: 'control',
        spec: 'broadcast %msg and wait'
    },

    doWait: {
        type: 'command',
        category: 'control',
        spec: 'wait %n secs'
    },

    doWaitUntil: {
        type: 'command',
        category: 'control',
        spec: 'wait until %b'
    },

    doForever: {
        type: 'command',
        category: 'control',
        spec: 'forever %c'
    },

    doRepeat: {
        type: 'command',
        category: 'control',
        spec: 'repeat %n %c'
    },

    doUntil: {
        type: 'command',
        category: 'control',
        spec: 'repeat until %b %c'
    },

    doIf: {
        type: 'command',
        category: 'control',
        spec: 'if %b %c'
    },

    doIfElse: {
        type: 'command',
        category: 'control',
        spec: 'if %b %c else %c'
    },

    doStop: {
        type: 'command',
        category: 'control',
        spec: 'stop script'
    },

    doStopAll: {
        type: 'command',
        category: 'control',
        spec: 'stop all'
    },

    doRun: {
        type: 'command',
        category: 'control',
        spec: 'run %cmdRing %inputs'
    },

    fork: {
        type: 'command',
        category: 'control',
        spec: 'launch %cmdRing %inputs'
    },

    evaluate: {
        type: 'reporter',
        category: 'control',
        spec: 'call %repRing %inputs'
    },

/*
    doRunWithInputList: {
        type: 'command',
        category: 'control',
        spec: 'run %cmd with input list %l'
    },

    forkWithInputList: {
        type: 'command',
        category: 'control',
        spec: 'launch %cmd with input list %l'
    },

    evaluateWithInputList: {
        type: 'reporter',
        category: 'control',
        spec: 'call %r with input list %l'
    },
*/

    doReport: {
        type: 'command',
        category: 'control',
        spec: 'report %s'
    },

    doStopBlock: {
        type: 'command',
        category: 'control',
        spec: 'stop block'
    },

    doCallCC: {
        type: 'command',
        category: 'control',
        spec: 'run %cmdRing w/continuation'
    },

    reportCallCC: {
        type: 'reporter',
        category: 'control',
        spec: 'call %cmdRing w/continuation'
    },

    doWarp: {
        type: 'command',
        category: 'other',
        spec: 'warp %c'
    },

    // Sensing

    reportTouchingObject: {
        type: 'predicate',
        category: 'sensing',
        spec: 'touching %col ?'
    },

    reportTouchingColor: {
        type: 'predicate',
        category: 'sensing',
        spec: 'touching %clr ?'
    },

    reportColorIsTouchingColor: {
        type: 'predicate',
        category: 'sensing',
        spec: 'color %clr is touching %clr ?'
    },

    colorFiltered: {
        type: 'reporter',
        category: 'sensing',
        spec: 'filtered for %col'
    },

    reportStackSize: {
        type: 'reporter',
        category: 'sensing',
        spec: 'stack size'
    },

    reportFrameCount: {
        type: 'reporter',
        category: 'sensing',
        spec: 'frames'
    },

    doAsk: {
        type: 'command',
        category: 'sensing',
        spec: 'ask %s and wait'
    },

    reportLastAnswer: {
        type: 'reporter',
        category: 'sensing',
        spec: 'answer'
    },

    reportMouseX: {
        type: 'reporter',
        category: 'sensing',
        spec: 'mouse x'
    },

    reportMouseY: {
        type: 'reporter',
        category: 'sensing',
        spec: 'mouse y'
    },

    reportMouseDown: {
        type: 'predicate',
        category: 'sensing',
        spec: 'mouse down?'
    },

    reportKeyPressed: {
        type: 'predicate',
        category: 'sensing',
        spec: 'key %key pressed?'
    },

    reportDistanceTo: {
        type: 'reporter',
        category: 'sensing',
        spec: 'distance to %dst'
    },
    doResetTimer: {
        type: 'command',
        category: 'sensing',
        spec: 'reset timer'
    },

    reportTimer: {
        type: 'reporter',
        category: 'sensing',
        spec: 'timer'
    },

    reportURL: {
        type: 'reporter',
        category: 'sensing',
        spec: 'http:// %s'
    },

    // Operators

    reifyScript: {
        type: 'ring',
        category: 'other',
        spec: '%rc %ringparms'
    },

    reifyReporter: {
        type: 'ring',
        category: 'other',
        spec: '%rr %ringparms'
    },

    reifyPredicate: {
        type: 'ring',
        category: 'other',
        spec: '%rp %ringparms'
    },

    reportSum: {
        type: 'reporter',
        category: 'operators',
        spec: '%n + %n'
    },

    reportDifference: {
        type: 'reporter',
        category: 'operators',
        spec: '%n \u2212 %n'
    },

    reportProduct: {
        type: 'reporter',
        category: 'operators',
        spec: '%n \u00D7 %n'
    },

    reportQuotient: {
        type: 'reporter',
        category: 'operators',
        spec: '%n / %n' // '%n \u00F7 %n'
    },

    reportRound: {
        type: 'reporter',
        category: 'operators',
        spec: 'round %n'
    },

    reportMonadic: {
        type: 'reporter',
        category: 'operators',
        spec: '%fun of %n'
    },

    reportModulus: {
        type: 'reporter',
        category: 'operators',
        spec: '%n mod %n'
    },

    reportRandom: {
        type: 'reporter',
        category: 'operators',
        spec: 'pick random %n to %n'
    },

    reportLessThan: {
        type: 'predicate',
        category: 'operators',
        spec: '%s < %s'
    },

    reportEquals: {
        type: 'predicate',
        category: 'operators',
        spec: '%s = %s'
    },

    reportGreaterThan: {
        type: 'predicate',
        category: 'operators',
        spec: '%s > %s'
    },

    reportAnd: {
        type: 'predicate',
        category: 'operators',
        spec: '%b and %b'
    },

    reportOr: {
        type: 'predicate',
        category: 'operators',
        spec: '%b or %b'
    },

    reportNot: {
        type: 'predicate',
        category: 'operators',
        spec: 'not %b'
    },

    reportTrue: {
        type: 'predicate',
        category: 'operators',
        spec: 'true'
    },

    reportFalse: {
        type: 'predicate',
        category: 'operators',
        spec: 'false'
    },

    reportJoinWords: {
        type: 'reporter',
        category: 'operators',
        spec: 'join %words'
    },

    reportLetter: {
        type: 'reporter',
        category: 'operators',
        spec: 'letter %n of %s'
    },

    reportStringSize: {
        type: 'reporter',
        category: 'operators',
        spec: 'length of %s'
    },

    reportUnicode: {
        type: 'reporter',
        category: 'operators',
        spec: 'unicode of %s'
    },

    reportUnicodeAsLetter: {
        type: 'reporter',
        category: 'operators',
        spec: 'unicode %n as letter'
    },

    reportIsA: {
        type: 'predicate',
        category: 'operators',
        spec: 'is %s a %typ'
    },

    reportTypeOf: { // only in dev mode for debugging
        type: 'reporter',
        category: 'operators',
        spec: 'type of %s'
    },

/*
    reportScript: {
        type: 'reporter',
        category: 'operators',
        spec: 'the script %parms %c'
    },

    reify: {
        type: 'reporter',
        category: 'operators',
        spec: 'the %f block %parms'
    },
*/

    // Variables

    doSetVar: {
        type: 'command',
        category: 'variables',
        spec: 'set %var to %s'
    },

    doChangeVar: {
        type: 'command',
        category: 'variables',
        spec: 'change %var by %n'
    },

    doShowVar: {
        type: 'command',
        category: 'variables',
        spec: 'show variable %var'
    },

    doHideVar: {
        type: 'command',
        category: 'variables',
        spec: 'hide variable %var'
    },

    doDeclareVariables: {
        type: 'command',
        category: 'other',
        spec: 'script variables %scriptVars'
    },

    // Lists

    reportNewList: {
        type: 'reporter',
        category: 'lists',
        spec: 'list %exp'
    },

    reportCONS: {
        type: 'reporter',
        category: 'lists',
        spec: '%s in front of %l'
    },

    reportListItem: {
        type: 'reporter',
        category: 'lists',
        spec: 'item %idx of %l'
    },

    reportCDR: {
        type: 'reporter',
        category: 'lists',
        spec: 'all but first of %l'
    },

    reportListLength: {
        type: 'reporter',
        category: 'lists',
        spec: 'length of %l'
    },

    reportListContainsItem: {
        type: 'predicate',
        category: 'lists',
        spec: '%l contains %s'
    },

    doAddToList: {
        type: 'command',
        category: 'lists',
        spec: 'add %s to %l'
    },

    doDeleteFromList: {
        type: 'command',
        category: 'lists',
        spec: 'delete %ida of %l'
    },

    doInsertInList: {
        type: 'command',
        category: 'lists',
        spec: 'insert %s at %idx of %l'
    },

    doReplaceInList: {
        type: 'command',
        category: 'lists',
        spec: 'replace item %idx of %l with %s',
        defaults: [1, null, 'thing']
    }
};

// SnapSerializer instance creation:

function SnapSerializer() {
	this.init();
}

// SnapSerializer initialization:

SnapSerializer.prototype.init = function () {
    this.project = {};
    this.objects = {};
};

// SnapSerializer loading:

SnapSerializer.prototype.load = function (xmlString) {
    // public - answer a new Project represented by the given XML String
    var myself = this,
        project = this.project = {},
        model,
        nameID;

    model = {project: this.parse(xmlString)};
    if (+project.version > this.version) {
        throw 'Project uses newer version of Serializer';
    }

    /* Project Info */

    this.objects = {};
    project.name = model.project.attributes.name;
    if (!project.name) {
        nameID = 1;
        while (
            localStorage.hasOwnProperty(
                '-snap-project-Untitled ' + nameID
            )
        ) {
            nameID += 1;
        }
        project.name = 'Untitled ' + nameID;
    }
    model.notes = model.project.childNamed('notes');
    if (model.notes) {
        project.notes = model.notes.contents;
    }
    model.globalVariables = model.project.childNamed('variables');
    project.globalVariables = new VariableFrame();

    /* Stage */

    model.stage = model.project.require('stage');
    project.stage = new StageMorph(project.globalVariables);
    if (model.stage.attributes.hasOwnProperty('id')) {
        this.objects[model.stage.attributes.id] = project.stage;
    }

    model.pentrails = model.stage.childNamed('pentrails');
    if (model.pentrails) {
        project.pentrails = new Image();
        project.pentrails.onload = function () {
            var context = project.stage.trailsCanvas.getContext('2d');
            context.drawImage(project.pentrails, 0, 0);
            project.stage.changed();
        };
        project.pentrails.src = model.pentrails.contents;
    }
    project.stage.isThreadSafe =
        model.stage.attributes.threadsafe === 'true';
    project.stage.setExtent(StageMorph.prototype.dimensions);

    model.globalBlocks = model.project.childNamed('blocks');
    if (model.globalBlocks) {
        this.loadCustomBlocks(project.stage, model.globalBlocks, true);
        this.populateCustomBlocks(
            project.stage,
            model.globalBlocks,
            true
        );
    }
    this.loadObject(project.stage, model.stage);

    /* Sprites */

    model.sprites = model.stage.require('sprites');
    project.sprites = {};
    project.sprites[project.stage.name] = project.stage;
    model.sprites.childrenNamed('sprite').forEach(function (model) {
        var sprite  = new SpriteMorph(project.globalVariables);

        if (model.attributes.id) {
            myself.objects[model.attributes.id] = sprite;
        }
        if (model.attributes.name) {
            sprite.name = model.attributes.name;
            project.sprites[model.attributes.name] = sprite;
        }
        if (model.attributes.color) {
            sprite.color = myself.loadColor(model.attributes.color);
        }
        project.stage.add(sprite);
        sprite.scale = parseFloat(model.attributes.scale || '1');
        sprite.rotationStyle = parseFloat(
            model.attributes.rotation || '1'
        );
        sprite.isDraggable = model.attributes.draggable !== 'false';
        sprite.isVisible = model.attributes.hidden !== 'true';
        sprite.heading = parseFloat(model.attributes.heading) || 0;
        sprite.drawNew();
        sprite.gotoXY(+model.attributes.x || 0, +model.attributes.y || 0);
        myself.loadObject(sprite, model);
    });

    /* Global Variables */

    if (model.globalVariables) {
        this.loadVariables(
            project.globalVariables,
            model.globalVariables
        );
    }

    /* Watchers */

    model.sprites.childrenNamed('watcher').forEach(function (model) {
        var watcher, color, target, hidden, extX, extY;

        color = myself.loadColor(model.attributes.color);
        target = model.attributes.hasOwnProperty('scope') ?
                project.sprites[model.attributes.scope] : null;

        // determine whether the watcher is hidden, slightly
        // complicated to retain backward compatibility
        // with former tag format: hidden="hidden"
        // now it's: hidden="true"
        hidden = model.attributes.hasOwnProperty('hidden')
            && (model.attributes.hidden !== 'false');

        if (model.attributes.hasOwnProperty('var')) {
            watcher = new WatcherMorph(
                model.attributes['var'],
                color,
                target === null ? project.globalVariables
                    : target.variables,
                model.attributes['var'],
                hidden
            );
        } else {
            watcher = new WatcherMorph(
                myself.watcherLabels[model.attributes.s],
                color,
                target,
                model.attributes.s,
                hidden
            );
        }
        watcher.setStyle(model.attributes.style || 'normal');
        if (watcher.style === 'slider') {
            watcher.setSliderMin(model.attributes.min || '1');
            watcher.setSliderMax(model.attributes.max || '100');
        }
        watcher.setPosition(
            project.stage.topLeft().add(new Point(
                +model.attributes.x || 0,
                +model.attributes.y || 0
            ))
        );
        project.stage.add(watcher);
        watcher.update();

        // set watcher's contentsMorph's extent if it is showing a list and
        // its monitor dimensions are given
        if (watcher.currentValue instanceof List) {
            extX = model.attributes.extX;
            if (extX) {
                watcher.cellMorph.contentsMorph.setWidth(+extX);
            }
            extY = model.attributes.extY;
            if (extY) {
                watcher.cellMorph.contentsMorph.setHeight(+extY);
            }
            // adjust my contentsMorph's handle position
            watcher.cellMorph.contentsMorph.handle.drawNew();
        }
    });
    this.objects = {};
    return project;
};

SnapSerializer.prototype.loadObject = function (object, model) {
    // private
    var blocks = model.require('blocks');
    this.loadCostumes(object, model);
    this.loadSounds(object, model);
    this.loadCustomBlocks(object, blocks);
    this.populateCustomBlocks(object, blocks);
    this.loadVariables(object.variables, model.require('variables'));
    this.loadScripts(object.scripts, model.require('scripts'));
};

SnapSerializer.prototype.loadCostumes = function (object, model) {
    // private
    var costumes = model.childNamed('costumes'),
        costume;
    if (costumes) {
        object.costumes = this.loadValue(costumes.require('list'));
    }
    if (model.attributes.hasOwnProperty('costume')) {
        costume = object.costumes.asArray()[model.attributes.costume - 1];
        if (costume) {
            costume.loaded = function () {
                object.wearCostume(costume);
            };
        }
    }
};

SnapSerializer.prototype.loadSounds = function (object, model) {
    // private
    var sounds = model.childNamed('sounds');
    if (sounds) {
        object.sounds = this.loadValue(sounds.require('list'));
    }
};

SnapSerializer.prototype.loadVariables = function (varFrame, element) {
    // private
    var myself = this;

    element.children.forEach(function (child) {
        var value;
        if (child.tag !== 'variable') {
            return;
        }
        value = child.children[0];
        varFrame.vars[child.attributes.name] = value ?
                myself.loadValue(value) : 0;
    });
};

SnapSerializer.prototype.loadCustomBlocks = function (
    object,
    element,
    isGlobal
) {
    // private
    element.children.forEach(function (child) {
        var definition, names, inputs, i;
        if (child.tag !== 'block-definition') {
            return;
        }
        definition = new CustomBlockDefinition(
            child.attributes.s || '',
            object
        );
        definition.category = child.attributes.category || 'other';
        definition.type = child.attributes.type || 'command';
        definition.isGlobal = (isGlobal === true);
        if (definition.isGlobal) {
            object.globalBlocks.push(definition);
        } else {
            object.customBlocks.push(definition);
        }

        names = definition.parseSpec(definition.spec).filter(
            function (str) {
                return str.charAt(0) === '%';
            }
        ).map(function (str) {
            return str.substr(1);
        });

        definition.names = names;
        inputs = child.childNamed('inputs');
        if (inputs) {
            i = -1;
            inputs.children.forEach(function (child) {
                if (child.tag !== 'input') {
                    return;
                }
                definition.declarations[names[i += 1]]
                    = [child.attributes.type, child.contents];
            });
        }
    });
};

SnapSerializer.prototype.populateCustomBlocks = function (
    object,
    element,
    isGlobal
) {
    // private
    var myself = this;
    element.children.forEach(function (child, index) {
        var definition, script;
        if (child.tag !== 'block-definition') {
            return;
        }
        definition = isGlobal ? object.globalBlocks[index]
                : object.customBlocks[index];
        script = child.childNamed('script');
        if (script) {
            definition.body = new Context(
                null,
                script ? myself.loadScript(script) : null,
                null,
                object
            );
            definition.body.inputs = definition.names.slice(0);
        }

        delete definition.names;
    });
};

SnapSerializer.prototype.loadScripts = function (scripts, model) {
    // private
    var myself = this;
    scripts.texture = 'scriptsPaneTexture.gif';
    model.children.forEach(function (child) {
        var block;
        if (child.tag !== 'script') {
            return;
        }
        block = myself.loadScript(child);
        if (!block) {
            return;
        }
        block.setPosition(new Point(
            +child.attributes.x || 0,
            +child.attributes.y || 0
        ).add(scripts.topLeft()));
        scripts.add(block);
        block.fixBlockColor(null, true); // force zebra coloring
    });
};

SnapSerializer.prototype.loadScript = function (model) {
    // private
    var topBlock, block, nextBlock,
        myself = this;
    model.children.forEach(function (child) {
        nextBlock = myself.loadBlock(child);
        if (!nextBlock) {
            return;
        }
        if (block) {
            block.nextBlock(nextBlock);
        } else {
            topBlock = nextBlock;
        }
        block = nextBlock;
    });
    return topBlock;
};

SnapSerializer.prototype.loadBlock = function (model) {
    // private
    var block, info, inputs, isGlobal, receiver;
    if (model.tag === 'block') {
        if (model.attributes.hasOwnProperty('var')) {
            block = new ReporterBlockMorph(false);
            block.selector = 'reportGetVar';
            block.color = SpriteMorph.prototype.blockColor.variables;
            block.category = 'variables';
            block.setSpec(model.attributes['var']);
            block.isDraggable = true;
            return block;
        }
        info = this.blocks[model.attributes.s];
        if (!info) {
            return this.obsoleteBlock();
        }
        block = info.type === 'command' ? new CommandBlockMorph()
            : info.type === 'hat' ? new HatBlockMorph()
                : info.type === 'ring' ? new RingMorph()
                    : new ReporterBlockMorph(info.type === 'predicate');
        block.color = SpriteMorph.prototype.blockColor[info.category];
        block.category = info.category;
        block.selector = model.attributes.s;
        if (
            contains(['reifyReporter', 'reifyPredicate'], block.selector)
        ) {
            block.isStatic = true;
        }
        block.setSpec(info.spec);
    } else if (model.tag === 'custom-block') {
        isGlobal = model.attributes.scope ? false : true;
        receiver = isGlobal ? this.project.stage
            : this.project.sprites[model.attributes.scope];
        if (!receiver) {
            return this.obsoleteBlock();
        }
        if (isGlobal) {
            info = detect(receiver.globalBlocks, function (block) {
                return block.blockSpec() === model.attributes.s;
            });
        } else {
            info = detect(receiver.customBlocks, function (block) {
                return block.blockSpec() === model.attributes.s;
            });
        }
        if (!info) {
            return this.obsoleteBlock();
        }
        block = info.type === 'command' ? new CustomCommandBlockMorph(
            info,
            false
        ) : new CustomReporterBlockMorph(
            info,
            info.type === 'predicate',
            false
        );
    }
    block.isDraggable = true;
    inputs = block.inputs();
    model.children.forEach(function (child, i) {
        this.loadInput(child, inputs[i], block);
    }, this);
    return block;
};

SnapSerializer.prototype.obsoleteBlock = function (spec, type) {
    // private
    var block = type === 'command' || !type ? new CommandBlockMorph()
        : type === 'hat' ? new HatBlockMorph()
            : type === 'ring' ? new RingMorph()
                : new ReporterBlockMorph(type === 'predicate');

    block.selector = 'nop';
    block.color = new Color(200, 0, 20);
    block.setSpec(spec || 'Obsolete!');
    block.isDraggable = true;
    return block;
};

SnapSerializer.prototype.loadInput = function (model, input, block) {
    // private
    var inp, val, myself = this;
    if (model.tag === 'script') {
        inp = this.loadScript(model);
        if (inp) {
            input.add(inp);
            input.fixLayout();
        }
    } else if (model.tag === 'autolambda' && model.children[0]) {
        inp = this.loadBlock(model.children[0]);
        if (inp) {
            input.silentReplaceInput(input.children[0], inp);
            input.fixLayout();
        }
    } else if (model.tag === 'list') {
        while (input.inputs().length > 0) {
            input.removeInput();
        }
        model.children.forEach(function (item) {
            input.addInput();
            myself.loadInput(
                item,
                input.children[input.children.length - 2],
                input
            );
        });
        input.fixLayout();
    } else if (model.tag === 'block' || model.tag === 'custom-block') {
        block.silentReplaceInput(input, this.loadBlock(model));
    } else if (model.tag === 'color') {
        input.setColor(this.loadColor(model.contents));
    } else {
        val = this.loadValue(model);
        if (val) {
            input.setContents(this.loadValue(model));
        }
    }
};

SnapSerializer.prototype.loadValue = function (model) {
    // private
    var v, items, el, center, image, name, audio,
        myself = this;

    function record() {
        if (model.attributes.hasOwnProperty('id')) {
            myself.objects[model.attributes.id] = v;
        }
    }
    switch (model.tag) {
    case 'ref':
        return this.objects[model.attributes.id];
    case 'l':
        return model.contents;
    case 'bool':
        return model.contents === 'true';
    case 'list':
        if (model.attributes.hasOwnProperty('linked')) {
            items = model.childrenNamed('item');
            if (items.length === 0) {
                v = new List();
                record();
                return v;
            }
            items.forEach(function (item) {
                var value = item.children[0];
                if (v === undefined) {
                    v = new List();
                    record();
                } else {
                    v = v.rest = new List();
                }
                v.isLinked = true;
                if (!value) {
                    v.first = 0;
                } else {
                    v.first = myself.loadValue(value);
                }
            });
            return v;
        }
        v = new List();
        record();
        v.contents = model.childrenNamed('item').map(function (item) {
            var value = item.children[0];
            if (!value) {
                return 0;
            }
            return myself.loadValue(value);
        });
        return v;
    case 'context':
        v = new Context(null);
        record();
        el = model.childNamed('script');
        if (el) {
            v.expression = this.loadScript(el);
        }
        el = model.childNamed('receiver');
        if (el && el.childNamed('ref')) {
            v.receiver = this.loadValue(el);
        }
        el = model.childNamed('inputs');
        if (el) {
            el.children.forEach(function (item) {
                if (item.tag === 'input') {
                    v.inputs.push(item.contents);
                }
            });
        }
        el = model.childNamed('variables');
        if (el) {
            this.loadVariables(v.variables, el);
        }
        el = model.childNamed('context');
        if (el) {
            v.outerContext = this.loadValue(el);
        }
        return v;
    case 'costume':
        center = new Point();
        if (model.attributes.hasOwnProperty('center-x')) {
            center.x = parseFloat(model.attributes['center-x']);
        }
        if (model.attributes.hasOwnProperty('center-y')) {
            center.y = parseFloat(model.attributes['center-y']);
        }
        if (model.attributes.hasOwnProperty('name')) {
            name = model.attributes.name;
        }
        if (model.attributes.hasOwnProperty('image')) {
            image = new Image();
            image.src = model.attributes.image;
            image.onload = function () {
                var canvas = newCanvas(
                        new Point(image.width, image.height)
                    ),
                    context = canvas.getContext('2d');
                context.drawImage(image, 0, 0);
                v.contents = canvas;
                v.version = +new Date();
                if (typeof v.loaded === 'function') {
                    v.loaded();
                }
            };
        }
        v = new Costume(null, name, center);
        record();
        return v;
    case 'sound':
        audio = new Audio();
        audio.src = model.attributes.sound;
        return new Sound(audio, model.attributes.name);
    }
    return undefined;
};

SnapSerializer.prototype.loadColor = function (colorString) {
    // private
    var c = (colorString || '').split(',');
    return new Color(
        parseFloat(c[0]),
        parseFloat(c[1]),
        parseFloat(c[2]),
        parseFloat(c[3])
    );
};

SnapSerializer.prototype.openProject = function (project, ide) {
    var stage = ide.stage,
        sprite,
        scripts;
    if (!project || !project.stage) {
        return;
    }
    ide.projectName = project.name;
    ide.projectNotes = project.notes || '';
    if (ide.globalVariables) {
        ide.globalVariables = project.globalVariables;
    }
    if (stage) {
        stage.destroy();
    }
    ide.add(ide.stage = project.stage);
    sprite = detect(
        project.stage.children,
        function (child) {
            return child instanceof SpriteMorph;
        }
    ) || project.stage;
    scripts = sprite.scripts;

    project.stage.drawNew();
    ide.createCorral();
    ide.selectSprite(sprite);
    ide.fixLayout();
    ide.world().keyboardReceiver = project.stage;
};

// SnapSerializer XML-representation of objects:

// Generics

Array.prototype.toXML = function (serializer) {
    return this.reduce(function (xml, item) {
        return xml + serializer.store(item);
    }, '');
};

// Sprites

StageMorph.prototype.toXML = function (serializer) {
    var thumbnail = this.thumbnail(SnapSerializer.prototype.thumbnailSize),
        ide = this.parentThatIsA(IDE_Morph);

    return serializer.format(
        '<project name="@" version="@">' +
            '<notes>$</notes>' +
            '<thumbnail>$</thumbnail>' +
            '<stage costume="@" threadsafe="@" ~>' +
            '<pentrails>$</pentrails>' +
            '<variables>%</variables>' +
            '<costumes>%</costumes>' +
            '<sounds>%</sounds>' +
            '<blocks>%</blocks>' +
            '<scripts>%</scripts><sprites>%</sprites>' +
            '</stage>' +
            '<blocks>%</blocks>' +
            '<variables>%</variables>' +
            '</project>',
        (ide && ide.projectName) ? ide.projectName : 'Untitled',
        serializer.version,
        (ide && ide.projectNotes) ? ide.projectNotes : '',
        thumbnail.toDataURL('image/png'),
        this.getCostumeIdx(),
        this.isThreadSafe,
        this.trailsCanvas.toDataURL('image/png'),
        serializer.store(this.variables),
        serializer.store(this.costumes),
        serializer.store(this.sounds),
        serializer.store(this.customBlocks),
        serializer.store(this.scripts),
        serializer.store(this.children),
        serializer.store(this.globalBlocks),
        (ide && ide.globalVariables) ?
                    serializer.store(ide.globalVariables) : ''
    );
};

SpriteMorph.prototype.toXML = function (serializer) {
    var stage = this.parentThatIsA(StageMorph),
        position = stage ?
                this.center().subtract(stage.center()) : this.center();

    return serializer.format(
        '<sprite name="@" x="@" y="@"' +
            ' heading="@"' +
            ' scale="@"' +
            ' rotation="@"' +
            ' draggable="@"' +
            '%' +
            ' costume="@" color="@,@,@" ~>' +
            '<variables>%</variables>' +
            '<costumes>%</costumes>' +
            '<sounds>%</sounds>' +
            '<blocks>%</blocks>' +
            '<scripts>%</scripts>' +
            '</sprite>',
        this.name,
        position.x,
        -position.y,
        this.heading,
        this.scale,
        this.rotationStyle,
        this.isDraggable,
        this.isVisible ? '' : ' hidden="true"',
        this.getCostumeIdx(),
        this.color.r,
        this.color.g,
        this.color.b,
        serializer.store(this.variables),
        serializer.store(this.costumes),
        serializer.store(this.sounds),
        !this.customBlocks ?
                    '' : serializer.store(this.customBlocks),
        serializer.store(this.scripts)
    );
};


Costume.prototype.toXML = function (serializer) {
    return serializer.format(
        '<costume name="@" center-x="@" center-y="@" image="@" ~/>',
        this.name,
        this.rotationCenter.x,
        this.rotationCenter.y,
        this.contents.toDataURL('image/png')
    );
};

Sound.prototype.toXML = function (serializer) {
    return serializer.format(
        '<sound name="@" sound="@" ~/>',
        this.name,
        this.toDataURL()
    );
};

VariableFrame.prototype.toXML = function (serializer) {
    var myself = this;
    return Object.keys(this.vars).reduce(function (vars, v) {
        var val = myself.vars[v],
            dta;
        if (val === undefined || val === null) {
            dta = serializer.format('<variable name="@"/>', v);
        } else {
            dta = serializer.format(
                '<variable name="@">%</variable>',
                v,
                typeof val === 'object' ? serializer.store(val)
                        : typeof val === 'boolean' ?
                                serializer.format('<bool>$</bool>', val)
                                : serializer.format('<l>$</l>', val)
            );
        }
        return vars + dta;
    }, '');
};



// Watchers

WatcherMorph.prototype.toXML = function (serializer) {
    var isVar = this.target instanceof VariableFrame,
        isList = this.currentValue instanceof List,
        color = this.readoutColor,
        position = this.parent ?
                this.topLeft().subtract(this.parent.topLeft())
                : this.topLeft();

    return serializer.format(
        '<watcher% % style="@"% x="@" y="@" color="@,@,@"%%/>',
        (isVar && this.target.owner) || (!isVar && this.target) ?
                    serializer.format(' scope="@"',
                        isVar ? this.target.owner.name : this.target.name)
                            : '',
        serializer.format(isVar ? 'var="@"' : 's="@"', this.getter),
        this.style,
        isVar && this.style === 'slider' ? serializer.format(
                ' min="@" max="@"',
                this.sliderMorph.start,
                this.sliderMorph.stop
            ) : '',
        position.x,
        position.y,
        color.r,
        color.g,
        color.b,
        !isList ? ''
                : serializer.format(
                ' extX="@" extY="@"',
                this.cellMorph.contentsMorph.width(),
                this.cellMorph.contentsMorph.height()
            ),
        this.isVisible ? '' : ' hidden="true"'
    );
};

// Scripts

ScriptsMorph.prototype.toXML = function (serializer) {
    return this.children.reduce(function (xml, child) {
        if (!(child instanceof BlockMorph)) {
            return xml;
        }
        return xml + child.toScriptXML(serializer, true);
    }, '');
};

BlockMorph.prototype.toXML = BlockMorph.prototype.toScriptXML = function (
    serializer,
    savePosition
) {
    var position,
        xml,
        block = this;

    // determine my position
    if (this.parent) {
        position = this.topLeft().subtract(this.parent.topLeft());
    } else {
        position = this.topLeft();
    }

    // save my position to xml
    if (savePosition) {
        xml = serializer.format(
            '<script x="@" y="@">',
            position.x,
            position.y
        );
    } else {
        xml = '<script>';
    }

    // recursively add my next blocks to xml
    do {
        xml += block.toBlockXML(serializer);
        block = block.nextBlock();
    } while (block);
    xml += '</script>';
    return xml;
};

BlockMorph.prototype.toBlockXML = function (serializer) {
    return serializer.format(
        '<block s="@">%</block>',
        this.selector,
        serializer.store(this.inputs())
    );
};

ReporterBlockMorph.prototype.toXML = function (serializer) {
    return this.selector === 'reportGetVar' ? serializer.format(
        '<block var="@"/>',
        this.blockSpec
    ) : this.toBlockXML(serializer);
};

ReporterBlockMorph.prototype.toScriptXML = function (
    serializer,
    savePosition
) {
    var position;

    // determine my save-position
    if (this.parent) {
        position = this.topLeft().subtract(this.parent.topLeft());
    } else {
        position = this.topLeft();
    }

    if (savePosition) {
        return serializer.format(
            '<script x="@" y="@">%</script>',
            position.x,
            position.y,
            this.toXML(serializer)
        );
    }
    return serializer.format('<script>%</script>', this.toXML(serializer));
};

CustomCommandBlockMorph.prototype.toBlockXML = function (serializer) {
    var scope = this.definition.isGlobal ? undefined
        : this.definition.receiver.name;
    return serializer.format(
        '<custom-block s="@"%>%</custom-block>',
        this.blockSpec,
        this.definition.isGlobal ?
                '' : serializer.format(' scope="@"', scope),
        serializer.store(this.inputs())
    );
};

CustomReporterBlockMorph.prototype.toBlockXML
    = CustomCommandBlockMorph.prototype.toBlockXML;

CustomBlockDefinition.prototype.toXML = function (serializer) {
    var myself = this;
    return serializer.format(
        '<block-definition s="@" type="@" category="@">' +
            '<inputs>%</inputs>%' +
            '</block-definition>',
        this.spec,
        this.type,
        this.category || 'other',
        Object.keys(this.declarations).reduce(function (xml, decl) {
                return xml + serializer.format(
                    '<input type="@">$</input>',
                    myself.declarations[decl][0],
                    myself.declarations[decl][1]
                );
            }, ''),
        this.body ? serializer.store(this.body.expression) : ''
    );
};

// Scripts - Inputs

ArgMorph.prototype.toXML = function () {
    return '<l/>'; // empty by default
};

InputSlotMorph.prototype.toXML = function (serializer) {
    return serializer.format('<l>$</l>', this.contents().text);
};

TemplateSlotMorph.prototype.toXML = function (serializer) {
    return serializer.format('<l>$</l>', this.contents());
};

CommandSlotMorph.prototype.toXML = function (serializer) {
    var block = this.children[0];
    if (block instanceof BlockMorph) {
        if (block instanceof ReporterBlockMorph) {
            return serializer.format(
                '<autolambda>%</autolambda>',
                serializer.store(block)
            );
        }
        return serializer.store(block);
    }
    return '<script></script>';
};

FunctionSlotMorph.prototype.toXML = CommandSlotMorph.prototype.toXML;

MultiArgMorph.prototype.toXML = function (serializer) {
    return serializer.format(
        '<list>%</list>',
        serializer.store(this.inputs())
    );
};

ColorSlotMorph.prototype.toXML = function (serializer) {
    return serializer.format(
        '<color>$,$,$,$</color>',
        this.color.r,
        this.color.g,
        this.color.b,
        this.color.a
    );
};

// Values

List.prototype.toXML = function (serializer) {
    var xml, item;
    if (this.isLinked) {
        xml = '<list linked="linked" ~>';
        item = this;
        do {
            xml += serializer.format(
                '<item>%</item>',
                serializer.store(item.first)
            );
            item = item.rest;
        } while (item !== undefined && (item !== null));
        return xml + '</list>';
    }
    return serializer.format(
        '<list ~>%</list>',
        this.contents.reduce(function (xml, item) {
            return xml + serializer.format(
                '<item>%</item>',
                typeof item === 'object' ? serializer.store(item)
                        : typeof item === 'boolean' ?
                                serializer.format('<bool>$</bool>', item)
                                : serializer.format('<l>$</l>', item)
            );
        }, '')
    );
};


Context.prototype.toXML = function (serializer) {
    return serializer.format(
        '<context% ~><inputs>%</inputs><variables>%</variables>' +
            '%<receiver>%</receiver>%</context>',
        this.isLambda ? ' lambda="lambda"' : '',
        this.inputs.reduce(
                function (xml, input) {
                    return xml + serializer.format('<input>$</input>', input);
                },
                ''
            ),
        this.variables ? serializer.store(this.variables) : '',
        this.expression ? serializer.store(this.expression) : '',
        this.receiver ? serializer.store(this.receiver) : '',
        this.outerContext ? serializer.store(this.outerContext) : ''
    );
};