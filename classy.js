/**
 * Classy - classy classes for JavaScript
 *
 * :copyright: (c) 2011 by Armin Ronacher. 
 * :license: BSD.
 */
!function (definition) {
  if (typeof module != 'undefined' && module.exports) module.exports = definition()
  else if (typeof define == 'function' && typeof define.amd == 'object') define(definition)
  else this.Class = definition()
}(function (undefined) {
  var
    CLASSY_VERSION = '1.4',
    context = this,
    old = context.Class,
    disable_constructor = false;

  /* we check if $super is in use by a class if we can.  But first we have to
     check if the JavaScript interpreter supports that.  This also matches
     to false positives later, but that does not do any harm besides slightly
     slowing calls down. */
  var probe_super = (function(){$super();}).toString().indexOf('$super') > 0;
  function usesSuper(obj) {
    return !probe_super || /\B\$super\b/.test(obj.toString());
  }

  /* helper function to set the attribute of something to a value or
     removes it if the value is undefined. */
  function setOrUnset(obj, key, value) {
    if (value === undefined)
      delete obj[key];
    else
      obj[key] = value;
  }

  /* gets the own property of an object */
  function getOwnProperty(obj, name) {
    return Object.prototype.hasOwnProperty.call(obj, name)
      ? obj[name] : undefined;
  }

  /* instanciate a class without calling the constructor */
  function cheapNew(cls) {
    disable_constructor = true;
    var rv = new cls;
    disable_constructor = false;
    return rv;
  }

  /* the base class we export */
  var Class = function() {};

  /* restore the global Class name and pass it to a function.  This allows
     different versions of the classy library to be used side by side and
     in combination with other libraries. */
  Class.$noConflict = function() {
    try {
      setOrUnset(context, 'Class', old);
    }
    catch (e) {
      // fix for IE that does not support delete on window
      context.Class = old;
    }
    return Class;
  };

  /* what version of classy are we using? */
  Class.$classyVersion = CLASSY_VERSION;

  /* adds new methods to a class object */
  Class.$append = function(properties){
    Class.$include(this.constructor.prototype, this.$super_prototype, properties);
  };
  
  /* helper metod to copy functions inside properties object to class prototype */
  Class.$include = function(prototype, super_prototype, properties) {
    /* copy all properties over to the new prototype */
    for (var name in properties) {
      var value = getOwnProperty(properties, name);
      if (name === '__include__' ||
          value === undefined)
        continue;

      prototype[name] = typeof value === 'function' && usesSuper(value) ?
        (function(meth, name) {
          return function() {
            var old_super = getOwnProperty(this, '$super');
            this.$super = super_prototype[name];
            try {
              return meth.apply(this, arguments);
            }
            finally {
              setOrUnset(this, '$super', old_super);
            }
          };
        })(value, name) : value
    }
  };
  
  /* Allows forward declarations of classes.
  @param {string} fullClassName String with the class full name. Make sure to provide always the same string for on class.
  @param {Class} baseClass The base class object that will be used to create the new class if required.
  @param {object} properties An object with properties to be defined as expected by method $extend.
  @return {Class} Returns a new Class object or the existing one if it was defined before.
  */
  Class.$define = (function(){  
    var $registeredClasses = {};

    function existsClass(classname) {
      return $registeredClasses[classname] !== undefined;
    }
    function getClass(classname) {
      return $registeredClasses[classname];
    }
    function registerClass(classname, classObj) {
      $registeredClasses[classname] = classObj;
    }

    return function(fullClassName, baseClass, properties){  
      if(baseClass !== undefined && typeof baseClass === "object" && properties === undefined)
      {
        properties = baseClass;
        baseClass = undefined;
      }
      
      if(properties === undefined || properties == null) properties = {};
      
      if(existsClass(fullClassName))
      {
        var classObj = getClass(fullClassName);
        if(properties !== undefined && properties !== null)
        {    
        classObj.$append(properties);
        }
        return classObj;
      }
      if(baseClass === undefined)
      {
        baseClass = Class;
      }
      
      registerClass(fullClassName, baseClass.$extend(properties));
      return getClass(fullClassName);
    };
  })();
    
  /* extend functionality */
  Class.$extend = function(properties) {
    var super_prototype = this.prototype;

    /* disable constructors and instanciate prototype.  Because the
       prototype can't raise an exception when created, we are safe
       without a try/finally here. */
    var prototype = cheapNew(this);

    /* copy all properties of the includes over if there are any */
    if (properties.__include__)
      for (var i = 0, n = properties.__include__.length; i != n; ++i) {
        var mixin = properties.__include__[i];
        for (var name in mixin) {
          var value = getOwnProperty(mixin, name);
          if (value !== undefined)
            prototype[name] = mixin[name];
        }
      }
 
    /* copy class vars from the superclass */
    properties.__classvars__ = properties.__classvars__ || {};
    if (prototype.__classvars__)
      for (var key in prototype.__classvars__)
        if (!properties.__classvars__[key]) {
          var value = getOwnProperty(prototype.__classvars__, key);
          properties.__classvars__[key] = value;
        }

    /* copy all properties over to the new prototype */
    Class.$include(prototype, super_prototype, properties);

    /* dummy constructor */
    var rv = function() {
      if (disable_constructor)
        return;
      var proper_this = context === this ? cheapNew(arguments.callee) : this;
      if (proper_this.__init__)
        proper_this.__init__.apply(proper_this, arguments);
      proper_this.$class = rv;
      return proper_this;
    }

    /* copy all class vars over of any */
    for (var key in properties.__classvars__) {
      var value = getOwnProperty(properties.__classvars__, key);
      if (value !== undefined)
        rv[key] = value;
    }

    /* copy prototype and constructor over, reattach $extend and
       return the class */
    rv.prototype = prototype;
    rv.constructor = rv;
    rv.$append = Class.$append;
    rv.$super_prototype = super_prototype;
    rv.$extend = Class.$extend;
    rv.$withData = Class.$withData;
    return rv;
  };

  /* instanciate with data functionality */
  Class.$withData = function(data) {
    var rv = cheapNew(this);
    for (var key in data) {
      var value = getOwnProperty(data, key);
      if (value !== undefined)
        rv[key] = value;
    }
    return rv;
  };

  /* export the class */
  return Class;
});