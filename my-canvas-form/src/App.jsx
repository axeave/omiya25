import React, { useEffect, useState, useRef } from 'react';
import CanvasLayered from './CanvasLayered';

const App = () => {
  const [sketches, setSketches] = useState([]);
  const [triggerUpdate, setTriggerUpdate] = useState(0);
  const containerRef = useRef(null); // canvas-containerへの参照
  const staticCanvasRef = useRef(null); // 静止画canvasへの参照
  const animatedCanvasRef = useRef(null); // アニメーションcanvasへの参照
  const previousSketchIds = useRef([]); // 追記

  // 表示するスケッチの総数の上限
  const MAX_DISPLAY_SKETCHES = 30;
  // 同時にアニメーションするスケッチの数の上限
  const MAX_ANIMATED_SKETCHES = 10; // 最新の1件のみアニメーション

  useEffect(() => {
    let timeoutId;

    const fetchLines = () => {
      fetch(`${import.meta.env.VITE_API_URL}/api/get_all_sketch_lines`)
        .then(res => res.json())
        .then(data => {
          // ① sketch_id ごとにグループ化
          const grouped = {};
          data.forEach(line => {
            const id = line.sketch_id;
            if (!grouped[id]) grouped[id] = [];
            grouped[id].push(line);
          });

          // ② sketch_id 降順で並べて、上位 N 件取り出す (総数の上限)
          const sortedIds = Object.keys(grouped)
            .map(Number)
            .sort((a, b) => b - a)
            .slice(0, MAX_DISPLAY_SKETCHES);

          // ③ sketch データ構造に整形
          const sketchList = sortedIds.map((id) => {
            const isNewSketch = !previousSketchIds.current.includes(id);
            return {
              sketch_id: id,
              lines: grouped[id],
              animate: isNewSketch // 新しいスケッチのみアニメーション
            };
          });

          setSketches(sketchList);
          previousSketchIds.current = sortedIds; // previousSketchIdsを更新

          // 次の更新を予約
          timeoutId = setTimeout(() => {
            setTriggerUpdate(prev => prev + 1);
          }, 5000);
        })
        .catch(err => {
          console.error("取得失敗:", err);
          timeoutId = setTimeout(() => {
            setTriggerUpdate(prev => prev + 1);
          }, 5000);
        });
    };

    fetchLines();
    return () => clearTimeout(timeoutId);
  }, [triggerUpdate]);

  return (
    <div id="canvas-container" style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', overflow: 'hidden', zIndex: -1 }} ref={containerRef}>
      <CanvasLayered
        sketches={sketches}
        canvasRef={staticCanvasRef}
        containerRef={containerRef}
      />
    </div>
  );
};

export default App;