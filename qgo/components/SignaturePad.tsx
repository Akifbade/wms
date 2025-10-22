import React, { useRef, useEffect } from 'react';
import SignaturePad from 'signature_pad';

interface SignaturePadWrapperProps {
    onEnd: (dataUrl: string) => void;
    onClear: () => void;
}

const SignaturePadWrapper: React.FC<SignaturePadWrapperProps> = ({ onEnd, onClear }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const signaturePadRef = useRef<SignaturePad | null>(null);

    useEffect(() => {
        if (canvasRef.current) {
            const signaturePad = new SignaturePad(canvasRef.current, {
                backgroundColor: 'rgb(255, 255, 255)',
            });
            signaturePadRef.current = signaturePad;

            const resizeCanvas = () => {
                const canvas = canvasRef.current;
                if(canvas) {
                    const ratio = Math.max(window.devicePixelRatio || 1, 1);
                    canvas.width = canvas.offsetWidth * ratio;
                    canvas.height = canvas.offsetHeight * ratio;
                    const context = canvas.getContext("2d");
                    if(context) {
                         context.scale(ratio, ratio);
                    }
                    signaturePad.clear();
                }
            };
            
            window.addEventListener("resize", resizeCanvas);
            resizeCanvas();

            signaturePad.addEventListener("endStroke", () => {
                if (!signaturePad.isEmpty()) {
                    // Pass the signature as a base64 encoded PNG
                    onEnd(signaturePad.toDataURL('image/png'));
                }
            });

            return () => {
                window.removeEventListener("resize", resizeCanvas);
                signaturePad.off();
            };
        }
    }, []);

    const handleClear = () => {
        if (signaturePadRef.current) {
            signaturePadRef.current.clear();
            onClear();
        }
    };

    return (
        <div>
            <div className="relative w-full h-48 border-2 border-dashed border-slate-300 rounded-md bg-white">
                 <canvas ref={canvasRef} className="absolute top-0 left-0 w-full h-full"></canvas>
            </div>
            <div className="text-right mt-2">
                <button type="button" onClick={handleClear} className="btn btn-secondary">Clear</button>
            </div>
        </div>
    );
};

export default SignaturePadWrapper;