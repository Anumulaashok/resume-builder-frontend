import fs from 'fs';
import path from 'path';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import EducationForm from '../components/Education-form';

describe('Dead UI and API code cleanup', () => {
  const srcRoot = path.resolve(__dirname, '..');

  it('removes duplicate src/ui directory and unused src/services/api.ts', () => {
    expect(fs.existsSync(path.join(srcRoot, 'ui'))).toBe(false);
    expect(fs.existsSync(path.join(srcRoot, 'services', 'api.ts'))).toBe(false);
  });

  it('renders canonical Button and Input primitives from src/components/ui/*', () => {
    const handleClick = jest.fn();
    render(
      <div>
        <Input aria-label="Degree input" defaultValue="B.Tech" />
        <Button variant="outline" onClick={handleClick}>
          Action
        </Button>
      </div>
    );

    expect(screen.getByLabelText('Degree input')).toHaveValue('B.Tech');
    fireEvent.click(screen.getByRole('button', { name: 'Action' }));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('renders EducationForm using src/components/ui/* primitives cleanly', () => {
    const onSave = jest.fn();
    const onCancel = jest.fn();
    render(<EducationForm onSave={onSave} onCancel={onCancel} />);

    const degreeInput = screen.getByLabelText(/degree \/ qualification/i);
    fireEvent.change(degreeInput, { target: { value: 'M.S. Computer Science' } });
    fireEvent.click(screen.getByRole('button', { name: /^save$/i }));

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ degree: 'M.S. Computer Science' })
    );
  });
});
