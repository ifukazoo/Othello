(function($) {

  var time = {};

  // データボード
  var board = Board.create();

  // GUI表示用に機能拡張したデータボード
  var jBoard;

  var ai = new Worker('ai.js');
  ai.onmessage = recvAiMsg;
  $(window).unload(function() {
    ai.terminate();
  });

  var compColor;

  // GUI表示用に機能拡張したマス目クラス
  var jPoint = function(point, canvas) {
    var obj = Object.create(point);
    var id = '#' + point.x + '_' + point.y;

    obj.jCall = function() {
      var args = Array.prototype.slice.call(arguments);
      var name = args.shift();
      var f = $(id)[name];
      f.apply($(id), args);
    };
    obj.highlight = function(on) {
      if (on) {
        obj.jCall('css','background-color', 'lightyellow');
      } else {
        obj.jCall('css','background-color', 'palegreen');
      }
    };
    obj.movable = function() {
      obj.jCall('mouseenter', function() {
        obj.highlight(true);
      });
      obj.jCall('mouseleave', function() {
        obj.highlight(false);
      });
      obj.jCall('click', function() {
        obj.highlight(false);
        board.move(point);
        displayBoard();
        waitNext();
      });
    };
    obj.unmovable = function() {
      obj.jCall('off', 'mouseenter');
      obj.jCall('off', 'mouseleave');
      obj.jCall('off', 'click');
    };

    obj.showDisc = function(color) {
      var context;

      if (!(color === Type.BLACK || color === Type.WHITE || color === Type.EMPTY))
        throw 'illegal state';

      context = canvas.getContext('2d');
      if (color === Type.EMPTY) {
        context.clearRect(0, 0, canvas.width, canvas.height);
      } else {
        context.beginPath();
        context.arc(23, 23, 15, 0, Math.PI * 2,true);
        if (color === Type.BLACK) {
          context.fillStyle = 'black';
        } else if (color === Type.WHITE) {
          context.fillStyle = 'white';
        } else {
          throw 'illegal state';
        }
        context.fill();
        context.closePath();
      }
    };
    return obj;
  };

  $(document).ready(function() {
    for (var i = 1; i <= Board.WIDTH; i++) {
      for (var j = 1; j <= Board.WIDTH; j++) {
        //canvas は CSSで縦横を指定すると内部の描画が歪んでしまう．
        $('#row'+ '_' + i).append('<canvas ' + 'id=' + j + '_' + i +' width="45px" height="45px" >'+ '</canvas>');
      }
    }

    /*
     * 全キャンバス要素を取得.
     * jQueryの基本機能のみでcanvasを扱うには,
     * このように地道にやるしかない模様．
     */
    var canvases = $('canvas');

    //拡張マス目クラスの生成
    var x,y,ci;
    jBoard  = new Array(Board.WIDTH + 2);
    for (x = 0; x < jBoard.length; x++) {
      jBoard[x] = new Array(Board.WIDTH + 2);
      if (!(x === 0 || x === Board.WIDTH + 1)) {
        for (y = 1; y < Board.WIDTH + 1; y++) {
          ci = 8 * (y - 1) + (x - 1);
          jBoard[x][y] = jPoint(Point(x, y), canvases[ci]);
        }
      }
    }

    //ボードをデフォルト色にする
    for (var x = 1; x <= Board.WIDTH; x++) {
      for (var y = 1; y <= Board.WIDTH; y++) {
        jBoard[x][y].highlight(false);
      }
    }

    displayBoard();
    $('#message').html('');
    $('#pass').hide();
    var $inputs = $('input:radio[name=teban]');
    $inputs.filter('[id=radio1]').prop("checked", true);
    $inputs.attr('disabled', false);
    $('#start').attr('disabled', false);
    $('#start').click(startGame);

    //debug
    $('#undo').click(function undo() {
      if (board.undo()) {
        displayBoard();
        setTimeout(function() { undo(); }, 1000);
      }
    });

    // end of document.ready
  });

  function displayBoard() {
    var point;
    var color;
    var disc = '';
    for (var x = 1; x <= Board.WIDTH; x++) {
      for (var y = 1; y <= Board.WIDTH; y++) {
        point = jBoard[x][y];
        color = board.getColor(point);
        point.showDisc(color);
      }
    }
  }

  function startGame() {
    $('#message').html('');
    $('#pass').show();
    $('#pass').click(tryPass);
    $('#start').attr('disabled', true);
    $('[id^=radio]').attr('disabled', true);
    var selected = $('input[name="teban"]:checked').val();
    compColor = -parseInt(selected);
    time.start = (new Date()).getTime();
    console.log(time.start);
    waitNext();
  }

  function tryPass() {
    if (!board.isPassable()) {
      $('#message').html('パスできません');
      return;
    }
    board.pass();
    waitNext();
  }

  function endGame() {
    var black = board.countDisc(Type.BLACK);
    var white = board.countDisc(Type.WHITE);

    var str = '黒: ' + black + "\t" + '白: ' + white + "\t\t";
    if (black > white)
      $('#message').html(str + '黒の勝ち');
    else if (white > black)
      $('#message').html(str + '白の勝ち');
    else if (white === white)
      $('#message').html(str + '引き分け');

    time.end = (new Date()).getTime();

    console.log((time.end - time.start) / 1000);
  }

  function prepareUser() {
    points = board.getMovablePos();
    points.forEach(function(point) {
      jBoard[point.x][point.y].movable();
    });
  }

  function aiThink() {
    var lastDisc = board.getLastDisc();
    if (board.turns === 0) {
      ai.postMessage({
        type: 'start',
      });
    } else if (!lastDisc) {
      ai.postMessage({
        type: 'pass',
      });
    } else {
      ai.postMessage({
        type: 'move',
        disc: lastDisc,
      });
    }
  }

  function recvAiMsg(e) {
    var point;
    var aiDisk;
    var msg = e.data;
    console.log(msg, msg.disc);

    if (msg.type === 'move') {
      point = Point(msg.disc.x, msg.disc.y);
      board.move(point);
      displayBoard();
    } else if (msg.type === 'pass') {
      board.pass();
    }
    waitNext();
  }

  function comp() {
    setTimeout(function() {
      var points = board.getMovablePos();
      if (points.length === 0) {
        if (!board.pass()) throw 'illegal state';
      } else if (points.length === 1) {
        board.move(points[0]);
      } else {
        var select = parseInt(Math.random() * points.length);
        if (!points[select]) throw 'illegal state';
        board.move(points[select]);
      }
      displayBoard();
      waitNext();
    }, 10);
  }
  // * 思考中メッセージ
  function showCompMsg() {
    $('#message').html('コンピュータ思考中');
    $('#message').effect('fade', null, 300, function callback() {
      $('#message').removeAttr('style').hide().fadeIn();
      if (board.currentColor === compColor) {
        showCompMsg();
      }
    });
  }

  function waitNext() {
    setTimeout(function() {
      var current;
      var points;

      $('#message').html('');
      if (board.isGameOver()) {
        //ゲームオーバー処理
        endGame();
        return;
      }

      //マス入力を無効化する
      for (var x = 1; x <= Board.WIDTH; x++) {
        for (var y = 1; y <= Board.WIDTH; y++) {
          jBoard[x][y].unmovable();
        }
      }

      current = board.currentColor;
      if (current === compColor) {
        aiThink();
      } else {
        // aiThink();
        prepareUser();
      }
    }, 0);
  }

})(jQuery);
