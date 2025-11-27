export const useMapExport = () => {
  const exportMapToPNG = (map: any, filename?: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (!map) {
        reject(new Error('Map instance is required'));
        return;
      }

      map.once('rendercomplete', () => {
        try {
          const mapCanvas = document.createElement('canvas');
          const size = map.getSize();
          mapCanvas.width = size[0];
          mapCanvas.height = size[1];
          const mapContext = mapCanvas.getContext('2d');

          if (!mapContext) {
            reject(new Error('Could not get canvas context'));
            return;
          }

          document.querySelectorAll('.ol-layer canvas, canvas.ol-layer').forEach((canvas) => {
            const canvasElement = canvas as HTMLCanvasElement;
            if (canvasElement.width > 0) {
              mapContext.drawImage(canvasElement, 0, 0);
            }
          });

          const link = document.createElement('a');

          const timestamp = new Date().toISOString().slice(0, 10);

          const finalFilename = filename
            ? `${filename}_${timestamp}.png`
            : `zemelapis_${timestamp}.png`;

          link.download = finalFilename;
          link.href = mapCanvas.toDataURL();
          link.click();

          resolve();
        } catch (error) {
          reject(error);
        }
      });

      map.renderSync();
    });
  };

  return { exportMapToPNG };
};
