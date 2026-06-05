import React, { useEffect, useCallback, useRef, useState } from 'react';

interface PhotoLightboxProps {
  photos: string[];
  currentIndex: number;
  onClose: () => void;
  onIndexChange: (index: number) => void;
}

const PhotoLightbox: React.FC<PhotoLightboxProps> = ({
  photos,
  currentIndex,
  onClose,
  onIndexChange,
}) => {
  const [visible, setVisible] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);

  // Trigger fade-in on mount
  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
  }, []);

  const goPrev = useCallback(() => {
    if (photos.length <= 1) return;
    const next = currentIndex === 0 ? photos.length - 1 : currentIndex - 1;
    onIndexChange(next);
  }, [currentIndex, photos.length, onIndexChange]);

  const goNext = useCallback(() => {
    if (photos.length <= 1) return;
    const next = currentIndex === photos.length - 1 ? 0 : currentIndex + 1;
    onIndexChange(next);
  }, [currentIndex, photos.length, onIndexChange]);

  // Keyboard support
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          onClose();
          break;
        case 'ArrowLeft':
          goPrev();
          break;
        case 'ArrowRight':
          goNext();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, goPrev, goNext]);

  // Click outside image to close
  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === overlayRef.current) {
      onClose();
    }
  };

  if (!photos.length) return null;

  return (
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      className={`fixed inset-0 z-50 flex items-center justify-center bg-black/80 transition-opacity duration-300 ${
        visible ? 'opacity-100' : 'opacity-0'
      }`}
    >
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/25 transition-colors"
        aria-label="Close"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-6 w-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      {/* Previous arrow */}
      {photos.length > 1 && (
        <button
          onClick={goPrev}
          className="absolute left-4 top-1/2 -translate-y-1/2 z-10 flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-white opacity-0 hover:opacity-100 hover:bg-white/25 transition-all duration-200"
          aria-label="Previous photo"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-8 w-8"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      )}

      {/* Image */}
      <div className="relative flex items-center justify-center max-h-[90vh] max-w-[90vw]">
        <img
          src={photos[currentIndex]}
          alt={`Photo ${currentIndex + 1}`}
          className="max-h-[90vh] max-w-[90vw] object-contain rounded-lg select-none"
          draggable={false}
        />
      </div>

      {/* Next arrow */}
      {photos.length > 1 && (
        <button
          onClick={goNext}
          className="absolute right-4 top-1/2 -translate-y-1/2 z-10 flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-white opacity-0 hover:opacity-100 hover:bg-white/25 transition-all duration-200"
          aria-label="Next photo"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-8 w-8"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      )}

      {/* Image counter */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full bg-black/50 text-white text-sm font-medium">
        {currentIndex + 1} / {photos.length}
      </div>
    </div>
  );
};

export default PhotoLightbox;
