'use strict';

var Type = {};

Type.EMPTY = 0;
Type.WHITE = -1;
Type.BLACK = 1;
Type.WALL = 2;

var Point = function(x, y) {
  var x_ = x ? x : 0;
  var y_ = y ? y : 0;
  return {
    dx : x, //デバッグ用
    dy : y, //デバッグ用
    get x() {return x_;},
    get y() {return y_;},
    set x(v) {x_ = v},
    set y(v) {y_ = v},
    str: function() {
      var label = "zabcdefgh";
      var sx = label.charAt(x_);
      return sx + y_;
    },
  };
};
var PointS = function(coord) {
  if (!coord || coord.length < 2) throw 'ArgumentError';
  var label = "zabcdefgh";
  var x = label.indexOf(coord.charAt(0));
  var y = parseInt(coord.charAt(1));
  return Point(x, y);
};

var Disc = function(x, y, color) {
  var point = Point(x, y);
  return {
    get x() {return point.x;},
    get y() {return point.y;},
    set x(v) {point.x = v;},
    set y(v) {point.y = v;},
    color : color ? color : disc.EMPTY,
  };
};
