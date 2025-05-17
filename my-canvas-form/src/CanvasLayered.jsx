import React, { useRef, useEffect, useState } from 'react';

const CanvasLayered = ({ sketches, canvasRef, containerRef }) => {
  const staticCanvasRef = canvasRef; // propsからcanvasRefを受け取る
  const animatedCanvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

  const updateCanvasSize = () => {
    if (containerRef.current) {
      setContainerSize({
        width: containerRef.current.clientWidth,
        height: containerRef.current.clientHeight
      });
    }
  };

  useEffect(() => {
    updateCanvasSize();
    window.addEventListener('resize', updateCanvasSize);
    return () => window.removeEventListener('resize', updateCanvasSize);
  }, []);

  useEffect(() => {
    const staticCanvas = staticCanvasRef.current;
    const animatedCanvas = animatedCanvasRef.current;
    if (!staticCanvas || !animatedCanvas || isDrawing || sketches.length === 0) return;

    staticCanvas.width = containerSize.width;
    staticCanvas.height = containerSize.height;
    animatedCanvas.width = containerSize.width;
    animatedCanvas.height = containerSize.height;

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

    // アニメーション描画
    setIsDrawing(true);
    const animatedCtx = animatedCanvas.getContext('2d');
    animatedCtx.clearRect(0, 0, animatedCanvas.width, animatedCanvas.height);

    const animatedSketches = sketches.filter(s => s.animate);
    let animationFrameId;

    const animateSketch = (index) => {
      if (index >= animatedSketches.length) {
        setIsDrawing(false);
        return;
      }

      const sketch = animatedSketches[index];
      const lines = sketch.lines;
      let i = 0;

      const drawLine = () => {
        if (i < lines.length) {
          const line = lines[i];
          animatedCtx.beginPath();
          animatedCtx.moveTo(line.start_x, line.start_y);
          animatedCtx.lineTo(line.end_x, line.end_y);
          animatedCtx.strokeStyle = line.color || '#000000';
          animatedCtx.lineWidth = line.thickness || 2;
          animatedCtx.stroke();
          i++;
          animationFrameId = requestAnimationFrame(drawLine);
        } else {
          animateSketch(index + 1); // 次のアニメーション
        }
      };

      drawLine();
    };

    if (animatedSketches.length > 0) {
      animateSketch(0);
    } else {
      setIsDrawing(false);
    }

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
      setIsDrawing(false);
    };

  }, [sketches, containerSize]);

  return (
    <>
      <canvas ref={staticCanvasRef} style={{ display: 'block', width: '100%', height: '100%', position: 'absolute', top: 0, left: 0, zIndex: 0 }} />
      <canvas ref={animatedCanvasRef} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 1 }} />
    </>
  );
};

export default CanvasLayered;