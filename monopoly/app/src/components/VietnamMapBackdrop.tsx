import React from 'react';

/**
 * Displays the user-provided Vietnam map illustration (including Hà Nội, Huế,
 * TP. Hồ Chí Minh, Hoàng Sa, and Trường Sa) inside the central board arena.
 */
export const VietnamMapBackdrop: React.FC = () => {
  return (
    <div
      aria-label="Bản đồ Việt Nam cùng quần đảo Hoàng Sa và Trường Sa"
      className="absolute inset-0 w-full h-full pointer-events-none select-none flex items-center justify-center p-2 sm:p-4 overflow-hidden bg-[radial-gradient(circle_at_center,_rgba(253,248,228,0.88)_0%,_rgba(226,244,238,0.72)_58%,_rgba(8,33,29,0.2)_100%)]"
    >
      <img
        src="./assets/aistudio/images_nobg_cc1f7cc9.png"
        alt="Bản đồ Việt Nam cùng quần đảo Hoàng Sa và Trường Sa"
        referrerPolicy="no-referrer"
        className="w-full h-full object-contain drop-shadow-[0_6px_16px_rgba(0,0,0,0.22)]"
      />
    </div>
  );
};
