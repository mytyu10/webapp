import { validateTaskForm, TaskFormValues } from './taskValidation';

/** テスト用の有効なフォーム値 */
const validValues: TaskFormValues = {
  title: 'テストタスク',
  description: 'テスト説明文',
  due_date: '2026-12-31T23:59',
  assignees: ['user1', 'user2'],
  priority: 'MEDIUM',
  category: '',
};

describe('validateTaskForm', () => {
  it('全て正常な値の場合はエラーなしを返す', () => {
    const errors = validateTaskForm(validValues);
    expect(Object.keys(errors)).toHaveLength(0);
  });

  describe('title', () => {
    it('タイトルが空の場合はエラーを返す', () => {
      const errors = validateTaskForm({ ...validValues, title: '' });
      expect(errors.title).toBeTruthy();
    });

    it('タイトルが空白のみの場合はエラーを返す', () => {
      const errors = validateTaskForm({ ...validValues, title: '   ' });
      expect(errors.title).toBeTruthy();
    });

    it('タイトルが200文字以内の場合はエラーなし', () => {
      const errors = validateTaskForm({ ...validValues, title: 'a'.repeat(200) });
      expect(errors.title).toBeUndefined();
    });

    it('タイトルが201文字以上の場合はエラーを返す', () => {
      const errors = validateTaskForm({ ...validValues, title: 'a'.repeat(201) });
      expect(errors.title).toBeTruthy();
    });
  });

  describe('description', () => {
    it('説明文が空の場合はエラーを返す', () => {
      const errors = validateTaskForm({ ...validValues, description: '' });
      expect(errors.description).toBeTruthy();
    });

    it('説明文が1000文字以内の場合はエラーなし', () => {
      const errors = validateTaskForm({ ...validValues, description: 'a'.repeat(1000) });
      expect(errors.description).toBeUndefined();
    });

    it('説明文が1001文字以上の場合はエラーを返す', () => {
      const errors = validateTaskForm({ ...validValues, description: 'a'.repeat(1001) });
      expect(errors.description).toBeTruthy();
    });
  });

  describe('due_date', () => {
    it('期限が空の場合はエラーを返す', () => {
      const errors = validateTaskForm({ ...validValues, due_date: '' });
      expect(errors.due_date).toBeTruthy();
    });

    it('不正な日時形式の場合はエラーを返す', () => {
      const errors = validateTaskForm({ ...validValues, due_date: 'not-a-date' });
      expect(errors.due_date).toBeTruthy();
    });

    it('正しいISO形式の場合はエラーなし', () => {
      const errors = validateTaskForm({ ...validValues, due_date: '2026-12-31T23:59' });
      expect(errors.due_date).toBeUndefined();
    });
  });

  describe('assignees', () => {
    it('担当者が空の場合はエラーになる', () => {
      const errors = validateTaskForm({ ...validValues, assignees: [] });
      expect(errors.assignees).toBeDefined();
    });

    it('担当者が50人以内の場合はエラーなし', () => {
      const assignees = Array.from({ length: 50 }, (_, i) => `user${i}`);
      const errors = validateTaskForm({ ...validValues, assignees });
      expect(errors.assignees).toBeUndefined();
    });

    it('担当者が51人以上の場合はエラーを返す', () => {
      const assignees = Array.from({ length: 51 }, (_, i) => `user${i}`);
      const errors = validateTaskForm({ ...validValues, assignees });
      expect(errors.assignees).toBeTruthy();
    });
  });

  describe('priority', () => {
    it('HIGHの場合はエラーなし', () => {
      const errors = validateTaskForm({ ...validValues, priority: 'HIGH' });
      expect(errors.priority).toBeUndefined();
    });

    it('MEDIUMの場合はエラーなし', () => {
      const errors = validateTaskForm({ ...validValues, priority: 'MEDIUM' });
      expect(errors.priority).toBeUndefined();
    });

    it('LOWの場合はエラーなし', () => {
      const errors = validateTaskForm({ ...validValues, priority: 'LOW' });
      expect(errors.priority).toBeUndefined();
    });
  });

  describe('category', () => {
    it('カテゴリが空の場合はエラーなし', () => {
      const errors = validateTaskForm({ ...validValues, category: '' });
      expect(errors.category).toBeUndefined();
    });

    it('カテゴリが100文字以内の場合はエラーなし', () => {
      const errors = validateTaskForm({ ...validValues, category: 'a'.repeat(100) });
      expect(errors.category).toBeUndefined();
    });

    it('カテゴリが101文字以上の場合はエラーを返す', () => {
      const errors = validateTaskForm({ ...validValues, category: 'a'.repeat(101) });
      expect(errors.category).toBeTruthy();
    });
  });
});
