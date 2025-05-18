
import React, { useRef, useEffect, useState } from 'react';

const CanvasLayered = ({ sketches }) => {
  const staticCanvasRef = useRef(null); // 背景
  const animatedCanvasRef = useRef(null); // アニメーション前景
  const [isDrawing, setIsDrawing] = useState(false);

  useEffect(() => {
    const staticCanvas = staticCanvasRef.current;
    const animatedCanvas = animatedCanvasRef.current;
    if (!staticCanvas || !animatedCanvas || isDrawing || sketches.length === 0) return;

    // 背景（静止画）描画
    const staticCtx = staticCanvas.getContext('2d');
    staticCtx.clearRect(0, 0, staticCanvas.width, staticCanvas.height);

    const staticSketches = sketches.filter(s => !s.animate);
    staticSketches.forEach(sketch => {
      sketch.lines.forEach(line => {
        staticCtx.beginPath();
        staticCtx.moveTo(line.start_x, line.start_y);
        staticCtx.lineTo(line.end_x, line.end_y);
        staticCtx.strokeStyle = line.color || '#000000';
        staticCtx.lineWidth = line.thickness || 2;
        staticCtx.stroke();
      });
    });

    // アニメーション描画開始
    setIsDrawing(true);
    const animatedCtx = animatedCanvas.getContext('2d');
    animatedCtx.clearRect(0, 0, animatedCanvas.width, animatedCanvas.height);

    let sketchIndex = 0;
    let lineIndex = 0;
    const animatedSketches = sketches
      .filter(s => s.animate)
      .reverse(); // ← 最新が最後に再生されるように！

    const drawNext = () => {
      if (sketchIndex >= animatedSketches.length) {
        // 🔁 再生終わったあと8秒だけキャンバスを保持してから終了
        setTimeout(() => {
          setIsDrawing(false);
        }, 8000); // 8000ms = 8秒

        return;
      }
      const sketch = animatedSketches[sketchIndex];
      const line = sketch.lines[lineIndex];
      if (line) {
        animatedCtx.beginPath();
        animatedCtx.moveTo(line.start_x, line.start_y);
        animatedCtx.lineTo(line.end_x, line.end_y);
        animatedCtx.strokeStyle = line.color || '#000000';
        animatedCtx.lineWidth = line.thickness || 2;
        animatedCtx.stroke();
        lineIndex++;
        setTimeout(drawNext, 10);
      } else {
        sketchIndex++;
        lineIndex = 0;
        setTimeout(drawNext, 200); // 次のスケッチまでちょい待つ
      }
    };

    drawNext();
  }, [sketches]);

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '100vh',
      backgroundColor: '#f5f5f5' // 背景色
    }}>
      <div style={{
        position: 'relative',
        backgroundColor: '#fff8dc',      // 額縁の内側
        border: '12px solid #8b5e3c',    // 額縁の外枠
        padding: '0px',
        boxSizing: 'content-box',
        boxShadow: '0 0 20px rgba(0,0,0,0.3)',
        width: 800,
        height: 600
      }}>
        <canvas
          ref={staticCanvasRef}
          width={800}
          height={600}
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            zIndex: 0
          }}
        />
        <canvas
          ref={animatedCanvasRef}
          width={800}
          height={600}
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            zIndex: 1
          }}
        />
      </div>
    </div>
  );

};

export default CanvasLayered;