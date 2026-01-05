
import React from 'react';

interface KofiButtonProps {
  phrase: string;
}

const KofiButton: React.FC<KofiButtonProps> = ({ phrase }) => {
  return (
    <a
      href="https://ko-fi.com/ghosteater1"
      target="_blank"
      rel="noopener noreferrer"
      className="group relative inline-flex items-center justify-center px-6 py-3 font-bold text-white transition-all duration-75 active:translate-y-1 active:shadow-none"
    >
      {/* Sombra del botón (Pixel Style) */}
      <span className="absolute inset-0 w-full h-full bg-black translate-x-1 translate-y-1 group-hover:translate-x-0 group-hover:translate-y-0 transition-transform"></span>
      
      {/* Cuerpo del botón */}
      <span className="absolute inset-0 w-full h-full bg-[#FF5E5B] border-4 border-black"></span>
      
      {/* Texto */}
      <span className="relative text-[10px] md:text-xs uppercase tracking-tight flex items-center gap-2 text-center">
        {phrase}
      </span>
    </a>
  );
};

export default KofiButton;
