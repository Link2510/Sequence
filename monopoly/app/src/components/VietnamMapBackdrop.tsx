import React from 'react';

/**
 * Displays the user-provided Vietnam map illustration (including Hà Nội, Huế,
 * TP. Hồ Chí Minh, Hoàng Sa, and Trường Sa) inside the central board arena.
 */
export const VietnamMapBackdrop: React.FC = () => {
  return (
    <div
      aria-label="Bản đồ Việt Nam cùng quần đảo Hoàng Sa và Trường Sa"
      className="absolute inset-0 w-full h-full pointer-events-none select-none flex items-center justify-center p-2 sm:p-4 overflow-hidden"
    >
      <div className="relative w-full h-full flex items-center justify-center rounded-xl overflow-hidden bg-[#FDF8E4]/92 shadow-inner">
        <img
          src="./assets/images_nobg.png"
          alt="Bản đồ Việt Nam cùng quần đảo Hoàng Sa và Trường Sa"
          referrerPolicy="no-referrer"
          className="w-full h-full object-contain"
        />
      </div>
    </div>
  );
};
