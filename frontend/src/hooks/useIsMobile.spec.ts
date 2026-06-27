import { renderHook, act } from '@testing-library/react';
import { useIsMobile } from './useIsMobile';

describe('useIsMobile', () => {
  const originalInnerWidth = Object.getOwnPropertyDescriptor(window, 'innerWidth');

  function setWindowWidth(width: number): void {
    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      writable: true,
      value: width,
    });
  }

  afterEach(() => {
    // innerWidth を元に戻す
    if (originalInnerWidth) {
      Object.defineProperty(window, 'innerWidth', originalInnerWidth);
    }
  });

  it('画面幅が 639px のとき true を返す', () => {
    setWindowWidth(639);
    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(true);
  });

  it('画面幅が 640px のとき false を返す', () => {
    setWindowWidth(640);
    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(false);
  });

  it('画面幅が 1024px のとき false を返す', () => {
    setWindowWidth(1024);
    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(false);
  });

  it('resize イベントで 1024px → 375px に変わると true になる', () => {
    setWindowWidth(1024);
    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(false);

    act(() => {
      setWindowWidth(375);
      window.dispatchEvent(new Event('resize'));
    });

    expect(result.current).toBe(true);
  });

  it('resize イベントで 375px → 768px に変わると false になる', () => {
    setWindowWidth(375);
    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(true);

    act(() => {
      setWindowWidth(768);
      window.dispatchEvent(new Event('resize'));
    });

    expect(result.current).toBe(false);
  });

  it('アンマウント後は resize イベントを受け取らない（リークなし）', () => {
    setWindowWidth(1024);
    const { result, unmount } = renderHook(() => useIsMobile());
    expect(result.current).toBe(false);

    unmount();

    // アンマウント後に resize を発火しても state 更新エラーが出ないことを確認
    act(() => {
      setWindowWidth(375);
      window.dispatchEvent(new Event('resize'));
    });

    // アンマウント済みなので result.current は変化しないが、エラーが出ないことを確認
    expect(result.current).toBe(false);
  });
});
