import { useEffect, useRef } from "react";

export default function HandTracker({ onResults }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  const pinchStateRef = useRef(false);
  const prevPosRef = useRef(null);

  function getDistance(a, b) {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  useEffect(() => {
    if (!window.Hands || !videoRef.current) return;

    const hands = new window.Hands({
      locateFile: (file) =>
        `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
    });

    hands.setOptions({
      maxNumHands: 1,
      modelComplexity: 1,
      minDetectionConfidence: 0.7,
      minTrackingConfidence: 0.7,
    });

    hands.onResults((results) => {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");

      ctx.save();
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(results.image, 0, 0, canvas.width, canvas.height);

      if (results.multiHandLandmarks?.length) {
        const landmarks = results.multiHandLandmarks[0];

        window.drawConnectors(
          ctx,
          landmarks,
          window.HAND_CONNECTIONS
        );
        window.drawLandmarks(ctx, landmarks);

        // Tracks pinch state with separate start and end thresholds.
        const thumb = landmarks[4];
        const index = landmarks[8];
        const distance = getDistance(thumb, index);

        const PINCH_START = 0.045;
        const PINCH_END = 0.065;

        let isPinching = pinchStateRef.current;

        if (!isPinching && distance < PINCH_START) {
          isPinching = true;
        }

        if (isPinching && distance > PINCH_END) {
          isPinching = false;
        }

        pinchStateRef.current = isPinching;

        // Treats index and middle fingers as the two-finger gesture.
        const indexExtended = landmarks[8].y < landmarks[6].y;
        const middleExtended = landmarks[12].y < landmarks[10].y;
        const ringExtended = landmarks[16].y < landmarks[14].y;
        const pinkyExtended = landmarks[20].y < landmarks[18].y;

        const twoFingerMode =
          indexExtended &&
          middleExtended &&
          !ringExtended &&
          !pinkyExtended;

        // Measures frame-to-frame index-finger movement.
        const currentPos = {
          x: landmarks[8].x,
          y: landmarks[8].y,
        };

        let deltaX = 0;
        let deltaY = 0;

        if (prevPosRef.current) {
          deltaX = currentPos.x - prevPosRef.current.x;
          deltaY = currentPos.y - prevPosRef.current.y;
        }

        prevPosRef.current = currentPos;

        if (onResults) {
          onResults({
            landmarks,
            isPinching,
            pinchDistance: distance,
            twoFingerMode,
            deltaX,
            deltaY,
          });
        }
      } else {
        // Clears gesture state when the hand leaves the frame.
        prevPosRef.current = null;
        pinchStateRef.current = false;
      }

      ctx.restore();
    });

    const camera = new window.Camera(videoRef.current, {
      onFrame: async () => {
        await hands.send({ image: videoRef.current });
      },
      width: 640,
      height: 480,
    });

    camera.start();

    return () => {
      camera.stop();
      hands.close();
    };
  }, [onResults]);

  return (
    <div style={{ position: "relative" }}>
      <video
        ref={videoRef}
        style={{ display: "none" }}
        playsInline
      />
      <canvas
        ref={canvasRef}
        width={640}
        height={480}
        style={{ width: "100%", maxWidth: 640 }}
      />
    </div>
  );
}
