'use strict';

importScripts('board.js', 'reversi.js');

self.board = Board.create();
self.ai = createAi();

self.addEventListener('message', onMessage);

var PRESEARCH_DEPTH = 1;
var NORMAL_DEPTH = 3;
var WLD_DEPTH = 15;
var PERFECT_DEPTH = 5;

function createAi() {

  function move(board) {
    var maxPoint
    ,alpha
    ,beta
    ,limit
    ,evaled
    ,evalMax;

    var movables = board.getMovablePos();
    var presorted;

    if (movables.length == 0) {
      board.pass();
      return;
    }

    if (movables.length == 1) {
      board.move(movables[0]);
      return;
    }

    //事前ソート
    presorted = presort(board, movables, PRESEARCH_DEPTH);

    //探索の深さを決定
    if (Board.MAX_TURNS - board.turns <= WLD_DEPTH) {
      limit = PERFECT_DEPTH;
    } else {
      limit = NORMAL_DEPTH;
    }

    /*
     * 最も価値の高いマスに打つ
     */
    evalMax = -Number.MAX_VALUE;
    maxPoint = presorted[0];
    alpha = -Number.MAX_VALUE;
    beta = Number.MAX_VALUE;
    for (var i = 0; i < presorted.length; i++) {
      //１手打つ
      board.move(presorted[i]);

      //ユーザは最も低い値を打ってくると考える．
      //最も被害が少ない値が自分にとっては価値が高い．
      evaled = searchMin(board, limit, alpha, beta);

      //戻す
      board.undo();

      //最高値を更新
      if (evaled > evalMax) {
        evalMax = evaled;
        maxPoint = presorted[i];
        alpha = Math.max(alpha, evalMax);
      }
    }
    board.move(maxPoint);
  }

  //最低値を探す相手側の思考）
  function searchMin(board, limit, alpha, beta) {

   var evaled;
   var evalMin = beta;

    if (board.isGameOver() || limit === 0) {
      //制限に達したので評価値を返す
      return board.evaluate();
    }

    var movables = board.getMovablePos();

    if (movables.length === 0) {
      //パス．他の手を探せないので，そのまま次節の値を返す．
      board.pass();
      evaled = searchMax(board, limit, alpha, beta);
      board.undo();
      return evaled;
    }

    for (var i = 0; i < movables.length; i++) {
      //１手打つ
      board.move(movables[i]);

      evaled = searchMax(board, limit - 1, alpha, beta);

      //戻す
      board.undo();

      //値更新
      evalMin = Math.min(evalMin, evaled);

      //アルファカット
      if (alpha >= evalMin) {
        return evalMin;
      }

      // //ベータ値を更新
      beta = Math.min(beta, evalMin);
    }
    return evalMin;
  }
  //最大値を探す（自分側の思考）
  function searchMax(board, limit, alpha, beta) {
   var evaled;
   var evalMax = alpha;

    if (board.isGameOver() || limit === 0) {
      //制限に達したので評価値を返す
      return board.evaluate();
    }

    var movables = board.getMovablePos();

    if (movables.length === 0) {
      //パス．他の手を探せないので，そのまま次節の値を返す．
      board.pass();
      evaled = searchMin(board, limit, alpha, beta);
      board.undo();
      return evaled;
    }

    for (var i = 0; i < movables.length; i++) {
      //１手打つ
      board.move(movables[i]);

      evaled = searchMin(board, limit - 1, alpha, beta);

      //戻す
      board.undo();

      //最大値を更新
      evalMax = Math.max(evalMax, evaled);

      //ベータカット
      if (beta <= evalMax) {
        return evalMax;
      }

      // //アルファ値を更新
      alpha = Math.max(alpha, evalMax);
    }
    return evalMax;
  }

  function PointWithEval(point, evaled) {
      var obj = Object.create(point);
      obj.evaled = evaled;
      return obj;
  }

  function presort(board, movables, limit) {
    var moves = [];
    var point;
    var evaled;
    var alpha = -Number.MAX_VALUE;
    var beta = Number.MAX_VALUE;

    for (var i = 0; i < movables.length; i++) {
      point = movables[i];

      board.move(point);
      evaled = searchMin(board, limit, alpha, beta);
      board.undo();

      moves.push(PointWithEval(point, evaled));
    }

    moves.sort(function(a, b) {
      return b.evaled - a.evaled;
    });

    return moves;
  }

  return {
    move: move,
  };
};

function onMessage(e) {
  var point;
  var aiDisk;
  var msg = e.data;
  console.log(msg, msg.disc);

  if (msg.type === 'move') {
    point = Point(msg.disc.x, msg.disc.y);
    self.board.move(point);
    self.ai.move(self.board);
  } else if (msg.type === 'pass') {
    self.board.pass();
    self.ai.move(self.board);
  } else if (msg.type === 'start') {
    self.ai.move(self.board);
  }
  aiDisk = self.board.getLastDisc();
  console.log(!aiDisk ? 'pass' : aiDisk);
  if (aiDisk) {
    postMessage({
      type: 'move',
      disc: aiDisk
    });
  } else {
    postMessage({
      type: 'pass',
    });
  }
}

console.log('AI loaded');
