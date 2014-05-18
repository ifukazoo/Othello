'use strict';

var Board = {};

/*
 * global
 */
Board.WIDTH = 8;
Board.MAX_TURNS = 60;
Board.create = function() {

  var NONE        =   0;
  var UPPER       =   1;
  var UPPER_LEFT  =   2;
  var LEFT        =   4;
  var LOWER_LEFT  =   8;
  var LOWER       =  16;
  var LOWER_RIGHT =  32;
  var RIGHT       =  64;
  var UPPER_RIGHT = 128;

  /*
   * private
   */
  var turns_ = 0;
  var rawBoard_ = new Array(Board.WIDTH + 2);
  for (var x = 0; x < rawBoard_.length; x++) {
    rawBoard_[x] = new Array(Board.WIDTH + 2);
  }

  // vector の配列
  // 該当ターンに，置けるマスを記憶
  var movablePos_ = new Array(Board.MAX_TURNS + 1);
  for (var i = 0; i < movablePos_.length; i++) {
      movablePos_[i] = [];
  }

  // vector の配列
  // 該当ターンに，マス毎の置ける方向を記憶
  var movableDir_ = new Array(Board.MAX_TURNS + 1);
  for (var x = 0; x < movableDir_.length; x++) {
    // x 軸を格納
    movableDir_[x] = new Array(Board.WIDTH + 2);
    for (var y = 0; y < movableDir_[x].length; y++) {
      movableDir_[x][y] = new Array(Board.WIDTH + 2);
    }
  }

  // vector の配列
  var updateLog_ = [];

  var currentColor_ = Type.EMPTY;

  //盤上の石の数
  var discs_ = {
    "1": 0,
    "-1": 0,
    "0": 0,
  };

  var checkMobility = function(disc) {
    var x, y, direct = NONE;

    // すでに石があったら置けない

    if (rawBoard_[disc.x][disc.y] !== Type.EMPTY) return NONE;

    //上
    if (rawBoard_[disc.x][disc.y - 1] === -disc.color) {
      x = disc.x; y = disc.y - 2;
      while (rawBoard_[x][y] === -disc.color) { y--; }
      if (rawBoard_[x][y] === disc.color) direct |= UPPER;
    }
    //下
    if (rawBoard_[disc.x][disc.y + 1] === -disc.color) {
      x = disc.x; y = disc.y + 2;
      while (rawBoard_[x][y] === -disc.color) { y++; }
      if (rawBoard_[x][y] === disc.color) direct |= LOWER;
    }
    //左
    if (rawBoard_[disc.x - 1][disc.y] === -disc.color) {
      x = disc.x - 2; y = disc.y;
      while (rawBoard_[x][y] === -disc.color) { x--; }
      if (rawBoard_[x][y] === disc.color) direct |= LEFT;
    }
    //右
    if (rawBoard_[disc.x + 1][disc.y] === -disc.color) {
      x = disc.x + 2; y = disc.y;
      while (rawBoard_[x][y] === -disc.color) { x++; }
      if (rawBoard_[x][y] === disc.color) direct |= RIGHT;
    }
    //右上
    if (rawBoard_[disc.x + 1][disc.y - 1] === -disc.color) {
      x = disc.x + 2; y = disc.y - 2;
      while (rawBoard_[x][y] === -disc.color) { x++; y--;}
      if (rawBoard_[x][y] === disc.color) direct |= UPPER_RIGHT;
    }
    //左上
    if (rawBoard_[disc.x - 1][disc.y - 1] === -disc.color) {
      x = disc.x - 2; y = disc.y - 2;
      while (rawBoard_[x][y] === -disc.color) { x--; y--;}
      if (rawBoard_[x][y] === disc.color) direct |= UPPER_LEFT;
    }
    //左下
    if (rawBoard_[disc.x - 1][disc.y + 1] === -disc.color) {
      x = disc.x - 2; y = disc.y + 2;
      while (rawBoard_[x][y] === -disc.color) { x--; y++;}
      if (rawBoard_[x][y] === disc.color) direct |= LOWER_LEFT;
    }
    //右下
    if (rawBoard_[disc.x + 1][disc.y + 1] === -disc.color) {
      x = disc.x + 2; y = disc.y + 2;
      while (rawBoard_[x][y] === -disc.color) { x++; y++;}
      if (rawBoard_[x][y] === disc.color) direct |= LOWER_RIGHT;
    }

    return direct;
  };

  var init = function() {
    /*
     *全マスを空きマスに設定
     */
    for (var x = 1; x <= Board.WIDTH; x++) {
      for (var y = 1; y <= Board.WIDTH; y++) {
        setRawBoard(x, y, Type.EMPTY);
      }
    }

    /*
     * 壁を設定
     */
    //  両サイド
    for (var y = 0; y < Board.WIDTH + 2; y++) {
        rawBoard_[0][y] = Type.WALL;
        rawBoard_[Board.WIDTH + 1][y] = Type.WALL;
    }
    //  上下
    for (var x = 0; x < Board.WIDTH + 2; x++) {
        rawBoard_[x][0] = Type.WALL;
        rawBoard_[x][Board.WIDTH + 1] = Type.WALL;
    }

    /*
     * 初期配置
     */
    setRawBoard(4, 4, Type.WHITE);
    setRawBoard(5, 5, Type.WHITE);
    setRawBoard(4, 5, Type.BLACK);
    setRawBoard(5, 4, Type.BLACK);

    /*
     * 石の数
     */
    discs_[Type.WHITE] = 2;
    discs_[Type.BLACK] = 2;
    discs_[Type.EMPTY] = Board.WIDTH * Board.WIDTH - 4;

    turns_ = 0;
    currentColor_ = Type.BLACK;

    updateLog_.length = 0;

    countMovable();
  };

  /*
   * private
   * movablepos_とmovabledir_を再計算する
   */
  var countMovable = function() {
    var direct;
    var disc;

    movablePos_[turns_].length = 0;
    for (var x = 1; x <= Board.WIDTH; x++) {
      for (var y = 1; y <= Board.WIDTH; y++) {
        disc = Disc(x, y, currentColor_);
        direct = checkMobility(disc);
        if (direct !== NONE) {
          movablePos_[turns_].push(disc);
        }
        movableDir_[turns_][x][y] = direct;
      }
    }
  };

  /*
   * private
   * 指定された位置に石を打ち，挟めるすべての石を裏返す．
   * 打った石と裏返した石を_updatelog_に挿入する
   */
  var flipDiscs = function(point) {
    var x, y, fliped;
    //置く石
    var direct = movableDir_[turns_][point.x][point.y];
    var update = [];

    //石を置く
    setRawBoard(point.x, point.y, currentColor_);
    update.push(Disc(point.x, point.y, currentColor_));

    //上
    if (direct & UPPER) {
      y = point.y - 1;
      while (rawBoard_[point.x][y] === -currentColor_) {
        setRawBoard(point.x, y, currentColor_);
        update.push(Disc(point.x, y, currentColor_));
        y--;
      }
    }
    //下
    if (direct & LOWER) {
      y = point.y + 1;
      while (rawBoard_[point.x][y] === -currentColor_) {
        setRawBoard(point.x, y, currentColor_);
        update.push(Disc(point.x, y, currentColor_));
        y++;
      }
    }
    //左
    if (direct & LEFT) {
      x = point.x - 1;
      while (rawBoard_[x][point.y] === -currentColor_) {
        setRawBoard(x, point.y, currentColor_);
        update.push(Disc(x, point.y, currentColor_));
        x--;
      }
    }
    //右
    if (direct & RIGHT) {
      x = point.x + 1;
      while (rawBoard_[x][point.y] === -currentColor_) {
        setRawBoard(x, point.y, currentColor_);
        update.push(Disc(x, point.y, currentColor_));
        x++;
      }
    }
    //右上
    if (direct & UPPER_RIGHT) {
      x = point.x + 1;
      y = point.y - 1;
      while (rawBoard_[x][y] === -currentColor_) {
        setRawBoard(x, y, currentColor_);
        update.push(Disc(x, y, currentColor_));
        x++;y--;
      }
    }
    //左上
    if (direct & UPPER_LEFT) {
      x = point.x - 1;
      y = point.y - 1;
      while (rawBoard_[x][y] === -currentColor_) {
        setRawBoard(x, y, currentColor_);
        update.push(Disc(x, y, currentColor_));
        x--;y--;
      }
    }
    //左下
    if (direct & LOWER_LEFT) {
      x = point.x - 1;
      y = point.y + 1;
      while (rawBoard_[x][y] === -currentColor_) {
        setRawBoard(x, y,currentColor_);
        update.push(Disc(x, y, currentColor_));
        x--;y++;
      }
    }
    //右下
    if (direct & LOWER_RIGHT) {
      x = point.x + 1;
      y = point.y + 1;
      while (rawBoard_[x][y] === -currentColor_) {
        setRawBoard(x ,y, currentColor_);
        update.push(Disc(x, y, currentColor_));
        x++;y++;
      }
    }

    /*
     * 盤上の石の数を更新
     * eg:1枚置いて2枚返した
     * -> 手番 +3
     *    相手 -2
     *    空白 -1
     */
    fliped = update.length;
    discs_[currentColor_]  += fliped;
    discs_[-currentColor_] -= fliped - 1;
    discs_[Type.EMPTY] -= 1;

    updateLog_.push(update);
  };

  /*
   * pointで指定された位置に石を打つ．
   */
  var move = function(point) {
      if (point.x < 0 || point.x > Board.WIDTH) return false;
      if (point.y < 0 || point.y > Board.WIDTH) return false;
      if (movableDir_[turns_][point.x][point.y] === NONE) return false;

      //石を返す
      flipDiscs(point);

      turns_++
      currentColor_ = -currentColor_;
      countMovable();

      return true;
  };

  var isGameOver = function() {
    if (turns_ >= Board.MAX_TURNS) return true;

    //打てる手がある
    if (movablePos_[turns_].length !== 0) return false;

    //調査用の石
    var disc = Disc(0, 0, -currentColor_);

    for (var x = 1; x <= Board.WIDTH; x++) {
      disc.x = x;
      for (var y = 1; y <= Board.WIDTH; y++) {
        disc.y = y;
        if (checkMobility(disc) !== NONE) return false;
      }
    }
    return true;
  };

  var isPassable = function() {
    if (movablePos_[turns_].length !== 0) return false;

    if (isGameOver()) return false;

    return true;
  };

  var pass = function() {
    //打てる手がある場合は，パスできない．
    if (!isPassable()) return false;

    //操作を行ったので空のログを挿入．
    updateLog_.push([]);

    currentColor_ = -currentColor_;
    countMovable();

    return true;
  };

  var undo = function() {
    var latestDiscs
    ,reverted
    ,discPut
    ,disc;

    if (turns_ === 0) return false;

    latestDiscs = updateLog_[updateLog_.length - 1];

    if (latestDiscs.length === 0) {
      //空のログが入っている -> パスだった．

      //実装上の都合により，passの場合に単純に戻すと，
      //movableDir_, movablePos_が前々回の手番に戻ってしまう．
      //よって，movableDir_, movablePos_をpassしたturnのものに
      //再構築する．
      movablePos_[turns_].length = 0;
      for (var x = 1; x <= Board.WIDTH; x++) {
        for (var y = 1; y <= Board.WIDTH; y++) {
          movableDir_[turns_][x][y] = NONE;
        }
      }
    } else {
      turns_--;

      /*
       * 石を元に戻す．
       */
      //置いた石は取り除く
      discPut = latestDiscs[0];
      setRawBoard(discPut.x, discPut.y, Type.EMPTY);

      //それ以外は裏返して元に戻す
      for (var i = 1; i < latestDiscs.length; i++) {
        disc = latestDiscs[i];


        /*
         * 現在の手番が白ならば，前回の手番で
         * 黒 -> 白 に返されているので，
         * undoではcurrentColor_に戻すことになる．
         */
        setRawBoard(disc.x, disc.y, currentColor_);
      }

      /*
      * 盤上の石の数を更新
      * eg:1枚除去して2枚返した
      * -> 手番 +2
      *    相手 -3
      *    空白 +1
      */
      reverted = latestDiscs.length;
      discs_[currentColor_]  += reverted - 1;
      discs_[-currentColor_] -= reverted;
      discs_[Type.EMPTY] += 1;
    }
    currentColor_ = -currentColor_;
    updateLog_.length--;

    return true;
  };

  var countDisc = function(color) {
    return discs_[color];
  };

  var getColor = function(point) {
    if (!(point.x && point.y)) throw 'TypeError';
    return rawBoard_[point.x][point.y];
  };

  var getMovablePos = function() {
      return movablePos_[turns_];
  };

  var getLastUpdate = function() {
    if (updateLog_.length === 0) {
      return [];
    } else {
      return updateLog_[updateLog_.length - 1];
    }
  };

  var getLastDisc = function() {
    var update = getLastUpdate();
    if (update.length === 0) {
      return null;
    } else {
      return update[0];
    }
  };

  var setRawBoard = function(x, y, color) {
    rawBoard_[x][y] = color;
  };

  var evaluate = function() {
    var table = [
    [0,   0,   0,   0,   0,   0,   0,   0,   0, 0],
    [0, 100, -50,  10,   0,   0,  10, -50, 100, 0],
    [0, -50, -70,  -5, -10, -10,  -5, -70, -50, 0],
    [0,  10,  -5, -10,  -5,  -5, -10,  -5,  10, 0],
    [0,   0, -10,  -5,   0,   0,  -5, -10,   0, 0],
    [0,   0, -10,  -5,   0,   0,  -5, -10,   0, 0],
    [0,  10,  -5, -10,  -5,  -5, -10,  -5,  10, 0],
    [0, -50, -70,  -5, -10, -10,  -5, -70, -50, 0],
    [0, 100, -50,  10,   0,   0,  10, -50, 100, 0],
    [0,   0,   0,   0,   0,   0,   0,   0,   0, 0],
    ];

    var sum = 0;
    for (var x = 1; x <= Board.WIDTH; x++) {
      for (var y = 1; y <= Board.WIDTH; y++) {
        if (rawBoard_[x][y] === currentColor_) {
          sum += table[x][y];
        }
      }
    }
    return sum;
  };

  //デバッグ用
  var inspect = function() {
    return {
      turns: turns_,
      rawBoard: rawBoard_,
      movablePos: movablePos_,
      movableDir: movableDir_,
      updateLog: updateLog_,
      currentColor: currentColor_,
      discs: discs_,
    };
  };

  //初期化の実行
  init();

  return {
    init :  init,
    move: move,
    isGameOver: isGameOver,
    pass: pass,
    undo: undo,
    countDisc: countDisc,
    getColor: getColor,
    getMovablePos: getMovablePos,
    getLastUpdate: getLastUpdate,
    getLastDisc: getLastDisc,
    isPassable: isPassable,
    evaluate: evaluate,
    get currentColor() { return currentColor_;},
    get turns() { return turns_;},

    //デバッグ
    inspect: inspect,
  };
};

