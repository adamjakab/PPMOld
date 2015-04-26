/**
 * Created with JetBrains PhpStorm.
 * User: jackisback
 * Date: 5/3/13
 * Time: 4:20 PM
 * Copyright (C) 2012 Andrew Duthie

 Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

 The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

 src: https://github.com/aduth/jquery.passwordMask
 demo: http://aduth.github.io/jquery.passwordMask/

 */

// jquery.passwordMask.js | Andrew Duthie | MIT License
;(function($, window, document, undefined) {

    'use strict';

    // Define defaults
    var plugin = 'passwordMask',
        defaults = {
            isShown: false,
            toggleText: 'Show password'
        };

    // cloneCopyEvent borrowed directly from jQuery for copying
    // events from one element to another
    function cloneCopyEvent(src, dest) {
        if (dest.nodeType !== 1 || !$.hasData(src)) {
            return;
        }

        var type, i, l,
            oldData = $._data(src),
            curData = $._data(dest, oldData),
            events = oldData.events;

        if (events) {
            delete curData.handle;
            curData.events = {};

            for (type in events) {
                if (events.hasOwnProperty(type)) {
                    for (i = 0, l = events[type].length; i < l; i++) {
                        $.event.add(dest, type, events[type][i]);
                    }
                }
            }
        }

        if (curData.data) {
            curData.data = $.extend({}, curData.data);
        }
    }

    // PasswordMask class constructor
    var PasswordMask = function(element, options) {
        this.$el = $(element);

        // Extend options from defaults
        this.options = $.extend({}, defaults, options);
        this._options = options;

        this.init();
    };

    // Initialize PasswordMask instance (sets up toggler and does
    // initial mask update - in case of defaulted show)
    PasswordMask.prototype.init = function() {
        var $toggler,
            togglerOptProp,
            that = this;

        if (typeof this._options === 'string') {
            // String -> jQuery selector
            $toggler = $(this._options);
        } else if ($.isPlainObject(this._options) && this._options.hasOwnProperty('toggler')) {
            // Object -> pull "$toggler" property
            togglerOptProp = this._options.toggler;

            if (togglerOptProp instanceof $) {
                // jQuery instance -> set directly
                $toggler = togglerOptProp;
            } else if (typeof togglerOptProp === 'string') {
                // String -> jQuery selector
                $toggler = $(togglerOptProp);
            }
        } else if (this._options instanceof $) {
            // jQuery instance -> set directly
            $toggler = this._options;
        }

        if (!$toggler) {
            // If no toggler defined, it means either no parameters were
            // passed, or parameters were improperly formatted. So, create
            // a new checkbox with options toggleText
            /*
            $toggler = $('<input type="checkbox" ' + (this.options.isShown ? 'checked="checked"' : '') + '/>')
                .insertAfter(this.$el)
                .wrap('<label/>')
                .after(this.options.toggleText);*/

            //JACK CUSTOM DEFAULT TOGGLER (jQuery UI)
            $toggler = $('<span style="cursor:pointer; float:right; margin-top: 5px;" class="ui-icon '+(this.options.isShown?'ui-icon-unlocked':'ui-icon-locked')+' pwtoggler"></span>').insertAfter(this.$el);

        }
        this.$toggler = $toggler;

        // Bind toggler
        $toggler.on('click', function() {
            that.toggleMask();
        });

        // Initial mask update - in case of defaulted show
        this.updateMask();
    };

    // Update isShown option and call mask update
    PasswordMask.prototype.toggleMask = function() {
        // If toggler is checkbox, pull checked value as whether field
        // should be displayed as text or password (isShown = text)
        this.options.isShown = this.$toggler.is(':checkbox') ? this.$toggler.is(':checked') : !this.options.isShown;

        this.$toggler.
            removeClass('ui-icon-unlocked').
            removeClass('ui-icon-unlocked').
            addClass(((this.options.isShown?'ui-icon-unlocked':'ui-icon-locked')));



        this.updateMask();
    };

    // Set field to text or password, depending on isShown option
    PasswordMask.prototype.updateMask = function() {
        // isShown corresponds to text
        var newType = this.options.isShown ? 'text' : 'password',
            $newField, ieField;

        if (newType !== this.$el[0].type) {
            // Change only if type is different (i.e. not in case of updateMask called
            // initially when defaulted hidden, or if method called externally)

            try {
                // To the best of my knowledge, no browser supports direct type changing,
                // but it would be the best way of applying the new type
                this.$el.attr('type', newType);
            } catch (errDirect) {
                try {
                    // Non-IE browsers should allow type changing on a cloned field, so
                    // clone and assign new type value
                    $newField = this.$el.clone(true).attr('type', newType);
                } catch (errProxy) {
                    if (document.documentElement.mergeAttributes) {
                        // In IE<9, need to create a new input element, assign type, then
                        // copy attributes, data, and events
                        ieField = document.createElement('input');
                        ieField.mergeAttributes(this.$el[0], false);
                        ieField.removeAttribute($.expando);
                        ieField.setAttribute('type', newType);
                        ieField.setAttribute('value', this.$el.val());
                        cloneCopyEvent(this.$el[0], ieField);

                        $newField = $(ieField);
                    }
                }

                // Replace old field and update instance element property
                this.$el.replaceWith($newField);
                this.$el = $newField;
            }
        }
    };

    // Register jQuery plugin
    $.fn[plugin] = function(options) {
        return this.each(function() {
            if (this.nodeName !== 'INPUT' || (this.type.toLowerCase() !== 'password' && this.type.toLowerCase() !== 'text')) {
                // If element is not input field, continue
                return true;
            }

            if (!$.data(this, 'plugin_' + plugin)) {
                // Create PasswordMask instance only if one is not already assigned,
                // and store in element data (credit: @ajpiano jQuery plugin pattern)
                $.data(
                    this,
                    'plugin_' + plugin,
                    new PasswordMask(this, options)
                );
            }
        });
    };

}(this.jQuery, this, this.document));