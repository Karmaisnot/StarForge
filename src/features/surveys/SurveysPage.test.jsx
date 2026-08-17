// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { QuestionField } from './SurveysPage.jsx';
import { answerPresent } from './surveyAnswers.js';

describe('survey yes/no answers', () => {
  it('keeps yes/no values as JSON booleans for the forms API', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const { rerender } = render(
      <QuestionField
        question={{ id: 17, kind: 'boolean' }}
        value={undefined}
        onChange={onChange}
        t={(key) => key}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'surveys.yes' }));
    expect(onChange).toHaveBeenLastCalledWith(true);

    rerender(
      <QuestionField
        question={{ id: 17, kind: 'boolean' }}
        value={true}
        onChange={onChange}
        t={(key) => key}
      />,
    );
    expect(
      screen.getByRole('button', { name: 'surveys.yes' }).getAttribute('data-on'),
    ).toBe('1');

    await user.click(screen.getByRole('button', { name: 'surveys.no' }));
    expect(onChange).toHaveBeenLastCalledWith(false);
    expect(answerPresent(false)).toBe(true);
  });
});
