/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */

/**
 *
 * MochiKit inlined.
 *
 * (c) 2005 Bob Ippolito.  All rights Reserved.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 **/

if (typeof(MochiKit) == 'undefined') {
    var MochiKit = {};
}
if (typeof(MochiKit.Base) == 'undefined') {
    MochiKit.Base = {};
}
if (typeof(MochiKit.__export__) == "undefined") {
    MochiKit.__export__ = (MochiKit.__compat__  ||
        (typeof(JSAN) == 'undefined' && typeof(dojo) == 'undefined')
    );
}

MochiKit.Base.VERSION = "1.4";
MochiKit.Base.NAME = "MochiKit.Base";
/** @id MochiKit.Base.update */
MochiKit.Base.update = function (self, obj/*, ... */) {
    if (self === null) {
        self = {};
    }
    for (var i = 1; i < arguments.length; i++) {
        var o = arguments[i];
        if (typeof(o) != 'undefined' && o !== null) {
            for (var k in o) {
                self[k] = o[k];
            }
        }
    }
    return self;
};


MochiKit.Base.update(MochiKit.Base, {
    __repr__: function () {
        return "[" + this.NAME + " " + this.VERSION + "]";
    },

    toString: function () {
        return this.__repr__();
    },

    /** @id MochiKit.Base.camelize */
    camelize: function (selector) {
        /* from dojo.style.toCamelCase */
        var arr = selector.split('-');
        var cc = arr[0];
        for (var i = 1; i < arr.length; i++) {
            cc += arr[i].charAt(0).toUpperCase() + arr[i].substring(1);
        }
        return cc;
    },

    /** @id MochiKit.Base.counter */
    counter: function (n/* = 1 */) {
        if (arguments.length === 0) {
            n = 1;
        }
        return function () {
            return n++;
        };
    },

    /** @id MochiKit.Base.clone */
    clone: function (obj) {
        var me = arguments.callee;
        if (arguments.length == 1) {
            me.prototype = obj;
            return new me();
        }
        return null;
    },

    _flattenArray: function (res, lst) {
        for (var i = 0; i < lst.length; i++) {
            var o = lst[i];
            if (o instanceof Array) {
                arguments.callee(res, o);
            } else {
                res.push(o);
            }
        }
        return res;
    },

    /** @id MochiKit.Base.flattenArray */
    flattenArray: function (lst) {
        return MochiKit.Base._flattenArray([], lst);
    },

    /** @id MochiKit.Base.flattenArguments */
    flattenArguments: function (lst/* ...*/) {
        var res = [];
        var m = MochiKit.Base;
        var args = m.extend(null, arguments);
        while (args.length) {
            var o = args.shift();
            if (o && typeof(o) == "object" && typeof(o.length) == "number") {
                for (var i = o.length - 1; i >= 0; i--) {
                    args.unshift(o[i]);
                }
            } else {
                res.push(o);
            }
        }
        return res;
    },

    /** @id MochiKit.Base.extend */
    extend: function (self, obj, /* optional */skip) {
        // Extend an array with an array-like object starting
        // from the skip index
        if (!skip) {
            skip = 0;
        }
        if (obj) {
            // allow iterable fall-through, but skip the full isArrayLike
            // check for speed, this is called often.
            var l = obj.length;
            if (typeof(l) != 'number' /* !isArrayLike(obj) */) {
                if (typeof(MochiKit.Iter) != "undefined") {
                    obj = MochiKit.Iter.list(obj);
                    l = obj.length;
                } else {
                    throw new TypeError("Argument not an array-like and MochiKit.Iter not present");
                }
            }
            if (!self) {
                self = [];
            }
            for (var i = skip; i < l; i++) {
                self.push(obj[i]);
            }
        }
        // This mutates, but it's convenient to return because
        // it's often used like a constructor when turning some
        // ghetto array-like to a real array
        return self;
    },


    /** @id MochiKit.Base.updatetree */
    updatetree: function (self, obj/*, ...*/) {
        if (self === null) {
            self = {};
        }
        for (var i = 1; i < arguments.length; i++) {
            var o = arguments[i];
            if (typeof(o) != 'undefined' && o !== null) {
                for (var k in o) {
                    var v = o[k];
                    if (typeof(self[k]) == 'object' && typeof(v) == 'object') {
                        arguments.callee(self[k], v);
                    } else {
                        self[k] = v;
                    }
                }
            }
        }
        return self;
    },

    /** @id MochiKit.Base.setdefault */
    setdefault: function (self, obj/*, ...*/) {
        if (self === null) {
            self = {};
        }
        for (var i = 1; i < arguments.length; i++) {
            var o = arguments[i];
            for (var k in o) {
                if (!(k in self)) {
                    self[k] = o[k];
                }
            }
        }
        return self;
    },

    /** @id MochiKit.Base.keys */
    keys: function (obj) {
        var rval = [];
        for (var prop in obj) {
            rval.push(prop);
        }
        return rval;
    },

    /** @id MochiKit.Base.values */
    values: function (obj) {
        var rval = [];
        for (var prop in obj) {
            rval.push(obj[prop]);
        }
        return rval;
    },

     /** @id MochiKit.Base.items */
    items: function (obj) {
        var rval = [];
        var e;
        for (var prop in obj) {
            var v;
            try {
                v = obj[prop];
            } catch (e) {
                continue;
            }
            rval.push([prop, v]);
        }
        return rval;
    },


    _newNamedError: function (module, name, func) {
        func.prototype = new MochiKit.Base.NamedError(module.NAME + "." + name);
        module[name] = func;
    },


    /** @id MochiKit.Base.operator */
    operator: {
        // unary logic operators
        /** @id MochiKit.Base.truth */
        truth: function (a) { return !!a; },
        /** @id MochiKit.Base.lognot */
        lognot: function (a) { return !a; },
        /** @id MochiKit.Base.identity */
        identity: function (a) { return a; },

        // bitwise unary operators
        /** @id MochiKit.Base.not */
        not: function (a) { return ~a; },
        /** @id MochiKit.Base.neg */
        neg: function (a) { return -a; },

        // binary operators
        /** @id MochiKit.Base.add */
        add: function (a, b) { return a + b; },
        /** @id MochiKit.Base.sub */
        sub: function (a, b) { return a - b; },
        /** @id MochiKit.Base.div */
        div: function (a, b) { return a / b; },
        /** @id MochiKit.Base.mod */
        mod: function (a, b) { return a % b; },
        /** @id MochiKit.Base.mul */
        mul: function (a, b) { return a * b; },

        // bitwise binary operators
        /** @id MochiKit.Base.and */
        and: function (a, b) { return a & b; },
        /** @id MochiKit.Base.or */
        or: function (a, b) { return a | b; },
        /** @id MochiKit.Base.xor */
        xor: function (a, b) { return a ^ b; },
        /** @id MochiKit.Base.lshift */
        lshift: function (a, b) { return a << b; },
        /** @id MochiKit.Base.rshift */
        rshift: function (a, b) { return a >> b; },
        /** @id MochiKit.Base.zrshift */
        zrshift: function (a, b) { return a >>> b; },

        // near-worthless built-in comparators
        /** @id MochiKit.Base.eq */
        eq: function (a, b) { return a == b; },
        /** @id MochiKit.Base.ne */
        ne: function (a, b) { return a != b; },
        /** @id MochiKit.Base.gt */
        gt: function (a, b) { return a > b; },
        /** @id MochiKit.Base.ge */
        ge: function (a, b) { return a >= b; },
        /** @id MochiKit.Base.lt */
        lt: function (a, b) { return a < b; },
        /** @id MochiKit.Base.le */
        le: function (a, b) { return a <= b; },

        // strict built-in comparators
        seq: function (a, b) { return a === b; },
        sne: function (a, b) { return a !== b; },

        // compare comparators
        /** @id MochiKit.Base.ceq */
        ceq: function (a, b) { return MochiKit.Base.compare(a, b) === 0; },
        /** @id MochiKit.Base.cne */
        cne: function (a, b) { return MochiKit.Base.compare(a, b) !== 0; },
        /** @id MochiKit.Base.cgt */
        cgt: function (a, b) { return MochiKit.Base.compare(a, b) == 1; },
        /** @id MochiKit.Base.cge */
        cge: function (a, b) { return MochiKit.Base.compare(a, b) != -1; },
        /** @id MochiKit.Base.clt */
        clt: function (a, b) { return MochiKit.Base.compare(a, b) == -1; },
        /** @id MochiKit.Base.cle */
        cle: function (a, b) { return MochiKit.Base.compare(a, b) != 1; },

        // binary logical operators
        /** @id MochiKit.Base.logand */
        logand: function (a, b) { return a && b; },
        /** @id MochiKit.Base.logor */
        logor: function (a, b) { return a || b; },
        /** @id MochiKit.Base.contains */
        contains: function (a, b) { return b in a; }
    },

    /** @id MochiKit.Base.forwardCall */
    forwardCall: function (func) {
        return function () {
            return this[func].apply(this, arguments);
        };
    },

    /** @id MochiKit.Base.itemgetter */
    itemgetter: function (func) {
        return function (arg) {
            return arg[func];
        };
    },

    /** @id MochiKit.Base.typeMatcher */
    typeMatcher: function (/* typ */) {
        var types = {};
        for (var i = 0; i < arguments.length; i++) {
            var typ = arguments[i];
            types[typ] = typ;
        }
        return function () {
            for (var i = 0; i < arguments.length; i++) {
                if (!(typeof(arguments[i]) in types)) {
                    return false;
                }
            }
            return true;
        };
    },

    /** @id MochiKit.Base.isNull */
    isNull: function (/* ... */) {
        for (var i = 0; i < arguments.length; i++) {
            if (arguments[i] !== null) {
                return false;
            }
        }
        return true;
    },

    /** @id MochiKit.Base.isUndefinedOrNull */
    isUndefinedOrNull: function (/* ... */) {
        for (var i = 0; i < arguments.length; i++) {
            var o = arguments[i];
            if (!(typeof(o) == 'undefined' || o === null)) {
                return false;
            }
        }
        return true;
    },

    /** @id MochiKit.Base.isEmpty */
    isEmpty: function (obj) {
        return !MochiKit.Base.isNotEmpty.apply(this, arguments);
    },

    /** @id MochiKit.Base.isNotEmpty */
    isNotEmpty: function (obj) {
        for (var i = 0; i < arguments.length; i++) {
            var o = arguments[i];
            if (!(o && o.length)) {
                return false;
            }
        }
        return true;
    },

    /** @id MochiKit.Base.isArrayLike */
    isArrayLike: function () {
        for (var i = 0; i < arguments.length; i++) {
            var o = arguments[i];
            var typ = typeof(o);
            if (
                (typ != 'object' && !(typ == 'function' && typeof(o.item) == 'function')) ||
                o === null ||
                typeof(o.length) != 'number' ||
                o.nodeType === 3
            ) {
                return false;
            }
        }
        return true;
    },

    /** @id MochiKit.Base.isDateLike */
    isDateLike: function () {
        for (var i = 0; i < arguments.length; i++) {
            var o = arguments[i];
            if (typeof(o) != "object" || o === null
                    || typeof(o.getTime) != 'function') {
                return false;
            }
        }
        return true;
    },


    /** @id MochiKit.Base.xmap */
    xmap: function (fn/*, obj... */) {
        if (fn === null) {
            return MochiKit.Base.extend(null, arguments, 1);
        }
        var rval = [];
        for (var i = 1; i < arguments.length; i++) {
            rval.push(fn(arguments[i]));
        }
        return rval;
    },

    /** @id MochiKit.Base.map */
    map: function (fn, lst/*, lst... */) {
        var m = MochiKit.Base;
        var itr = MochiKit.Iter;
        var isArrayLike = m.isArrayLike;
        if (arguments.length <= 2) {
            // allow an iterable to be passed
            if (!isArrayLike(lst)) {
                if (itr) {
                    // fast path for map(null, iterable)
                    lst = itr.list(lst);
                    if (fn === null) {
                        return lst;
                    }
                } else {
                    throw new TypeError("Argument not an array-like and MochiKit.Iter not present");
                }
            }
            // fast path for map(null, lst)
            if (fn === null) {
                return m.extend(null, lst);
            }
            // disabled fast path for map(fn, lst)
            /*
            if (false && typeof(Array.prototype.map) == 'function') {
                // Mozilla fast-path
                return Array.prototype.map.call(lst, fn);
            }
            */
            var rval = [];
            for (var i = 0; i < lst.length; i++) {
                rval.push(fn(lst[i]));
            }
            return rval;
        } else {
            // default for map(null, ...) is zip(...)
            if (fn === null) {
                fn = Array;
            }
            var length = null;
            for (i = 1; i < arguments.length; i++) {
                // allow iterables to be passed
                if (!isArrayLike(arguments[i])) {
                    if (itr) {
                        return itr.list(itr.imap.apply(null, arguments));
                    } else {
                        throw new TypeError("Argument not an array-like and MochiKit.Iter not present");
                    }
                }
                // find the minimum length
                var l = arguments[i].length;
                if (length === null || length > l) {
                    length = l;
                }
            }
            rval = [];
            for (i = 0; i < length; i++) {
                var args = [];
                for (var j = 1; j < arguments.length; j++) {
                    args.push(arguments[j][i]);
                }
                rval.push(fn.apply(this, args));
            }
            return rval;
        }
    },

    /** @id MochiKit.Base.xfilter */
    xfilter: function (fn/*, obj... */) {
        var rval = [];
        if (fn === null) {
            fn = MochiKit.Base.operator.truth;
        }
        for (var i = 1; i < arguments.length; i++) {
            var o = arguments[i];
            if (fn(o)) {
                rval.push(o);
            }
        }
        return rval;
    },

    /** @id MochiKit.Base.filter */
    filter: function (fn, lst, self) {
        var rval = [];
        // allow an iterable to be passed
        var m = MochiKit.Base;
        if (!m.isArrayLike(lst)) {
            if (MochiKit.Iter) {
                lst = MochiKit.Iter.list(lst);
            } else {
                throw new TypeError("Argument not an array-like and MochiKit.Iter not present");
            }
        }
        if (fn === null) {
            fn = m.operator.truth;
        }
        if (typeof(Array.prototype.filter) == 'function') {
            // Mozilla fast-path
            return Array.prototype.filter.call(lst, fn, self);
        } else if (typeof(self) == 'undefined' || self === null) {
            for (var i = 0; i < lst.length; i++) {
                var o = lst[i];
                if (fn(o)) {
                    rval.push(o);
                }
            }
        } else {
            for (i = 0; i < lst.length; i++) {
                o = lst[i];
                if (fn.call(self, o)) {
                    rval.push(o);
                }
            }
        }
        return rval;
    },


    _wrapDumbFunction: function (func) {
        return function () {
            // fast path!
            switch (arguments.length) {
                case 0: return func();
                case 1: return func(arguments[0]);
                case 2: return func(arguments[0], arguments[1]);
                case 3: return func(arguments[0], arguments[1], arguments[2]);
            }
            var args = [];
            for (var i = 0; i < arguments.length; i++) {
                args.push("arguments[" + i + "]");
            }
            return eval("(func(" + args.join(",") + "))");
        };
    },

    /** @id MochiKit.Base.methodcaller */
    methodcaller: function (func/*, args... */) {
        var args = MochiKit.Base.extend(null, arguments, 1);
        if (typeof(func) == "function") {
            return function (obj) {
                return func.apply(obj, args);
            };
        } else {
            return function (obj) {
                return obj[func].apply(obj, args);
            };
        }
    },

    /** @id MochiKit.Base.method */
    method: function (self, func) {
        var m = MochiKit.Base;
        return m.bind.apply(this, m.extend([func, self], arguments, 2));
    },

    /** @id MochiKit.Base.compose */
    compose: function (f1, f2/*, f3, ... fN */) {
        var fnlist = [];
        var m = MochiKit.Base;
        if (arguments.length === 0) {
            throw new TypeError("compose() requires at least one argument");
        }
        for (var i = 0; i < arguments.length; i++) {
            var fn = arguments[i];
            if (typeof(fn) != "function") {
                throw new TypeError(m.repr(fn) + " is not a function");
            }
            fnlist.push(fn);
        }
        return function () {
            var args = arguments;
            for (var i = fnlist.length - 1; i >= 0; i--) {
                args = [fnlist[i].apply(this, args)];
            }
            return args[0];
        };
    },

    /** @id MochiKit.Base.bind */
    bind: function (func, self/* args... */) {
        if (typeof(func) == "string") {
            func = self[func];
        }
        var im_func = func.im_func;
        var im_preargs = func.im_preargs;
        var im_self = func.im_self;
        var m = MochiKit.Base;
        if (typeof(func) == "function" && typeof(func.apply) == "undefined") {
            // this is for cases where JavaScript sucks ass and gives you a
            // really dumb built-in function like alert() that doesn't have
            // an apply
            func = m._wrapDumbFunction(func);
        }
        if (typeof(im_func) != 'function') {
            im_func = func;
        }
        if (typeof(self) != 'undefined') {
            im_self = self;
        }
        if (typeof(im_preargs) == 'undefined') {
            im_preargs = [];
        } else  {
            im_preargs = im_preargs.slice();
        }
        m.extend(im_preargs, arguments, 2);
        var newfunc = function () {
            var args = arguments;
            var me = arguments.callee;
            if (me.im_preargs.length > 0) {
                args = m.concat(me.im_preargs, args);
            }
            var self = me.im_self;
            if (!self) {
                self = this;
            }
            return me.im_func.apply(self, args);
        };
        newfunc.im_self = im_self;
        newfunc.im_func = im_func;
        newfunc.im_preargs = im_preargs;
        return newfunc;
    },

    /** @id MochiKit.Base.bindMethods */
    bindMethods: function (self) {
        var bind = MochiKit.Base.bind;
        for (var k in self) {
            var func = self[k];
            if (typeof(func) == 'function') {
                self[k] = bind(func, self);
            }
        }
    },

    /** @id MochiKit.Base.registerComparator */
    registerComparator: function (name, check, comparator, /* optional */ override) {
        MochiKit.Base.comparatorRegistry.register(name, check, comparator, override);
    },

    _primitives: {'boolean': true, 'string': true, 'number': true},

    /** @id MochiKit.Base.compare */
    compare: function (a, b) {
        if (a == b) {
            return 0;
        }
        var aIsNull = (typeof(a) == 'undefined' || a === null);
        var bIsNull = (typeof(b) == 'undefined' || b === null);
        if (aIsNull && bIsNull) {
            return 0;
        } else if (aIsNull) {
            return -1;
        } else if (bIsNull) {
            return 1;
        }
        var m = MochiKit.Base;
        // bool, number, string have meaningful comparisons
        var prim = m._primitives;
        if (!(typeof(a) in prim && typeof(b) in prim)) {
            try {
                return m.comparatorRegistry.match(a, b);
            } catch (e) {
                if (e != m.NotFound) {
                    throw e;
                }
            }
        }
        if (a < b) {
            return -1;
        } else if (a > b) {
            return 1;
        }
        // These types can't be compared
        var repr = m.repr;
        throw new TypeError(repr(a) + " and " + repr(b) + " can not be compared");
    },

    /** @id MochiKit.Base.compareDateLike */
    compareDateLike: function (a, b) {
        return MochiKit.Base.compare(a.getTime(), b.getTime());
    },

    /** @id MochiKit.Base.compareArrayLike */
    compareArrayLike: function (a, b) {
        var compare = MochiKit.Base.compare;
        var count = a.length;
        var rval = 0;
        if (count > b.length) {
            rval = 1;
            count = b.length;
        } else if (count < b.length) {
            rval = -1;
        }
        for (var i = 0; i < count; i++) {
            var cmp = compare(a[i], b[i]);
            if (cmp) {
                return cmp;
            }
        }
        return rval;
    },

    /** @id MochiKit.Base.registerRepr */
    registerRepr: function (name, check, wrap, /* optional */override) {
        MochiKit.Base.reprRegistry.register(name, check, wrap, override);
    },

    /** @id MochiKit.Base.repr */
    repr: function (o) {
        if (typeof(o) == "undefined") {
            return "undefined";
        } else if (o === null) {
            return "null";
        }
        try {
            if (typeof(o.__repr__) == 'function') {
                return o.__repr__();
            } else if (typeof(o.repr) == 'function' && o.repr != arguments.callee) {
                return o.repr();
            }
            return MochiKit.Base.reprRegistry.match(o);
        } catch (e) {
            if (typeof(o.NAME) == 'string' && (
                    o.toString == Function.prototype.toString ||
                    o.toString == Object.prototype.toString
                )) {
                return o.NAME;
            }
        }
        try {
            var ostring = (o + "");
        } catch (e) {
            return "[" + typeof(o) + "]";
        }
        if (typeof(o) == "function") {
            o = ostring.replace(/^\s+/, "");
            var idx = o.indexOf("{");
            if (idx != -1) {
                o = o.substr(0, idx) + "{...}";
            }
        }
        return ostring;
    },

    /** @id MochiKit.Base.reprArrayLike */
    reprArrayLike: function (o) {
        var m = MochiKit.Base;
        return "[" + m.map(m.repr, o).join(", ") + "]";
    },

    /** @id MochiKit.Base.reprString */
    reprString: function (o) {
        return ('"' + o.replace(/(["\\])/g, '\\$1') + '"' /* ' */
            ).replace(/[\f]/g, "\\f"
            ).replace(/[\b]/g, "\\b"
            ).replace(/[\n]/g, "\\n"
            ).replace(/[\t]/g, "\\t"
            ).replace(/[\r]/g, "\\r");
    },

    /** @id MochiKit.Base.reprNumber */
    reprNumber: function (o) {
        return o + "";
    },

    /** @id MochiKit.Base.registerJSON */
    registerJSON: function (name, check, wrap, /* optional */override) {
        MochiKit.Base.jsonRegistry.register(name, check, wrap, override);
    },


    /** @id MochiKit.Base.evalJSON */
    evalJSON: function () {
        return eval("(" + MochiKit.Base._filterJSON(arguments[0]) + ")");
    },

    _filterJSON: function (s) {
        var m = s.match(/^\s*\/\*(.*)\*\/\s*$/);
        if (m) {
            return m[1];
        }
        return s;
    },

    /** @id MochiKit.Base.serializeJSON */
    serializeJSON: function (o) {
        var objtype = typeof(o);
        if (objtype == "number" || objtype == "boolean") {
            return o + "";
        } else if (o === null) {
            return "null";
        }
        var m = MochiKit.Base;
        var reprString = m.reprString;
        if (objtype == "string") {
            return reprString(o);
        }
        // recurse
        var me = arguments.callee;
        // short-circuit for objects that support "json" serialization
        // if they return "self" then just pass-through...
        var newObj;
        if (typeof(o.__json__) == "function") {
            newObj = o.__json__();
            if (o !== newObj) {
                return me(newObj);
            }
        }
        if (typeof(o.json) == "function") {
            newObj = o.json();
            if (o !== newObj) {
                return me(newObj);
            }
        }
        // array
        if (objtype != "function" && typeof(o.length) == "number") {
            var res = [];
            for (var i = 0; i < o.length; i++) {
                var val = me(o[i]);
                if (typeof(val) != "string") {
                    val = "undefined";
                }
                res.push(val);
            }
            return "[" + res.join(", ") + "]";
        }
        // look in the registry
        try {
            newObj = m.jsonRegistry.match(o);
            if (o !== newObj) {
                return me(newObj);
            }
        } catch (e) {
            if (e != m.NotFound) {
                // something really bad happened
                throw e;
            }
        }
        // undefined is outside of the spec
        if (objtype == "undefined") {
            throw new TypeError("undefined can not be serialized as JSON");
        }
        // it's a function with no adapter, bad
        if (objtype == "function") {
            return null;
        }
        // generic object code path
        res = [];
        for (var k in o) {
            var useKey;
            if (typeof(k) == "number") {
                useKey = '"' + k + '"';
            } else if (typeof(k) == "string") {
                useKey = reprString(k);
            } else {
                // skip non-string or number keys
                continue;
            }
            val = me(o[k]);
            if (typeof(val) != "string") {
                // skip non-serializable values
                continue;
            }
            res.push(useKey + ":" + val);
        }
        return "{" + res.join(", ") + "}";
    },


    /** @id MochiKit.Base.objEqual */
    objEqual: function (a, b) {
        return (MochiKit.Base.compare(a, b) === 0);
    },

    /** @id MochiKit.Base.arrayEqual */
    arrayEqual: function (self, arr) {
        if (self.length != arr.length) {
            return false;
        }
        return (MochiKit.Base.compare(self, arr) === 0);
    },

    /** @id MochiKit.Base.concat */
    concat: function (/* lst... */) {
        var rval = [];
        var extend = MochiKit.Base.extend;
        for (var i = 0; i < arguments.length; i++) {
            extend(rval, arguments[i]);
        }
        return rval;
    },

    /** @id MochiKit.Base.keyComparator */
    keyComparator: function (key/* ... */) {
        // fast-path for single key comparisons
        var m = MochiKit.Base;
        var compare = m.compare;
        if (arguments.length == 1) {
            return function (a, b) {
                return compare(a[key], b[key]);
            };
        }
        var compareKeys = m.extend(null, arguments);
        return function (a, b) {
            var rval = 0;
            // keep comparing until something is inequal or we run out of
            // keys to compare
            for (var i = 0; (rval === 0) && (i < compareKeys.length); i++) {
                var key = compareKeys[i];
                rval = compare(a[key], b[key]);
            }
            return rval;
        };
    },

    /** @id MochiKit.Base.reverseKeyComparator */
    reverseKeyComparator: function (key) {
        var comparator = MochiKit.Base.keyComparator.apply(this, arguments);
        return function (a, b) {
            return comparator(b, a);
        };
    },

    /** @id MochiKit.Base.partial */
    partial: function (func) {
        var m = MochiKit.Base;
        return m.bind.apply(this, m.extend([func, undefined], arguments, 1));
    },

    /** @id MochiKit.Base.listMinMax */
    listMinMax: function (which, lst) {
        if (lst.length === 0) {
            return null;
        }
        var cur = lst[0];
        var compare = MochiKit.Base.compare;
        for (var i = 1; i < lst.length; i++) {
            var o = lst[i];
            if (compare(o, cur) == which) {
                cur = o;
            }
        }
        return cur;
    },

    /** @id MochiKit.Base.objMax */
    objMax: function (/* obj... */) {
        return MochiKit.Base.listMinMax(1, arguments);
    },

    /** @id MochiKit.Base.objMin */
    objMin: function (/* obj... */) {
        return MochiKit.Base.listMinMax(-1, arguments);
    },

    /** @id MochiKit.Base.findIdentical */
    findIdentical: function (lst, value, start/* = 0 */, /* optional */end) {
        if (typeof(end) == "undefined" || end === null) {
            end = lst.length;
        }
        if (typeof(start) == "undefined" || start === null) {
            start = 0;
        }
        for (var i = start; i < end; i++) {
            if (lst[i] === value) {
                return i;
            }
        }
        return -1;
    },

    /** @id MochiKit.Base.mean */
    mean: function(/* lst... */) {
        /* http://www.nist.gov/dads/HTML/mean.html */
        var sum = 0;

        var m = MochiKit.Base;
        var args = m.extend(null, arguments);
        var count = args.length;

        while (args.length) {
            var o = args.shift();
            if (o && typeof(o) == "object" && typeof(o.length) == "number") {
                count += o.length - 1;
                for (var i = o.length - 1; i >= 0; i--) {
                    sum += o[i];
                }
            } else {
                sum += o;
            }
        }

        if (count <= 0) {
            throw new TypeError('mean() requires at least one argument');
        }

        return sum/count;
    },

    /** @id MochiKit.Base.median */
    median: function(/* lst... */) {
        /* http://www.nist.gov/dads/HTML/median.html */
        var data = MochiKit.Base.flattenArguments(arguments);
        if (data.length === 0) {
            throw new TypeError('median() requires at least one argument');
        }
        data.sort(compare);
        if (data.length % 2 == 0) {
            var upper = data.length / 2;
            return (data[upper] + data[upper - 1]) / 2;
        } else {
            return data[(data.length - 1) / 2];
        }
    },

    /** @id MochiKit.Base.findValue */
    findValue: function (lst, value, start/* = 0 */, /* optional */end) {
        if (typeof(end) == "undefined" || end === null) {
            end = lst.length;
        }
        if (typeof(start) == "undefined" || start === null) {
            start = 0;
        }
        var cmp = MochiKit.Base.compare;
        for (var i = start; i < end; i++) {
            if (cmp(lst[i], value) === 0) {
                return i;
            }
        }
        return -1;
    },

    /** @id MochiKit.Base.nodeWalk */
    nodeWalk: function (node, visitor) {
        var nodes = [node];
        var extend = MochiKit.Base.extend;
        while (nodes.length) {
            var res = visitor(nodes.shift());
            if (res) {
                extend(nodes, res);
            }
        }
    },


    /** @id MochiKit.Base.nameFunctions */
    nameFunctions: function (namespace) {
        var base = namespace.NAME;
        if (typeof(base) == 'undefined') {
            base = '';
        } else {
            base = base + '.';
        }
        for (var name in namespace) {
            var o = namespace[name];
            if (typeof(o) == 'function' && typeof(o.NAME) == 'undefined') {
                try {
                    o.NAME = base + name;
                } catch (e) {
                    // pass
                }
            }
        }
    },


    /** @id MochiKit.Base.queryString */
    queryString: function (names, values) {
        // check to see if names is a string or a DOM element, and if
        // MochiKit.DOM is available.  If so, drop it like it's a form
        // Ugliest conditional in MochiKit?  Probably!
        if (typeof(MochiKit.DOM) != "undefined" && arguments.length == 1
            && (typeof(names) == "string" || (
                typeof(names.nodeType) != "undefined" && names.nodeType > 0
            ))
        ) {
            var kv = MochiKit.DOM.formContents(names);
            names = kv[0];
            values = kv[1];
        } else if (arguments.length == 1) {
            // Allow the return value of formContents to be passed directly
            if (typeof(names.length) == "number" && names.length == 2) {
                return arguments.callee(names[0], names[1]);
            }
            var o = names;
            names = [];
            values = [];
            for (var k in o) {
                var v = o[k];
                if (typeof(v) == "function") {
                    continue;
                } else if (typeof(v) != "string" &&
                        typeof(v.length) == "number") {
                    for (var i = 0; i < v.length; i++) {
                        names.push(k);
                        values.push(v[i]);
                    }
                } else {
                    names.push(k);
                    values.push(v);
                }
            }
        }
        var rval = [];
        var len = Math.min(names.length, values.length);
        var urlEncode = MochiKit.Base.urlEncode;
        for (var i = 0; i < len; i++) {
            v = values[i];
            if (typeof(v) != 'undefined' && v !== null) {
                rval.push(urlEncode(names[i]) + "=" + urlEncode(v));
            }
        }
        return rval.join("&");
    },


    /** @id MochiKit.Base.parseQueryString */
    parseQueryString: function (encodedString, useArrays) {
        // strip a leading '?' from the encoded string
        var qstr = (encodedString.charAt(0) == "?")
            ? encodedString.substring(1)
            : encodedString;
        var pairs = qstr.replace(/\+/g, "%20").split(/(\&amp\;|\&\#38\;|\&#x26;|\&)/);
        var o = {};
        var decode;
        if (typeof(decodeURIComponent) != "undefined") {
            decode = decodeURIComponent;
        } else {
            decode = unescape;
        }
        if (useArrays) {
            for (var i = 0; i < pairs.length; i++) {
                var pair = pairs[i].split("=");
                var name = decode(pair.shift());
                if (!name) {
                    continue;
                }
                var arr = o[name];
                if (!(arr instanceof Array)) {
                    arr = [];
                    o[name] = arr;
                }
                arr.push(decode(pair.join("=")));
            }
        } else {
            for (i = 0; i < pairs.length; i++) {
                pair = pairs[i].split("=");
                var name = pair.shift();
                if (!name) {
                    continue;
                }
                o[decode(name)] = decode(pair.join("="));
            }
        }
        return o;
    }
});

/** @id MochiKit.Base.AdapterRegistry */
MochiKit.Base.AdapterRegistry = function () {
    this.pairs = [];
};

MochiKit.Base.AdapterRegistry.prototype = {
    /** @id MochiKit.Base.AdapterRegistry.prototype.register */
    register: function (name, check, wrap, /* optional */ override) {
        if (override) {
            this.pairs.unshift([name, check, wrap]);
        } else {
            this.pairs.push([name, check, wrap]);
        }
    },

    /** @id MochiKit.Base.AdapterRegistry.prototype.match */
    match: function (/* ... */) {
        for (var i = 0; i < this.pairs.length; i++) {
            var pair = this.pairs[i];
            if (pair[1].apply(this, arguments)) {
                return pair[2].apply(this, arguments);
            }
        }
        throw MochiKit.Base.NotFound;
    },

    /** @id MochiKit.Base.AdapterRegistry.prototype.unregister */
    unregister: function (name) {
        for (var i = 0; i < this.pairs.length; i++) {
            var pair = this.pairs[i];
            if (pair[0] == name) {
                this.pairs.splice(i, 1);
                return true;
            }
        }
        return false;
    }
};


MochiKit.Base.EXPORT = [
    "flattenArray",
    "noop",
    "camelize",
    "counter",
    "clone",
    "extend",
    "update",
    "updatetree",
    "setdefault",
    "keys",
    "values",
    "items",
    "NamedError",
    "operator",
    "forwardCall",
    "itemgetter",
    "typeMatcher",
    "isCallable",
    "isUndefined",
    "isUndefinedOrNull",
    "isNull",
    "isEmpty",
    "isNotEmpty",
    "isArrayLike",
    "isDateLike",
    "xmap",
    "map",
    "xfilter",
    "filter",
    "methodcaller",
    "compose",
    "bind",
    "bindMethods",
    "NotFound",
    "AdapterRegistry",
    "registerComparator",
    "compare",
    "registerRepr",
    "repr",
    "objEqual",
    "arrayEqual",
    "concat",
    "keyComparator",
    "reverseKeyComparator",
    "partial",
    "merge",
    "listMinMax",
    "listMax",
    "listMin",
    "objMax",
    "objMin",
    "nodeWalk",
    "zip",
    "urlEncode",
    "queryString",
    "serializeJSON",
    "registerJSON",
    "evalJSON",
    "parseQueryString",
    "findValue",
    "findIdentical",
    "flattenArguments",
    "method",
    "average",
    "mean",
    "median"
];

MochiKit.Base.EXPORT_OK = [
    "nameFunctions",
    "comparatorRegistry",
    "reprRegistry",
    "jsonRegistry",
    "compareDateLike",
    "compareArrayLike",
    "reprArrayLike",
    "reprString",
    "reprNumber"
];

MochiKit.Base._exportSymbols = function (globals, module) {
    if (!MochiKit.__export__) {
        return;
    }
    var all = module.EXPORT_TAGS[":all"];
    for (var i = 0; i < all.length; i++) {
        globals[all[i]] = module[all[i]];
    }
};

MochiKit.Base.__new__ = function () {
    // A singleton raised when no suitable adapter is found
    var m = this;

    // convenience
    /** @id MochiKit.Base.noop */
    m.noop = m.operator.identity;

    // Backwards compat
    m.forward = m.forwardCall;
    m.find = m.findValue;

    if (typeof(encodeURIComponent) != "undefined") {
        /** @id MochiKit.Base.urlEncode */
        m.urlEncode = function (unencoded) {
            return encodeURIComponent(unencoded).replace(/\'/g, '%27');
        };
    } else {
        m.urlEncode = function (unencoded) {
            return escape(unencoded
                ).replace(/\+/g, '%2B'
                ).replace(/\"/g,'%22'
                ).rval.replace(/\'/g, '%27');
        };
    }

    /** @id MochiKit.Base.NamedError */
    m.NamedError = function (name) {
        this.message = name;
        this.name = name;
    };
    m.NamedError.prototype = new Error();
    m.update(m.NamedError.prototype, {
        repr: function () {
            if (this.message && this.message != this.name) {
                return this.name + "(" + m.repr(this.message) + ")";
            } else {
                return this.name + "()";
            }
        },
        toString: m.forwardCall("repr")
    });

    /** @id MochiKit.Base.NotFound */
    m.NotFound = new m.NamedError("MochiKit.Base.NotFound");


    /** @id MochiKit.Base.listMax */
    m.listMax = m.partial(m.listMinMax, 1);
    /** @id MochiKit.Base.listMin */
    m.listMin = m.partial(m.listMinMax, -1);

    /** @id MochiKit.Base.isCallable */
    m.isCallable = m.typeMatcher('function');
    /** @id MochiKit.Base.isUndefined */
    m.isUndefined = m.typeMatcher('undefined');

    /** @id MochiKit.Base.merge */
    m.merge = m.partial(m.update, null);
    /** @id MochiKit.Base.zip */
    m.zip = m.partial(m.map, null);

    /** @id MochiKit.Base.average */
    m.average = m.mean;

    /** @id MochiKit.Base.comparatorRegistry */
    m.comparatorRegistry = new m.AdapterRegistry();
    m.registerComparator("dateLike", m.isDateLike, m.compareDateLike);
    m.registerComparator("arrayLike", m.isArrayLike, m.compareArrayLike);

    /** @id MochiKit.Base.reprRegistry */
    m.reprRegistry = new m.AdapterRegistry();
    m.registerRepr("arrayLike", m.isArrayLike, m.reprArrayLike);
    m.registerRepr("string", m.typeMatcher("string"), m.reprString);
    m.registerRepr("numbers", m.typeMatcher("number", "boolean"), m.reprNumber);

    /** @id MochiKit.Base.jsonRegistry */
    m.jsonRegistry = new m.AdapterRegistry();

    var all = m.concat(m.EXPORT, m.EXPORT_OK);
    m.EXPORT_TAGS = {
        ":common": m.concat(m.EXPORT_OK),
        ":all": all
    };

    m.nameFunctions(this);

};

MochiKit.Base.__new__();
MochiKit.Base._exportSymbols(this, MochiKit.Base);

if (typeof(MochiKit.Iter) == 'undefined') {
    MochiKit.Iter = {};
}

MochiKit.Iter.NAME = "MochiKit.Iter";
MochiKit.Iter.VERSION = "1.4";
MochiKit.Base.update(MochiKit.Iter, {
    __repr__: function () {
        return "[" + this.NAME + " " + this.VERSION + "]";
    },
    toString: function () {
        return this.__repr__();
    },

    /** @id MochiKit.Iter.registerIteratorFactory  */
    registerIteratorFactory: function (name, check, iterfactory, /* optional */ override) {
        MochiKit.Iter.iteratorRegistry.register(name, check, iterfactory, override);
    },

    /** @id MochiKit.Iter.iter */
    iter: function (iterable, /* optional */ sentinel) {
        var self = MochiKit.Iter;
        if (arguments.length == 2) {
            return self.takewhile(
                function (a) { return a != sentinel; },
                iterable
            );
        }
        if (typeof(iterable.next) == 'function') {
            return iterable;
        } else if (typeof(iterable.iter) == 'function') {
            return iterable.iter();
        /*
        }  else if (typeof(iterable.__iterator__) == 'function') {
            //
            // XXX: We can't support JavaScript 1.7 __iterator__ directly
            //      because of Object.prototype.__iterator__
            //
            return iterable.__iterator__();
        */
        }

        try {
            return self.iteratorRegistry.match(iterable);
        } catch (e) {
            var m = MochiKit.Base;
            if (e == m.NotFound) {
                e = new TypeError(typeof(iterable) + ": " + m.repr(iterable) + " is not iterable");
            }
            throw e;
        }
    },

    /** @id MochiKit.Iter.count */
    count: function (n) {
        if (!n) {
            n = 0;
        }
        var m = MochiKit.Base;
        return {
            repr: function () { return "count(" + n + ")"; },
            toString: m.forwardCall("repr"),
            next: m.counter(n)
        };
    },

    /** @id MochiKit.Iter.cycle */
    cycle: function (p) {
        var self = MochiKit.Iter;
        var m = MochiKit.Base;
        var lst = [];
        var iterator = self.iter(p);
        return {
            repr: function () { return "cycle(...)"; },
            toString: m.forwardCall("repr"),
            next: function () {
                try {
                    var rval = iterator.next();
                    lst.push(rval);
                    return rval;
                } catch (e) {
                    if (e != self.StopIteration) {
                        throw e;
                    }
                    if (lst.length === 0) {
                        this.next = function () {
                            throw self.StopIteration;
                        };
                    } else {
                        var i = -1;
                        this.next = function () {
                            i = (i + 1) % lst.length;
                            return lst[i];
                        };
                    }
                    return this.next();
                }
            }
        };
    },

    /** @id MochiKit.Iter.repeat */
    repeat: function (elem, /* optional */n) {
        var m = MochiKit.Base;
        if (typeof(n) == 'undefined') {
            return {
                repr: function () {
                    return "repeat(" + m.repr(elem) + ")";
                },
                toString: m.forwardCall("repr"),
                next: function () {
                    return elem;
                }
            };
        }
        return {
            repr: function () {
                return "repeat(" + m.repr(elem) + ", " + n + ")";
            },
            toString: m.forwardCall("repr"),
            next: function () {
                if (n <= 0) {
                    throw MochiKit.Iter.StopIteration;
                }
                n -= 1;
                return elem;
            }
        };
    },

    /** @id MochiKit.Iter.next */
    next: function (iterator) {
        return iterator.next();
    },

    /** @id MochiKit.Iter.izip */
    izip: function (p, q/*, ...*/) {
        var m = MochiKit.Base;
        var self = MochiKit.Iter;
        var next = self.next;
        var iterables = m.map(self.iter, arguments);
        return {
            repr: function () { return "izip(...)"; },
            toString: m.forwardCall("repr"),
            next: function () { return m.map(next, iterables); }
        };
    },

    /** @id MochiKit.Iter.ifilter */
    ifilter: function (pred, seq) {
        var m = MochiKit.Base;
        seq = MochiKit.Iter.iter(seq);
        if (pred === null) {
            pred = m.operator.truth;
        }
        return {
            repr: function () { return "ifilter(...)"; },
            toString: m.forwardCall("repr"),
            next: function () {
                while (true) {
                    var rval = seq.next();
                    if (pred(rval)) {
                        return rval;
                    }
                }
                // mozilla warnings aren't too bright
                return undefined;
            }
        };
    },

    /** @id MochiKit.Iter.ifilterfalse */
    ifilterfalse: function (pred, seq) {
        var m = MochiKit.Base;
        seq = MochiKit.Iter.iter(seq);
        if (pred === null) {
            pred = m.operator.truth;
        }
        return {
            repr: function () { return "ifilterfalse(...)"; },
            toString: m.forwardCall("repr"),
            next: function () {
                while (true) {
                    var rval = seq.next();
                    if (!pred(rval)) {
                        return rval;
                    }
                }
                // mozilla warnings aren't too bright
                return undefined;
            }
        };
    },

    /** @id MochiKit.Iter.islice */
    islice: function (seq/*, [start,] stop[, step] */) {
        var self = MochiKit.Iter;
        var m = MochiKit.Base;
        seq = self.iter(seq);
        var start = 0;
        var stop = 0;
        var step = 1;
        var i = -1;
        if (arguments.length == 2) {
            stop = arguments[1];
        } else if (arguments.length == 3) {
            start = arguments[1];
            stop = arguments[2];
        } else {
            start = arguments[1];
            stop = arguments[2];
            step = arguments[3];
        }
        return {
            repr: function () {
                return "islice(" + ["...", start, stop, step].join(", ") + ")";
            },
            toString: m.forwardCall("repr"),
            next: function () {
                var rval;
                while (i < start) {
                    rval = seq.next();
                    i++;
                }
                if (start >= stop) {
                    throw self.StopIteration;
                }
                start += step;
                return rval;
            }
        };
    },

    /** @id MochiKit.Iter.imap */
    imap: function (fun, p, q/*, ...*/) {
        var m = MochiKit.Base;
        var self = MochiKit.Iter;
        var iterables = m.map(self.iter, m.extend(null, arguments, 1));
        var map = m.map;
        var next = self.next;
        return {
            repr: function () { return "imap(...)"; },
            toString: m.forwardCall("repr"),
            next: function () {
                return fun.apply(this, map(next, iterables));
            }
        };
    },

    /** @id MochiKit.Iter.applymap */
    applymap: function (fun, seq, self) {
        seq = MochiKit.Iter.iter(seq);
        var m = MochiKit.Base;
        return {
            repr: function () { return "applymap(...)"; },
            toString: m.forwardCall("repr"),
            next: function () {
                return fun.apply(self, seq.next());
            }
        };
    },

    /** @id MochiKit.Iter.chain */
    chain: function (p, q/*, ...*/) {
        // dumb fast path
        var self = MochiKit.Iter;
        var m = MochiKit.Base;
        if (arguments.length == 1) {
            return self.iter(arguments[0]);
        }
        var argiter = m.map(self.iter, arguments);
        return {
            repr: function () { return "chain(...)"; },
            toString: m.forwardCall("repr"),
            next: function () {
                while (argiter.length > 1) {
                    try {
                        return argiter[0].next();
                    } catch (e) {
                        if (e != self.StopIteration) {
                            throw e;
                        }
                        argiter.shift();
                    }
                }
                if (argiter.length == 1) {
                    // optimize last element
                    var arg = argiter.shift();
                    this.next = m.bind("next", arg);
                    return this.next();
                }
                throw self.StopIteration;
            }
        };
    },

    /** @id MochiKit.Iter.takewhile */
    takewhile: function (pred, seq) {
        var self = MochiKit.Iter;
        seq = self.iter(seq);
        return {
            repr: function () { return "takewhile(...)"; },
            toString: MochiKit.Base.forwardCall("repr"),
            next: function () {
                var rval = seq.next();
                if (!pred(rval)) {
                    this.next = function () {
                        throw self.StopIteration;
                    };
                    this.next();
                }
                return rval;
            }
        };
    },

    /** @id MochiKit.Iter.dropwhile */
    dropwhile: function (pred, seq) {
        seq = MochiKit.Iter.iter(seq);
        var m = MochiKit.Base;
        var bind = m.bind;
        return {
            "repr": function () { return "dropwhile(...)"; },
            "toString": m.forwardCall("repr"),
            "next": function () {
                while (true) {
                    var rval = seq.next();
                    if (!pred(rval)) {
                        break;
                    }
                }
                this.next = bind("next", seq);
                return rval;
            }
        };
    },

    _tee: function (ident, sync, iterable) {
        sync.pos[ident] = -1;
        var m = MochiKit.Base;
        var listMin = m.listMin;
        return {
            repr: function () { return "tee(" + ident + ", ...)"; },
            toString: m.forwardCall("repr"),
            next: function () {
                var rval;
                var i = sync.pos[ident];

                if (i == sync.max) {
                    rval = iterable.next();
                    sync.deque.push(rval);
                    sync.max += 1;
                    sync.pos[ident] += 1;
                } else {
                    rval = sync.deque[i - sync.min];
                    sync.pos[ident] += 1;
                    if (i == sync.min && listMin(sync.pos) != sync.min) {
                        sync.min += 1;
                        sync.deque.shift();
                    }
                }
                return rval;
            }
        };
    },

    /** @id MochiKit.Iter.tee */
    tee: function (iterable, n/* = 2 */) {
        var rval = [];
        var sync = {
            "pos": [],
            "deque": [],
            "max": -1,
            "min": -1
        };
        if (arguments.length == 1 || typeof(n) == "undefined" || n === null) {
            n = 2;
        }
        var self = MochiKit.Iter;
        iterable = self.iter(iterable);
        var _tee = self._tee;
        for (var i = 0; i < n; i++) {
            rval.push(_tee(i, sync, iterable));
        }
        return rval;
    },

    /** @id MochiKit.Iter.list */
    list: function (iterable) {
        // Fast-path for Array and Array-like
        var rval;
        if (iterable instanceof Array) {
            return iterable.slice();
        } 
        // this is necessary to avoid a Safari crash
        if (typeof(iterable) == "function" &&
                !(iterable instanceof Function) &&
                typeof(iterable.length) == 'number') {
            rval = [];
            for (var i = 0; i < iterable.length; i++) {
                rval.push(iterable[i]);
            }
            return rval;
        }

        var self = MochiKit.Iter;
        iterable = self.iter(iterable);
        var rval = [];
        try {
            while (true) {
                rval.push(iterable.next());
            }
        } catch (e) {
            if (e != self.StopIteration) {
                throw e;
            }
            return rval;
        }
        // mozilla warnings aren't too bright
        return undefined;
    },


    /** @id MochiKit.Iter.reduce */
    reduce: function (fn, iterable, /* optional */initial) {
        var i = 0;
        var x = initial;
        var self = MochiKit.Iter;
        iterable = self.iter(iterable);
        if (arguments.length < 3) {
            try {
                x = iterable.next();
            } catch (e) {
                if (e == self.StopIteration) {
                    e = new TypeError("reduce() of empty sequence with no initial value");
                }
                throw e;
            }
            i++;
        }
        try {
            while (true) {
                x = fn(x, iterable.next());
            }
        } catch (e) {
            if (e != self.StopIteration) {
                throw e;
            }
        }
        return x;
    },

    /** @id MochiKit.Iter.range */
    range: function (/* [start,] stop[, step] */) {
        var start = 0;
        var stop = 0;
        var step = 1;
        if (arguments.length == 1) {
            stop = arguments[0];
        } else if (arguments.length == 2) {
            start = arguments[0];
            stop = arguments[1];
        } else if (arguments.length == 3) {
            start = arguments[0];
            stop = arguments[1];
            step = arguments[2];
        } else {
            throw new TypeError("range() takes 1, 2, or 3 arguments!");
        }
        if (step === 0) {
            throw new TypeError("range() step must not be 0");
        }
        return {
            next: function () {
                if ((step > 0 && start >= stop) || (step < 0 && start <= stop)) {
                    throw MochiKit.Iter.StopIteration;
                }
                var rval = start;
                start += step;
                return rval;
            },
            repr: function () {
                return "range(" + [start, stop, step].join(", ") + ")";
            },
            toString: MochiKit.Base.forwardCall("repr")
        };
    },

    /** @id MochiKit.Iter.sum */
    sum: function (iterable, start/* = 0 */) {
        if (typeof(start) == "undefined" || start === null) {
            start = 0;
        }
        var x = start;
        var self = MochiKit.Iter;
        iterable = self.iter(iterable);
        try {
            while (true) {
                x += iterable.next();
            }
        } catch (e) {
            if (e != self.StopIteration) {
                throw e;
            }
        }
        return x;
    },

    /** @id MochiKit.Iter.exhaust */
    exhaust: function (iterable) {
        var self = MochiKit.Iter;
        iterable = self.iter(iterable);
        try {
            while (true) {
                iterable.next();
            }
        } catch (e) {
            if (e != self.StopIteration) {
                throw e;
            }
        }
    },

    /** @id MochiKit.Iter.forEach */
    forEach: function (iterable, func, /* optional */self) {
        var m = MochiKit.Base;
        if (arguments.length > 2) {
            func = m.bind(func, self);
        }
        // fast path for array
        if (m.isArrayLike(iterable)) {
            try {
                for (var i = 0; i < iterable.length; i++) {
                    func(iterable[i]);
                }
            } catch (e) {
                if (e != MochiKit.Iter.StopIteration) {
                    throw e;
                }
            }
        } else {
            self = MochiKit.Iter;
            self.exhaust(self.imap(func, iterable));
        }
    },

    /** @id MochiKit.Iter.every */
    every: function (iterable, func) {
        var self = MochiKit.Iter;
        try {
            self.ifilterfalse(func, iterable).next();
            return false;
        } catch (e) {
            if (e != self.StopIteration) {
                throw e;
            }
            return true;
        }
    },

    /** @id MochiKit.Iter.sorted */
    sorted: function (iterable, /* optional */cmp) {
        var rval = MochiKit.Iter.list(iterable);
        if (arguments.length == 1) {
            cmp = MochiKit.Base.compare;
        }
        rval.sort(cmp);
        return rval;
    },

    /** @id MochiKit.Iter.reversed */
    reversed: function (iterable) {
        var rval = MochiKit.Iter.list(iterable);
        rval.reverse();
        return rval;
    },

    /** @id MochiKit.Iter.some */
    some: function (iterable, func) {
        var self = MochiKit.Iter;
        try {
            self.ifilter(func, iterable).next();
            return true;
        } catch (e) {
            if (e != self.StopIteration) {
                throw e;
            }
            return false;
        }
    },

    /** @id MochiKit.Iter.iextend */
    iextend: function (lst, iterable) {
        if (MochiKit.Base.isArrayLike(iterable)) {
            // fast-path for array-like
            for (var i = 0; i < iterable.length; i++) {
                lst.push(iterable[i]);
            }
        } else {
            var self = MochiKit.Iter;
            iterable = self.iter(iterable);
            try {
                while (true) {
                    lst.push(iterable.next());
                }
            } catch (e) {
                if (e != self.StopIteration) {
                    throw e;
                }
            }
        }
        return lst;
    },

    /** @id MochiKit.Iter.groupby */
    groupby: function(iterable, /* optional */ keyfunc) {
        var m = MochiKit.Base;
        var self = MochiKit.Iter;
        if (arguments.length < 2) {
            keyfunc = m.operator.identity;
        }
        iterable = self.iter(iterable);

        // shared
        var pk = undefined;
        var k = undefined;
        var v;

        function fetch() {
            v = iterable.next();
            k = keyfunc(v);
        };

        function eat() {
            var ret = v;
            v = undefined;
            return ret;
        };

        var first = true;
        var compare = m.compare;
        return {
            repr: function () { return "groupby(...)"; },
            next: function() {
                // iterator-next

                // iterate until meet next group
                while (compare(k, pk) === 0) {
                    fetch();
                    if (first) {
                        first = false;
                        break;
                    }
                }
                pk = k;
                return [k, {
                    next: function() {
                        // subiterator-next
                        if (v == undefined) { // Is there something to eat?
                            fetch();
                        }
                        if (compare(k, pk) !== 0) {
                            throw self.StopIteration;
                        }
                        return eat();
                    }
                }];
            }
        };
    },

    /** @id MochiKit.Iter.groupby_as_array */
    groupby_as_array: function (iterable, /* optional */ keyfunc) {
        var m = MochiKit.Base;
        var self = MochiKit.Iter;
        if (arguments.length < 2) {
            keyfunc = m.operator.identity;
        }

        iterable = self.iter(iterable);
        var result = [];
        var first = true;
        var prev_key;
        var compare = m.compare;
        while (true) {
            try {
                var value = iterable.next();
                var key = keyfunc(value);
            } catch (e) {
                if (e == self.StopIteration) {
                    break;
                }
                throw e;
            }
            if (first || compare(key, prev_key) !== 0) {
                var values = [];
                result.push([key, values]);
            }
            values.push(value);
            first = false;
            prev_key = key;
        }
        return result;
    },

    /** @id MochiKit.Iter.arrayLikeIter */
    arrayLikeIter: function (iterable) {
        var i = 0;
        return {
            repr: function () { return "arrayLikeIter(...)"; },
            toString: MochiKit.Base.forwardCall("repr"),
            next: function () {
                if (i >= iterable.length) {
                    throw MochiKit.Iter.StopIteration;
                }
                return iterable[i++];
            }
        };
    },

    /** @id MochiKit.Iter.hasIterateNext */
    hasIterateNext: function (iterable) {
        return (iterable && typeof(iterable.iterateNext) == "function");
    },

    /** @id MochiKit.Iter.iterateNextIter */
    iterateNextIter: function (iterable) {
        return {
            repr: function () { return "iterateNextIter(...)"; },
            toString: MochiKit.Base.forwardCall("repr"),
            next: function () {
                var rval = iterable.iterateNext();
                if (rval === null || rval === undefined) {
                    throw MochiKit.Iter.StopIteration;
                }
                return rval;
            }
        };
    }
});


MochiKit.Iter.EXPORT_OK = [
    "iteratorRegistry",
    "arrayLikeIter",
    "hasIterateNext",
    "iterateNextIter",
];

MochiKit.Iter.EXPORT = [
    "StopIteration",
    "registerIteratorFactory",
    "iter",
    "count",
    "cycle",
    "repeat",
    "next",
    "izip",
    "ifilter",
    "ifilterfalse",
    "islice",
    "imap",
    "applymap",
    "chain",
    "takewhile",
    "dropwhile",
    "tee",
    "list",
    "reduce",
    "range",
    "sum",
    "exhaust",
    "forEach",
    "every",
    "sorted",
    "reversed",
    "some",
    "iextend",
    "groupby",
    "groupby_as_array"
];

MochiKit.Iter.__new__ = function () {
    var m = MochiKit.Base;
    // Re-use StopIteration if exists (e.g. SpiderMonkey)
    if (typeof(StopIteration) != "undefined") {
        this.StopIteration = StopIteration;
    } else {
        /** @id MochiKit.Iter.StopIteration */
        this.StopIteration = new m.NamedError("StopIteration");
    }
    this.iteratorRegistry = new m.AdapterRegistry();
    // Register the iterator factory for arrays
    this.registerIteratorFactory(
        "arrayLike",
        m.isArrayLike,
        this.arrayLikeIter
    );

    this.registerIteratorFactory(
        "iterateNext",
        this.hasIterateNext,
        this.iterateNextIter
    );

    this.EXPORT_TAGS = {
        ":common": this.EXPORT,
        ":all": m.concat(this.EXPORT, this.EXPORT_OK)
    };

    m.nameFunctions(this);

};

MochiKit.Iter.__new__();
MochiKit.Base._exportSymbols(this, MochiKit.Iter);

/**
 * This file contains a simple synchronization method for JSON objects
 * based on the file synchronization algorithm presented by Norman
 * Ramsey and Elod Csirmaz in
 *
 *   An Algebraic Approach to File Synchronization
 *   <http://www.eecs.harvard.edu/~nr/pubs/sync-abstract.html>
 *
 *   Abstract: "We present a sound and complete proof system for
 *   reasoning about operations on filesystems. The proof system
 *   enables us to specify a file-synchronization algorithm that can
 *   be combined with several different conflict-resolution
 *   policies. By contrast, previous work builds the
 *   conflict-resolution policy into the specification, or worse, does
 *   not specify the behavior formally. We present several
 *   alternatives for conflict resolution, and we address the knotty
 *   question of timestamps."
 *
 * We map this algorithm to JSON records by giving object and array
 * values the same treatment that Ramsey and Csirmaz give file system
 * directories. For the definition of JSON, see RFC 4627.
 *
 *   <http://www.ietf.org/rfc/rfc4627.txt>
 **/

/**
 * This algorithm requires that we keep a snapshot around, such as the
 * last response from a server.
 **/
var snapshotJSON =
{
  "x": 42,
  "a": 1,
  "b":
  {
    "c": 2,
    "d":
    {
      "e": 3,
      "f": 4
    },
    "g": 5
  },
  "h": 6.6,
  "i": [7, 8, 9],
  "j": 10,
  "k": { "m": 11 },
  "n": 66
}

/**
 * After local updates have occured, the JSON object will have
 * changed. Our algorithm determines a sequence of updates to the
 * snapshot that result in an object approximating the current
 * state. We can perform this detection without logging each change by
 * ignoring sequences deemed to be insignificant. For example, the
 * field "x" with value 42 could be deleted and subsequently added
 * with a value of 43. Our algorithm will not track these changes.
 * The key is present in both JSON objects, so the change will be
 * represented as an edit.
 **/
var currentJSON =
{
  "x": 43,             /* edited */ 
  "a": 1,
  "new": 11,           /* created */
  "b":
  {
    "c": 2,
    "new2": 22,        /* created */
    "d":
    {
      "e": 3
      /*"f": 4*/       /* removed */
    },
    "g": 55           /* edited  */
  },
  /* "h": 6.6, */      /* removed */   
  "i": [7, 8, 9, 99],  /* added array element */
  "j": 10,
  "k": 42,             /* replaced object with primitive */
  "n": { "new3": 77 } /* replaced primitive with object */
}

/**
 * function detectUpdates(snapshot, current)
 *
 * @param  snapshot
 *         An old version of the object.
 *
 * @param  current
 *         The current version of the object.
 *
 * @return An array of change operations.
 *
 * Ramsey and Csirmaz characterize all changes to the tree in terms of
 * three operations:
 *
 *   1.) create
 *   2.) remove
 *   3.) edit
 *  
 * We need to determine which changes have occured, and sequence them
 * such that the object is never in an incoherent state.
 *
 *   { "foo": 1, "bar": { "baz": 42 }}
 *
 * For example, we must avoid a sequence that calls for a deletion of
 * "bar" followed by an edit to "baz".
 *
 * A path syntax is useful to express the locations of changes, and
 * maps relatively cleanly to URIs. We express keys as path segments,
 * with arrays implying numeric path segments for their members. Keys
 * with objects or arrays as values have a "/" path separator
 * appended. Given an object
 *
 *   {
 *     "foo": 1,
 *     "bar":
 *      {
 *        "baz": 42,
 *        "qux": [43, 44, 45, 46]
 *      }
 *   }
 *
 * the following paths map to these values
 * 
 *   /foo       => 1
 *   /bar/baz   => 42
 *   /bar/qux/2 => 45
 *
 * In the JSON sync algorithm, Ramsey and Csirmaz's directories
 * correspond to objects and arrays, while their files correspond to
 * primitive JSON values such as strings and integers.
 *
 * The function isObjectOrArray() is used to distinguish between the
 * two cases.
 */
function isObjectOrArray(x) {
  return !isNull(x) && typeof(x) == "object";
}

/**
 * As an object pair is scanned, we can safely ignore keys that are
 * present in both objects that also share identical primitive
 * values. The function identifySuspects() returns a list of keys that
 * warrant further inspection.
 **/
function identifySuspects(snapshot, current) {
  /**
   * First, the union of both objects' keys must be calculated. This
   * code is suboptimal if both arguments are arrays, since we could
   * simply run keys() on the longer of the two in that case.
   **/
  var keySet = {}
  forEach(extend(keys(snapshot), keys(current)),
	  function(key) { keySet[key] = true }); 
  /**
   * Using the keys present in one or both objects, filter out those
   * that are present with identical primitive values.
   **/
  return filter(function(key) { 
                  return (isObjectOrArray(snapshot[key]) ||
	                  isObjectOrArray(current[key]) ||
	                  snapshot[key] !== current[key]);
                }, keys(keySet));
}

/**
 * We use Command objects to represent operations performed
 * on each replica.
 **/
function Command(action, path, value) {
  this.action = action;
  this.path = path;
  this.value = value;
}
Command.prototype = {
  equals: function(other) {
    return (other && other.action == this.action && 
            arrayEqual(this.path, other.path) &&
            (isObjectOrArray(other.value) && isObjectOrArray(this.value) ?
             other.value.constructor == this.value.constructor :
             other.value === this.value));
  },
  /**
   * Check whether the other command's path starts with our path.
   **/
  isParentOf: function(other) {
    return other.path.length > this.path.length &&
           arrayEqual(other.path.slice(0, this.path.length), this.path);
  }
}

/**
 * Objects need to be created in preorder (before their child nodes),
 * to avoid a disconnected tree.
 **/
function created(path, value) {
  if (isObjectOrArray(value)) {
    /* object created. Prepend the creation record to its children */
    return extend([new Command("create", path, value.constructor())],
                  _detectUpdates(path, {}, value));
  }

  /* primitive created */
  return [new Command("create", path, value)];
}

/**
 * Objects need to be removed in postorder (after their child nodes),
 * to avoid a disconnected graph. This is the same way "rm -rf" works.
 **/
function removed(path, value) {
  if (isObjectOrArray(value)) {
    /* Object removed. Append the removal record to its children. */
    return extend(_detectUpdates(path, value, {}),
                  [new Command("remove", path)]);
  }
  
  /* primitive removed */
  return [new Command("remove", path)];
}

/**
 * Some edit operations are more complicated than they first
 * appear. In particular, we want to recurse into object values where
 * the key was previously a primitive. This approach provides us with
 * a detailed creation log, and allows us to reconcile more JSON
 * graphs, because it provides a detailed log of the created children
 * of the new object.
 **/
function edited(path, old, update) {
  if (isObjectOrArray(old) && !isObjectOrArray(update)) {
    /* object replaced by primitive */
    return extend([new Command("edit", path, update)],
                  _detectUpdates(path, old, {}));
  } else if (!isObjectOrArray(old) && isObjectOrArray(update)) {
    /* primitive replaced by object */
    return extend([new Command("edit", path, update.constructor())],
                  _detectUpdates(path, {}, update));
  }
  
  /* primitive edit */
  return [new Command("edit", path, update)];   
}


function _detectUpdates(stack, snapshot, current) {
  /* check for edits and recurse into objects and arrays */
  return flattenArray(map(
    function (key) {
      var old = snapshot[key];
      var update = current[key];
      var path = concat(stack, [key]);

      /* create */
      if (typeof(old) == "undefined")
        return created(path, update);

      /* remove */
      if (typeof(update) == "undefined")
        return removed(path, old);

      /* edit */
      if (!isObjectOrArray(old) || !isObjectOrArray(update))
        return edited(path, old, update);

      /* recurse into object/array values at the same path */
      /** 
       * We need to detect container type changes. This type of edit
       * changes the algebra described by Ramsey and Csirmaz a bit,
       * because it imposes additional ordering constraints on the
       * update sequence, which complicates the algorithm, but it
       * seems worth it to avoid profiling JSON.
       *
       * When an object's type changes at a path I, we want to reverse
       * the normal order of operations that Ramsey and Csirmaz give,
       * because we assume that a deletion of all of the array's
       * elements preceded the change from array to object. This
       * assumption does prevent key preservation across non-idiomatic
       * transformations between Object and Array types.
       *
       *  remove(I/I')
       *  removeObj(I, Array(m))
       *  createObj(I, Object(m))
       *  create(I/I')
       *
       * In otherwords, when an Array at path I is changed to an
       * Object, that implies a recursive deletion of all its
       * children, a removal of an Array at path I, a creation of an
       * Object at path I, and recursive creation of the Object's
       * members. This means we have to interleave creates and
       * removes, unlike Ramsey and Csirmaz.
       * 
       **/

      ///XXX change this to recurse and return
      var changeSequence = [];
      if (old.constructor != update.constructor) {
        changeSequence.push(new Command("edit", path, update.constructor()));
      }

      /**
       * Now we recurse into objects and arrays, and append
       * the current key to our path stack.
       **/
      return extend(changeSequence,
                    _detectUpdates(path, old, update));
                    
    }, identifySuspects(snapshot, current)));
}
var detectUpdates = partial(_detectUpdates, []);

/**
 * function orderUpdates(updates)
 *
 * @param  updates
 *         An array of produced by detectUpdates.
 *
 * @return An array of change operations in the canonical order.
 *
 * Once we have our updates, we'll need to order the records in the
 * canonical sequence described by Ramsey and Csirmaz for path I:
 *
 * (a) Commands of the form edit (I, Dir(m)), in any order determined
 *     by I.
 * (b) Commands of the form create (I, X), in preorder. 
 * (c) Commands of the form remove (I), in postorder. 
 * (d) Commands of the form edit (I, File(m, x)), in any order
 *     determined by I.
 *
 **/
function orderUpdates(updates) {
  var dirEdits = [];
  var creates = [];
  var removes = [];
  var edits = [];
  
  /** 
   *  _detectUpdates orders creates and removes canonically, so we
   *  just need to weed out the edits.
   **/
  forEach(updates, function(update) {
    if (update.action == "edit")
      isObjectOrArray(value) ? dirEdits.push(update) : edits.push(update);
    else if (update.action == "create")
      creates.push(update);
    else if (update.action == "remove")
      removes.push(update);
  });
  
  return chain(dirEdits, creates, removes, edits);
}


/**
 * 
 *
 * Excerpt from Ramsey and Csirmaz:
 *
 *    The reconciler takes the sequences S1 , ... , Sn that are
 *    computed to have been performed at each replica. It com- putes
 *    sequences S a? 1 , ... , S a? n that make the filesystems as close
 *    as possible. The idea of the algorithm is that a command C a??
 *    Si should be propagated to replica j (included a? in Sj ) iff
 *    three criteria are met:
 *
 *      * C a?? Sj , i.e., C has not already been performed at
 *        replica j
 *
 *      * no commands at replicas other than i conflict with C
 *
 *      * no commands at replicas other than i conflict with commands
 *        that must precede C
 *
 *    A command C must precede command C iff they appear in the same
 *    sequence Si , C precedes C in Si , and they do not commute (C ;
 *    C C; C ).
 *
 **/

/**
 * function commandInList(command, commands)
 *
 * Check whether a command appears in a list of commands, so we can
 * tell if a command has already been performed at a replica.
 *
 **/
registerComparator("CommandComparator", 
  function areCommands(a, b) {
    return (a instanceof Command && b instanceof Command)
  },
  function compareCommands(a, b) { return a.equals(b) ? 0 : -1; }
);

function commandInList(command, commands) {
  return (findValue(commands, command) != -1);
}

/**
 * Now we find commands with paths that are of interest, make sure
 * it's not the same command, and then check to see if it's a break.
 * 
 * function conflictsFromReplicas(command, commandListsFromOtherReplicas)
 *
 * @param  command 
 *         A Command object.
 *
 * @param  commandListsFromOtherReplicas
 *         A list of command lists from other replicas ([[],[],[]])
 *
 * @return A list of objects conforming to the interface:
 *         {
 *           command: Command
 *           conflicts: [Command, Command, Command...]
 *           commandList: [Command, Command, Command...]
 *         }
 *  
 **/
 
/**
 * Check whether an edit or create operation has been attempted under
 * a remove.
 **/ 
function isBreak(a, b) {
  return a.isParentOf(b) && 
         ((!isObjectOrArray(a.value) || a.action == "remove") &&
          b.action != "remove");
}
 
/**
 * Check whether the commands would result in a broken graph,
 * or whether they are attempting to insert the different values
 * at the same path.
 **/
function doesConflict(command, other) {
  var broken = isBreak(command, other) || isBreak(other, command); 
  return broken || (arrayEqual(command["path"], other.path)
                    && !command.equals(other));
}

function conflictsFromReplica(command, commandList) {
    return {
      "command": command,
      "conflicts": filter(partial(doesConflict, command), commandList),
      "commandList": commandList
    };
}

function conflictsFromReplicas(command, commandListsFromOtherReplicas) {
  return map(partial(conflictsFromReplica, command),
             commandListsFromOtherReplicas);
}

/**
 * If a command doesn't conflict, we still might have to put it in the 
 * conflict list if an earlier command did conflict, and that command
 * is a precondition for the current command.
 **/
function mustPrecede(command, earlierCommand) {  
  if (earlierCommand.action == "edit")
    return false;

  return earlierCommand.isParentOf(command);
}

function precedingCommandsConflict(command, conflictList) {
  if (isEmpty(conflictList))
    return false;
  if (some(conflictList, partial(mustPrecede, command))) {
    return true;
  }
  return false;
}

function reconcile(commandLists) {
  var propagations = [];
  var conflicts = [];

  forEach(commandLists, function() {
    propagations.push([]);
    conflicts.push([]);
  });

  for (var i = 0; i < commandLists.length; ++i) {
    for (var j = 0; j < commandLists.length; ++j) {
      if (i != j) {
        forEach(commandLists[i],
          function (command) {
            if (!commandInList(command, commandLists[j])) {
              var others = chain(commandLists.slice(0, i), 
                                 commandLists.slice(i + 1));
              var conflict = conflictsFromReplicas(command, others);
              if (every(conflict, function(c) { return c.conflicts.length == 0 })) {
                if (precedingCommandsConflict(command, conflicts[j])) {
                  conflicts[j].push(command);
                } else {
                  propagations[j].push(command);
                }
              } else {
                conflicts[j].push(command);
              }
            }
          }
        );
      }
    }
  }
  return {"propagations":propagations, "conflicts":conflicts};
}

/**
 * Map a path array to an object reference, such that [foo, bar, baz]
 * becomes a reference to the value at obj[foo][bar][baz].
 **/
function pathToReference(obj, path) {
  return reduce(function (reference, segment) {
                  return reference ? reference[segment] : reference;
                }, 
                path, obj);
}

/**
 * Apply a single command to an object.
 **/
function applyCommand(target, command) {  
  var container =
    pathToReference(target, command.path.slice(0, command.path.length - 1));

  // XXX for some reason we sometimes get here without a container....
  if(!container) {
	return;
  }

  if (command.action == "remove") {
      delete container[command.path[command.path.length - 1]];
  }
  
  container[command.path[command.path.length - 1]] = command.value;
}

/**
 * Apply a list of commands to an object.
 **/
function applyCommands(target, commands) {
  forEach(commands, partial(applyCommand, target));
}
