import { useState, useEffect } from 'react';

/** スマホ判定のブレークポイント（px）。640px未満をスマホとみなす */
const MOBILE_BREAKPOINT_PX = 640;

/**
 * 画面幅が640px未満かどうかを返すカスタムフック。
 * ウィンドウリサイズに追従してリアクティブに更新される。
 */
export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState<boolean>(
    () => window.innerWidth < MOBILE_BREAKPOINT_PX,
  );

  useEffect(() => {
    function handleResize(): void {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT_PX);
    }

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return isMobile;
}
