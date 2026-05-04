import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import CalendarViewToggle from './CalendarViewToggle';
import { CalendarView } from '../hooks/useCalendar';

describe('CalendarViewToggle', () => {
  const onChange = jest.fn();

  beforeEach(() => {
    onChange.mockClear();
  });

  describe('PC表示（isMobile=false）', () => {
    it('月・週・日の3ボタンがすべて表示される', () => {
      render(
        <CalendarViewToggle
          currentView="dayGridMonth"
          onChange={onChange}
          isMobile={false}
        />,
      );

      expect(screen.getByText('月')).toBeInTheDocument();
      expect(screen.getByText('週')).toBeInTheDocument();
      expect(screen.getByText('日')).toBeInTheDocument();
    });

    it('currentView=dayGridMonth のとき「月」ボタンがアクティブスタイルになる', () => {
      render(
        <CalendarViewToggle
          currentView="dayGridMonth"
          onChange={onChange}
          isMobile={false}
        />,
      );

      const monthBtn = screen.getByText('月');
      expect(monthBtn.className).toContain('bg-sky-700');
    });

    it('currentView=timeGridWeek のとき「週」ボタンがアクティブスタイルになる', () => {
      render(
        <CalendarViewToggle
          currentView="timeGridWeek"
          onChange={onChange}
          isMobile={false}
        />,
      );

      const weekBtn = screen.getByText('週');
      expect(weekBtn.className).toContain('bg-sky-700');
    });

    it('currentView=timeGridDay のとき「日」ボタンがアクティブスタイルになる', () => {
      render(
        <CalendarViewToggle
          currentView="timeGridDay"
          onChange={onChange}
          isMobile={false}
        />,
      );

      const dayBtn = screen.getByText('日');
      expect(dayBtn.className).toContain('bg-sky-700');
    });

    it('「週」ボタンをクリックすると onChange(timeGridWeek) が呼ばれる', () => {
      render(
        <CalendarViewToggle
          currentView="dayGridMonth"
          onChange={onChange}
          isMobile={false}
        />,
      );

      fireEvent.click(screen.getByText('週'));
      expect(onChange).toHaveBeenCalledTimes(1);
      expect(onChange).toHaveBeenCalledWith('timeGridWeek' as CalendarView);
    });

    it('「日」ボタンをクリックすると onChange(timeGridDay) が呼ばれる', () => {
      render(
        <CalendarViewToggle
          currentView="dayGridMonth"
          onChange={onChange}
          isMobile={false}
        />,
      );

      fireEvent.click(screen.getByText('日'));
      expect(onChange).toHaveBeenCalledTimes(1);
      expect(onChange).toHaveBeenCalledWith('timeGridDay' as CalendarView);
    });
  });

  describe('スマホ表示（isMobile=true）', () => {
    it('「週」ボタンが非表示になる', () => {
      render(
        <CalendarViewToggle
          currentView="dayGridMonth"
          onChange={onChange}
          isMobile={true}
        />,
      );

      expect(screen.queryByText('週')).not.toBeInTheDocument();
    });

    it('「月」ボタンと「日」ボタンは表示される', () => {
      render(
        <CalendarViewToggle
          currentView="dayGridMonth"
          onChange={onChange}
          isMobile={true}
        />,
      );

      expect(screen.getByText('月')).toBeInTheDocument();
      expect(screen.getByText('日')).toBeInTheDocument();
    });

    it('「月」ボタンをクリックすると onChange(dayGridMonth) が呼ばれる', () => {
      render(
        <CalendarViewToggle
          currentView="timeGridDay"
          onChange={onChange}
          isMobile={true}
        />,
      );

      fireEvent.click(screen.getByText('月'));
      expect(onChange).toHaveBeenCalledWith('dayGridMonth' as CalendarView);
    });

    it('isMobile のデフォルト値が false のとき週ボタンが表示される', () => {
      render(
        <CalendarViewToggle currentView="dayGridMonth" onChange={onChange} />,
      );

      expect(screen.getByText('週')).toBeInTheDocument();
    });
  });
});
