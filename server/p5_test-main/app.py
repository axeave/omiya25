import sqlite3
import logging
from flask_cors import CORS
from flask import Flask, render_template, request, jsonify

app = Flask(__name__)
CORS(app)
DATABASE = 'lines.db'
logging.basicConfig(level=logging.INFO) # ログレベルを設定



def get_db():
    conn = sqlite3.connect(DATABASE)
    conn.row_factory = sqlite3.Row
    return conn

def close_db(conn):
    if conn:
        conn.close()

def init_db():
    with app.app_context():
        db = get_db()
        with app.open_resource('schema.sql', mode='r') as f:
            db.cursor().executescript(f.read())
        db.commit()
        close_db(db) # データベースを閉じる処理を追加

@app.cli.command('initdb')
def initdb_command():
    """Initialize the database."""
    init_db()
    print('Initialized the database.')

# --- ルートとAPIエンドポイント ---

@app.route('/')
def index():
    """メインの描画ページを表示します。"""
    return render_template('index.html')

@app.route('/log')
def log_page():
    """スケッチのログページを表示します。"""
    return render_template('log.html') # 新しいHTMLファイル

@app.route('/api/create_sketch', methods=['POST'])
def create_sketch():
    logging.info("create_sketch: リクエスト受信") # ログ出力
    conn = get_db()
    cursor = conn.cursor()
    try:
        logging.info("create_sketch: データベース操作開始") # ログ出力
        cursor.execute("INSERT INTO sketches DEFAULT VALUES")
        conn.commit()
        sketch_id = cursor.lastrowid
        logging.info(f"create_sketch: スケッチID {sketch_id} を作成") # ログ出力
        close_db(conn)
        logging.info("create_sketch: レスポンス送信") # ログ出力
        return jsonify({'message': 'Sketch created successfully', 'sketch_id': sketch_id}), 201
    except sqlite3.Error as e:
        conn.rollback()
        close_db(conn)
        logging.error(f"create_sketch: エラー発生: {e}") # ログ出力
        return jsonify({'error': str(e)}), 500
    finally:
        logging.info("create_sketch: 処理終了") # ログ出力

@app.route('/api/save_lines', methods=['POST'])
def save_lines():
    logging.info("save_lines: リクエスト受信")
    data = request.get_json()
    sketch_id = data.get('sketch_id')
    lines = data.get('lines')
    conn = get_db()
    cursor = conn.cursor()
    try:
        logging.info("save_lines: データベース操作開始")
        for line in lines:
            cursor.execute("""
                INSERT INTO lines (sketch_id, start_x, start_y, end_x, end_y, color, thickness)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (sketch_id, line['start_x'], line['start_y'], line['end_x'], line['end_y'], line['color'], line['thickness']))
        conn.commit()
        close_db(conn)
        logging.info("save_lines: 線を保存しました")
        return jsonify({'message': 'Lines saved successfully'}), 200
    except sqlite3.Error as e:
        conn.rollback()
        close_db(conn)
        logging.error(f"save_lines: エラー発生: {e}")
        return jsonify({'error': str(e)}), 500
    finally:
        logging.info("save_lines: 処理終了")

@app.route('/api/get_sketches', methods=['GET'])
def get_sketches():
    """保存されている全てのスケッチのリストを取得します。"""
    conn = get_db()
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT id, created_at FROM sketches ORDER BY created_at DESC")
        sketches = cursor.fetchall()
        close_db(conn)
        return jsonify([dict(row) for row in sketches])
    except sqlite3.Error as e:
        close_db(conn)
        return jsonify({'error': str(e)}), 500

@app.route('/api/get_sketch_lines/<int:sketch_id>', methods=['GET'])
def get_sketch_lines(sketch_id):
    """指定されたsketch_idに紐づく全ての線データを取得します。"""
    conn = get_db()
    cursor = conn.cursor()
    try:
        # 指定されたsketch_idが存在するか確認
        cursor.execute("SELECT id FROM sketches WHERE id = ?", (sketch_id,))
        sketch = cursor.fetchone()
        if not sketch:
            close_db(conn)
            return jsonify({'error': f'Sketch with id {sketch_id} not found.'}), 404

        cursor.execute("SELECT start_x, start_y, end_x, end_y,color,thickness FROM lines WHERE sketch_id = ?", (sketch_id,))
        lines = cursor.fetchall()
        close_db(conn)
        return jsonify([dict(row) for row in lines])
    except sqlite3.Error as e:
        close_db(conn)
        return jsonify({'error': str(e)}), 500


@app.route('/api/get_all_sketch_lines', methods=['GET'])
def get_all_sketch_lines():
    """保存されている全てのスケッチの線画データを取得し、各スケッチの開始点と終了点を返す。"""
    conn = get_db()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            SELECT 
                l.start_x, l.start_y, l.end_x, l.end_y, 
                l.color,l.thickness,
                s.created_at, s.id as sketch_id,
                FIRST_VALUE(l.start_x) OVER (PARTITION BY s.id ORDER BY l.id ASC) as sketch_start_x,
                FIRST_VALUE(l.start_y) OVER (PARTITION BY s.id ORDER BY l.id ASC) as sketch_start_y,
                LAST_VALUE(l.end_x) OVER (PARTITION BY s.id ORDER BY l.id DESC ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING) as sketch_end_x,
                LAST_VALUE(l.end_y) OVER (PARTITION BY s.id ORDER BY l.id DESC ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING) as sketch_end_y
            FROM lines l
            JOIN sketches s ON l.sketch_id = s.id
            ORDER BY s.created_at, l.id
        """)
        lines = cursor.fetchall()
        close_db(conn)
        return jsonify([dict(row) for row in lines])
    except sqlite3.Error as e:
        close_db(conn)
        return jsonify({'error': str(e)}), 500


# 以前の /api/get_lines と /api/save_line は新しいエンドポイントに役割を譲るため削除またはコメントアウトします。
# もし古いAPIを何らかの理由で残したい場合はその旨お伝えください。
# 今回は、新しい機能に完全に移行するため、古いAPIは不要と判断します。

if __name__ == '__main__':
    # staticフォルダの場所を明示的に指定 (通常は自動で認識されますが、念のため)
    # app.static_folder = 'static'
    CORS(app)
    init_db()
    app.run(host='0.0.0.0', port=5000, debug=True)