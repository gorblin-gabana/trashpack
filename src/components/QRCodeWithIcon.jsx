import { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { useWalletStore } from '../store';

function QRCodeWithIcon({ 
  data, 
  size = 200, 
  iconSize = 40, 
  backgroundColor = '#ffffff', 
  foregroundColor = '#000000',
  className = '',
  chainIcon = null // Optional override for specific chain icon
}) {
  const canvasRef = useRef(null);
  const [qrCodeGenerated, setQrCodeGenerated] = useState(false);
  const [error, setError] = useState(null);
  const { selectedNetwork } = useWalletStore();

  // Get the appropriate icon URL
  const getIconUrl = () => {
    if (chainIcon) return chainIcon;
    
    // Map networks to local icons
    if (selectedNetwork.chain === 'gorbagana') {
      return '/icons/gorbchain.png';
    } else if (selectedNetwork.chain === 'solana') {
      // Use external Solana icon for Solana
      return selectedNetwork.icon;
    }
    
    // Default fallback to TrashPack logo
    return '/icons/trashpack.png';
  };

  // Function to draw icon on canvas
  const drawIconOnCanvas = (ctx, iconImg, centerX, centerY) => {
    try {
      // Create white background circle for icon
      const bgSize = iconSize + 8;
      ctx.fillStyle = backgroundColor;
      ctx.beginPath();
      ctx.arc(centerX, centerY, bgSize / 2, 0, 2 * Math.PI);
      ctx.fill();
      
      // Add subtle border around the icon background
      ctx.strokeStyle = '#e0e0e0';
      ctx.lineWidth = 2;
      ctx.stroke();
      
      // Draw the chain icon in the center
      const iconX = centerX - iconSize / 2;
      const iconY = centerY - iconSize / 2;
      
      ctx.save();
      ctx.beginPath();
      ctx.arc(centerX, centerY, iconSize / 2, 0, 2 * Math.PI);
      ctx.clip();
      ctx.drawImage(iconImg, iconX, iconY, iconSize, iconSize);
      ctx.restore();
      
      setQrCodeGenerated(true);
    } catch (drawError) {
      console.warn('Error drawing icon, using fallback:', drawError);
      drawFallbackIcon(ctx, centerX, centerY);
    }
  };

  // Fallback icon creation function
  const drawFallbackIcon = (ctx, centerX, centerY) => {
    const bgSize = iconSize + 8;
    
    // White background circle
    ctx.fillStyle = backgroundColor;
    ctx.beginPath();
    ctx.arc(centerX, centerY, bgSize / 2, 0, 2 * Math.PI);
    ctx.fill();
    
    // Add subtle border
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 2;
    ctx.stroke();
    
    // Colored circle for network
    const networkColor = selectedNetwork.color === 'bg-teal-600' ? '#0d9488' : '#9333ea';
    ctx.fillStyle = networkColor;
    ctx.beginPath();
    ctx.arc(centerX, centerY, iconSize / 2, 0, 2 * Math.PI);
    ctx.fill();
    
    // Add network symbol text
    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${iconSize / 3}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(selectedNetwork.symbol.charAt(0), centerX, centerY);
    
    setQrCodeGenerated(true);
  };

  useEffect(() => {
    const generateQRCode = async () => {
      if (!data || !canvasRef.current) return;

      try {
        setError(null);
        setQrCodeGenerated(false);
        
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        
        // Set canvas size
        canvas.width = size;
        canvas.height = size;

        // Generate QR code
        await QRCode.toCanvas(canvas, data, {
          width: size,
          margin: 1,
          color: {
            dark: foregroundColor,
            light: backgroundColor
          },
          errorCorrectionLevel: 'M'
        });

        const centerX = size / 2;
        const centerY = size / 2;
        
        // Try to load the appropriate icon
        const iconUrl = getIconUrl();
        const icon = new Image();
        icon.crossOrigin = 'anonymous';
        
        // Set up timeout for icon loading
        const loadTimeout = setTimeout(() => {
          if (!qrCodeGenerated) {
            console.warn('Icon loading timeout, using fallback');
            drawFallbackIcon(ctx, centerX, centerY);
          }
        }, 2000);
        
        icon.onload = () => {
          clearTimeout(loadTimeout);
          if (!qrCodeGenerated) {
            drawIconOnCanvas(ctx, icon, centerX, centerY);
          }
        };

        icon.onerror = () => {
          clearTimeout(loadTimeout);
          console.warn('Failed to load icon:', iconUrl, 'using fallback');
          if (!qrCodeGenerated) {
            drawFallbackIcon(ctx, centerX, centerY);
          }
        };

        // Load the icon
        if (iconUrl.startsWith('http')) {
          // External URL
          icon.src = iconUrl;
        } else {
          // Local file - try different approaches
          const localPaths = [
            iconUrl,
            '.' + iconUrl,
            window.location.origin + iconUrl
          ];
          
          let pathIndex = 0;
          const tryNextPath = () => {
            if (pathIndex < localPaths.length) {
              icon.src = localPaths[pathIndex];
              pathIndex++;
            } else {
              // All paths failed, use fallback
              clearTimeout(loadTimeout);
              if (!qrCodeGenerated) {
                drawFallbackIcon(ctx, centerX, centerY);
              }
            }
          };
          
          icon.onerror = () => {
            tryNextPath();
          };
          
          // Start with first path
          tryNextPath();
        }

      } catch (error) {
        console.error('Error generating QR code:', error);
        setError('Failed to generate QR code');
        setQrCodeGenerated(true);
      }
    };

    generateQRCode();
  }, [data, size, iconSize, backgroundColor, foregroundColor, selectedNetwork, chainIcon]);

  if (error) {
    return (
      <div className={`flex justify-center ${className}`}>
        <div 
          className="bg-red-100 border border-red-300 rounded-lg flex items-center justify-center"
          style={{ width: size, height: size }}
        >
          <div className="text-red-600 text-center">
            <div className="text-sm">QR Error</div>
            <div className="text-xs">{error}</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex justify-center ${className}`}>
      <canvas 
        ref={canvasRef}
        className="rounded-lg"
        style={{ 
          maxWidth: '100%', 
          height: 'auto',
          display: qrCodeGenerated ? 'block' : 'none'
        }}
      />
      {!qrCodeGenerated && (
        <div 
          className="bg-gray-200 rounded-lg flex items-center justify-center"
          style={{ width: size, height: size }}
        >
          <div className="text-gray-500">Generating QR...</div>
        </div>
      )}
    </div>
  );
}

export default QRCodeWithIcon; 