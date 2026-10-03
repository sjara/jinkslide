// jinkslide.js
//
// Copyright 2012-2026 Santiago Jaramillo
// Copyright 2008, 2009, 2010 Hannes Hochreiner
//
// Originally based on JessyInk (https://launchpad.net/jessyink) by Hannes Hochreiner.
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with this program.  If not, see http://www.gnu.org/licenses/.

// Version information. Update with bump_version.py, which also
// stamps the version label in the SVG files.
var JINKSLIDE_VERSION = "1.1.0";
var JINKSLIDE_DATE = "2026-10-03";

function Slide(groupElement, clipPathId, slideBackgroundId)
{
	// States.
	this.STATE_START = -1;
	this.STATE_END = -2;

	// Namespaces.
	this.nss = {'sodipodi':'http://sodipodi.sourceforge.net/DTD/sodipodi-0.dtd',
		'cc':'http://web.resource.org/cc/',
		'svg':'http://www.w3.org/2000/svg',
		'dc':'http://purl.org/dc/elements/1.1/',
		'rdf':'http://www.w3.org/1999/02/22-rdf-syntax-ns#',
		'inkscape':'http://www.inkscape.org/namespaces/inkscape',
		'xlink':'http://www.w3.org/1999/xlink',
		'xml':'http://www.w3.org/XML/1998/namespace',
		'jinkslide':'https://github.com/sjara/jinkslide'};
	this.elements = new Object();
	this.origGElement = groupElement;
	this.gElement = this.removeModulesAndIds(this.origGElement.cloneNode(true));
	this.viewGroup = document.createElementNS(this.nss.svg, 'g');
	this.transformGroup = document.createElementNS(this.nss.svg, 'g');
	this.initialView = null;
	this.init(clipPathId, slideBackgroundId);
	this.effects = new Array();
	this.effectIndices = new Array();

	return this;
}

Slide.prototype.init = function(clipPathId, slideBackgroundId)
{
	// Set clip-path.
	this.gElement.setAttribute('clip-path', 'url(#' + clipPathId + ')');

	// Set background.
	var useNode = document.createElementNS(this.nss.svg, 'use');

	useNode.setAttributeNS(this.nss.xlink, 'href', '#' + slideBackgroundId);
	this.gElement.insertBefore(useNode, this.gElement.firstChild);
	
	// Add content to transform group.
	while (this.gElement.firstChild)
	{
		this.transformGroup.appendChild(this.gElement.firstChild);
	}

	// Transfer the transform attribute from the node to the transform group.
	if (this.gElement.getAttribute('transform'))
	{
		this.transformGroup.setAttribute('transform', this.gElement.getAttribute('transform'));
		this.gElement.removeAttribute('transform');
	}

	this.viewGroup.appendChild(this.transformGroup);

	// Set initial view with identity matrix.
	this.viewGroup.setAttribute('transform', 'matrix(1, 0, 0, 1, 0, 0)');
	this.initialView = { 
		getMatrix: function() { 
			return { toAttribute: function() { return 'matrix(1, 0, 0, 1, 0, 0)'; } }; 
		} 
	};

	this.gElement.appendChild(this.viewGroup);
};

Slide.prototype.removeModulesAndIds = function(node)
{
	var nodesToBeRemoved = [];

	for (var nodeCounter in node.childNodes)
	{
		var n = node.childNodes[nodeCounter];

		if ((n !== undefined) && (n.nodeType === 1))
		{
			if (n.getAttribute('id'))
			{
				n.removeAttribute('id');
			}

			if (n.getAttributeNS(this.nss.jinkslide, 'module'))
			{
				nodesToBeRemoved.push(n);
			}

			if (n.getAttributeNS(this.nss.jinkslide, 'element'))
			{
				var cat = n.getAttributeNS(this.nss.jinkslide, 'element');

				// Hide element.
				n.style.display = 'none';

				if (!this.elements[cat])
				{
					this.elements[cat] = new Array();
				}

				this.elements[cat].push(n);
			}

			if (n.childNodes.length > 0)
			{
				this.removeModulesAndIds(n);
			}
		}
	}

	while (nodesToBeRemoved.length > 0)
	{
		var nd = nodesToBeRemoved.pop();

		nd.parentNode.removeChild(nd);
	}

	node.removeAttribute('id');

	return node;
};

Slide.prototype.hide = function(keepInTree)
{
	this.gElement.setAttribute('opacity',0);

	if (keepInTree)
	{
		this.gElement.style.display = 'inherit';
	}
	else
	{
		this.gElement.style.display = 'none';
	}
};

Slide.prototype.show = function()
{
	this.gElement.setAttribute('opacity',1.0);
	this.gElement.style.display = 'inherit';
};

Slide.prototype.getGElement = function()
{
	return this.gElement;
};

Slide.prototype.addEffect = function(effect, index)
{
	if (!((index > 0) && (effect.playEffect)))
		return;

	if (this.effects[index] == undefined)
	{
		this.effects[index] = new Object();
	}

	if (this.effects[index].effects == undefined)
	{
		this.effects[index].effects = new Array();
	}

	this.effects[index].effects.push(effect);

	this.updateIndices();
};

Slide.prototype.updateIndices = function()
{
	this.effectIndices = new Array();

	for (var elem in this.effects)
	{
		this.effectIndices.push(elem);
	}
};

Slide.prototype.getEffectsAtIndex = function(index)
{
	var outArray = new Array();

	for (var effCounter in this.effects[this.effectIndices[index]].effects)
	{
		outArray.push(this.effects[this.effectIndices[index]].effects[effCounter]);
	}

	if (this.effects[this.effectIndices[index]].view)
	{
		outArray.push(this.effects[this.effectIndices[index]].view);
	}

	return outArray;
};

Slide.prototype.getEffectIndexCount = function()
{
	return this.effectIndices.length;
};

Slide.prototype.setToState = function(state)
{	
	this.viewGroup.setAttribute('transform', this.initialView.getMatrix().toAttribute());

	if (this.getEffectIndexCount() > 0)
	{
		if (state == this.STATE_END)
		{
			for (var counter = 0; counter < this.getEffectIndexCount(); counter++)
			{
				for (var subCounter = 0; subCounter < this.getEffectsAtIndex(counter).length; subCounter++)
				{
					this.getEffectsAtIndex(counter)[subCounter].playEffect(1, this.STATE_END);
				}
			}
		}
		else if (state == this.STATE_START)
		{
			for (var counter = this.getEffectIndexCount() - 1; counter >= 0; counter--)
			{
				for (var subCounter = 0; subCounter < this.getEffectsAtIndex(counter).length; subCounter++)
				{
					this.getEffectsAtIndex(counter)[subCounter].playEffect(-1, this.STATE_START);
				}
			}
		}
		else
		{
			setSlideToState(slide, this.STATE_START);
		}
	}
};

function JinkSlideEffectAppear(element, direction)
{
	this.gElement = element;
	this.baseDirection = direction;

	return this;
}

JinkSlideEffectAppear.prototype.playEffect = function (dir, time)
{
	if ((dir * this.baseDirection) == 1)
	{
		this.gElement.style.display = 'inherit';
		this.gElement.setAttribute('opacity', 1);
	}
	else
	{
		this.gElement.style.display = 'none';
		this.gElement.setAttribute('opacity', 0);
	}

	return true;
};

/** Main JinkSlide class.
*/
function JinkSlide()
{
	this.nss = {	'sodipodi':'http://sodipodi.sourceforge.net/DTD/sodipodi-0.dtd',
		'cc':'http://web.resource.org/cc/',
		'svg':'http://www.w3.org/2000/svg',
		'dc':'http://purl.org/dc/elements/1.1/',
		'rdf':'http://www.w3.org/1999/02/22-rdf-syntax-ns#',
		'inkscape':'http://www.inkscape.org/namespaces/inkscape',
		'xlink':'http://www.w3.org/1999/xlink',
		'xml':'http://www.w3.org/XML/1998/namespace',
		'jinkslide':'https://github.com/sjara/jinkslide'};
	this.rootNode = document.getElementsByTagNameNS(this.nss.svg, 'svg')[0];
	this.width;
	this.height;
	this.bgColor;
	this.slides = [];
	this.currentMode = 'core_slide';
	this.activeSlide = 0;
	this.activeEffect = 0;
	this.effectArray = [];
	this.timeStep = 30; // 40 ms equal 25 frames per second.
	this.lastFrameTime = null;
	this.processingEffect = false;
	this.transCounter = 0;
	this.presentationLayer = null;
	this.indexColumns = 4;

	// Keycodes.
	this.LEFT_KEY = 37; // cursor left keycode
	this.UP_KEY = 38; // cursor up keycode
	this.RIGHT_KEY = 39; // cursor right keycode
	this.DOWN_KEY = 40; // cursor down keycode
	this.PAGE_UP_KEY = 33; // page up keycode
	this.PAGE_DOWN_KEY = 34; // page down keycode
	this.HOME_KEY = 36; // home keycode
	this.END_KEY = 35; // end keycode
	this.ENTER_KEY = 13; // enter keycode
	this.SPACE_KEY = 32; // space keycode
	this.ESC_KEY = 27; // escape keycode

	// Mouse handler actions.
	this.MOUSE_UP = 1;
	this.MOUSE_DOWN = 2;
	this.MOUSE_MOVE = 3;
	this.MOUSE_WHEEL = 4;

	// States.
	this.STATE_START = -1;
	this.STATE_END = -2;

	// Initialise char and key code dictionaries.
	this.charCodeDictionary = this.getDefaultCharCodeDictionary();
	this.keyCodeDictionary = this.getDefaultKeyCodeDictionary();

	// Initialise mouse handler dictionary.
	this.mouseHandlerDictionary = this.getDefaultMouseHandlerDictionary();

	return this;
}

/** Private function to make the presentation scale.
 *
 * The function gets the width and height of the presentation either from the
 * viewbox or the width and height attributes of the root node and saves them
 * in the fields 'width' and 'height'. Afterwards, it sets the viewbox
 * attribute, if needed, and changes the width and height attributes of the
 * root node to 100%.
 */
JinkSlide.prototype.setAutoScale = function()
{
	if (this.rootNode.getAttribute('viewBox'))
	{
		this.width = this.rootNode.viewBox.animVal.width;
		this.height = this.rootNode.viewBox.animVal.height;
	}
	else
	{
		this.width = parseFloat(this.rootNode.getAttribute('width'));
		this.height = parseFloat(this.rootNode.getAttribute('height'));
		this.rootNode.setAttribute('viewBox', '0 0 ' + this.width + ' ' + this.height);
	}

	this.rootNode.setAttribute('width', '100%');
	this.rootNode.setAttribute('height', '100%');
};

/** Private function to set the background color.
 *
 * The function determines the background color from the sodipodi setting and
 * applies it to the root node. It also saves the color in the field
 * 'bgColor' for later use with the slides.
 */
JinkSlide.prototype.setBackgroundColor = function()
{
	// Setting the background color.
	var namedViews = document.getElementsByTagNameNS(this.nss.sodipodi, 'namedview');

	for (var counter = 0; counter < namedViews.length; counter++)
	{
		if (namedViews[counter].hasAttribute('id') && namedViews[counter].hasAttribute('pagecolor'))
		{
			if (namedViews[counter].getAttribute('id') == 'base')
			{
				this.bgColor = namedViews[counter].getAttribute('pagecolor');
				var newAttribute = 'background-color:' + this.bgColor + ';';

				if (this.rootNode.hasAttribute('style'))
					newAttribute += this.rootNode.getAttribute('style');

				this.rootNode.setAttribute('style', newAttribute);
			}
		}
	}
};

/** Private function to check for background-setter elements in a slide and apply the color.
 *
 *  The function looks for groups marked with jinkslide:background-setter="true" and uses the fill color
 *  of the first rectangle in that group as the new background color.
 *
 *  @param slideElement the slide element to check
 */
JinkSlide.prototype.checkAndApplySlideBackgroundColor = function(slideElement)
{
	// Look for groups marked as background setters
	var allGroups = slideElement.getElementsByTagNameNS(this.nss.svg, 'g');
	
	for (var i = 0; i < allGroups.length; i++)
	{
		var group = allGroups[i];
		
		// Check if this group is marked as a background setter
		if (group.getAttributeNS(this.nss.jinkslide, 'background-setter') === 'true')
		{
			// Look for rectangles in this background setter group
			var rects = group.getElementsByTagNameNS(this.nss.svg, 'rect');
			
			if (rects.length > 0)
			{
				// Get the fill color of the first rectangle
				var rect = rects[0];
				var fillColor = rect.getAttribute('fill');
				
				// If no fill attribute, try to get from style
				if (!fillColor || fillColor === 'none')
				{
					var style = rect.getAttribute('style') || '';
					var match = style.match(/fill:\s*([^;]+)/);
					if (match)
					{
						fillColor = match[1];
					}
				}
				
				if (fillColor && fillColor !== 'none')
				{
					// Apply the new background color to the root node
					var currentStyle = this.rootNode.getAttribute('style') || '';
					var newStyle = currentStyle.replace(/background-color:[^;]*;?/g, '');
					newStyle = 'background-color:' + fillColor + ';' + newStyle;
					this.rootNode.setAttribute('style', newStyle);
					
					// Also update the background rectangle used by slides
					var backgroundRect = document.getElementById('jinkSlideBackground');
					if (backgroundRect)
					{
						backgroundRect.setAttribute('fill', fillColor);
					}
					
					return; // Found and applied, exit
				}
			}
		}
	}
	
	// No background setter found, reset to default
	this.resetBackgroundColor();
};


/** Private function to reset the background to the default color.
 */
JinkSlide.prototype.resetBackgroundColor = function()
{
	// Apply the default background color to the root node
	var currentStyle = this.rootNode.getAttribute('style') || '';
	var newStyle = currentStyle.replace(/background-color:[^;]*;?/g, '');
	newStyle = 'background-color:' + this.bgColor + ';' + newStyle;
	this.rootNode.setAttribute('style', newStyle);
	
	// Also update the background rectangle used by slides
	var backgroundRect = document.getElementById('jinkSlideBackground');
	if (backgroundRect)
	{
		backgroundRect.setAttribute('fill', this.bgColor);
	}
};

/** Private function this removes the old JinkSlide layer, if present.
*/
JinkSlide.prototype.removeJinkSlideLayer = function()
{
	// Delete existing JinkSlide presentation layer.
	var oldLayer = document.getElementById('jinkSlidePresentationLayer');

	if (oldLayer)
	{
		oldLayer.parentNode.removeChild(oldLayer);
	}
}

/** Private function to hide all elements that are direct children of the
 * root node.
 *
 * The function tries to hide any visual objects this maybe present as
 * children of the root node. This is done to avoid any interference with the
 * presentation and to limit the number of elements this need to be drawn.
 */
JinkSlide.prototype.hideEverything = function()
{
	for (nodeNumber in this.rootNode.childNodes)
	{
		var nodeName = this.rootNode.childNodes[nodeNumber].nodeName;

		if (nodeName !== undefined)
		{
			var elementsToBeHidden = ['text', 'tspan', 'tref', 'rect', 'circle', 'ellipse', 'line', 'polyline', 'polygon', 'path', 'g'];
			var found = false;

			for (var elementCounter = 0; elementCounter < elementsToBeHidden.length && !found; elementCounter++)
			{
				if (nodeName === elementsToBeHidden[elementCounter])
				{
					found = true;
				}
			}

			if (found)
			{
				this.rootNode.childNodes[nodeNumber].style.display = 'none';
			}
		}
	}
};

/** Private function for creating a new JinkSlide layer.
*/
JinkSlide.prototype.makeJinkSlideLayer = function()
{
	var JinkSlidePresentationLayer = document.createElementNS(this.nss.svg, 'g');

	JinkSlidePresentationLayer.setAttributeNS(this.nss.inkscape, 'groupmode', 'layer');
	JinkSlidePresentationLayer.setAttributeNS(this.nss.inkscape, 'label', 'JinkSlide Presentation Layer');
	JinkSlidePresentationLayer.setAttributeNS(this.nss.jinkslide, 'presentationLayer', 'presentationLayer');
	JinkSlidePresentationLayer.setAttribute('id', 'jinkSlidePresentationLayer');
	JinkSlidePresentationLayer.setAttribute('opacity', 1);
	JinkSlidePresentationLayer.style.display = 'inherit';

	this.presentationLayer = this.rootNode.appendChild(JinkSlidePresentationLayer);
}

/** Private function to define a clip path for the slides.
 *
 * The function first deletes the old clip path, if present, and then creates
 * a new one.
 */
JinkSlide.prototype.defineClipPath = function()
{
	// Delete existing clip path.
	var oldClipPath = document.getElementById('jinkSlideSlideClipPath');

	if (oldClipPath)
	{
		oldClipPath.parentNode.removeChild(oldClipPath);
	}

	// Find or create a defs node.
	var defsNode;
	var defsNodes = document.getElementsByTagNameNS(this.nss.svg, 'defs');

	if (defsNodes.length > 0)
	{
		defsNode = defsNodes[0];
	}
	else
	{
		defsNode = document.createElementNS(this.nss.svg, 'defs');
		this.rootNode.appendChild(defNode);
	}

	// Create clip path.
	var rectNode = document.createElementNS(this.nss.svg, 'rect');
	var clipPath = document.createElementNS(this.nss.svg, 'clipPath');

	rectNode.setAttribute('x', 0);
	rectNode.setAttribute('y', 0);
	rectNode.setAttribute('width', this.width);
	rectNode.setAttribute('height', this.height);

	clipPath.setAttribute('id', 'jinkSlideSlideClipPath');
	clipPath.setAttribute('clipPathUnits', 'userSpaceOnUse');

	clipPath.appendChild(rectNode);

	// Append clip path to defs node.
	defsNode.appendChild(clipPath);
};

/** Private function to define a background layer.
 *
 * The function first delets the old definition, if present, and then creates
 * a new one.
 */
JinkSlide.prototype.defineBackground = function()
{
	// Delete existing background.
	var background = document.getElementById('jinkSlideSlideBackground');

	if (background)
	{
		background.parentNode.removeChild(background);
	}

	// Find or create a defs node.
	var defsNode;
	var defsNodes = document.getElementsByTagNameNS(this.nss.svg, 'defs');

	if (defsNodes.length > 0)
	{
		defsNode = defsNodes[0];
	}
	else
	{
		defsNode = document.createElementNS(this.nss.svg, 'defs');
		this.rootNode.appendChild(defNode);
	}

	// Create clip path.
	var rectNode = document.createElementNS(this.nss.svg, 'rect');

	rectNode.setAttribute('x', 0);
	rectNode.setAttribute('y', 0);
	rectNode.setAttribute('width', this.width);
	rectNode.setAttribute('height', this.height);
	rectNode.setAttribute('id', 'jinkSlideBackground');
	rectNode.setAttribute('fill', this.bgColor);

	// Append clip path to defs node.
	defsNode.appendChild(rectNode);
};

/** Private function to collect all the slides.
*/
JinkSlide.prototype.getSlides = function()
{
	for (nodeNumber in this.rootNode.childNodes)
	{
		var nd = this.rootNode.childNodes[nodeNumber];

		if ((nd !== undefined) && (nd.nodeType === 1))
		{
			if ((nd.nodeName === 'g') && (nd.getAttributeNS(this.nss.inkscape, 'groupmode')) && (nd.getAttributeNS(this.nss.inkscape, 'groupmode') === 'layer') && (nd.getAttributeNS(this.nss.jinkslide, 'presentationLayer') != 'presentationLayer'))
			{
				var tmpSlide = new Slide(this.rootNode.childNodes[nodeNumber], 'jinkSlideSlideClipPath', 'jinkSlideSlideBackground');
				tmpSlide.hide(true);
				this.slides.push(tmpSlide);

				document.getElementById('jinkSlidePresentationLayer').appendChild(this.slides[this.slides.length - 1].getGElement());
			}
		}
	}
};

JinkSlide.prototype.callSlideChangingExtensions = function()
{
	for (module in JINKSLIDE.modules)
	{
		if (JINKSLIDE.modules[module].changeSlides)
		{
			JINKSLIDE.modules[module].changeSlides(this);
		}
	}
};

JinkSlide.prototype.callSlideDecoratingExtensions = function()
{
	for (module in JINKSLIDE.modules)
	{
		if (JINKSLIDE.modules[module].decorateSlides)
		{
			JINKSLIDE.modules[module].decorateSlides(this);
		}
	}
};

JinkSlide.prototype.initModules = function()
{
	for (module in JINKSLIDE.modules)
	{
		if (JINKSLIDE.modules[module].init)
		{
			JINKSLIDE.modules[module].init(this);
		}
	}
};

JinkSlide.prototype.initPresentation = function()
{
	for (var slide in this.slides)
	{
		this.slides[slide].hide(false);
	}

	var slideFromURL;
	var hashFromURL = window.location.hash;
	if (hashFromURL=='')
	{
	    slideFromURL = 1;
	}
	else
	{
	    slideFromURL = parseInt(window.location.hash.substring(1).split('_')[0]);
	}
    // NOTE:  slideFromURL starts at 1. JS arrays start at 0.
	this.slideSetActiveSlide(slideFromURL-1);
};

/** Function to dispatch the next effect, if there is none left, change the slide.
 *
 *  @param dir direction of the change (1 = forwards, -1 = backwards)
 */
JinkSlide.prototype.dispatchEffects = function(dir)
{
	if (this.slides[this.activeSlide].effects && (((dir == 1) && (this.activeEffect < this.slides[this.activeSlide].getEffectIndexCount())) || ((dir == -1) && (this.activeEffect > 0))))
	{
		this.processingEffect = true;

		if (dir == 1)
		{
			this.effectArray = this.slides[this.activeSlide].getEffectsAtIndex(this.activeEffect);
			this.activeEffect += dir;
		}
		else if (dir == -1)
		{
			this.activeEffect += dir;
			this.effectArray = this.slides[this.activeSlide].getEffectsAtIndex(this.activeEffect);
		}

		this.transCounter = 0;
		this.startTime = (new Date()).getTime();
		this.lastFrameTime = null;
		this.playEffects(dir);
	}
	else if (((dir == 1) && (this.activeSlide < (this.slides.length - 1))) || (((dir == -1) && (this.activeSlide > 0))))
	{
		this.changeSlide(dir);
	}
};

/** Function to change between slides.
 *
 *  @param dir direction (1 = forwards, -1 = backwards)
 */
JinkSlide.prototype.changeSlide = function(dir)
{
	// Stop all sounds when changing slides
	stopAllSounds();
	
	this.processingEffect = true;
	this.effectArray = new Array();

	// Create the effect array. If transitions are set for the slide use them,
	// if not create appear effects.
	if (dir == 1)
	{
		if (this.slides[this.activeSlide].transitionOut)
		{
			this.effectArray[0] = this.slides[this.activeSlide].transitionOut;
		}
		else
		{
			this.effectArray[0] = new JinkSlideEffectAppear(this.slides[this.activeSlide].getGElement(), -1);
		}
	}
	else if (dir == -1)
	{
		if (this.slides[this.activeSlide].transitionIn)
		{
			this.effectArray[0] = this.slides[this.activeSlide].transitionIn;
		}
		else
		{
			this.effectArray[0] = new JinkSlideEffectAppear(this.slides[this.activeSlide].getGElement(), 1);
		}
	}

	this.activeSlide += dir;

	if (dir == 1)
	{
		if (this.slides[this.activeSlide].transitionIn)
		{
			this.effectArray[1] = this.slides[this.activeSlide].transitionIn;
		}
		else
		{
			this.effectArray[1] = new JinkSlideEffectAppear(this.slides[this.activeSlide].getGElement(), 1);
		}
	}
	else if (dir == -1)
	{
		if (this.slides[this.activeSlide].transitionOut)
		{
			this.effectArray[1] = this.slides[this.activeSlide].transitionOut;
		}
		else
		{
			this.effectArray[1] = new JinkSlideEffectAppear(this.slides[this.activeSlide].getGElement(), -1);
		}
	}

	if (this.slides[this.activeSlide].effects && (dir == -1))
		this.activeEffect = this.slides[this.activeSlide].getEffectIndexCount();
	else
		this.activeEffect = 0;

	if (dir == -1)
		this.slides[this.activeSlide].setToState(this.STATE_END);
	else
		this.slides[this.activeSlide].setToState(this.STATE_START);

	// Check for set background elements in the new slide
	this.checkAndApplySlideBackgroundColor(this.slides[this.activeSlide].origGElement);

	// Create videos from namespace-marked rectangles in the new slide (only if videos exist)
	var that = this;
	if (hasVideoRectangles(this.slides[this.activeSlide].origGElement)) {
		setTimeout(function() { createVideoFromRect(); }, 50);
	}

	this.transCounter = 0;
	this.startTime = (new Date()).getTime();
	this.lastFrameTime = null;
	this.playEffects(dir);
};

/** Function to play an effect.
 *
 *  @param dir direction in which to play the effect (1 = forwards, -1 = backwards)
 */
JinkSlide.prototype.playEffects = function(dir)
{
	var done = true;
	var suspendHandle = this.rootNode.suspendRedraw(200);

	for (var counter = 0; counter < this.effectArray.length; counter++)
	{
		done &= this.effectArray[counter].playEffect(dir, this.transCounter);
	}

	this.rootNode.unsuspendRedraw(suspendHandle);
	this.rootNode.forceRedraw();

	if (!done)
	{
		var currentTime = (new Date()).getTime();
		var timeDiff = 1;

		this.transCounter = currentTime - this.startTime;

		if (this.lastFrameTime != null)
		{
			timeDiff = this.timeStep - (currentTime - this.lastFrameTime);

			if (timeDiff <= 0)
				timeDiff = 1;
		}

		this.lastFrameTime = currentTime;

		var that = this;

		window.setTimeout(function() { that.playEffects(dir); }, timeDiff);
	}
	else
	{
		window.location.hash = (this.activeSlide + 1) + '_' + this.activeEffect;
		this.processingEffect = false;
	}
};

/** Event handler for key press.
 *
 *  @param e the event
 */
JinkSlide.prototype.keydown = function (e)
{
	var that = this;

	if (!e)
		e = window.event;

	code = e.keyCode || e.charCode;
	//console.log(this.keyCodeDictionary[this.currentMode][code]) //DEBUG
	if (!this.processingEffect && this.keyCodeDictionary[this.currentMode] && this.keyCodeDictionary[this.currentMode][code])
		this.keyCodeDictionary[this.currentMode][code]();
	else
		document.onkeypress = function(e) { that.keypress(e); };
};

/** Event handler for key press.
 *
 *  @param e the event
 */
JinkSlide.prototype.keypress = function (e)
{
	document.onkeypress = null;

	if (!e)
		e = window.event;

	str = String.fromCharCode(e.keyCode || e.charCode);

	if (!this.processingEffect && this.charCodeDictionary[this.currentMode] && this.charCodeDictionary[this.currentMode][str])
		this.charCodeDictionary[this.currentMode][str]();
};

/** Function to supply the default char code dictionary.
 *
 * @returns default char code dictionary
 */
JinkSlide.prototype.getDefaultCharCodeDictionary = function()
{
	var that = this;
	var charCodeDict = new Object();

	charCodeDict.core_slide = new Object();
	charCodeDict.core_slide['i'] = function () { that.toggleSlideIndex(); };

	charCodeDict.slide_index = new Object();
	charCodeDict.slide_index['i'] = function () { that.toggleSlideIndex(); };
	charCodeDict.slide_index['='] = function () { that.changeIndexColNumber(-1); };
	charCodeDict.slide_index['+'] = function () { that.changeIndexColNumber(-1); };
	charCodeDict.slide_index['-'] = function () { that.changeIndexColNumber(1); };

	return charCodeDict;
};

/** Function to supply the default key code dictionary.
 *
 * @returns default key code dictionary
 */
JinkSlide.prototype.getDefaultKeyCodeDictionary = function()
{
	var that = this;
	var keyCodeDict = new Object();

	keyCodeDict.core_slide = new Object();
	keyCodeDict.core_slide[this.LEFT_KEY] = function() { that.dispatchEffects(-1); };
	keyCodeDict.core_slide[this.RIGHT_KEY] = function() { that.dispatchEffects(1); };
	keyCodeDict.core_slide[this.UP_KEY] = function() { that.skipEffects(-1); };
	keyCodeDict.core_slide[this.DOWN_KEY] = function() { that.skipEffects(1); };
	keyCodeDict.core_slide[this.PAGE_UP_KEY] = function() { that.dispatchEffects(-1); };
	keyCodeDict.core_slide[this.PAGE_DOWN_KEY] = function() { that.dispatchEffects(1); };
	keyCodeDict.core_slide[this.HOME_KEY] = function() { that.slideSetActiveSlide(0); };
	keyCodeDict.core_slide[this.END_KEY] = function() { that.slideSetActiveSlide(that.slides.length - 1); };
	keyCodeDict.core_slide[this.SPACE_KEY] = function() { playAllVisibleVideos(); };
	keyCodeDict.core_slide[this.ESC_KEY] = function() { stopAllSounds(); };

	keyCodeDict.slide_index = new Object();
	keyCodeDict.slide_index[this.RIGHT_KEY] = function() { that.indexSetActiveSlide(that.activeSlide+1); };
	keyCodeDict.slide_index[this.LEFT_KEY] = function() { that.indexSetActiveSlide(that.activeSlide-1); };
	keyCodeDict.slide_index[this.ENTER_KEY] = function () { that.toggleSlideIndex(); };
	keyCodeDict.slide_index[this.UP_KEY] = function() { that.nextRowInIndex(-1); };
	keyCodeDict.slide_index[this.DOWN_KEY] = function() { that.nextRowInIndex(1); };
	keyCodeDict.slide_index[this.ESC_KEY] = function() { stopAllSounds(); };

	return keyCodeDict;
};


/*****************************************************************************/
/*****************************************************************************/

/** Activate slide from next/previous row in index
 *
 *  @param dir
 *
 *  Added by Santiago Jaramillo - 2012-02-01
 */
JinkSlide.prototype.nextRowInIndex = function(dir)
{
	var nextSlide = this.activeSlide + dir*this.indexColumns;
	if ((nextSlide>=0) && (nextSlide<this.slides.length))
	{
	    // FIXME: Inefficient implementation. It should check if new displayIndex()
	    //        is necessary or not.
	    var activeRow = Math.floor(nextSlide/this.indexColumns);
	    var topRow = Math.max(activeRow-this.indexColumns+1,0);
	    this.displayIndex(topRow);

	    this.indexSetActiveSlide(nextSlide);
	}

}

/** Toggle to Slide Index Mode
 *
 *  Added by Santiago Jaramillo - 2012-02-01
 */
JinkSlide.prototype.toggleSlideIndex = function()
{
    if (this.currentMode == 'slide_index')
    {
	this.currentMode = 'core_slide';
	for (var slide in this.slides)
	{
	    this.slides[slide].gElement.removeAttribute('transform');
	    this.slides[slide].hide();
	    
	    // Remove border rectangles when exiting index mode
	    var borderRect = document.getElementById('slideBorder_' + slide);
	    if (borderRect)
	    {
	        borderRect.parentNode.removeChild(borderRect);
	    }
        }
	this.slideSetActiveSlide(this.activeSlide);
	
    }
    else
    {
	this.currentMode = 'slide_index';
        this.displayIndex(0);
	this.slideSetActiveSlide(this.activeSlide);
    }
}

/** Show Slide Index
 *
 *  Added by Santiago Jaramillo - 2012-02-01
 */
JinkSlide.prototype.displayIndex = function(topRow)
{
    var NCOLS = this.indexColumns;
    var row;
    var col;
    var offsetX;
    var offsetY;
    var paddingX = 0.01;
    var paddingY = 0.01;
    var scale = 1/NCOLS;
    
    // Clean up existing border rectangles first
    for (var i = 0; i < this.slides.length; i++)
    {
        var existingBorder = document.getElementById('slideBorder_' + i);
        if (existingBorder)
        {
            existingBorder.parentNode.removeChild(existingBorder);
        }
    }
    
    for (var slideind in this.slides)
    {
		row = Math.floor(slideind/NCOLS) - topRow;
		col = slideind % NCOLS;
		//this.slides[slide].hide(false);
		offsetX = col*(1+paddingX)*this.width;
		offsetY = row*(1+paddingY)*this.height;
		this.slides[slideind].gElement.setAttribute('transform','scale('+scale+') translate('+offsetX+','+offsetY+')');
		this.slides[slideind].gElement.setAttribute('opacity',0.5);
		this.slides[slideind].gElement.style.display = 'inherit';
		
		// Create a border rectangle for each slide in index mode
		// Position border to match where the scaled slide actually appears
		var borderX = offsetX * scale - 0;
		var borderY = offsetY * scale - 0;
		var borderRect = document.createElementNS(this.nss.svg, 'rect');
		borderRect.setAttribute('x', borderX);
		borderRect.setAttribute('y', borderY);
		borderRect.setAttribute('width', this.width * scale + 0);
		borderRect.setAttribute('height', this.height * scale + 0);
		borderRect.setAttribute('fill', 'none');
		
		// Set border color - red for active slide, gray for others
		if (slideind == this.activeSlide)
		{
			borderRect.setAttribute('stroke', '#ff0000');
			borderRect.setAttribute('stroke-width', 2);
		}
		else
		{
			borderRect.setAttribute('stroke', '#dbdbdbff');
			borderRect.setAttribute('stroke-width', 1);
		}
		
		borderRect.setAttribute('id', 'slideBorder_' + slideind);
		
		// Add border to presentation layer
		this.presentationLayer.appendChild(borderRect);
    }
    
}

/** Function to set the active slide in the index view.
 *
 *  @param toSlide index of the active slide
 */
JinkSlide.prototype.indexSetActiveSlide = function(toSlide)
{
	if (toSlide >= this.slides.length)
		toSlide = this.slides.length - 1;
	else if (toSlide < 0)
		toSlide = 0;

	// Reset previous active slide appearance
	this.slides[this.activeSlide].gElement.setAttribute('opacity',0.5);
	var prevBorder = document.getElementById('slideBorder_' + this.activeSlide);
	if (prevBorder)
	{
		prevBorder.setAttribute('stroke', '#dbdbdbff');
		prevBorder.setAttribute('stroke-width', 1);
	}
	
	// Set new active slide
	this.activeSlide = toSlide;

	// Highlight new active slide
	this.slides[this.activeSlide].gElement.setAttribute('opacity',1);
	var activeBorder = document.getElementById('slideBorder_' + this.activeSlide);
	if (activeBorder)
	{
		activeBorder.setAttribute('stroke', '#ff0000');
		activeBorder.setAttribute('stroke-width', 2);
	}
}

/** Function to change the number of columns in index.
 *
 *  @param addColumn
 */
JinkSlide.prototype.changeIndexColNumber = function(addColumn)
{
	this.indexColumns += addColumn;
	if (this.indexColumns < 2)
		this.indexColumns = 2;

	this.displayIndex(0);
	this.slideSetActiveSlide(this.activeSlide);
}



/** Function to skip effects and directly either put the slide into start or end state or change slides.
 *
 *  @param dir direction of the change (1 = forwards, -1 = backwards)
 *
 *  Added by Santiago Jaramillo - 2012-01-17
 */
JinkSlide.prototype.skipEffects = function(dir)
{
    // FIXME: should the limits check happen here or on slideSetActiveSlide() ?
    if (((dir == 1) && (this.activeSlide < (this.slides.length - 1))) || (((dir == -1) && (this.activeSlide > 0))))
    {
	this.slideSetActiveSlide(this.activeSlide+dir);
    } 
}

/** Function to set the active slide in the slide view.
 *
 *  @param nbr index of the active slide
 *
 *  Added by Santiago Jaramillo - 2012-01-17
 */
JinkSlide.prototype.slideSetActiveSlide = function(toSlide)
{
    // Stop all sounds when directly setting active slide
    stopAllSounds();
    
    //this.changeSlide(1);
    this.effectArray = new Array();
    this.effectArray[0] = new JinkSlideEffectAppear(this.slides[this.activeSlide].getGElement(), -1);
    this.activeSlide = toSlide;
    this.effectArray[1] = new JinkSlideEffectAppear(this.slides[this.activeSlide].getGElement(), 1);
    this.activeEffect = 0;
    this.slides[this.activeSlide].setToState(this.STATE_START);
    
    // Check for set background elements in the new slide
    this.checkAndApplySlideBackgroundColor(this.slides[this.activeSlide].origGElement);
    
    // Create videos from namespace-marked rectangles in the new slide (only if videos exist)
    var that = this;
    if (hasVideoRectangles(this.slides[this.activeSlide].origGElement)) {
        setTimeout(function() { createVideoFromRect(); }, 50);
    }
    
    this.transCounter = 0;
    this.startTime = (new Date()).getTime();
    this.lastFrameTime = null;
    this.playEffects(1);
}

/*****************************************************************************/
/*****************************************************************************/


/** Function to handle all mouse events.
 *
 *	@param	evnt	event
 *	@param	action	type of event (e.g. mouse up, mouse wheel)
 */
JinkSlide.prototype.mouseHandlerDispatch = function(evnt, action)
{
	if (!evnt)
		evnt = window.event;

	var retVal = true;

	if (!this.processingEffect && this.mouseHandlerDictionary[this.currentMode] && this.mouseHandlerDictionary[this.currentMode][action])
	{
		var subRetVal = this.mouseHandlerDictionary[this.currentMode][action](evnt);

		if (subRetVal != null && subRetVal != undefined)
			retVal = subRetVal;
	}

	if (evnt.preventDefault && !retVal)
		evnt.preventDefault();

	evnt.returnValue = retVal;

	return retVal;
};

/** Function to supply the default mouse handler dictionary.
 *
 * @returns default mouse handler dictionary
 */
JinkSlide.prototype.getDefaultMouseHandlerDictionary = function()
{
	var mouseHandlerDict = new Object();

	mouseHandlerDict.core_slide = new Object();
	mouseHandlerDict.core_slide[this.MOUSE_DOWN] = function(evnt) { this.dispatchEffects(1); };

	return mouseHandlerDict;
};

JinkSlide.prototype.init = function()
{
	var suspendId = this.rootNode.suspendRedraw(1000);

	this.setAutoScale();
	this.setBackgroundColor();

	this.rootNode.unsuspendRedraw(suspendId);
	suspendId = this.rootNode.suspendRedraw(2000);

	this.removeJinkSlideLayer();
	this.hideEverything();
	this.makeJinkSlideLayer();
	this.defineClipPath();
	this.defineBackground();
	this.getSlides();
	this.callSlideChangingExtensions();
	this.callSlideDecoratingExtensions();
	this.initModules();
	this.initPresentation();

	this.rootNode.unsuspendRedraw(suspendId);
	this.rootNode.forceRedraw();

	var that = this;
	// Set event handler for key down.
	document.onkeydown = function(e) { that.keydown(e); };
};

if (typeof(JINKSLIDE) === 'undefined')
{
	JINKSLIDE = new Object();
}

JINKSLIDE.main = new JinkSlide();

// Show the running version in the label of the SVG (marked with
// jinkslide:role="version"); the text stored in the SVG is only a baseline.
function updateVersionLabel()
{
	var jinkslideNs = 'https://github.com/sjara/jinkslide';
	var tspans = document.getElementsByTagNameNS('http://www.w3.org/2000/svg', 'tspan');
	for (var indTspan = 0; indTspan < tspans.length; indTspan++)
	{
		if (tspans[indTspan].getAttributeNS(jinkslideNs, 'role') == 'version')
		{
			tspans[indTspan].textContent = 'v' + JINKSLIDE_VERSION + ' (' + JINKSLIDE_DATE + ')';
		}
	}
}

window.onload = function() { updateVersionLabel(); JINKSLIDE.main.init(); };

// Sound functionality
function playSound(soundFile) {
	try {
		// Create audio element if it doesn't exist
		var audioId = 'audio_' + soundFile.replace(/[^a-zA-Z0-9]/g, '_');
		var audio = document.getElementById(audioId);
		
		if (!audio) {
			audio = new Audio(soundFile);
			audio.id = audioId;
			audio.preload = 'auto';
			// Store reference in a global object to prevent garbage collection
			if (!window.audioElements) {
				window.audioElements = {};
			}
			window.audioElements[audioId] = audio;
		}
		
		// Reset and play
		audio.currentTime = 0;
		audio.play().catch(function(error) {
			console.log('Error playing sound:', error);
		});
	} catch (error) {
		console.log('Error with audio:', error);
	}
}

// Function to stop all currently playing sounds
function stopAllSounds() {
	try {
		if (window.audioElements) {
			for (var audioId in window.audioElements) {
				var audio = window.audioElements[audioId];
				if (audio && !audio.paused) {
					audio.pause();
					audio.currentTime = 0;
				}
			}
		}
	} catch (error) {
		console.log('Error stopping sounds:', error);
	}
}

// Function to play all visible videos in the current slide
function playAllVisibleVideos() {
    try {
        // Get the current active slide
        var currentSlide = JINKSLIDE.main.slides[JINKSLIDE.main.activeSlide];
        if (!currentSlide) {
            return;
        }
        
        // Find foreignObjects only within the current slide's gElement
        var foreignObjects = currentSlide.gElement.getElementsByTagName('foreignObject');
        var visibleVideos = [];
        
        // Collect all videos from foreignObjects in the current slide
        for (var i = 0; i < foreignObjects.length; i++) {
            var videos = foreignObjects[i].getElementsByTagName('video');
            for (var j = 0; j < videos.length; j++) {
                visibleVideos.push(videos[j]);
            }
        }
        
        if (visibleVideos.length === 0) {
            return; // No visible videos to control
        }
        
        // Check if any videos are currently playing
        var anyPlaying = false;
        for (var k = 0; k < visibleVideos.length; k++) {
            if (!visibleVideos[k].paused) {
                anyPlaying = true;
                break;
            }
        }
        
        // Toggle: if any are playing, pause all; if all are paused, play all
        for (var l = 0; l < visibleVideos.length; l++) {
            var video = visibleVideos[l];
            if (anyPlaying) {
                video.pause();
            } else {
                video.play().catch(function(error) {
                    console.log('Error playing video:', error);
                });
            }
        }
    } catch (error) {
        console.log('Error in playAllVisibleVideos:', error);
    }
}

// Helper function to check if there are any video elements in the specified slide
function hasVideoRectangles(slideElement) {
	try {
		if (!slideElement) {
			return false;
		}
		
		var jinkslideNS = 'https://github.com/sjara/jinkslide';
		
		// Check for groups with video attributes (new structure)
		var allGroups = slideElement.getElementsByTagName('g');
		for (var i = 0; i < allGroups.length; i++) {
			var group = allGroups[i];
			if (group.getAttributeNS(jinkslideNS, 'video-src')) {
				return true;
			}
		}
		
		// Also check for rectangles with video attributes (legacy structure)
		var allRects = slideElement.getElementsByTagName('rect');
		for (var i = 0; i < allRects.length; i++) {
			var rect = allRects[i];
			if (rect.getAttributeNS(jinkslideNS, 'video-src')) {
				return true;
			}
		}
		
		return false;
	} catch (error) {
		return false;
	}
}

// Function to create and display videos based on namespace-marked elements
function createVideoFromRect() {
	try {
		var presentationLayer = document.getElementById('jinkSlidePresentationLayer');
		if (!presentationLayer) {
			console.log('Presentation layer not found');
			return;
		}
		
		var jinkslideNS = 'https://github.com/sjara/jinkslide';
		var svgNS = 'http://www.w3.org/2000/svg';
		var xhtmlNS = 'http://www.w3.org/1999/xhtml';
		
		// First, check for groups with video attributes (new structure)
		var allGroups = presentationLayer.getElementsByTagName('g');
		
		for (var i = 0; i < allGroups.length; i++) {
			var group = allGroups[i];
			
			// Look for groups marked with video namespace attributes
			if (group.getAttributeNS(jinkslideNS, 'video-src')) {
				// Check if this group has already been processed
				if (group.getAttributeNS(jinkslideNS, 'video-processed') === 'true') {
					continue; // Skip already processed groups
				}
				
				// Use IIFE to create proper closure for each video instance
				(function(currentGroup) {
					// Find the rectangle within this group to get dimensions
					var rects = currentGroup.getElementsByTagName('rect');
					if (rects.length === 0) return;
					
					var rect = rects[0]; // Use the first rectangle in the group
					var videoSrc = currentGroup.getAttributeNS(jinkslideNS, 'video-src');
					
					// Get rectangle dimensions
					var rectWidth = parseFloat(rect.getAttribute('width'));
					var rectHeight = parseFloat(rect.getAttribute('height'));
					
					// Get the actual transformed position of the rectangle
					var rectBBox = rect.getBBox();
					var rectX, rectY;
					
					// Parse transform attribute manually to handle translate transformations
					var groupTransformAttr = currentGroup.getAttribute('transform');
					if (groupTransformAttr) {
						// Parse translate transform - handles both translate(x) and translate(x,y) formats
						var translateMatch = groupTransformAttr.match(/translate\s*\(\s*([^,\s)]+)(?:[\s,]+([^)]+))?\s*\)/);
						if (translateMatch) {
							var translateX = parseFloat(translateMatch[1]);
							var translateY = translateMatch[2] ? parseFloat(translateMatch[2]) : 0; // Default Y to 0 if not provided
							rectX = rectBBox.x + translateX;
							rectY = rectBBox.y + translateY;
						} else {
							// No translation found, use original coordinates
							rectX = rectBBox.x;
							rectY = rectBBox.y;
						}
					} else {
						// No transform, use original coordinates
						rectX = rectBBox.x;
						rectY = rectBBox.y;
					}
					
					// Create video element first to detect aspect ratio
					var video = document.createElementNS(xhtmlNS, 'video');
					video.setAttribute('preload', 'metadata');
					
					// Add optional video attributes from namespace
					if (currentGroup.getAttributeNS(jinkslideNS, 'video-controls') === 'true') {
						video.setAttribute('controls', 'true');
					}
					else {
						video.removeAttribute('controls');
					}
					if (currentGroup.getAttributeNS(jinkslideNS, 'video-autoplay') === 'true') {
						video.setAttribute('autoplay', 'true');
					}
					if (currentGroup.getAttributeNS(jinkslideNS, 'video-loop') === 'true') {
						video.setAttribute('loop', 'true');
					}
					if (currentGroup.getAttributeNS(jinkslideNS, 'video-muted') === 'true') {
						video.setAttribute('muted', 'true');
					}
					
					// Create source element
					var source = document.createElementNS(xhtmlNS, 'source');
					source.setAttribute('src', videoSrc);
					source.setAttribute('type', 'video/mp4');
					video.appendChild(source);
					
					// Create foreignObject for the video
					var foreignObject = document.createElementNS(svgNS, 'foreignObject');
					foreignObject.setAttribute('x', rectX);
					foreignObject.setAttribute('y', rectY);
					foreignObject.setAttribute('width', rectWidth);
					foreignObject.setAttribute('height', rectHeight);
					
					// Set initial video dimensions to match the rectangle
					// This ensures the video has size even if metadata doesn't load
					video.setAttribute('width', rectWidth);
					video.setAttribute('height', rectHeight);
					
					// Function to resize video once metadata is loaded
					var resizeVideo = function() {
						var videoAspectRatio;
						
						// Try to get aspect ratio from video metadata
						if (video.videoWidth && video.videoHeight) {
							videoAspectRatio = video.videoWidth / video.videoHeight;
							console.log('Using video metadata for aspect ratio:', videoAspectRatio);
						} else {
							// Fallback to namespace attribute or default
							var aspectRatio = currentGroup.getAttributeNS(jinkslideNS, 'video-aspect-ratio');
							if (!aspectRatio) {
								aspectRatio = '16:9'; // Default aspect ratio
							}
							var aspectParts = aspectRatio.split(':');
							var originalWidth = parseFloat(aspectParts[0]);
							var originalHeight = parseFloat(aspectParts[1]);
							videoAspectRatio = originalWidth / originalHeight;
							console.log('Using fallback aspect ratio:', videoAspectRatio);
						}
						
						// Calculate video dimensions maintaining aspect ratio
						var videoWidth, videoHeight;
						var rectAspectRatio = rectWidth / rectHeight;
						
						if (rectAspectRatio > videoAspectRatio) {
							// Rectangle is wider, fit to height
							videoHeight = rectHeight;
							videoWidth = rectHeight * videoAspectRatio;
						} else {
							// Rectangle is taller or same, fit to width
							videoWidth = rectWidth;
							videoHeight = rectWidth / videoAspectRatio;
						}
						
						// Center the video within the rectangle
						var videoX = rectX + (rectWidth - videoWidth) / 2;
						var videoY = rectY + (rectHeight - videoHeight) / 2;
						
						// Update video and foreignObject dimensions
						video.setAttribute('width', videoWidth);
						video.setAttribute('height', videoHeight);
						foreignObject.setAttribute('x', videoX);
						foreignObject.setAttribute('y', videoY);
						foreignObject.setAttribute('width', videoWidth);
						foreignObject.setAttribute('height', videoHeight);
					};
					
					// Add event listener for when metadata is loaded
					video.addEventListener('loadedmetadata', resizeVideo);
					
					// Check if metadata is already loaded (handles race condition)
					// This can happen if the video is cached or loads very quickly
					if (video.readyState >= 1) {
						// Metadata is already available, resize immediately
						resizeVideo();
					}
					
					// Create XHTML body
					var body = document.createElementNS(xhtmlNS, 'body');
					body.style.margin = '0';
					body.style.padding = '0';
					body.style.overflow = 'hidden';
					
					// Assemble the elements
					body.appendChild(video);
					foreignObject.appendChild(body);
					
					// Insert the video after the group
					currentGroup.parentNode.insertBefore(foreignObject, currentGroup.nextSibling);
					
					// Hide the original group
					currentGroup.style.display = 'none';
					
					// Mark this group as processed to prevent duplicate creation
					currentGroup.setAttributeNS(jinkslideNS, 'video-processed', 'true');
				})(group);
			}
		}
	} catch (error) {
		console.log('Error in createVideoFromRect:', error);
	}
}


// Module implementing the appear/disappear effect for slide elements.
function JinkSlide_core_effect_appear()
{
};

JinkSlide_core_effect_appear.prototype.decorateSlides = function (ji)
{
	for (var slideCounter in ji.slides)
	{
		if (ji.slides[slideCounter].elements.core_effect_appear)
		{
			// Process appear effects.
			for (var effectCounter in ji.slides[slideCounter].elements.core_effect_appear)
			{
				var effect = ji.slides[slideCounter].elements.core_effect_appear[effectCounter];
				
				if ((effect.parentNode.nodeName === 'g') && !(effect.parentNode.getAttributeNS(ji.nss.inkscape, 'groupmode') === 'layer' || effect.parentNode.getAttributeNS(ji.nss.jinkslide, 'module') === 'core_effect_appear'))
				{
					var nds = effect.getElementsByTagNameNS(ji.nss.svg, 'tspan');

					for (var nodeCounter = 0; nodeCounter <  nds.length; nodeCounter++)
					{
						if (nds[nodeCounter].getAttributeNS(ji.nss.jinkslide, 'core_effect_appear') == 'order')
						{
							var order = parseInt(nds[nodeCounter].firstChild.nodeValue);
						}
					}

					if (order !== 'undefined' && !isNaN(order) && (order > 0))
					{
						ji.slides[slideCounter].addEffect(new JinkSlideEffectAppear(effect.parentNode, 1), order);
					}
				}
			}
		}

		if (ji.slides[slideCounter].elements.core_effect_disappear)
		{
			// Process disappear effects.
			for (var effectCounter in ji.slides[slideCounter].elements.core_effect_disappear)
			{
				var effect = ji.slides[slideCounter].elements.core_effect_disappear[effectCounter];
				
				if ((effect.parentNode.nodeName === 'g') && !(effect.parentNode.getAttributeNS(ji.nss.inkscape, 'groupmode') === 'layer' || effect.parentNode.getAttributeNS(ji.nss.jinkslide, 'module') === 'core_effect_appear'))
				{
					var nds = effect.getElementsByTagNameNS(ji.nss.svg, 'tspan');

					for (var nodeCounter = 0; nodeCounter <  nds.length; nodeCounter++)
					{
						if (nds[nodeCounter].getAttributeNS(ji.nss.jinkslide, 'core_effect_disappear') == 'order')
						{
							var order = parseInt(nds[nodeCounter].firstChild.nodeValue);
						}
					}

					if (order !== 'undefined' && !isNaN(order) && (order > 0))
					{
						ji.slides[slideCounter].addEffect(new JinkSlideEffectAppear(effect.parentNode, -1), order);
					}
				}
			}
		}
	}
};

function JinkSlideEffectAppear(element, direction)
{
	this.gElement = element;
	this.baseDirection = direction;

	return this;
}

JinkSlideEffectAppear.prototype.playEffect = function (dir, time)
{
	if ((dir * this.baseDirection) == 1)
	{
		this.gElement.style.display = 'inherit';
		this.gElement.setAttribute('opacity', 1);
	}
	else
	{
		this.gElement.style.display = 'none';
		this.gElement.setAttribute('opacity', 0);
	}

	return true;
};

if (typeof(JINKSLIDE) === 'undefined')
{
	JINKSLIDE = new Object();
}

if (typeof(JINKSLIDE.modules) === 'undefined')
{
	JINKSLIDE.modules = new Object();
}

JINKSLIDE.modules.core_effect_appear = new JinkSlide_core_effect_appear();

