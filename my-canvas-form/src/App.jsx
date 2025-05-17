import React, { useEffect, useState } from 'react';
import Canvas from './Canvas';
import CanvasLayered from './CanvasLayered';

const App = () => {
  const [sketches, setSketches] = useState([]);
  const [triggerUpdate, setTriggerUpdate] = useState(0);

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

          // ② sketch_id 降順で並べて、上位30件取り出す
          const sortedIds = Object.keys(grouped)
            .map(Number)
            .sort((a, b) => b - a)
            .slice(0, 30);

          // ③ sketch データ構造に整形
          const sketchList = sortedIds.map((id, index) => ({
            sketch_id: id,
            lines: grouped[id],
            animate: index < 10 // 最新10件だけアニメーション
          }));

          setSketches(sketchList);

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
    <div>
      <h1>再生付きスケッチ（間隔制御）</h1>
      <CanvasLayered sketches={sketches} />
    </div>
  );
};

export default App;
