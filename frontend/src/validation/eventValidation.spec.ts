import {
  validateEventForm,
  isEventFormValid,
  validateMultipleEventForm,
  isMultipleEventFormValid,
  validateRepeatEventForm,
  isRepeatEventFormValid,
} from './eventValidation';

// ────────────────────────────────────────────────
// validateEventForm（通常フォーム）
// ────────────────────────────────────────────────
describe('validateEventForm', () => {
  const validValues = {
    title: 'ミーティング',
    description: '',
    start_at: '2026-06-01T10:00',
    end_at: '2026-06-01T11:00',
  };

  it('正常な入力はエラーなし', () => {
    const errors = validateEventForm(validValues);
    expect(isEventFormValid(errors)).toBe(true);
  });

  it('タイトル未入力はエラーになる', () => {
    const errors = validateEventForm({ ...validValues, title: '' });
    expect(errors.title).toBeDefined();
  });

  it('タイトルが200文字超はエラーになる', () => {
    const errors = validateEventForm({ ...validValues, title: 'a'.repeat(201) });
    expect(errors.title).toBeDefined();
  });

  it('開始日時未入力はエラーになる', () => {
    const errors = validateEventForm({ ...validValues, start_at: '' });
    expect(errors.start_at).toBeDefined();
  });

  it('終了日時未入力はエラーになる', () => {
    const errors = validateEventForm({ ...validValues, end_at: '' });
    expect(errors.end_at).toBeDefined();
  });

  it('終了日時が開始日時以前はエラーになる', () => {
    const errors = validateEventForm({
      ...validValues,
      start_at: '2026-06-01T11:00',
      end_at: '2026-06-01T10:00',
    });
    expect(errors.end_at).toBeDefined();
  });
});

// ────────────────────────────────────────────────
// validateMultipleEventForm（複数日付フォーム）
// ────────────────────────────────────────────────
describe('validateMultipleEventForm', () => {
  const validValues = {
    title: 'ミーティング',
    description: '',
    duration_minutes: '60',
    start_times: ['2026-06-01T10:00', '2026-06-02T10:00'],
  };

  it('正常な入力はエラーなし', () => {
    const errors = validateMultipleEventForm(validValues);
    expect(isMultipleEventFormValid(errors)).toBe(true);
  });

  it('タイトル未入力はエラーになる', () => {
    const errors = validateMultipleEventForm({ ...validValues, title: '' });
    expect(errors.title).toBeDefined();
  });

  it('duration_minutes が空はエラーになる', () => {
    const errors = validateMultipleEventForm({ ...validValues, duration_minutes: '' });
    expect(errors.duration_minutes).toBeDefined();
  });

  it('duration_minutes が0以下はエラーになる', () => {
    const errors = validateMultipleEventForm({ ...validValues, duration_minutes: '0' });
    expect(errors.duration_minutes).toBeDefined();
  });

  it('duration_minutes が1440超はエラーになる', () => {
    const errors = validateMultipleEventForm({ ...validValues, duration_minutes: '1441' });
    expect(errors.duration_minutes).toBeDefined();
  });

  it('start_times が空配列はエラーになる', () => {
    const errors = validateMultipleEventForm({ ...validValues, start_times: [] });
    expect(errors.start_times).toBeDefined();
  });

  it('start_times に空文字が含まれるはエラーになる', () => {
    const errors = validateMultipleEventForm({ ...validValues, start_times: ['2026-06-01T10:00', ''] });
    expect(errors.start_times).toBeDefined();
  });

  it('start_times が100件超はエラーになる', () => {
    const errors = validateMultipleEventForm({
      ...validValues,
      start_times: Array.from({ length: 101 }, (_, i) => `2026-06-${String(i + 1).padStart(2, '0')}T10:00`),
    });
    expect(errors.start_times).toBeDefined();
  });
});

// ────────────────────────────────────────────────
// validateRepeatEventForm（繰り返しフォーム）
// ────────────────────────────────────────────────
describe('validateRepeatEventForm', () => {
  const validValuesEndDate = {
    title: '週次会議',
    description: '',
    duration_minutes: '60',
    start_at: '2026-06-01T10:00',
    repeat_type: 'weekly' as const,
    interval: '1',
    days_of_week: [],
    end_condition_type: 'end_date' as const,
    end_date: '2026-07-01T10:00',
    count: '',
  };

  const validValuesCount = {
    ...validValuesEndDate,
    end_condition_type: 'count' as const,
    end_date: '',
    count: '4',
  };

  it('end_date 指定の正常入力はエラーなし', () => {
    const errors = validateRepeatEventForm(validValuesEndDate);
    expect(isRepeatEventFormValid(errors)).toBe(true);
  });

  it('count 指定の正常入力はエラーなし', () => {
    const errors = validateRepeatEventForm(validValuesCount);
    expect(isRepeatEventFormValid(errors)).toBe(true);
  });

  it('タイトル未入力はエラーになる', () => {
    const errors = validateRepeatEventForm({ ...validValuesCount, title: '' });
    expect(errors.title).toBeDefined();
  });

  it('duration_minutes が空はエラーになる', () => {
    const errors = validateRepeatEventForm({ ...validValuesCount, duration_minutes: '' });
    expect(errors.duration_minutes).toBeDefined();
  });

  it('start_at 未入力はエラーになる', () => {
    const errors = validateRepeatEventForm({ ...validValuesCount, start_at: '' });
    expect(errors.start_at).toBeDefined();
  });

  it('end_condition_type=end_date で end_date 未入力はエラーになる', () => {
    const errors = validateRepeatEventForm({ ...validValuesEndDate, end_date: '' });
    expect(errors.end_condition).toBeDefined();
  });

  it('end_condition_type=end_date で end_date が start_at 以前はエラーになる', () => {
    const errors = validateRepeatEventForm({
      ...validValuesEndDate,
      start_at: '2026-07-01T10:00',
      end_date: '2026-06-01T10:00',
    });
    expect(errors.end_condition).toBeDefined();
  });

  it('end_condition_type=count で count が0以下はエラーになる', () => {
    const errors = validateRepeatEventForm({ ...validValuesCount, count: '0' });
    expect(errors.end_condition).toBeDefined();
  });

  it('end_condition_type=count で count が100超はエラーになる', () => {
    const errors = validateRepeatEventForm({ ...validValuesCount, count: '101' });
    expect(errors.end_condition).toBeDefined();
  });
});
